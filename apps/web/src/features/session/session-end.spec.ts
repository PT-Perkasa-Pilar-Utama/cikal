import { standardErrors } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { ApiError } from "../../lib/api/client";
import { sessionEndedMessage } from "./session-end";

const apiError = (status: number, code: string, message: string) =>
  new ApiError(status, { code, message, details: [], correlationId: "c-1" });

describe("sessionEndedMessage", () => {
  it("returns the idle-expiry message for SESSION_EXPIRED (AC-06.03)", () => {
    const { message } = standardErrors.SESSION_EXPIRED;
    expect(sessionEndedMessage(apiError(401, "SESSION_EXPIRED", message))).toBe(
      "Your session has expired. Please log in again",
    );
  });

  it("returns the replaced-session message for SESSION_REPLACED (AC-06.05)", () => {
    const { message } = standardErrors.SESSION_REPLACED;
    expect(sessionEndedMessage(apiError(401, "SESSION_REPLACED", message))).toBe(
      "Your session was ended because you logged in from another browser",
    );
  });

  it("treats a wrong password as a login failure, not an ended session (AC-01.02)", () => {
    expect(sessionEndedMessage(apiError(401, "INVALID_CREDENTIALS", "Invalid username or password"))).toBeUndefined();
  });

  it("ignores errors that are not API errors", () => {
    expect(sessionEndedMessage(new Error("network down"))).toBeUndefined();
  });
});
