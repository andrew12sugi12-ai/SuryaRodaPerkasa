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
  onHand: number;
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
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, sku: true, name: true, quantityOnHand: true },
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
  const productMovement: ProductMovement[] = products
    .map((p) => {
      const sold = soldByProduct.get(p.id) ?? { units: 0, revenue: 0, cogs: 0 };
      const onHand = Number(p.quantityOnHand);
      const grossProfit = sold.revenue - sold.cogs;
      const dailyRate = sold.units / periodDays;
      const daysOfStock = dailyRate > 0 ? onHand / dailyRate : null;

      let category: ProductMovement["category"];
      if (sold.units <= 0) category = "DEAD";
      else if (daysOfStock !== null && daysOfStock <= 30) category = "FAST";
      else if (daysOfStock !== null && daysOfStock > 90) category = "SLOW";
      else category = "NORMAL";

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
        category,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = topCustomers.reduce((s, c) => s + c.revenue, 0);
  const totalProfit = topCustomers.reduce((s, c) => s + c.grossProfit, 0);

  return {
    periodDays,
    salesmanPerformance,
    topCustomers,
    productMovement,
    totals: {
      revenue: totalRevenue,
      grossProfit: totalProfit,
      marginPct: pct(totalProfit, totalRevenue),
      invoices: topCustomers.reduce((s, c) => s + c.invoices, 0),
      deadStock: productMovement.filter((p) => p.category === "DEAD").length,
    },
  };
}
