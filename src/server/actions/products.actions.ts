"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { productSchema, type ProductInput } from "@/lib/validation/product";
import * as productsService from "@/server/services/products.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function createProductAction(input: ProductInput) {
  const user = await requireUser();
  const parsed = productSchema.parse(input);
  const product = await productsService.createProduct(parsed, user.id);
  revalidatePath("/products");
  revalidatePath("/journal-entries");
  return { id: product.id };
}

export async function updateProductAction(id: string, input: ProductInput) {
  await requireUser();
  const parsed = productSchema.parse(input);
  const product = await productsService.updateProduct(id, parsed);
  revalidatePath("/products");
  return { id: product.id };
}

export async function deleteProductAction(id: string) {
  await requireUser();
  await productsService.deleteProduct(id);
  revalidatePath("/products");
  revalidatePath("/journal-entries");
  return { ok: true };
}
