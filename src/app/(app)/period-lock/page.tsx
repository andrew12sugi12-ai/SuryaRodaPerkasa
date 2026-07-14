import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDict } from "@/lib/i18n/server";
import { getLockedThrough } from "@/server/services/period.service";
import { PeriodLockForm } from "@/components/admin/period-lock-form";

export default async function PeriodLockPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const dict = await getDict();
  const lockedThrough = await getLockedThrough();
  const isMeaningfulLock = lockedThrough && lockedThrough.getFullYear() > 1971;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.admin.periodLock}</h1>
      <p className="text-sm text-muted-foreground">
        {isMeaningfulLock
          ? `${dict.admin.currentlyLocked}: ${lockedThrough.toLocaleDateString("id-ID")}`
          : dict.admin.notLocked}
      </p>
      <PeriodLockForm
        currentLock={isMeaningfulLock ? lockedThrough.toISOString().slice(0, 10) : null}
      />
    </div>
  );
}
