"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { accountSchema, type AccountInput } from "@/lib/validation/account";
import * as accountsService from "@/server/services/accounts.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function createAccountAction(input: AccountInput) {
  await requireUser();
  const parsed = accountSchema.parse(input);
  const account = await accountsService.createAccount(parsed);
  revalidatePath("/accounts");
  return account;
}

export async function updateAccountAction(id: string, input: AccountInput) {
  await requireUser();
  const parsed = accountSchema.parse(input);
  const account = await accountsService.updateAccount(id, parsed);
  revalidatePath("/accounts");
  return account;
}
