import { prisma } from "@/lib/prisma";
import { PaymentType } from "@/generated/prisma";

const AR_ACCOUNT_CODE = "1100";
const AP_ACCOUNT_CODE = "2000";

const DAY = 86_400_000;

export type Aging = { b0_30: number; b31_60: number; b61_90: number; b90: number; total: number };

// Age a set of open "debit" items (opening balance + credit invoices) after
// applying `credits` (payments/returns) oldest-first, into standard buckets.
function computeAging(debits: { due: Date | null; amount: number }[], credits: number): Aging {
  const now = Date.now();
  const sorted = [...debits].sort((a, b) => {
    const da = a.due ? a.due.getTime() : 0;
    const db = b.due ? b.due.getTime() : 0;
    return da - db;
  });
  let remainingCredit = credits;
  const out: Aging = { b0_30: 0, b31_60: 0, b61_90: 0, b90: 0, total: 0 };
  for (const d of sorted) {
    const applied = Math.min(d.amount, remainingCredit);
    remainingCredit -= applied;
    const open = Math.round((d.amount - applied) * 100) / 100;
    if (open <= 0) continue;
    const daysPastDue = d.due ? Math.floor((now - d.due.getTime()) / DAY) : 0;
    if (daysPastDue <= 30) out.b0_30 += open;
    else if (daysPastDue <= 60) out.b31_60 += open;
    else if (daysPastDue <= 90) out.b61_90 += open;
    else out.b90 += open;
    out.total += open;
  }
  return out;
}

// Receivable = opening balance + credit sales (billed to Piutang Dagang)
// minus payments received. A giro/cek payment that later bounces is excluded
// (its receipt is reversed) so the receivable reopens.
export async function getCustomerReceivable(customerId: string) {
  const [customer, creditSales, receipts, returns] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId }, select: { openingBalance: true } }),
    prisma.sale.aggregate({
      where: { customerId, paymentAccount: { code: AR_ACCOUNT_CODE } },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: { customerId, type: PaymentType.CUSTOMER_RECEIPT, OR: [{ giroStatus: null }, { giroStatus: { not: "BOUNCED" } }] },
      _sum: { amount: true },
    }),
    prisma.salesReturn.aggregate({
      where: { customerId, settledToAR: true },
      _sum: { totalAmount: true },
    }),
  ]);
  return (
    Number(customer?.openingBalance ?? 0) +
    Number(creditSales._sum.totalAmount ?? 0) -
    Number(receipts._sum.amount ?? 0) -
    Number(returns._sum.totalAmount ?? 0)
  );
}

export async function getSupplierPayable(supplierId: string) {
  const [supplier, creditPurchases, paymentsMade] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: supplierId }, select: { openingBalance: true } }),
    prisma.purchase.aggregate({
      where: { supplierId, paymentAccount: { code: AP_ACCOUNT_CODE } },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: { supplierId, type: PaymentType.SUPPLIER_PAYMENT },
      _sum: { amount: true },
    }),
  ]);
  return (
    Number(supplier?.openingBalance ?? 0) +
    Number(creditPurchases._sum.totalAmount ?? 0) -
    Number(paymentsMade._sum.amount ?? 0)
  );
}

// Customers/suppliers that have at least one credit transaction past its due date.
export async function getOverdueCustomerIds() {
  const rows = await prisma.sale.findMany({
    where: { dueDate: { lt: new Date() }, paymentAccount: { code: AR_ACCOUNT_CODE } },
    select: { customerId: true },
    distinct: ["customerId"],
  });
  return new Set(rows.map((r) => r.customerId));
}

export async function getOverdueSupplierIds() {
  const rows = await prisma.purchase.findMany({
    where: { dueDate: { lt: new Date() }, paymentAccount: { code: AP_ACCOUNT_CODE } },
    select: { supplierId: true },
    distinct: ["supplierId"],
  });
  return new Set(rows.map((r) => r.supplierId));
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

// AR aging for every customer (0–30 / 31–60 / 61–90 / 90+), computed in one pass.
export async function listCustomerAging() {
  const [customers, sales, receipts, returns] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, openingBalance: true },
    }),
    prisma.sale.findMany({
      where: { paymentAccount: { code: AR_ACCOUNT_CODE } },
      select: { customerId: true, date: true, dueDate: true, totalAmount: true },
    }),
    prisma.payment.groupBy({
      by: ["customerId"],
      where: { type: PaymentType.CUSTOMER_RECEIPT, OR: [{ giroStatus: null }, { giroStatus: { not: "BOUNCED" } }] },
      _sum: { amount: true },
    }),
    prisma.salesReturn.groupBy({
      by: ["customerId"],
      where: { settledToAR: true },
      _sum: { totalAmount: true },
    }),
  ]);

  const salesByCust = new Map<string, { due: Date | null; amount: number }[]>();
  for (const s of sales) {
    const arr = salesByCust.get(s.customerId) ?? [];
    arr.push({ due: s.dueDate ?? s.date, amount: Number(s.totalAmount) });
    salesByCust.set(s.customerId, arr);
  }
  const creditByCust = new Map<string, number>();
  for (const r of receipts) creditByCust.set(r.customerId!, Number(r._sum.amount ?? 0));
  for (const r of returns)
    creditByCust.set(r.customerId, (creditByCust.get(r.customerId) ?? 0) + Number(r._sum.totalAmount ?? 0));

  return customers.map((c) => {
    const debits = salesByCust.get(c.id) ?? [];
    const opening = Number(c.openingBalance);
    if (opening > 0) debits.push({ due: null, amount: opening });
    const aging = computeAging(debits, creditByCust.get(c.id) ?? 0);
    return { id: c.id, name: c.name, phone: c.phone, ...aging };
  });
}

