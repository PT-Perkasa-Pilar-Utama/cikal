import { describe, expect, it } from "vitest";
import { afterWrongPassword, isLocked, type LoginAccount, rejectionForStatus } from "./login-policy.js";

const now = new Date("2026-10-26T08:00:00Z");
const account = (overrides: Partial<LoginAccount> = {}): LoginAccount => ({
  status: "ACTIVE",
  hasRole: true,
  failedLoginCount: 0,
  lockedUntil: null,
  ...overrides,
});

describe("login policy (api-specs 02 §2.2)", () => {
  it("keeps the account open after the fourth wrong password", () => {
    expect(afterWrongPassword(account({ failedLoginCount: 3 }), now)).toEqual({
      failedLoginCount: 4,
      lockedUntil: null,
      rejection: "INVALID_CREDENTIALS",
    });
  });

  it("locks the account for 15 minutes on the fifth wrong password (AC-01.05)", () => {
    expect(afterWrongPassword(account({ failedLoginCount: 4 }), now)).toEqual({
      failedLoginCount: 5,
      lockedUntil: new Date("2026-10-26T08:15:00Z"),
      rejection: "ACCOUNT_LOCKED",
    });
  });

  it("starts counting again once a lock has expired", () => {
    const expired = account({ failedLoginCount: 5, lockedUntil: new Date("2026-10-26T07:59:00Z") });
    expect(isLocked(expired, now)).toBe(false);
    expect(afterWrongPassword(expired, now).failedLoginCount).toBe(1);
  });

  it("rejects inactive and roleless accounts after the password check (AC-01.07)", () => {
    expect(rejectionForStatus(account({ status: "INACTIVE" }))).toBe("ACCOUNT_INACTIVE");
    expect(rejectionForStatus(account({ status: "NO_ROLE" }))).toBe("ACCOUNT_NO_ROLE");
    expect(rejectionForStatus(account({ hasRole: false }))).toBe("ACCOUNT_NO_ROLE");
    expect(rejectionForStatus(account())).toBeNull();
  });
});
