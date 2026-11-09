"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { saleSchema, type SaleInput } from "@/lib/validation/sale";
import { recordSale } from "@/server/services/sales.service";
import { assertCreditOk } from "@/server/services/credit.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function recordSaleAction(
  input: SaleInput,
  options?: { override?: boolean }
) {
  const user = await requireUser();
  const parsed = saleSchema.parse(input);

  // Credit control: block credit sales that breach the toko's limits unless the
  // user has acknowledged the warning (override).
  const saleTotal = parsed.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  await assertCreditOk(parsed.customerId, parsed.paymentAccountId, saleTotal, options?.override);

  const sale = await recordSale({
    date: parsed.date,
    dueDate: parsed.dueDate,
    customerId: parsed.customerId,
    salesmanId: parsed.salesmanId,
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
