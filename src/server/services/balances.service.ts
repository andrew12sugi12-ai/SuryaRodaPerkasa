import { prisma } from "@/lib/prisma";
import { PaymentType } from "@/generated/prisma";

const AR_ACCOUNT_CODE = "1100";
const AP_ACCOUNT_CODE = "2000";

// Receivable = credit sales (billed to Piutang Dagang) minus payments received.
export async function getCustomerReceivable(customerId: string) {
  const [creditSales, receipts] = await Promise.all([
    prisma.sale.aggregate({
      where: { customerId, paymentAccount: { code: AR_ACCOUNT_CODE } },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: { customerId, type: PaymentType.CUSTOMER_RECEIPT },
      _sum: { amount: true },
    }),
  ]);
  return Number(creditSales._sum.totalAmount ?? 0) - Number(receipts._sum.amount ?? 0);
}

export async function getSupplierPayable(supplierId: string) {
  const [creditPurchases, paymentsMade] = await Promise.all([
    prisma.purchase.aggregate({
      where: { supplierId, paymentAccount: { code: AP_ACCOUNT_CODE } },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: { supplierId, type: PaymentType.SUPPLIER_PAYMENT },
      _sum: { amount: true },
    }),
  ]);
  return Number(creditPurchases._sum.totalAmount ?? 0) - Number(paymentsMade._sum.amount ?? 0);
}

export async function listCustomersWithReceivables() {
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
  return Promise.all(
    customers.map(async (c) => ({ ...c, receivable: await getCustomerReceivable(c.id) }))
  );
}

export async function listSuppliersWithPayables() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return Promise.all(
    suppliers.map(async (s) => ({ ...s, payable: await getSupplierPayable(s.id) }))
  );
}

export async function getCustomerDetail(customerId: string) {
  const [customer, receivable, sales, payments, productGroups] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    getCustomerReceivable(customerId),
    prisma.sale.findMany({
      where: { customerId },
      orderBy: { date: "desc" },
      include: { paymentAccount: true },
    }),
    prisma.payment.findMany({
      where: { customerId },
      orderBy: { date: "desc" },
      include: { account: true },
    }),
    prisma.saleLine.groupBy({
      by: ["productId"],
      where: { sale: { customerId } },
      _sum: { quantity: true, lineTotal: true },
    }),
  ]);

  const products = await prisma.product.findMany({
    where: { id: { in: productGroups.map((g) => g.productId) } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const productSummary = productGroups
    .map((g) => ({
      sku: productById.get(g.productId)?.sku ?? "?",
      name: productById.get(g.productId)?.name ?? "?",
      quantity: Number(g._sum.quantity ?? 0),
      total: Number(g._sum.lineTotal ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  return { customer, receivable, sales, payments, productSummary };
}

export async function getSupplierDetail(supplierId: string) {
  const [supplier, payable, purchases, payments, productGroups] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: supplierId } }),
    getSupplierPayable(supplierId),
    prisma.purchase.findMany({
      where: { supplierId },
      orderBy: { date: "desc" },
      include: { paymentAccount: true },
    }),
    prisma.payment.findMany({
      where: { supplierId },
      orderBy: { date: "desc" },
      include: { account: true },
    }),
    prisma.purchaseLine.groupBy({
      by: ["productId"],
      where: { purchase: { supplierId } },
      _sum: { quantity: true, lineTotal: true },
    }),
  ]);

  const products = await prisma.product.findMany({
    where: { id: { in: productGroups.map((g) => g.productId) } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const productSummary = productGroups
    .map((g) => ({
      sku: productById.get(g.productId)?.sku ?? "?",
      name: productById.get(g.productId)?.name ?? "?",
      quantity: Number(g._sum.quantity ?? 0),
      total: Number(g._sum.lineTotal ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  return { supplier, payable, purchases, payments, productSummary };
}
