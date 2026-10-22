import { describe, expect, it } from "vitest";
import { sharedMenu } from "./entity-menus.js";

describe("sharedMenu", () => {
  it("returns the menu that product and pricing requests share", () => {
    expect(sharedMenu(["PRODUCT", "PRODUCT_PRICING"])).toBe("MST-PRODUCT");
  });

  it("returns null when the entity types belong to different menus", () => {
    expect(sharedMenu(["PRODUCT", "ROLE_ACCESS"])).toBeNull();
  });
});
