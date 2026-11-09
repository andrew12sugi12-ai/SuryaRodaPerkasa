import { prisma } from "@/lib/prisma";
import { AccountType } from "@/generated/prisma";

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  isLongTerm: boolean;
  totalDebit: number;
  totalCredit: number;
  balance: number;
};

export async function getTrialBalance(asOfDate: Date) {
  const accounts = await prisma.account.findMany({
    orderBy: { code: "asc" },
    include: {
      journalLines: {
        where: { journalEntry: { date: { lte: asOfDate } } },
      },
    },
  });

  const rows: TrialBalanceRow[] = accounts.map((account) => {
    const totalDebit = account.journalLines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = account.journalLines.reduce((sum, l) => sum + Number(l.credit), 0);
    const balance =
      account.normalBalance === "DEBIT" ? totalDebit - totalCredit : totalCredit - totalDebit;

    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      isLongTerm: account.isLongTerm,
      totalDebit,
      totalCredit,
      balance,
    };
  });

  const totalDebit = rows.reduce((sum, r) => sum + r.totalDebit, 0);
  const totalCredit = rows.reduce((sum, r) => sum + r.totalCredit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return { rows, totalDebit, totalCredit, isBalanced };
}

export async function getIncomeStatement(startDate: Date, endDate: Date) {
  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: { date: { gte: startDate, lte: endDate } },
      account: { type: { in: [AccountType.INCOME, AccountType.EXPENSE] } },
    },
    include: { account: true },
  });

  const byAccount = new Map<
    string,
    { code: string; name: string; type: AccountType; category: string; amount: number }
  >();

  for (const line of lines) {
    const key = line.accountId;
    // Category comes from the account's expenseCategory; legacy accounts
    // without one fall back to the 50xx-is-COGS code convention.
    const fallback = line.account.code.startsWith("50") ? "COGS" : "OPERATIONAL";
    const existing = byAccount.get(key) ?? {
      code: line.account.code,
      name: line.account.name,
      type: line.account.type,
      category: line.account.expenseCategory ?? fallback,
      amount: 0,
    };
    // INCOME accounts are normally credit-balance; EXPENSE (incl. COGS) are debit-balance.
    const delta =
      line.account.type === AccountType.INCOME
        ? Number(line.credit) - Number(line.debit)
        : Number(line.debit) - Number(line.credit);
    existing.amount += delta;
    byAccount.set(key, existing);
  }

  const expenseRows = (category: string) =>
    [...byAccount.values()]
      .filter((r) => r.type === AccountType.EXPENSE && r.category === category)
      .sort((a, b) => a.code.localeCompare(b.code));

  const revenueRows = [...byAccount.values()]
    .filter((r) => r.type === AccountType.INCOME)
    .sort((a, b) => a.code.localeCompare(b.code));
  const cogsRows = expenseRows("COGS");
  const operationalRows = expenseRows("OPERATIONAL");
  const fixedRows = expenseRows("FIXED");
  const salesExpenseRows = expenseRows("SALES");
  const otherRows = expenseRows("OTHER");

  const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

  const revenue = sum(revenueRows);
  const cogs = sum(cogsRows);
  const grossProfit = revenue - cogs;
  const operationalTotal = sum(operationalRows);
  const fixedTotal = sum(fixedRows);
  const salesExpenseTotal = sum(salesExpenseRows);
  const otherTotal = sum(otherRows);
  const operatingExpenses = operationalTotal + fixedTotal + salesExpenseTotal + otherTotal;
  const netIncome = grossProfit - operatingExpenses;

  return {
    revenueRows,
    cogsRows,
    operationalRows,
    fixedRows,
    salesExpenseRows,
    otherRows,
    revenue,
    cogs,
    grossProfit,
    operationalTotal,
    fixedTotal,
    salesExpenseTotal,
    otherTotal,
    operatingExpenses,
    netIncome,
  };
}

const AR_ACCOUNT_CODE = "1100";
const CUSTOMER_ADVANCE_CODE = "2400"; // synthetic presentation line (reclassified from AR)
const isCashBankCode = (code: string) => code.startsWith("10");
const sumBalance = (rows: TrialBalanceRow[]) => rows.reduce((s, r) => s + r.balance, 0);

