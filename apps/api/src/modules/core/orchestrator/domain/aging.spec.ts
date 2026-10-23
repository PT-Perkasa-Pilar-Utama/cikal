import { describe, expect, it } from "vitest";
import { calendarDayAging } from "./aging.js";

describe("calendar day aging", () => {
  it("counts calendar dates, not elapsed hours (AC-85.04)", () => {
    // 20-10-2026 16:00 sampai 22-10-2026 09:00 WIB.
    expect(calendarDayAging(new Date("2026-10-20T09:00:00Z"), new Date("2026-10-22T02:00:00Z"))).toBe("2");
  });

  it("uses the Jakarta business date across UTC midnight", () => {
    // 20-10-2026 23:30 WIB dan 21-10-2026 06:30 WIB berbeda satu tanggal bisnis.
    expect(calendarDayAging(new Date("2026-10-20T16:30:00Z"), new Date("2026-10-20T23:30:00Z"))).toBe("1");
  });
});
