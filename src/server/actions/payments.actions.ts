"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { paymentSchema, type PaymentInput } from "@/lib/validation/payment";
import { recordPayment } from "@/server/services/payments.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function recordPaymentAction(input: PaymentInput) {
  const user = await requireUser();
  const parsed = paymentSchema.parse(input);
  const payment = await recordPayment({ ...parsed, createdById: user.id });
  revalidatePath("/payments");
  revalidatePath("/customers");
  revalidatePath("/suppliers");
  revalidatePath("/journal-entries");
  revalidatePath("/dashboard");
  return { id: payment.id };
}
