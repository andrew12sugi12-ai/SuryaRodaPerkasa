import { z } from "zod";

export const EXPENSE_CATEGORIES = ["OPERATIONAL", "FIXED", "SALES", "OTHER"] as const;

export const expenseSchema = z.object({
  date: z.date(),
  description: z.string().min(1, "Description is required").max(300),
  amount: z.number().positive("Amount must be greater than zero"),
  category: z.enum(EXPENSE_CATEGORIES),
  paidFromAccountId: z.string().min(1, "Account is required"),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
