import { sessionResponseMock } from "@cikal/contracts";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("renders the menus granted by the session", async () => {
    const rootRoute = createRootRoute({ component: () => <Sidebar menus={sessionResponseMock.data.menus} /> });
    const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ["/"] }) });
    render(<RouterProvider router={router} />);

    const nav = await screen.findByRole("navigation", { name: "Main menu" });
    expect(nav).toHaveTextContent("Product");
    expect(nav).toHaveTextContent("Role Access");
    expect(screen.getByRole("link", { name: "Product" })).toHaveAttribute("href", "/master/products");
    expect(screen.getByRole("link", { name: "Product Route" })).toHaveAttribute("href", "/master/routes");
  });
});
