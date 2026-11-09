"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { supplierSchema, type SupplierInput } from "@/lib/validation/supplier";
import * as suppliersService from "@/server/services/suppliers.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function createSupplierAction(input: SupplierInput) {
  const user = await requireUser();
  const parsed = supplierSchema.parse(input);
  const supplier = await suppliersService.createSupplier(parsed, user.id);
  revalidatePath("/suppliers");
  return supplier;
}

export async function updateSupplierAction(id: string, input: SupplierInput) {
  await requireUser();
  const parsed = supplierSchema.parse(input);
  const supplier = await suppliersService.updateSupplier(id, parsed);
  revalidatePath("/suppliers");
  return supplier;
}