export async function listSupplierAging() {
  const [suppliers, purchases, payments] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, openingBalance: true },
    }),
    prisma.purchase.findMany({
      where: { paymentAccount: { code: AP_ACCOUNT_CODE } },
      select: { supplierId: true, date: true, dueDate: true, totalAmount: true },
    }),
    prisma.payment.groupBy({
      by: ["supplierId"],
      where: { type: PaymentType.SUPPLIER_PAYMENT },
      _sum: { amount: true },
    }),
  ]);

  const byS = new Map<string, { due: Date | null; amount: number }[]>();
  for (const p of purchases) {
    const arr = byS.get(p.supplierId) ?? [];
    arr.push({ due: p.dueDate ?? p.date, amount: Number(p.totalAmount) });
    byS.set(p.supplierId, arr);
  }
  const creditByS = new Map<string, number>();
  for (const p of payments) creditByS.set(p.supplierId!, Number(p._sum.amount ?? 0));

  return suppliers.map((s) => {
    const debits = byS.get(s.id) ?? [];
    const opening = Number(s.openingBalance);
    if (opening > 0) debits.push({ due: null, amount: opening });
    const aging = computeAging(debits, creditByS.get(s.id) ?? 0);
    return { id: s.id, name: s.name, phone: s.phone, ...aging };
  });
}

export type LedgerEntry = {
  date: Date;
  description: string;
  ref: string | null;
  debit: number;
  credit: number;
  balance: number;
  href: string | null;
};

// Kartu Piutang — a running-balance account statement for one customer.
export async function getCustomerLedger(customerId: string) {
  const [customer, sales, payments, returns] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.sale.findMany({
      where: { customerId, paymentAccount: { code: AR_ACCOUNT_CODE } },
      orderBy: { date: "asc" },
    }),
    prisma.payment.findMany({
      where: { customerId, type: PaymentType.CUSTOMER_RECEIPT, OR: [{ giroStatus: null }, { giroStatus: { not: "BOUNCED" } }] },
      orderBy: { date: "asc" },
    }),
    prisma.salesReturn.findMany({
      where: { customerId, settledToAR: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const raw: Omit<LedgerEntry, "balance">[] = [];
  if (customer && Number(customer.openingBalance) > 0) {
    raw.push({
      date: new Date(0),
      description: "Saldo Awal",
      ref: null,
      debit: Number(customer.openingBalance),
      credit: 0,
      href: null,
    });
  }
  for (const s of sales)
    raw.push({ date: s.date, description: "Penjualan", ref: s.reference, debit: Number(s.totalAmount), credit: 0, href: `/sales/${s.id}` });
  for (const p of payments)
    raw.push({ date: p.date, description: `Pembayaran (${p.method.toLowerCase()})`, ref: p.reference ?? p.instrumentNumber, debit: 0, credit: Number(p.amount), href: null });
  for (const r of returns)
    raw.push({ date: r.date, description: "Retur / Nota Kredit", ref: r.number, debit: 0, credit: Number(r.totalAmount), href: `/returns/${r.id}` });

  raw.sort((a, b) => a.date.getTime() - b.date.getTime());
  let balance = 0;
  const entries: LedgerEntry[] = raw.map((e) => {
    balance = Math.round((balance + e.debit - e.credit) * 100) / 100;
    return { ...e, balance };
  });
  return { customer, entries, balance };
}

// Kartu Hutang — running-balance account statement for one supplier.
export async function getSupplierLedger(supplierId: string) {
  const [supplier, purchases, payments] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: supplierId } }),
    prisma.purchase.findMany({
      where: { supplierId, paymentAccount: { code: AP_ACCOUNT_CODE } },
      orderBy: { date: "asc" },
    }),
    prisma.payment.findMany({
      where: { supplierId, type: PaymentType.SUPPLIER_PAYMENT },
      orderBy: { date: "asc" },
    }),
  ]);

  const raw: Omit<LedgerEntry, "balance">[] = [];
  if (supplier && Number(supplier.openingBalance) > 0) {
    raw.push({ date: new Date(0), description: "Saldo Awal", ref: null, debit: 0, credit: Number(supplier.openingBalance), href: null });
  }
  for (const p of purchases)
    raw.push({ date: p.date, description: "Pembelian", ref: p.reference, debit: 0, credit: Number(p.totalAmount), href: `/purchases/${p.id}` });
  for (const p of payments)
    raw.push({ date: p.date, description: `Pembayaran (${p.method.toLowerCase()})`, ref: p.reference ?? p.instrumentNumber, debit: Number(p.amount), credit: 0, href: null });

  raw.sort((a, b) => a.date.getTime() - b.date.getTime());
  let balance = 0;
  const entries: LedgerEntry[] = raw.map((e) => {
    balance = Math.round((balance + e.credit - e.debit) * 100) / 100;
    return { ...e, balance };
  });
  return { supplier, entries, balance };
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
