"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { expenseSchema, type ExpenseInput } from "@/lib/validation/expense";
import { recordExpense } from "@/server/services/expenses.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function recordExpenseAction(input: ExpenseInput) {
  const user = await requireUser();
  const parsed = expenseSchema.parse(input);
  await recordExpense({ ...parsed, createdById: user.id });
  revalidatePath("/expenses");
  revalidatePath("/journal-entries");
  revalidatePath("/dashboard");
}
