import type { Action, SessionMenu } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { menuActions } from "./menu-access";

/** Pohon menu sesi dengan satu submenu Product berisi aksi dari baris MRTM US-09. */
const sessionMenus = (actions: Action[]): SessionMenu[] =>
  actions.length === 0
    ? []
    : [
        {
          menuCode: "MST",
          menuName: "Master Data",
          link: null,
          iconName: "database",
          actions: ["VIEW"],
          children: [
            {
              menuCode: "MST-PRODUCT",
              menuName: "Product",
              link: "/master/products",
              iconName: "package",
              actions,
              children: [],
            },
          ],
        },
      ];

describe("menuActions", () => {
  it("grants nothing on Product to a Sales without View (AC-09.02 TRM_ACC_001)", () => {
    expect(menuActions(sessionMenus([]), "MST-PRODUCT").size).toBe(0);
  });

  it("grants a Checker View and Approve only (AC-09.02 TRM_ACC_002)", () => {
    expect([...menuActions(sessionMenus(["VIEW", "APPROVE"]), "MST-PRODUCT")]).toEqual(["VIEW", "APPROVE"]);
  });

  it("grants a Maker View, Create, Update, and Delete without Approve (AC-09.02 TRM_ACC_003)", () => {
    const actions = menuActions(sessionMenus(["VIEW", "CREATE", "UPDATE", "DELETE"]), "MST-PRODUCT");
    expect(actions.has("CREATE")).toBe(true);
    expect(actions.has("APPROVE")).toBe(false);
  });

  it("grants an Admin Sistem every action (AC-09.02 TRM_ACC_004)", () => {
    const all: Action[] = ["VIEW", "CREATE", "UPDATE", "DELETE", "APPROVE"];
    expect([...menuActions(sessionMenus(all), "MST-PRODUCT")]).toEqual(all);
  });
});
