"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  deleteSale,
  deletePurchase,
  deletePayment,
  deleteJournalEntry,
  deleteAccount,
  deleteCustomer,
  deleteSupplier,
} from "@/server/services/deletions.service";
import { updateSale } from "@/server/services/sales.service";
import { updatePurchase } from "@/server/services/purchases.service";
import { updateJournalEntry } from "@/server/services/journal.service";
import { saleSchema, type SaleInput } from "@/lib/validation/sale";
import { purchaseSchema, type PurchaseInput } from "@/lib/validation/purchase";
import { journalEntrySchema, type JournalEntryInput } from "@/lib/validation/journal";
import { setLockedThrough } from "@/server/services/period.service";
import { updateUser, resetUserPassword } from "@/server/services/users.service";
import { adjustStock } from "@/server/services/products.service";
import { resetAllData } from "@/server/services/reset.service";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Admin access required");
  }
  return session.user;
}

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

function revalidateAll() {
  for (const path of [
    "/dashboard",
    "/journal-entries",
    "/sales",
    "/purchases",
    "/expenses",
    "/payments",
    "/products",
    "/customers",
    "/suppliers",
    "/audit-log",
  ]) {
    revalidatePath(path);
  }
}

// Sales & purchases: edit + delete available to all authenticated users.
export async function deleteSaleAction(id: string) {
  const user = await requireUser();
  await deleteSale(id, user.id);
  revalidateAll();
}

export async function deletePurchaseAction(id: string) {
  const user = await requireUser();
  await deletePurchase(id, user.id);
  revalidateAll();
}

export async function updateSaleAction(id: string, input: SaleInput) {
  const user = await requireUser();
  const parsed = saleSchema.parse(input);
  await updateSale(id, {
    date: parsed.date,
    customerId: parsed.customerId,
    paymentAccountId: parsed.paymentAccountId,
    reference: parsed.reference,
    createdById: user.id,
    lines: parsed.lines,
  });
  revalidateAll();
  return { id };
}

export async function updatePurchaseAction(id: string, input: PurchaseInput) {
  const user = await requireUser();
  const parsed = purchaseSchema.parse(input);
  await updatePurchase(id, {
    date: parsed.date,
    supplierId: parsed.supplierId,
    paymentAccountId: parsed.paymentAccountId,
    reference: parsed.reference,
    createdById: user.id,
    lines: parsed.lines,
  });
  revalidateAll();
  return { id };
}

// Payments delete: admin only (kept from before).
export async function deletePaymentAction(id: string) {
  const admin = await requireAdmin();
  await deletePayment(id, admin.id);
  revalidateAll();
}

// Journal entries: edit for everyone, delete admin-only.
export async function updateJournalEntryAction(id: string, input: JournalEntryInput) {
  const user = await requireUser();
  const parsed = journalEntrySchema.parse(input);
  await updateJournalEntry(id, {
    date: parsed.date,
    memo: parsed.memo,
    reference: parsed.reference,
    createdById: user.id,
    lines: parsed.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
    })),
  });
  revalidateAll();
  return { id };
}

export async function deleteJournalEntryAction(id: string) {
  const admin = await requireAdmin();
  await deleteJournalEntry(id, admin.id);
  revalidateAll();
}

// Master data deletes: admin only.
export async function deleteAccountAction(id: string) {
  const admin = await requireAdmin();
  await deleteAccount(id, admin.id);
  revalidatePath("/accounts");
  revalidatePath("/audit-log");
}

export async function deleteCustomerAction(id: string) {
  const admin = await requireAdmin();
  await deleteCustomer(id, admin.id);
  revalidatePath("/customers");
  revalidatePath("/audit-log");
}

export async function deleteSupplierAction(id: string) {
  const admin = await requireAdmin();
  await deleteSupplier(id, admin.id);
  revalidatePath("/suppliers");
  revalidatePath("/audit-log");
}

export async function setPeriodLockAction(dateISO: string | null) {
  const admin = await requireAdmin();
  await setLockedThrough(dateISO ? new Date(`${dateISO}T23:59:59`) : null, admin.id);
  revalidatePath("/period-lock");
  revalidatePath("/audit-log");
}

const updateUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(["ADMIN", "BOOKKEEPER"]),
  isActive: z.boolean(),
});

export async function updateUserAction(
  id: string,
  input: z.infer<typeof updateUserSchema>
) {
  const admin = await requireAdmin();
  await updateUser(id, updateUserSchema.parse(input), admin.id);
  revalidatePath("/users");
}

export async function resetPasswordAction(id: string, newPassword: string) {
  await requireAdmin();
  if (newPassword.length < 10) {
    throw new Error("Password must be at least 10 characters");
  }
  await resetUserPassword(id, newPassword);
}

const adjustStockSchema = z.object({
  productId: z.string().min(1),
  actualQuantity: z.number().min(0),
  reason: z.string().min(1, "Reason is required").max(200),
});

export async function adjustStockAction(input: z.infer<typeof adjustStockSchema>) {
  const user = await requireUser();
  const parsed = adjustStockSchema.parse(input);
  await adjustStock({ ...parsed, createdById: user.id });
  revalidatePath("/products");
  revalidatePath("/journal-entries");
  revalidatePath("/dashboard");
}

// Admin-only. Requires the user to type the exact confirmation phrase "RESET".
export async function resetDataAction(confirmation: string) {
  const admin = await requireAdmin();
  if (confirmation !== "RESET") {
    throw new Error('Type RESET to confirm.');
  }
  await resetAllData(admin.id);
  revalidateAll();
}
