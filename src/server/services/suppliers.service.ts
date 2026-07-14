import { prisma } from "@/lib/prisma";
import type { SupplierInput } from "@/lib/validation/supplier";

export async function listSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function listActiveSuppliers() {
  return prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getSupplier(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}

export async function createSupplier(input: SupplierInput) {
  return prisma.supplier.create({ data: input });
}

export async function updateSupplier(id: string, input: SupplierInput) {
  return prisma.supplier.update({ where: { id }, data: input });
}
