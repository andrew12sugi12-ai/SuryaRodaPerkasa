"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { salesReturnSchema, type SalesReturnFormInput } from "@/lib/validation/sales-return";
import { recordSalesReturn } from "@/server/services/sales-return.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function recordSalesReturnAction(input: SalesReturnFormInput) {
  const user = await requireUser();
  const parsed = salesReturnSchema.parse(input);
  const result = await recordSalesReturn({
    ...parsed,
    lines: parsed.lines.filter((l) => l.quantity > 0),
    createdById: user.id,
  });
  revalidatePath("/returns");
  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/customers");
  revalidatePath("/journal-entries");
  return { id: result.id };
}
