import { LogOut, PanelLeft } from "lucide-react";

interface AppHeaderProps {
  fullName: string;
  roleName: string;
  companyName: string;
  onToggleSidebar: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}

/** Inisial avatar dari dua kata pertama nama lengkap. */
function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/** Header LayoutSide: toggle sidebar di kiri; nama, role, avatar, chip company, dan Logout di kanan (AC-01.01, AC-06.01). */
export function AppHeader({ fullName, roleName, companyName, onToggleSidebar, onLogout, loggingOut }: AppHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-2 bg-neutral-0 px-6">
      <button
        type="button"
        aria-label="Toggle sidebar"
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-neutral-6 hover:bg-neutral-1 hover:text-primary"
      >
        <PanelLeft size={20} aria-hidden />
      </button>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-semibold text-neutral-8">{fullName}</div>
          <div className="text-xs text-neutral-5">{roleName}</div>
        </div>
        <div
          aria-hidden
          className="flex size-9 items-center justify-center rounded-full bg-primary-light font-bold text-primary"
        >
          {initials(fullName)}
        </div>
        <span className="rounded-full border border-neutral-3 bg-neutral-1 px-3 py-1 text-xs font-semibold text-neutral-7">
          {companyName}
        </span>
        <button
          type="button"
          aria-label="Logout"
          title="Logout"
          disabled={loggingOut}
          onClick={onLogout}
          className="rounded-lg p-2 text-neutral-6 hover:bg-error-lightest hover:text-error disabled:opacity-60"
        >
          <LogOut size={20} aria-hidden />
        </button>
      </div>
    </header>
  );
}
