import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import type { SalesmanInput } from "@/lib/validation/salesman";

export async function listSalesmen() {
  return prisma.salesman.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { customers: true } } },
  });
}

export async function listActiveSalesmen() {
  return prisma.salesman.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getSalesman(id: string) {
  return prisma.salesman.findUnique({ where: { id } });
}

export async function createSalesman(input: SalesmanInput) {
  return prisma.salesman.create({
    data: {
      name: input.name,
      phone: input.phone || null,
      monthlyTarget: new Prisma.Decimal(input.monthlyTarget ?? 0),
      isActive: input.isActive,
    },
  });
}

export async function updateSalesman(id: string, input: SalesmanInput) {
  return prisma.salesman.update({
    where: { id },
    data: {
      name: input.name,
      phone: input.phone || null,
      monthlyTarget: new Prisma.Decimal(input.monthlyTarget ?? 0),
      isActive: input.isActive,
    },
  });
}

export async function deleteSalesman(id: string) {
  // Detach any toko still pointing at this salesman, then remove the record.
  await prisma.$transaction([
    prisma.customer.updateMany({ where: { salesmanId: id }, data: { salesmanId: null } }),
    prisma.salesman.delete({ where: { id } }),
  ]);
}