export async function getBalanceSheet(asOfDate: Date) {
  const trialBalance = await getTrialBalance(asOfDate);

  const assetRows = trialBalance.rows.filter((r) => r.type === AccountType.ASSET);
  const equityRows = trialBalance.rows.filter((r) => r.type === AccountType.EQUITY);

  // Assets: current (isLongTerm=false) vs long-term/fixed (isLongTerm=true).
  // Kas & Bank shown as a single summarized line, detail schedule provided below.
  const cashBankRows = assetRows.filter((r) => isCashBankCode(r.code) && r.balance !== 0);
  const cashBankTotal = assetRows
    .filter((r) => isCashBankCode(r.code))
    .reduce((sum, r) => sum + r.balance, 0);

  const otherCurrentAssetRows = assetRows.filter(
    (r) => !isCashBankCode(r.code) && !r.isLongTerm && r.balance !== 0
  );
  const longTermAssetRows = assetRows.filter((r) => r.isLongTerm && r.balance !== 0);

  const totalCurrentAssets =
    cashBankTotal + sumBalance(otherCurrentAssetRows);
  const totalLongTermAssets = sumBalance(longTermAssetRows);

  // Liabilities: current vs long-term.
  const liabilityRows = trialBalance.rows.filter(
    (r) => r.type === AccountType.LIABILITY && r.balance !== 0
  );
  const currentLiabilityRows = liabilityRows.filter((r) => !r.isLongTerm);
  const longTermLiabilityRows = liabilityRows.filter((r) => r.isLongTerm);
  const totalCurrentLiabilities = sumBalance(currentLiabilityRows);
  const totalLongTermLiabilities = sumBalance(longTermLiabilityRows);

  // No year-end closing entries in v1: current-period earnings are shown live
  // as an equity line so Assets = Liabilities + Equity always holds.
  const earliestEntry = await prisma.journalEntry.findFirst({ orderBy: { date: "asc" } });
  const startDate = earliestEntry?.date ?? asOfDate;
  const incomeStatement = await getIncomeStatement(startDate, asOfDate);

  const totalEquityAccounts = sumBalance(equityRows);
  const currentEarnings = incomeStatement.netIncome;
  const totalEquity = totalEquityAccounts + currentEarnings;

  // Detail schedules: receivables per customer, payables per supplier.
  const [receivablesRaw, payablesDetail] = await Promise.all([
    getReceivablesByCustomer(),
    getPayablesBySupplier(),
  ]);

  // Reclassify customer credit balances (overpayments / advances) out of AR.
  // A customer whose receipts exceed their invoices is money we owe them — an
  // advance — so it belongs in liabilities as "Uang Muka Pelanggan", not netted
  // against receivables as a negative AR (which hides it from the balance sheet).
  const receivablesDetail = receivablesRaw.filter((c) => c.amount > 0);
  const advancesDetail = receivablesRaw
    .filter((c) => c.amount < 0)
    .map((c) => ({ id: c.id, name: c.name, amount: -c.amount }));
  const customerAdvances = advancesDetail.reduce((s, a) => s + a.amount, 0);

  let customerAdvanceRows: TrialBalanceRow[] = [];
  if (customerAdvances > 0.005) {
    // Gross the AR asset back up by the advance amount so receivables are shown
    // at their true (positive) value, with the advance moved to liabilities.
    const arRow = otherCurrentAssetRows.find((r) => r.code === AR_ACCOUNT_CODE);
    if (arRow) {
      arRow.balance += customerAdvances;
    } else {
      const grossed: TrialBalanceRow = {
        accountId: "synthetic-ar",
        code: AR_ACCOUNT_CODE,
        name: "Piutang Usaha",
        type: AccountType.ASSET,
        isLongTerm: false,
        totalDebit: 0,
        totalCredit: 0,
        balance: customerAdvances,
      };
      otherCurrentAssetRows.push(grossed);
      assetRows.push(grossed);
    }
    customerAdvanceRows = [
      {
        accountId: "synthetic-advance",
        code: CUSTOMER_ADVANCE_CODE,
        name: "Uang Muka Pelanggan",
        type: AccountType.LIABILITY,
        isLongTerm: false,
        totalDebit: 0,
        totalCredit: 0,
        balance: customerAdvances,
      },
    ];
  }

  const currentLiabilityRowsAll = [...currentLiabilityRows, ...customerAdvanceRows];

  // Recompute totals after the reclassification (assets and liabilities both
  // rise by the advance amount, so the sheet stays balanced).
  const totalCurrentAssetsAdj = cashBankTotal + sumBalance(otherCurrentAssetRows);
  const totalAssets = sumBalance(assetRows);
  const totalCurrentLiabilitiesAdj = sumBalance(currentLiabilityRowsAll);
  const totalLiabilities = sumBalance(liabilityRows) + customerAdvances;

  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

  return {
    cashBankRows,
    cashBankTotal,
    otherCurrentAssetRows,
    longTermAssetRows,
    totalCurrentAssets: totalCurrentAssetsAdj,
    totalLongTermAssets,
    currentLiabilityRows: currentLiabilityRowsAll,
    longTermLiabilityRows,
    totalCurrentLiabilities: totalCurrentLiabilitiesAdj,
    totalLongTermLiabilities,
    equityRows,
    currentEarnings,
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced,
    receivablesDetail,
    advancesDetail,
    customerAdvances,
    payablesDetail,
  };
}

