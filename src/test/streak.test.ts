import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  toISO,
  todayISO,
  isoDaysAgo,
  lastNDays,
  daysBetween,
  currentStreak,
  MAX_STREAK_DAYS,
} from "@/lib/streak";

// All helpers derive "today" from new Date() in local time. Pin the clock so
// the assertions are deterministic regardless of when the suite runs.
const fixedNow = new Date(2026, 4, 27, 15, 30, 0); // 2026-05-27 local

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(fixedNow);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("toISO", () => {
  it("formats a date as local YYYY-MM-DD", () => {
    expect(toISO(new Date(2026, 4, 27))).toBe("2026-05-27");
  });

  it("zero-pads single-digit month and day", () => {
    expect(toISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("uses local calendar fields, not UTC", () => {
    // Late evening local time should still report the local calendar day.
    expect(toISO(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });
});

describe("todayISO", () => {
  it("returns the pinned current day", () => {
    expect(todayISO()).toBe("2026-05-27");
  });
});

describe("isoDaysAgo", () => {
  it("returns today for back=0", () => {
    expect(isoDaysAgo(0)).toBe("2026-05-27");
  });

  it("returns yesterday for back=1", () => {
    expect(isoDaysAgo(1)).toBe("2026-05-26");
  });

  it("crosses month boundaries", () => {
    expect(isoDaysAgo(27)).toBe("2026-04-30");
  });
});

describe("lastNDays", () => {
  it("returns n days oldest → newest including today", () => {
    expect(lastNDays(3)).toEqual(["2026-05-25", "2026-05-26", "2026-05-27"]);
  });

  it("returns just today for n=1", () => {
    expect(lastNDays(1)).toEqual(["2026-05-27"]);
  });

  it("returns an empty array for n=0", () => {
    expect(lastNDays(0)).toEqual([]);
  });
});

describe("daysBetween", () => {
  it("returns an inclusive range oldest → newest", () => {
    expect(daysBetween("2026-05-25", "2026-05-28")).toEqual([
      "2026-05-25",
      "2026-05-26",
      "2026-05-27",
      "2026-05-28",
    ]);
  });

  it("returns a single day when start equals end", () => {
    expect(daysBetween("2026-05-27", "2026-05-27")).toEqual(["2026-05-27"]);
  });

  it("returns [] when start is after end", () => {
    expect(daysBetween("2026-05-28", "2026-05-27")).toEqual([]);
  });

  it("crosses month boundaries", () => {
    expect(daysBetween("2026-04-29", "2026-05-02")).toEqual([
      "2026-04-29",
      "2026-04-30",
      "2026-05-01",
      "2026-05-02",
    ]);
  });

  it("is independent of today (not relative to the clock)", () => {
    // Window entirely in the past relative to the pinned 2026-05-27 now.
    expect(daysBetween("2026-01-01", "2026-01-03")).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
  });

  it("returns [] for unparseable input", () => {
    expect(daysBetween("nope", "2026-05-27")).toEqual([]);
    expect(daysBetween("2026-05-27", "")).toEqual([]);
  });

  it("caps absurdly long ranges at MAX_STREAK_DAYS", () => {
    const days = daysBetween("2026-01-01", "2030-01-01");
    expect(days.length).toBe(MAX_STREAK_DAYS);
    expect(days[0]).toBe("2026-01-01");
  });
});

describe("currentStreak", () => {
  it("is 0 with no checked days", () => {
    expect(currentStreak([])).toBe(0);
    expect(currentStreak()).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(currentStreak(["2026-05-25", "2026-05-26", "2026-05-27"])).toBe(3);
  });

  it("counts a single check-off today", () => {
    expect(currentStreak(["2026-05-27"])).toBe(1);
  });

  it("does not break the streak until a whole day is missed (grace)", () => {
    // Today not yet checked, but yesterday + before form a live streak.
    expect(currentStreak(["2026-05-25", "2026-05-26"])).toBe(2);
  });

  it("counts a lone yesterday check-off as a streak of 1", () => {
    expect(currentStreak(["2026-05-26"])).toBe(1);
  });

  it("is 0 when neither today nor yesterday is checked", () => {
    expect(currentStreak(["2026-05-24", "2026-05-25"])).toBe(0);
  });

  it("stops at the first gap", () => {
    // 27 + 26 are consecutive; 24 is separated from them by the missing 25.
    expect(currentStreak(["2026-05-24", "2026-05-26", "2026-05-27"])).toBe(2);
  });

  it("ignores duplicate dates", () => {
    expect(currentStreak(["2026-05-27", "2026-05-27", "2026-05-26"])).toBe(2);
  });

  it("ignores future dates", () => {
    expect(currentStreak(["2026-05-28", "2026-05-27"])).toBe(1);
  });

  it("is unaffected by the order of input", () => {
    expect(currentStreak(["2026-05-27", "2026-05-25", "2026-05-26"])).toBe(3);
  });
});
