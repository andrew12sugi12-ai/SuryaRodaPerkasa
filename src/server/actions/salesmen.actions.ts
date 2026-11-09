"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { salesmanSchema, type SalesmanInput } from "@/lib/validation/salesman";
import * as salesmenService from "@/server/services/salesmen.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Admin access required");
  return user;
}

export async function createSalesmanAction(input: SalesmanInput) {
  await requireUser();
  const parsed = salesmanSchema.parse(input);
  const salesman = await salesmenService.createSalesman(parsed);
  revalidatePath("/salesmen");
  return salesman;
}

export async function updateSalesmanAction(id: string, input: SalesmanInput) {
  await requireUser();
  const parsed = salesmanSchema.parse(input);
  const salesman = await salesmenService.updateSalesman(id, parsed);
  revalidatePath("/salesmen");
  return salesman;
}

export async function deleteSalesmanAction(id: string) {
  await requireAdmin();
  await salesmenService.deleteSalesman(id);
  revalidatePath("/salesmen");
}
