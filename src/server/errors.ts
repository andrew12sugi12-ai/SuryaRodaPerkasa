export class UnbalancedEntryError extends Error {
  constructor(totalDebit: number, totalCredit: number) {
    super(`Journal entry does not balance: debits ${totalDebit} vs credits ${totalCredit}`);
    this.name = "UnbalancedEntryError";
  }
}

export class InsufficientStockError extends Error {
  constructor(productName: string, available: number, requested: number) {
    super(
      `Insufficient stock for ${productName}: ${available} on hand, ${requested} requested`
    );
    this.name = "InsufficientStockError";
  }
}

// Raised when a credit sale would breach a toko's credit controls (cash-only,
// over credit limit, or outstanding overdue bills) and no override was given.
export class CreditLimitError extends Error {
  reasons: string[];
  constructor(reasons: string[]) {
    super(`Credit check failed: ${reasons.join(", ")}`);
    this.name = "CreditLimitError";
    this.reasons = reasons;
  }
}
