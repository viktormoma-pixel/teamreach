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
