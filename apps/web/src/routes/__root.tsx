import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "../components/layout/AppShell";
import { FullPageStatus } from "../components/layout/FullPageStatus";
import { useLogout, useSession } from "../features/session/api";
import { sessionEndedMessage } from "../features/session/session-end";

/**
 * Halaman aplikasi tampil hanya setelah `GET /auth/session` berhasil. Sesi yang berakhir diarahkan ke "Login" oleh
 * penangan 401 global di `app.tsx`, jadi selama itu layar tetap memuat (AC-06.01, AC-06.02).
 */
function AuthenticatedLayout() {
  const session = useSession();
  const logout = useLogout();
  if (!session.data) {
    const error = session.error && !sessionEndedMessage(session.error) ? session.error.message : undefined;
    return <FullPageStatus error={error} />;
  }
  return (
    <AppShell
      session={session.data}
      onLogout={() => logout.mutate()}
      loggingOut={logout.isPending}
      alert={logout.error?.message}
    >
      <Outlet />
    </AppShell>
  );
}

function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname === "/login" ? <Outlet /> : <AuthenticatedLayout />;
}

export const Route = createRootRoute({ component: RootLayout });
