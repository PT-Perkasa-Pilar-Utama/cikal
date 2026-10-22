import { describe, expect, it } from "vitest";
import { buildMenuTree, type MenuGrant, type MenuRow } from "./menu-tree.js";

const row = (id: string, code: string, index: number, parent: string | null, moduleCode = "CORE"): MenuRow => ({
  id,
  menuCode: code,
  menuName: code,
  menuIndex: index,
  parentMenuId: parent,
  link: parent ? `/${code.toLowerCase()}` : null,
  iconName: null,
  moduleCode,
});
const grant = (menuId: string, flags: Partial<MenuGrant>): MenuGrant => ({
  menuId,
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canApprove: false,
  ...flags,
});

const menus = [
  row("g2", "OPS", 2, null),
  row("g1", "MST", 1, null),
  row("p", "MST-PRODUCT", 2, "g1"),
  row("o", "MST-ORG", 1, "g1"),
  row("d", "MST-DEDUP", 3, "g1", "M06"),
  row("v", "OPS-VALIDITY", 1, "g2", "M15"),
];

describe("buildMenuTree (api-specs 02 §2.4)", () => {
  it("shows only menus with View, ordered, under their group, with their actions (AC-09.02)", () => {
    const tree = buildMenuTree(
      menus,
      [grant("p", { canView: true, canCreate: true }), grant("o", { canView: true }), grant("v", { canUpdate: true })],
      ["CORE", "M15"],
    );
    expect(tree).toEqual([
      {
        menuCode: "MST",
        menuName: "MST",
        link: null,
        iconName: null,
        actions: ["VIEW"],
        children: [
          {
            menuCode: "MST-ORG",
            menuName: "MST-ORG",
            link: "/mst-org",
            iconName: null,
            actions: ["VIEW"],
            children: [],
          },
          {
            menuCode: "MST-PRODUCT",
            menuName: "MST-PRODUCT",
            link: "/mst-product",
            iconName: null,
            actions: ["VIEW", "CREATE"],
            children: [],
          },
        ],
      },
    ]);
  });

  it("hides menus of unlicensed modules even with View (AC-100.01)", () => {
    const tree = buildMenuTree(menus, [grant("d", { canView: true })], ["CORE"]);
    expect(tree).toEqual([]);
  });

  it("merges role access with user access", () => {
    const tree = buildMenuTree(menus, [grant("p", { canView: true }), grant("p", { canUpdate: true })], ["CORE"]);
    expect(tree[0]?.children[0]?.actions).toEqual(["VIEW", "UPDATE"]);
  });
});
