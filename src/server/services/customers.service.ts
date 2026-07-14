import { prisma } from "@/lib/prisma";
import type { CustomerInput } from "@/lib/validation/customer";

export async function listCustomers() {
  return prisma.customer.findMany({ orderBy: { name: "asc" } });
}

export async function listActiveCustomers() {
  return prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({ where: { id } });
}

export async function createCustomer(input: CustomerInput) {
  return prisma.customer.create({ data: input });
}

export async function updateCustomer(id: string, input: CustomerInput) {
  return prisma.customer.update({ where: { id }, data: input });
}
