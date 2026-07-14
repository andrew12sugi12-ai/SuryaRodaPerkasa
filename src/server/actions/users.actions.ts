"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createUserSchema, type CreateUserInput } from "@/lib/validation/user";
import * as usersService from "@/server/services/users.service";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Only admins can manage users");
  }
  return session.user;
}

export async function createUserAction(input: CreateUserInput) {
  await requireAdmin();
  const parsed = createUserSchema.parse(input);
  await usersService.createUser(parsed);
  revalidatePath("/users");
}
