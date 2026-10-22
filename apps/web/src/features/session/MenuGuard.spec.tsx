import { sessionResponseMock } from "@cikal/contracts";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, stubApi } from "../../test/render-app";

/** Sesi Sales tanpa hak apa pun pada menu Product (MRTM US-09 TRM_ACC_001). */
const salesWithoutProduct = {
  status: 200,
  body: {
    data: {
      ...sessionResponseMock.data,
      user: { ...sessionResponseMock.data.user, roleName: "Sales" },
      menus: sessionResponseMock.data.menus.filter((group) => group.menuCode !== "MST"),
    },
  },
};

describe("MenuGuard", () => {
  afterEach(() => vi.restoreAllMocks());

  it("hides Product from the menu and denies its address for a Sales without View (AC-09.02 TRM_ACC_001)", async () => {
    const fetchSpy = stubApi({ "GET /api/v1/auth/session": salesWithoutProduct });
    renderApp("/master/products");

    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have access to this page");
    expect(screen.getByRole("navigation", { name: "Main menu" })).not.toHaveTextContent("Product");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
