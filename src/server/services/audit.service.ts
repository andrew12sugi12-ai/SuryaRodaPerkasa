import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;

export async function logAudit(
  action: string,
  detail: unknown,
  userId: string,
  db: DbClient = prisma
) {
  await db.auditLog.create({
    data: {
      action,
      detail: typeof detail === "string" ? detail : JSON.stringify(detail),
      userId,
    },
  });
}

export async function listAuditLogs(limit = 200) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: true },
  });
}
