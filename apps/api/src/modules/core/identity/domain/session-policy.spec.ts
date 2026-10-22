import { describe, expect, it } from "vitest";
import { isSessionExpired } from "./session-policy.js";

const now = new Date("2026-10-26T08:00:00Z");
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
const later = new Date("2026-10-26T12:00:00Z");

describe("isSessionExpired (api-specs 02 §2.1)", () => {
  it("keeps a session idle for 29 minutes active (AC-06.04)", () => {
    expect(isSessionExpired({ lastActivityAt: minutesAgo(29), expiresAt: later }, now)).toBe(false);
  });

  it("expires a session idle for 30 minutes (AC-06.03)", () => {
    expect(isSessionExpired({ lastActivityAt: minutesAgo(30), expiresAt: later }, now)).toBe(true);
  });

  it("expires an active session at its absolute limit", () => {
    expect(isSessionExpired({ lastActivityAt: minutesAgo(1), expiresAt: now }, now)).toBe(true);
  });
});
