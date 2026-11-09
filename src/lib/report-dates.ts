// Report date defaults are computed in Asia/Jakarta (WIB) so they match the
// user's calendar regardless of the server's timezone. Using
// `new Date().toISOString()` here would return the UTC date, which resolves to
// "yesterday" during WIB early-morning hours and on UTC-hosted servers
// (e.g. Railway) — making same-day entries look missing in reports.
const TZ = "Asia/Jakarta";

// Today's calendar date in WIB, as YYYY-MM-DD.
export function reportToday(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

// First day of the current WIB month, as YYYY-MM-DD.
export function reportFirstOfMonth(): string {
  return `${reportToday().slice(0, 7)}-01`;
}

// Current WIB year and 0-indexed month, for building month ranges.
export function reportYearMonth(): { year: number; month: number } {
  const [y, m] = reportToday().split("-").map(Number);
  return { year: y, month: m - 1 };
}

// Format a locally-constructed Date as YYYY-MM-DD from its own calendar
// components (timezone-independent — never round-trips through UTC).
export function isoFromLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
