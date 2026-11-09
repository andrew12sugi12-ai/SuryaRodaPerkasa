import { prisma } from "@/lib/prisma";
import { GiroStatus, PaymentType } from "@/generated/prisma";

// Monthly sales revenue for the last `months` months (including empty months).
export async function getMonthlyRevenue(months = 12) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const sales = await prisma.sale.findMany({
    where: { date: { gte: start } },
    select: { date: true, totalAmount: true },
  });

  const buckets = new Map<string, number>();
  const order: string[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.set(key, 0);
    order.push(key);
  }
  for (const s of sales) {
    const key = `${s.date.getFullYear()}-${s.date.getMonth()}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + Number(s.totalAmount));
  }

  return order.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m, 1);
    return {
      label: d.toLocaleDateString("id-ID", { month: "short" }),
      monthYear: d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
      total: buckets.get(key) ?? 0,
    };
  });
}

// Customer invoices (sales) due soon or overdue, by due date.
export async function getUpcomingInvoices(withinDays = 30, limit = 8) {
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);
  const sales = await prisma.sale.findMany({
    where: {
      dueDate: { not: null, lte: horizon },
      paymentAccount: { code: "1100" }, // credit sales (AR)
    },
    orderBy: { dueDate: "asc" },
    take: limit,
    include: { customer: true },
  });
  return sales.map((s) => {
    const due = s.dueDate as Date;
    const days = Math.round((due.getTime() - now.getTime()) / 86_400_000);
    return {
      id: s.id,
      customer: s.customer.name,
      amount: Number(s.totalAmount),
      dueDate: due,
      days, // negative = overdue
    };
  });
}

// Pending (uncleared) giro/cek receipts, flagged overdue vs their due date.
export async function getPendingGiroList(limit = 8) {
  const now = new Date();
  const payments = await prisma.payment.findMany({
    where: { type: PaymentType.CUSTOMER_RECEIPT, giroStatus: GiroStatus.PENDING },
    orderBy: { dueDate: "asc" },
    take: limit,
    include: { customer: true },
  });
  return payments.map((p) => {
    const due = p.dueDate ?? null;
    const days = due ? Math.round((due.getTime() - now.getTime()) / 86_400_000) : null;
    return {
      id: p.id,
      customer: p.customer?.name ?? "—",
      number: p.instrumentNumber ?? "—",
      amount: Number(p.amount),
      dueDate: due,
      days,
    };
  });
}
