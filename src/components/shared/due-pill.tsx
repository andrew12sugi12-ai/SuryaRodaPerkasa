"use client";

import { useI18n } from "@/components/i18n-provider";

// Color-coded days-to-due pill. days < 0 = overdue (red), 0 = today (amber),
// 1–7 = due soon (amber), else later (green/neutral).
export function DuePill({ days }: { days: number | null }) {
  const { dict } = useI18n();
  const t = dict.dashboard;
  if (days === null) return <span className="text-xs text-muted-foreground">—</span>;

  let cls = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  let text = t.dueIn.replace("{n}", String(days));
  if (days < 0) {
    cls = "bg-red-500/10 text-red-600 dark:text-red-400";
    text = t.overdueBy.replace("{n}", String(Math.abs(days)));
  } else if (days === 0) {
    cls = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    text = t.dueToday;
  } else if (days <= 7) {
    cls = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{text}</span>;
}
