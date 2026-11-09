"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  startTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
} from "@/server/services/twofactor.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function startTwoFactorAction() {
  const user = await requireUser();
  return startTwoFactor(user.id);
}

export async function confirmTwoFactorAction(token: string) {
  const user = await requireUser();
  await confirmTwoFactor(user.id, token);
  revalidatePath("/security");
}

export async function disableTwoFactorAction(token: string) {
  const user = await requireUser();
  await disableTwoFactor(user.id, token);
  revalidatePath("/security");
}
