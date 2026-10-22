import { productListResponseMock } from "@cikal/contracts";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiRoutes, renderApp, sessionOk, standardError, stubApi } from "./test/render-app";

const loginForm = () => screen.findByRole("form", { name: "Login" });

describe("session handling", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows Login after Logout, and Back does not reopen an application page (AC-06.01)", async () => {
    const routes: ApiRoutes = { "GET /api/v1/auth/session": sessionOk, "POST /api/v1/auth/logout": { status: 204 } };
    stubApi(routes);
    const { router } = renderApp("/");
    await screen.findByRole("heading", { name: "Dashboard" });

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await loginForm();
    routes["GET /api/v1/auth/session"] = standardError("UNAUTHENTICATED");
    router.history.back();

    expect(await loginForm()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("shows Login when the Dashboard address is opened without a session (AC-06.02)", async () => {
    stubApi({ "GET /api/v1/auth/session": standardError("UNAUTHENTICATED") });
    renderApp("/");

    expect(await loginForm()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("shows Login with the expiry message when a request fails after 30 idle minutes (AC-06.03)", async () => {
    stubApi({
      "GET /api/v1/auth/session": sessionOk,
      "GET /api/v1/products?page=1": standardError("SESSION_EXPIRED"),
    });
    renderApp("/master/products");

    await loginForm();
    expect(screen.getByRole("alert")).toHaveTextContent("Your session has expired. Please log in again");
  });

  it("shows Login with the replaced-session message after a login from another browser (AC-06.05)", async () => {
    stubApi({
      "GET /api/v1/auth/session": sessionOk,
      "GET /api/v1/products?page=1": standardError("SESSION_REPLACED"),
    });
    renderApp("/master/products");

    await loginForm();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your session was ended because you logged in from another browser",
    );
  });

  it("keeps the user on the page when a request fails for a reason other than the session", async () => {
    stubApi({ "GET /api/v1/auth/session": sessionOk, "GET /api/v1/products?page=1": standardError("ACCESS_DENIED") });
    renderApp("/master/products");

    await waitFor(() => expect(screen.getByText("You do not have access to this page")).toBeInTheDocument());
    expect(screen.queryByRole("form", { name: "Login" })).not.toBeInTheDocument();
  });

  it("renders the page once the session loads", async () => {
    stubApi({
      "GET /api/v1/auth/session": sessionOk,
      "GET /api/v1/products?page=1": { status: 200, body: productListResponseMock },
    });
    renderApp("/master/products");

    expect(await screen.findByRole("heading", { name: "Product" })).toBeInTheDocument();
  });
});
