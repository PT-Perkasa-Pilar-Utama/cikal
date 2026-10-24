import { describe, expect, it } from "vitest";
import { seedFraudMatrixRows, seedVelocityRule } from "../seed/fraud-rules.js";
import { ipStatusOf, judgeFraud, velocityHit, windowStart } from "./fraud-rules.js";

const judge = (overrides: Partial<Parameters<typeof judgeFraud>[0]> = {}) =>
  judgeFraud({
    isBlacklisted: false,
    rules: [seedVelocityRule],
    hits: [velocityHit(seedVelocityRule, 1)],
    ipStatus: "NORMAL",
    matrix: seedFraudMatrixRows,
    ...overrides,
  });

describe("fraud rules", () => {
  it("AC-65.01 TRM_FRD_001 is High Fraud Potential for a blacklisted applicant", () => {
    expect(judge({ isBlacklisted: true, ipStatus: "VPN_PROXY" })).toEqual({
      outcome: "HIGH_FRAUD_POTENTIAL",
      matrixRow: null,
      blacklistReason: null,
    });
  });

  it("AC-65.01 TRM_FRD_002 is High Fraud Potential and blacklists a fourth application with the same name in a day", () => {
    const hit = velocityHit(seedVelocityRule, 4);

    expect(hit).toEqual({
      dimension: "FULL_NAME",
      windowValue: 1,
      windowUnit: "DAY",
      maxCount: 3,
      actualCount: 4,
      exceeded: true,
    });
    expect(judge({ hits: [hit] })).toEqual({
      outcome: "HIGH_FRAUD_POTENTIAL",
      matrixRow: null,
      blacklistReason: "Velocity rule exceeded: FULL_NAME 4 in 1 DAY",
    });
  });

  it("AC-65.01 TRM_FRD_003 is Clean exactly at the limit of 3 a day", () => {
    expect(judge({ hits: [velocityHit(seedVelocityRule, 3)] })).toMatchObject({ outcome: "CLEAN" });
  });

  it("AC-65.01 TRM_FRD_004 is Suspicious for a VPN or proxy IP", () => {
    expect(ipStatusOf({ isVpnOrProxy: true, province: "31" }, "31")).toBe("VPN_PROXY");
    expect(judge({ ipStatus: "VPN_PROXY" })).toMatchObject({ outcome: "SUSPICIOUS", matrixRow: { priority: 1 } });
  });

  it("AC-65.01 TRM_FRD_005 is Suspicious when the IP province differs from the ID card province", () => {
    expect(ipStatusOf({ isVpnOrProxy: false, province: "32" }, "31")).toBe("LOCATION_MISMATCH");
    expect(judge({ ipStatus: "LOCATION_MISMATCH" })).toMatchObject({ outcome: "SUSPICIOUS" });
  });

  it("AC-65.01 TRM_FRD_006 is Clean for a normal IP and one application", () => {
    expect(ipStatusOf({ isVpnOrProxy: false, province: "31" }, "31")).toBe("NORMAL");
    expect(judge()).toMatchObject({ outcome: "CLEAN", blacklistReason: null });
  });

  it("AC-65.02 is Clean from blacklist and frequency only when the IP check is not applicable", () => {
    expect(judge({ ipStatus: "NOT_APPLICABLE" })).toMatchObject({ outcome: "CLEAN" });
  });

  it("is Suspicious when no matrix row covers the combination", () => {
    expect(judge({ matrix: [] })).toEqual({ outcome: "SUSPICIOUS", matrixRow: null, blacklistReason: null });
  });

  it("counts a one-day window back from now", () => {
    expect(windowStart(seedVelocityRule, new Date("2026-10-25T10:00:00Z"))).toEqual(new Date("2026-10-24T10:00:00Z"));
  });
});
