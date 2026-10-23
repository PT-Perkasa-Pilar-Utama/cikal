import type { TaskItem } from "@cikal/contracts";
import { ArrowRight, Hand, LockOpen, LogOut } from "lucide-react";
import type { ReactNode } from "react";

const actionButton =
  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold whitespace-nowrap text-primary hover:bg-primary-light/40 disabled:cursor-not-allowed disabled:opacity-60";

interface TaskActionsProps {
  task: TaskItem;
  busy: boolean;
  onAssign: () => void;
  onProceed: () => void;
  onRelease: () => void;
  onReleaseOther: () => void;
}

function ActionButton({ busy, onClick, children }: { busy: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className={actionButton}>
      {children}
    </button>
  );
}

/**
 * Tombol aksi satu tugas, hanya dari `allowedActions` server (api-specs 14 §14.2): tugas milik orang lain tidak
 * punya Assign to Me, Proceed, dan Release Me (AC-58.02, AC-58.06).
 */
export function TaskActions({ task, busy, onAssign, onProceed, onRelease, onReleaseOther }: TaskActionsProps) {
  const allowed = new Set(task.allowedActions);
  return (
    <div className="flex justify-end gap-1">
      {allowed.has("ASSIGN") && (
        <ActionButton busy={busy} onClick={onAssign}>
          <Hand size={16} aria-hidden />
          Assign to Me
        </ActionButton>
      )}
      {allowed.has("PROCEED") && (
        <ActionButton busy={busy} onClick={onProceed}>
          <ArrowRight size={16} aria-hidden />
          Proceed
        </ActionButton>
      )}
      {allowed.has("RELEASE") && (
        <ActionButton busy={busy} onClick={onRelease}>
          <LogOut size={16} aria-hidden />
          Release Me
        </ActionButton>
      )}
      {allowed.has("RELEASE_OTHER") && (
        <ActionButton busy={busy} onClick={onReleaseOther}>
          <LockOpen size={16} aria-hidden />
          Release
        </ActionButton>
      )}
    </div>
  );
}
