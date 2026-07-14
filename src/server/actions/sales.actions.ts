"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { saleSchema, type SaleInput } from "@/lib/validation/sale";
import { recordSale } from "@/server/services/sales.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function recordSaleAction(input: SaleInput) {
  const user = await requireUser();
  const parsed = saleSchema.parse(input);

  const sale = await recordSale({
    date: parsed.date,
    customerId: parsed.customerId,
    paymentAccountId: parsed.paymentAccountId,
    reference: parsed.reference,
    createdById: user.id,
    lines: parsed.lines,
  });

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/journal-entries");
  return { id: sale.id };
}
