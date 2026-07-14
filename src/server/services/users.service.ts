import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import type { CreateUserInput } from "@/lib/validation/user";

export async function listUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: "asc" } });
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
    },
  });
}

export async function updateUser(
  id: string,
  input: { name: string; email: string; role: "ADMIN" | "BOOKKEEPER"; isActive: boolean },
  actingAdminId: string
) {
  if (id === actingAdminId && (input.role !== "ADMIN" || !input.isActive)) {
    throw new Error("You cannot demote or deactivate your own account");
  }
  const existing = await prisma.user.findFirst({
    where: { email: input.email, NOT: { id } },
  });
  if (existing) throw new Error("A user with this email already exists");

  return prisma.user.update({ where: { id }, data: input });
}

export async function resetUserPassword(id: string, newPassword: string) {
  return prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
}
