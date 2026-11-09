"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { purchaseSchema, type PurchaseInput } from "@/lib/validation/purchase";
import { recordPurchase } from "@/server/services/purchases.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function recordPurchaseAction(input: PurchaseInput) {
  const user = await requireUser();
  const parsed = purchaseSchema.parse(input);

  const purchase = await recordPurchase({
    date: parsed.date,
    dueDate: parsed.dueDate,
    supplierId: parsed.supplierId,
    paymentAccountId: parsed.paymentAccountId,
    reference: parsed.reference,
    createdById: user.id,
    lines: parsed.lines,
  });

  revalidatePath("/purchases");
  revalidatePath("/products");
  revalidatePath("/journal-entries");
  return { id: purchase.id };
}
