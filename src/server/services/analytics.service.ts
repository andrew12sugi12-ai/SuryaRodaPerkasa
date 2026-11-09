import { prisma } from "@/lib/prisma";

export type SalesmanPerformance = {
  id: string;
  name: string;
  tokoCount: number;
  invoices: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  target: number; // monthly target
  attainmentPct: number | null; // revenue vs target (null when no target)
};

export type CustomerRank = {
  id: string;
  name: string;
  invoices: number;
  revenue: number;
  grossProfit: number;
  marginPct: number;
};

export type ProductMovement = {
  id: string;
  sku: string;
  name: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  onHand: number; // for a bike this is "buildable" from parts
  daysOfStock: number | null; // null = infinite (nothing sold)
  category: "FAST" | "NORMAL" | "SLOW" | "DEAD";
};


const dayMs = 86_400_000;
const pct = (profit: number, revenue: number) => (revenue > 0 ? (profit / revenue) * 100 : 0);

// All three analytics views over one date window. Each uses a bounded number of
// queries (no per-row round trips) so it scales with data volume, not toko count.
export async function getAnalytics(startDate: Date, endDate: Date) {
  // Count inclusive calendar days, ignoring the time-of-day on each bound.
  // (endDate is 23:59:59, so a raw diff + 1 would over-count a full month as 31.)
  const startDay = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const periodDays = Math.max(1, Math.round((endDay - startDay) / dayMs) + 1);
  const where = { date: { gte: startDate, lte: endDate } };

  const [salesmen, sales, customerGroups, lineGroups, products, customers] = await Promise.all([
    prisma.salesman.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { customers: true } } },
    }),
    // Sale totals tagged with the owning toko's salesman, for rep roll-ups.
    prisma.sale.findMany({
      where,
      select: {
        totalAmount: true,
        totalCOGS: true,
        salesmanId: true,
        customer: { select: { salesmanId: true } },
      },
    }),
    prisma.sale.groupBy({
      by: ["customerId"],
      where,
      _sum: { totalAmount: true, totalCOGS: true },
      _count: true,
    }),
    prisma.saleLine.groupBy({
      by: ["productId"],
      where: { sale: where },
      _sum: { quantity: true, lineTotal: true, lineCOGS: true },
    }),
    // All active products with the relationships needed to tell spareparts,
    // finished bikes, and bike components apart and to roll component usage up
    // from bike sales.
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        name: true,
        quantityOnHand: true,
        unitCost: true,
        category: true,
        components: {
          select: {
            quantity: true,
            component: { select: { id: true, quantityOnHand: true, unitCost: true } },
          },
        },
        usedInBikes: { select: { bikeId: true, quantity: true } },
      },
    }),
    prisma.customer.findMany({ select: { id: true, name: true } }),
  ]);

  // --- Salesman performance ---
  const bySalesman = new Map<string, { revenue: number; cogs: number; invoices: number }>();
  for (const s of sales) {
    // Credit the salesman recorded on the sale; fall back to the toko's rep
    // for sales entered before per-sale attribution existed.
    const key = s.salesmanId ?? s.customer.salesmanId;
    if (!key) continue;
    const agg = bySalesman.get(key) ?? { revenue: 0, cogs: 0, invoices: 0 };
    agg.revenue += Number(s.totalAmount);
    agg.cogs += Number(s.totalCOGS);
    agg.invoices += 1;
    bySalesman.set(key, agg);
  }
  const salesmanPerformance: SalesmanPerformance[] = salesmen
    .map((m) => {
      const agg = bySalesman.get(m.id) ?? { revenue: 0, cogs: 0, invoices: 0 };
      const grossProfit = agg.revenue - agg.cogs;
      const target = Number(m.monthlyTarget);
      // Scale a monthly target to the selected window length (pace vs target).
      const scaledTarget = target > 0 ? (target * periodDays) / 30 : 0;
      return {
        id: m.id,
        name: m.name,
        tokoCount: m._count.customers,
        invoices: agg.invoices,
        revenue: agg.revenue,
        cogs: agg.cogs,
        grossProfit,
        marginPct: pct(grossProfit, agg.revenue),
        target: scaledTarget,
        attainmentPct: scaledTarget > 0 ? (agg.revenue / scaledTarget) * 100 : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // --- Top toko (customer ranking) ---
  const nameById = new Map(customers.map((c) => [c.id, c.name]));
  const topCustomers: CustomerRank[] = customerGroups
    .map((g) => {
      const revenue = Number(g._sum.totalAmount ?? 0);
      const cogs = Number(g._sum.totalCOGS ?? 0);
      const grossProfit = revenue - cogs;
      return {
        id: g.customerId,
        name: nameById.get(g.customerId) ?? "—",
        invoices: g._count,
        revenue,
        grossProfit,
        marginPct: pct(grossProfit, revenue),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // --- Product movement / margin ---
  const soldByProduct = new Map<
    string,
    { units: number; revenue: number; cogs: number }
  >();
  for (const g of lineGroups) {
    soldByProduct.set(g.productId, {
      units: Number(g._sum.quantity ?? 0),
      revenue: Number(g._sum.lineTotal ?? 0),
      cogs: Number(g._sum.lineCOGS ?? 0),
    });
  }
  // Classify every active product.
  const bikes = products.filter((p) => p.components.length > 0);
  const spareparts = products.filter(
    (p) => p.components.length === 0 && p.usedInBikes.length === 0
  );

  const movementCategory = (
    unitsSold: number,
    daysOfStock: number | null
  ): ProductMovement["category"] => {
    if (unitsSold <= 0) return "DEAD";
    if (daysOfStock !== null && daysOfStock <= 30) return "FAST";
    if (daysOfStock !== null && daysOfStock > 90) return "SLOW";
    return "NORMAL";
  };

  // --- Sparepart movement (standalone stock-carrying items) ---
  const sparepartMovement: ProductMovement[] = spareparts
    .map((p) => {
      const sold = soldByProduct.get(p.id) ?? { units: 0, revenue: 0, cogs: 0 };
      const onHand = Number(p.quantityOnHand);
      const grossProfit = sold.revenue - sold.cogs;
      const dailyRate = sold.units / periodDays;
      const daysOfStock = dailyRate > 0 ? onHand / dailyRate : null;
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        unitsSold: sold.units,
        revenue: sold.revenue,
        cogs: sold.cogs,
        grossProfit,
        marginPct: pct(grossProfit, sold.revenue),
        onHand,
        daysOfStock,
        category: movementCategory(sold.units, daysOfStock),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // --- Bicycle movement (finished bikes — "on hand" is buildable from parts) ---
  const bicycleMovement: ProductMovement[] = bikes
    .map((p) => {
      const sold = soldByProduct.get(p.id) ?? { units: 0, revenue: 0, cogs: 0 };
      const buildable = p.components.length
        ? Math.floor(
            Math.min(
              ...p.components.map((c) =>
                Number(c.quantity) > 0
                  ? Number(c.component.quantityOnHand) / Number(c.quantity)
                  : 0
              )
            )
          )
        : 0;
      const grossProfit = sold.revenue - sold.cogs;
      const dailyRate = sold.units / periodDays;
      const daysOfStock = dailyRate > 0 ? buildable / dailyRate : null;
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        unitsSold: sold.units,
        revenue: sold.revenue,
        cogs: sold.cogs,
        grossProfit,
        marginPct: pct(grossProfit, sold.revenue),
        onHand: buildable,
        daysOfStock,
        category: movementCategory(sold.units, daysOfStock),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = topCustomers.reduce((s, c) => s + c.revenue, 0);
  const totalProfit = topCustomers.reduce((s, c) => s + c.grossProfit, 0);
  const deadStockCount =
    sparepartMovement.filter((p) => p.category === "DEAD").length +
    bicycleMovement.filter((p) => p.category === "DEAD").length;

  return {
    periodDays,
    salesmanPerformance,
    topCustomers,
    sparepartMovement,
    bicycleMovement,
    totals: {
      revenue: totalRevenue,
      grossProfit: totalProfit,
      marginPct: pct(totalProfit, totalRevenue),
      invoices: topCustomers.reduce((s, c) => s + c.invoices, 0),
      deadStockCount,
    },
  };
}
