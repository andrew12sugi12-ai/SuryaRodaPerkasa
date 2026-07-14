import { z } from "zod";

export const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const;
export const NORMAL_BALANCES = ["DEBIT", "CREDIT"] as const;
export const ACCOUNT_EXPENSE_CATEGORIES = [
  "COGS",
  "OPERATIONAL",
  "FIXED",
  "SALES",
  "OTHER",
] as const;

export const accountSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(20, "Code must be 20 characters or fewer"),
  name: z.string().min(1, "Name is required").max(120),
  type: z.enum(ACCOUNT_TYPES),
  normalBalance: z.enum(NORMAL_BALANCES),
  expenseCategory: z.enum(ACCOUNT_EXPENSE_CATEGORIES).optional(),
  isLongTerm: z.boolean().optional(),
  isActive: z.boolean(),
});

export type AccountInput = z.infer<typeof accountSchema>;
