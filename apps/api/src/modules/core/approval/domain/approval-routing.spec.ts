import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  coversAmount,
  isAutoApproved,
  type RoutingApprover,
  type RoutingLevel,
  routeApproval,
} from "./approval-routing.js";

const level2: RoutingLevel = {
  jobLevel: 2,
  description: "Kepala Cabang",
  amountBegin: "0.00",
  amountEnd: "500000000.00",
  isFinalApprover: false,
};
const level1: RoutingLevel = {
  jobLevel: 1,
  description: "Kepala Wilayah",
  amountBegin: "500000001.00",
  amountEnd: "2000000000.00",
  isFinalApprover: true,
};
const approver = (fields: Partial<RoutingApprover> & Pick<RoutingApprover, "jobLevel">): RoutingApprover => ({
  subLevel: 1,
  upLevel: null,
  upSubLevel: null,
  approverUserId: `user-${fields.jobLevel}`,
  active: true,
  ...fields,
});
/** Setup KPR Bandung AC-72.06: level 2 naik ke level 1. */
const bandung = {
  levels: [level2, level1],
  approvers: [approver({ jobLevel: 2, upLevel: 1, upSubLevel: 1 }), approver({ jobLevel: 1 })],
  branchCode: "011",
  productCode: "KPR",
};
const route = (amount: string, setup = bandung) => routeApproval(setup, new Decimal(amount), "BOTH_INCLUSIVE");
const levels = (amount: string, setup = bandung) => {
  const routing = route(amount, setup);
  return routing.ok ? routing.chain.map((node) => node.jobLevel) : routing.message;
};

describe("approval routing", () => {
  it("AC-72.06 TRM_APV_001 needs level 2 only at 500.000.000", () => {
    expect(levels("500000000.00")).toEqual([2]);
  });

  it("AC-72.06 TRM_APV_002 needs level 2 then level 1 at 500.000.001", () => {
    expect(levels("500000001.00")).toEqual([2, 1]);
  });

  it("AC-72.06 TRM_APV_003 needs level 2 then level 1 at the upper bound 2.000.000.000", () => {
    expect(levels("2000000000.00")).toEqual([2, 1]);
  });

  it("AC-72.06 TRM_APV_004 rejects an amount above every level", () => {
    expect(levels("2000000001.00")).toBe("No approval level covers this amount");
  });

  it("AC-72.06 TRM_APV_005 rejects a branch and product without setup", () => {
    const cimahi = { levels: [], approvers: [], branchCode: "012", productCode: "KPR" };
    expect(levels("300000000.00", cimahi)).toBe("No approval setup for branch 012 and product KPR");
  });

  it("AC-27.04 rejects a level whose approvers are all inactive", () => {
    const inactive = {
      ...bandung,
      approvers: [
        approver({ jobLevel: 2, upLevel: 1, upSubLevel: 1, active: false }),
        approver({ jobLevel: 2, approverUserId: "user-2b", active: false }),
        approver({ jobLevel: 1 }),
      ],
    };
    expect(levels("100000000.00", inactive)).toBe("No active approver for level 2");
  });

  it("rejects a chain that climbs to a level without approvers", () => {
    const missing = { ...bandung, approvers: [approver({ jobLevel: 2, upLevel: 1, upSubLevel: 1 })] };
    expect(levels("600000000.00", missing)).toBe("No active approver for level 1");
  });

  it("walks sub levels in order through upLevel and upSubLevel", () => {
    const subLevels = {
      ...bandung,
      approvers: [
        approver({ jobLevel: 2, subLevel: 2, upLevel: 1, upSubLevel: 1, approverUserId: "second" }),
        approver({ jobLevel: 2, subLevel: 1, upLevel: 2, upSubLevel: 2, approverUserId: "first" }),
        approver({ jobLevel: 1 }),
      ],
    };
    const routing = route("600000000.00", subLevels);
    expect(routing.ok && routing.chain).toEqual([
      { sequence: 1, jobLevel: 2, subLevel: 1, description: "Kepala Cabang", approverUserId: "first" },
      { sequence: 2, jobLevel: 2, subLevel: 2, description: "Kepala Cabang", approverUserId: "second" },
      { sequence: 3, jobLevel: 1, subLevel: 1, description: "Kepala Wilayah", approverUserId: "user-1" },
    ]);
  });

  it("assigns the first active approver of a sub level", () => {
    const shared = {
      ...bandung,
      approvers: [
        approver({ jobLevel: 2, approverUserId: "inactive", active: false }),
        approver({ jobLevel: 2, approverUserId: "active" }),
      ],
    };
    const routing = route("100000000.00", shared);
    expect(routing.ok && routing.chain.map((node) => node.approverUserId)).toEqual(["active"]);
  });

  it("stops at a final approver level", () => {
    const finalAtLevel2 = { ...bandung, levels: [{ ...level2, isFinalApprover: true }, level1] };
    expect(levels("600000000.00", finalAtLevel2)).toEqual([2]);
  });

  it("stops when upLevel loops back", () => {
    const loop = {
      ...bandung,
      levels: [level2, { ...level1, isFinalApprover: false }],
      approvers: [
        approver({ jobLevel: 2, upLevel: 1, upSubLevel: 1 }),
        approver({ jobLevel: 1, upLevel: 2, upSubLevel: 1 }),
      ],
    };
    expect(levels("600000000.00", loop)).toEqual([2, 1]);
  });
});

describe("range boundary", () => {
  it("includes both ends by default", () => {
    expect(coversAmount(level2, new Decimal("500000000.00"), "BOTH_INCLUSIVE")).toBe(true);
  });

  it("excludes the end with END_EXCLUSIVE", () => {
    expect(coversAmount(level2, new Decimal("500000000.00"), "END_EXCLUSIVE")).toBe(false);
    expect(coversAmount(level2, new Decimal("0.00"), "END_EXCLUSIVE")).toBe(true);
  });
});

describe("auto approval", () => {
  const limit = new Decimal("10000000.00");

  it("AC-74.01 approves a limit below the auto approval limit", () => {
    expect(isAutoApproved(new Decimal("8000000.00"), limit)).toBe(true);
  });

  it("AC-74.02 approves a limit equal to the auto approval limit", () => {
    expect(isAutoApproved(new Decimal("10000000.00"), limit)).toBe(true);
  });

  it("AC-74.03 routes a limit one rupiah above the auto approval limit", () => {
    expect(isAutoApproved(new Decimal("10000001.00"), limit)).toBe(false);
  });

  it("AC-74.05 never approves automatically when the limit is 0", () => {
    expect(isAutoApproved(new Decimal("1000000.00"), new Decimal("0.00"))).toBe(false);
  });
});
