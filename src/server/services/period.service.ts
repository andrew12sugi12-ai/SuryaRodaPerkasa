import { prisma } from "@/lib/prisma";
import { logAudit } from "@/server/services/audit.service";

export async function getLockedThrough(): Promise<Date | null> {
  const latest = await prisma.periodLock.findFirst({
    orderBy: { createdAt: "desc" },
  });
  return latest?.lockedThrough ?? null;
}

// Throws when a non-admin tries to post into a locked period. Admins are exempt.
export async function assertPeriodOpen(date: Date, userId: string) {
  const lockedThrough = await getLockedThrough();
  if (!lockedThrough || date > lockedThrough) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.role === "ADMIN") return;

  throw new Error(
    `Books are locked through ${lockedThrough.toLocaleDateString("id-ID")}. Ask an admin to record entries in this period.`
  );
}

export async function setLockedThrough(date: Date | null, adminId: string) {
  await prisma.periodLock.create({
    data: {
      // Setting a very old date effectively unlocks everything.
      lockedThrough: date ?? new Date("1970-01-01"),
      createdById: adminId,
    },
  });
  await logAudit(
    date ? "LOCK_PERIOD" : "UNLOCK_PERIOD",
    { lockedThrough: date?.toISOString() ?? null },
    adminId
  );
}
