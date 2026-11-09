"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { landedCostSchema, type LandedCostFormInput } from "@/lib/validation/landed-cost";
import { recordLandedCost, previewLandedCost } from "@/server/services/landed-cost.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function previewLandedCostAction(input: {
  purchaseId: string;
  selectedLineIds: string[];
  totalCost: number;
}) {
  await requireUser();
  return previewLandedCost(input);
}

export async function recordLandedCostAction(input: LandedCostFormInput) {
  const user = await requireUser();
  const parsed = landedCostSchema.parse(input);
  const result = await recordLandedCost({ ...parsed, createdById: user.id });
  revalidatePath("/products");
  revalidatePath("/purchases");
  revalidatePath(`/purchases/${parsed.purchaseId}`);
  revalidatePath("/journal-entries");
  revalidatePath("/reports/inventory");
  return result;
}
