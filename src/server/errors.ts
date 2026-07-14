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
