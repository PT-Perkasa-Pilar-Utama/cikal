import type { SessionResponse } from "@cikal/contracts";
import { type ReactNode, useState } from "react";
import { FeedbackMessage } from "../ui/FeedbackMessage";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  session: SessionResponse["data"];
  onLogout: () => void;
  loggingOut: boolean;
  /** Pesan error tingkat layout, misalnya logout yang gagal. */
  alert?: string;
  children: ReactNode;
}

/** Kerangka LayoutSide: sidebar menu, header identitas, dan area konten Neutral 1 (design-system 6.1, AC-01.01). */
export function AppShell({ session, onLogout, loggingOut, alert, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div className="flex min-h-screen">
      {sidebarOpen && <Sidebar menus={session.menus} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          fullName={session.user.fullName}
          roleName={session.user.roleName}
          companyName={session.company.companyName}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          onLogout={onLogout}
          loggingOut={loggingOut}
        />
        <main className="flex flex-1 flex-col gap-4 p-6">
          {alert && <FeedbackMessage type="error">{alert}</FeedbackMessage>}
          {children}
        </main>
      </div>
    </div>
  );
}
