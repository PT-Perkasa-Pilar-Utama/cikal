import { describe, expect, it } from "vitest";
import { auditEventType } from "./audit-event-type.js";
import { asRecord, auditPeriodError, changedFields } from "./audit-search.js";

describe("audit period", () => {
  it("AC-14.03 refuses an end date before the start date", () => {
    expect(auditPeriodError("2026-10-31", "2026-10-01")?.code).toBe("INVALID_DATE_RANGE");
  });

  it("AC-14.04 refuses 01-01-2025 to 02-01-2026 and allows 366 days", () => {
    const error = auditPeriodError("2025-01-01", "2026-01-02");
    expect(error).toMatchObject({ code: "DATE_RANGE_TOO_LONG", status: 422 });
    expect(error?.message).toBe("Search period must not exceed 366 days");
    expect(auditPeriodError("2025-01-01", "2026-01-01")).toBeNull();
    expect(auditPeriodError("2026-10-01", "2026-10-01")).toBeNull();
  });
});

describe("audit event type", () => {
  it("AC-14.06 classifies login, failed login, and logout as Authentication", () => {
    for (const action of ["LOGIN", "LOGIN_FAILED", "LOGOUT"]) {
      expect(auditEventType("Authentication", action)).toBe("AUTHENTICATION");
    }
  });

  it("classifies views as Data Access, application modules as Application Action, and the rest as Master Data", () => {
    expect(auditEventType("Application", "VIEW_APPLICATION")).toBe("DATA_ACCESS");
    expect(auditEventType("Document", "VIEW_DOCUMENT")).toBe("DATA_ACCESS");
    expect(auditEventType("Approval", "APPROVE")).toBe("APPLICATION_ACTION");
    expect(auditEventType("Task Queue", "ASSIGN")).toBe("APPLICATION_ACTION");
    expect(auditEventType("Process Monitoring", "STEP_RETRIED")).toBe("APPLICATION_ACTION");
    expect(auditEventType("Product", "APPROVE")).toBe("MASTER_DATA");
    expect(auditEventType("License", "LICENSE_INSTALLED")).toBe("MASTER_DATA");
  });
});

describe("audit changed fields", () => {
  it("AC-14.02 marks the nested paths whose values differ and compares arrays whole", () => {
    const before = { productName: "KTA", limits: { auto: "15000000.00", max: "50000000.00" }, steps: ["A", "B"] };
    const after = { productName: "KTA", limits: { auto: "25000000.00", max: "50000000.00" }, steps: ["A", "C"] };
    expect(changedFields(before, after)).toEqual(["limits.auto", "steps"]);
  });

  it("marks nothing without the data before the change", () => {
    expect(changedFields(null, { productName: "KTA" })).toEqual([]);
  });

  it("wraps data that is not an object", () => {
    expect(asRecord(["A"])).toEqual({ value: ["A"] });
    expect(asRecord(null)).toBeNull();
  });
});
