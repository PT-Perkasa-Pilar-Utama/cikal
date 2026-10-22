import { sessionResponseMock } from "@cikal/contracts";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, standardError, stubApi } from "../../test/render-app";

const salesSession = {
  status: 200,
  body: {
    data: {
      ...sessionResponseMock.data,
      user: {
        ...sessionResponseMock.data.user,
        username: "sales.jkt01",
        fullName: "Sari Wulandari",
        roleName: "Sales",
      },
    },
  },
};

const loginOk = {
  status: 200,
  body: {
    data: {
      user: {
        id: sessionResponseMock.data.user.id,
        username: "sales.jkt01",
        fullName: "Sari Wulandari",
        roleName: "Sales",
      },
      company: { companyCode: "001", companyName: "Bank Contoh" },
      mustChangePassword: false,
    },
  },
};

async function submitLogin(username: string, password: string) {
  fireEvent.change(await screen.findByLabelText(/Username/), { target: { value: username } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
}

describe("Login page", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens the Dashboard with full name, role, and company in the header (AC-01.01)", async () => {
    stubApi({ "POST /api/v1/auth/login": loginOk, "GET /api/v1/auth/session": salesSession });
    renderApp("/login");

    await submitLogin("sales.jkt01", "correct-password");

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    const header = screen.getByRole("banner");
    expect(header).toHaveTextContent("Sari Wulandari");
    expect(header).toHaveTextContent("Sales");
    expect(header).toHaveTextContent("Bank Contoh");
  });

  it("shows the invalid-credentials message and stays on Login for a wrong password (AC-01.02)", async () => {
    stubApi({
      "POST /api/v1/auth/login": {
        status: 401,
        body: { code: "INVALID_CREDENTIALS", message: "Invalid username or password", details: [], correlationId: "c" },
      },
    });
    renderApp("/login");

    await submitLogin("sales.jkt01", "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password");
    expect(screen.getByRole("form", { name: "Login" })).toBeInTheDocument();
  });

  it("shows a required message under each empty field without calling the API (AC-01.04)", async () => {
    const fetchSpy = stubApi({});
    renderApp("/login");

    await submitLogin("", "");

    expect(screen.getByText("Username is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the lock message on the fifth consecutive failure (AC-01.05)", async () => {
    stubApi({ "POST /api/v1/auth/login": standardError("ACCOUNT_LOCKED") });
    renderApp("/login");

    await submitLogin("sales.jkt01", "wrong-password");

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Your account is locked for 15 minutes due to too many failed attempts",
      ),
    );
  });
});
