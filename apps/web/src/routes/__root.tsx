import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "../components/layout/AppShell";

function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname === "/login") {
    return <Outlet />;
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export const Route = createRootRoute({ component: RootLayout });
