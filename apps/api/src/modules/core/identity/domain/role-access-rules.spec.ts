import { describe, expect, it } from "vitest";
import type { AccessFlags } from "./access-policy.js";
import { buildMenuCatalog } from "./menu-catalog.js";
import type { MenuRow } from "./menu-tree.js";
import { roleAccessDisplayName, sameFlags, viewRequired } from "./role-access-rules.js";

const none: AccessFlags = { canView: false, canCreate: false, canUpdate: false, canDelete: false, canApprove: false };

describe("viewRequired", () => {
  it("rejects Approve without View (AC-09.03)", () => {
    expect(viewRequired({ ...none, canApprove: true })).toBe(true);
  });

  it("accepts View with Approve (AC-09.01)", () => {
    expect(viewRequired({ ...none, canView: true, canApprove: true })).toBe(false);
  });

  it("accepts revoking every action", () => {
    expect(viewRequired(none)).toBe(false);
  });
});

describe("sameFlags", () => {
  it("detects a changed toggle", () => {
    expect(sameFlags({ ...none, canView: true }, { ...none, canView: true, canUpdate: true })).toBe(false);
  });
});

describe("roleAccessDisplayName", () => {
  it("names the Pending Role Access row by role and menu", () => {
    expect(roleAccessDisplayName({ roleName: "Checker", menuName: "Product" })).toBe("Checker - Product");
  });
});

describe("buildMenuCatalog", () => {
  const row = (id: string, index: number, parent: string | null, moduleCode = "CORE"): MenuRow => ({
    id,
    menuCode: id.toUpperCase(),
    menuName: id,
    menuIndex: index,
    parentMenuId: parent,
    link: parent ? `/${id}` : null,
    iconName: null,
    moduleCode,
  });

  it("nests sub menus under their menu in index order and hides unlicensed modules", () => {
    const catalog = buildMenuCatalog(
      [row("mst", 1, null), row("product", 2, "mst"), row("org", 1, "mst"), row("epolis", 3, "mst", "M14")],
      ["CORE"],
    );
    expect(catalog.map((menu) => menu.menuCode)).toEqual(["MST"]);
    expect(catalog[0]?.children.map((menu) => menu.menuCode)).toEqual(["ORG", "PRODUCT"]);
  });
});
