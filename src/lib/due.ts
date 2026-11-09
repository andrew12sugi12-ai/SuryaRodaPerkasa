// Whole-days until a date (negative = past/overdue). Plain util so both
// server components and client components can import it.
export function daysUntil(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.round((date.getTime() - Date.now()) / 86_400_000);
}
