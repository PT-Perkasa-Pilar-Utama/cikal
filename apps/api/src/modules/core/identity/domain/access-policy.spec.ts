import { describe, expect, it } from "vitest";
import { type AccessFlags, decideAccess, type MenuAccessFacts } from "./access-policy.js";

const none: AccessFlags = { canView: false, canCreate: false, canUpdate: false, canDelete: false, canApprove: false };
const facts = (grants: Partial<AccessFlags>[], moduleCode = "CORE", isActive = true): MenuAccessFacts => ({
  menu: { moduleCode, isActive },
  grants: grants.map((grant) => ({ ...none, ...grant })),
  licensedModules: new Set(["CORE", "M06"]),
  licenseExempt: false,
});

describe("decideAccess (technical-specs 09 §9.4)", () => {
  it("denies the page without View (AC-09.02 TRM_ACC_001)", () => {
    expect(decideAccess(facts([]), "VIEW")).toBe("ACCESS_DENIED");
  });

  it("denies an action the role lacks even without View (AC-09.04)", () => {
    expect(decideAccess(facts([]), "CREATE")).toBe("ACTION_DENIED");
  });

  it("allows View and Approve but not Create for a checker grant (AC-09.02 TRM_ACC_002)", () => {
    const checker = facts([{ canView: true, canApprove: true }]);
    expect([decideAccess(checker, "VIEW"), decideAccess(checker, "APPROVE"), decideAccess(checker, "CREATE")]).toEqual([
      "ALLOW",
      "ALLOW",
      "ACTION_DENIED",
    ]);
  });

  it("unions role access with user access valid today", () => {
    expect(decideAccess(facts([{ canView: true }, { canView: true, canUpdate: true }]), "UPDATE")).toBe("ALLOW");
  });

  it("requires View before any other action (AC-09.03)", () => {
    expect(decideAccess(facts([{ canCreate: true }]), "CREATE")).toBe("ACTION_DENIED");
  });

  it("rejects a menu of an unlicensed module with MODULE_NOT_LICENSED (AC-100.03)", () => {
    expect(decideAccess(facts([{ canView: true }], "M14"), "VIEW")).toBe("MODULE_NOT_LICENSED");
  });

  it("skips the module licence check on a licence-exempt route but keeps the menu rights", () => {
    const unlicensed = { ...facts([{ canView: true }]), licensedModules: new Set<string>(), licenseExempt: true };
    expect([decideAccess(unlicensed, "VIEW"), decideAccess(unlicensed, "UPDATE")]).toEqual(["ALLOW", "ACTION_DENIED"]);
  });

  it("treats an inactive or unknown menu as no access", () => {
    expect(decideAccess(facts([{ canView: true }], "CORE", false), "VIEW")).toBe("ACCESS_DENIED");
    expect(decideAccess({ ...facts([{ canView: true }]), menu: null }, "UPDATE")).toBe("ACTION_DENIED");
  });
});
