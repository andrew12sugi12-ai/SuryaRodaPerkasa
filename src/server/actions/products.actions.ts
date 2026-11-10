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

// Returns a structured result rather than throwing, because Next.js redacts
// thrown server-action error messages in production (the client would only ever
// see a generic error). This way the specific block reason reaches the UI.
export type DeleteProductResult =
  | { ok: true }
  | { ok: false; reason: "history" | "component" | "unknown" };

export async function deleteProductAction(id: string): Promise<DeleteProductResult> {
  await requireUser();
  try {
    await productsService.deleteProduct(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("DELETE_BLOCKED_HISTORY")) return { ok: false, reason: "history" };
    if (msg.includes("DELETE_BLOCKED_COMPONENT")) return { ok: false, reason: "component" };
    console.error("deleteProductAction failed", err);
    return { ok: false, reason: "unknown" };
  }
  revalidatePath("/products");
  revalidatePath("/journal-entries");
  return { ok: true };
}
