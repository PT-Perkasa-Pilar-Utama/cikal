import type { ReactNode } from "react";
import { useSession } from "../../features/session/use-session";
import { Sidebar } from "./Sidebar";

/** Kerangka layout: sidebar menu dan header nama, role, company (AC-01.01). */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  return (
    <div className="flex min-h-screen">
      <Sidebar menus={session?.menus ?? []} />
      <div className="flex flex-1 flex-col">
        <header className="flex justify-end gap-2 border-b border-neutral-2 bg-neutral-0 px-6 py-3">
          {session && (
            <span>
              {session.user.fullName} · {session.user.roleName} · {session.company.companyName}
            </span>
          )}
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
