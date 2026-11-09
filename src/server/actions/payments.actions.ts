"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { paymentSchema, type PaymentInput } from "@/lib/validation/payment";
import {
  recordPayment,
  clearGiroPayment,
  bounceGiroPayment,
} from "@/server/services/payments.service";

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

function revalidatePayments() {
  revalidatePath("/payments");
  revalidatePath("/customers");
  revalidatePath("/journal-entries");
  revalidatePath("/dashboard");
}

export async function clearGiroPaymentAction(id: string) {
  const user = await requireUser();
  await clearGiroPayment(id, user.id);
  revalidatePayments();
}

export async function bounceGiroPaymentAction(id: string, reason: string) {
  const user = await requireUser();
  await bounceGiroPayment(id, reason, user.id);
  revalidatePayments();
}

export async function uploadPaymentAttachmentAction(formData: FormData) {
  await requireUser();
  const { default: path } = await import("path");
  const fs = await import("fs/promises");
  const { PAYMENTS_DIR, ALLOWED_TYPES, MAX_BYTES, ensureDir } = await import("@/lib/uploads");
  const { prisma } = await import("@/lib/prisma");

  const paymentId = String(formData.get("paymentId") ?? "");
  const file = formData.get("file");
  if (!paymentId || !(file instanceof File)) throw new Error("No file provided");
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Only JPG, PNG, WEBP or PDF allowed");
  if (file.size > MAX_BYTES) throw new Error("File must be 5MB or smaller");

  await ensureDir(PAYMENTS_DIR);
  const ext = (path.extname(file.name) || "").slice(0, 10);
  const stored = `${paymentId}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(PAYMENTS_DIR, stored), buffer);

  await prisma.payment.update({
    where: { id: paymentId },
    data: { attachmentPath: stored, attachmentName: file.name, attachmentType: file.type },
  });
  revalidatePath("/payments");
}
