"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { customerSchema, type CustomerInput } from "@/lib/validation/customer";
import * as customersService from "@/server/services/customers.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function createCustomerAction(input: CustomerInput) {
  const user = await requireUser();
  const parsed = customerSchema.parse(input);
  const customer = await customersService.createCustomer(parsed, user.id);
  revalidatePath("/customers");
  return customer;
}

export async function updateCustomerAction(id: string, input: CustomerInput) {
  await requireUser();
  const parsed = customerSchema.parse(input);
  const customer = await customersService.updateCustomer(id, parsed);
  revalidatePath("/customers");
  return customer;
}
