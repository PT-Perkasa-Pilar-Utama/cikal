import { describe, expect, it } from "vitest";
import { reviewBlock, reviewBlockedReason } from "./review-policy.js";

const maker = "0192b6a0-0000-7000-8000-00000000000a";
const checker = "0192b6a0-0000-7000-8000-00000000000b";

describe("reviewBlock", () => {
  it("lets another user review a waiting request", () => {
    expect(reviewBlock({ status: "WAITING_APPROVAL", submittedBy: maker }, checker)).toBeNull();
  });

  it("blocks the maker from reviewing their own request (AC-12.04)", () => {
    expect(reviewBlock({ status: "WAITING_APPROVAL", submittedBy: maker }, maker)).toBe("SELF_REVIEW_NOT_ALLOWED");
  });

  it("blocks a request that another checker already processed (AC-12.05)", () => {
    expect(reviewBlock({ status: "APPROVED", submittedBy: maker }, checker)).toBe("ALREADY_PROCESSED");
  });

  it("blocks a request sent back for revision", () => {
    expect(reviewBlock({ status: "REVISE", submittedBy: maker }, checker)).toBe("ALREADY_PROCESSED");
  });
});

describe("reviewBlockedReason", () => {
  it("explains why the maker sees no review buttons (AC-12.04)", () => {
    expect(reviewBlockedReason({ status: "WAITING_APPROVAL", submittedBy: maker }, maker)).toBe(
      "You cannot review your own submission",
    );
  });

  it("has no reason for a reviewer who may act", () => {
    expect(reviewBlockedReason({ status: "WAITING_APPROVAL", submittedBy: maker }, checker)).toBeNull();
  });
});
