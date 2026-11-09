import { prisma } from "@/lib/prisma";
import { CreditLimitError } from "@/server/errors";
import {
  getCustomerReceivable,
  getOverdueCustomerIds,
} from "@/server/services/balances.service";

const AR_ACCOUNT_CODE = "1100";

export type CreditStatus = {
  customerId: string;
  creditLimit: number; // 0 = no limit set
  cashOnly: boolean;
  termDays: number;
  receivable: number; // current outstanding AR
  projected: number; // receivable + the charge being evaluated
  available: number | null; // null when no limit is set
  overLimit: boolean;
  hasOverdue: boolean;
  // A sale should be blocked (pending override) when any of these trip on a
  // credit sale: the customer is cash-only, over their limit, or has overdue bills.
  blocked: boolean;
  reasons: ("CASH_ONLY" | "OVER_LIMIT" | "OVERDUE")[];
};

// Evaluate a customer's credit standing, optionally including a new charge
// (the sale being entered). `additionalCharge` is the new credit-sale total.
export async function getCustomerCreditStatus(
  customerId: string,
  additionalCharge = 0
): Promise<CreditStatus> {
  const [customer, receivable, overdueIds] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: { creditLimit: true, cashOnly: true, termDays: true },
    }),
    getCustomerReceivable(customerId),
    getOverdueCustomerIds(),
  ]);

  const creditLimit = Number(customer?.creditLimit ?? 0);
  const cashOnly = customer?.cashOnly ?? false;
  const termDays = customer?.termDays ?? 0;
  const projected = receivable + additionalCharge;
  const hasLimit = creditLimit > 0;
  const overLimit = hasLimit && projected > creditLimit + 0.005;
  const hasOverdue = overdueIds.has(customerId);

  const reasons: CreditStatus["reasons"] = [];
  if (cashOnly) reasons.push("CASH_ONLY");
  if (overLimit) reasons.push("OVER_LIMIT");
  if (hasOverdue) reasons.push("OVERDUE");

  return {
    customerId,
    creditLimit,
    cashOnly,
    termDays,
    receivable,
    projected,
    available: hasLimit ? creditLimit - receivable : null,
    overLimit,
    hasOverdue,
    blocked: reasons.length > 0,
    reasons,
  };
}

// Guard used by the sale action. Credit controls only apply to credit sales
// (those billed to Piutang Dagang / AR 1100); cash and transfer sales pass
// through untouched. Throws CreditLimitError when blocked and not overridden.
export async function assertCreditOk(
  customerId: string,
  paymentAccountId: string,
  saleTotal: number,
  override = false
): Promise<CreditStatus | null> {
  const account = await prisma.account.findUnique({
    where: { id: paymentAccountId },
    select: { code: true },
  });
  if (account?.code !== AR_ACCOUNT_CODE) return null;

  const status = await getCustomerCreditStatus(customerId, saleTotal);
  if (status.blocked && !override) {
    throw new CreditLimitError(status.reasons);
  }
  return status;
}

// Lightweight per-customer credit snapshot for the sale form, built from the
// one-pass aging query plus the overdue set — no per-customer round trips.
export async function getCreditSnapshotMap() {
  const { listCustomerAging } = await import("@/server/services/balances.service");
  const [aging, overdueIds, customers] = await Promise.all([
    listCustomerAging(),
    getOverdueCustomerIds(),
    prisma.customer.findMany({
      select: { id: true, creditLimit: true, cashOnly: true, termDays: true },
    }),
  ]);

  const receivableById = new Map(aging.map((a) => [a.id, a.total]));
  const map: Record<
    string,
    { creditLimit: number; cashOnly: boolean; termDays: number; receivable: number; hasOverdue: boolean }
  > = {};
  for (const c of customers) {
    map[c.id] = {
      creditLimit: Number(c.creditLimit),
      cashOnly: c.cashOnly,
      termDays: c.termDays,
      receivable: receivableById.get(c.id) ?? 0,
      hasOverdue: overdueIds.has(c.id),
    };
  }
  return map;
}