// Detail schedules for the balance sheet supporting notes.
async function getReceivablesByCustomer() {
  const { listCustomersWithReceivables } = await import(
    "@/server/services/balances.service"
  );
  const rows = await listCustomersWithReceivables();
  return rows
    .filter((c) => c.receivable !== 0)
    .map((c) => ({ id: c.id, name: c.name, amount: c.receivable }))
    .sort((a, b) => b.amount - a.amount);
}

async function getPayablesBySupplier() {
  const { listSuppliersWithPayables } = await import(
    "@/server/services/balances.service"
  );
  const rows = await listSuppliersWithPayables();
  return rows
    .filter((s) => s.payable !== 0)
    .map((s) => ({ id: s.id, name: s.name, amount: s.payable }))
    .sort((a, b) => b.amount - a.amount);
}

// Direct-method cash flow: every journal line touching a Kas/Bank (10xx)
// account, bucketed by what kind of transaction moved the cash.
export async function getCashFlow(startDate: Date, endDate: Date) {
  const cashLines = await prisma.journalLine.findMany({
    where: { account: { type: AccountType.ASSET, code: { startsWith: "10" } } },
    include: { journalEntry: true },
  });

  let openingBalance = 0;
  const buckets = {
    salesReceipts: 0, // cash sales (SALE_REVENUE hitting cash)
    customerReceipts: 0, // pelunasan piutang in
    supplierPayments: 0, // pelunasan hutang out
    purchasePayments: 0, // cash purchases out
    expensePayments: 0, // biaya out
    otherMovements: 0, // manual journal entries touching cash
  };

  for (const line of cashLines) {
    const net = Number(line.debit) - Number(line.credit);
    const date = line.journalEntry.date;

    if (date < startDate) {
      openingBalance += net;
      continue;
    }
    if (date > endDate) continue;

    switch (line.journalEntry.sourceType) {
      case "SALE_REVENUE":
        buckets.salesReceipts += net;
        break;
      case "PAYMENT":
        if (net >= 0) buckets.customerReceipts += net;
        else buckets.supplierPayments += net;
        break;
      case "PURCHASE":
        buckets.purchasePayments += net;
        break;
      case "EXPENSE":
        buckets.expensePayments += net;
        break;
      default:
        buckets.otherMovements += net;
    }
  }

  const netOperating =
    buckets.salesReceipts +
    buckets.customerReceipts +
    buckets.supplierPayments +
    buckets.purchasePayments +
    buckets.expensePayments;
  const netChange = netOperating + buckets.otherMovements;
  const closingBalance = openingBalance + netChange;

  // Closing balance per rekening for the supporting schedule.
  const accounts = await prisma.account.findMany({
    where: { type: AccountType.ASSET, code: { startsWith: "10" } },
    orderBy: { code: "asc" },
    include: {
      journalLines: { where: { journalEntry: { date: { lte: endDate } } } },
    },
  });
  const closingByAccount = accounts
    .map((a) => ({
      code: a.code,
      name: a.name,
      balance: a.journalLines.reduce(
        (sum, l) => sum + Number(l.debit) - Number(l.credit),
        0
      ),
    }))
    .filter((a) => a.balance !== 0);

  return {
    openingBalance,
    ...buckets,
    netOperating,
    netChange,
    closingBalance,
    closingByAccount,
  };
}
