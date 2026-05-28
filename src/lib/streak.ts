// Date helpers for streak ("check off days") challenges. All dates are ISO
// YYYY-MM-DD in the user's local timezone so a "day" matches the calendar.

const pad = (n: number) => String(n).padStart(2, "0");

export const toISO = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = (): string => toISO(new Date());

/** ISO date `back` days before today (back=0 → today). */
export const isoDaysAgo = (back: number): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - back);
  return toISO(d);
};

/** Last `n` calendar days, oldest → newest, including today. */
export const lastNDays = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => isoDaysAgo(n - 1 - i));

/** Hard cap on a streak window so a far-future deadline can't freeze the grid. */
export const MAX_STREAK_DAYS = 366;

/**
 * Inclusive list of ISO days from `startISO` to `endISO` (oldest → newest).
 * Returns [] when either date is unparseable or start is after end. Capped at
 * MAX_STREAK_DAYS.
 */
export const daysBetween = (startISO: string, endISO: string): string[] => {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (start > end) return [];
  const out: string[] = [];
  const d = new Date(start);
  while (d <= end && out.length < MAX_STREAK_DAYS) {
    out.push(toISO(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
};

/**
 * Length of the current consecutive streak ending today (or yesterday — a
 * streak isn't broken until a whole day is missed). Returns 0 if neither
 * today nor yesterday is checked.
 */
export const currentStreak = (checkedDays: string[] = []): number => {
  const set = new Set(checkedDays);
  let start = 0;
  if (!set.has(isoDaysAgo(0))) {
    if (!set.has(isoDaysAgo(1))) return 0;
    start = 1;
  }
  let count = 0;
  for (let back = start; ; back++) {
    if (set.has(isoDaysAgo(back))) count++;
    else break;
  }
  return count;
};
