import { type StepCode, standardErrors } from "@cikal/contracts";
import { Pencil, Send, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { formatDateTime } from "../../lib/format";
import { useProductRoute, useUpdateRoute } from "./api";
import { RouteModuleTable } from "./RouteModuleTable";
import { ROUTE_VERSION_STATUS_LABELS, type RouteStep } from "./route-labels";

interface RoutePanelProps {
  productId: string;
  /** Hak `MST-ROUTE` UPDATE; tanpa hak ini "Edit Route" tidak tampil (AC-31.06). */
  canEdit: boolean;
}

type Draft = Record<string, boolean>;

const toDraft = (steps: readonly RouteStep[]): Draft =>
  Object.fromEntries(steps.map((step) => [step.stepCode, step.isEnabled]));

/**
 * Rute ACTIVE satu produk dan mode edit dengan toggle per modul (api-specs 08 §8.9, §8.10). Pengajuan tampil di
 * "Pending Product Route" dan versi ACTIVE tetap dipakai sampai disetujui (AC-31.01).
 */
export function RoutePanel({ productId, canEdit }: RoutePanelProps) {
  const route = useProductRoute(productId);
  const update = useUpdateRoute(productId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mandatoryHint, setMandatoryHint] = useState<StepCode | null>(null);
  const [blocked, setBlocked] = useState(false);
  const data = route.data;

  if (route.error) return <FeedbackMessage type="error">{route.error.message}</FeedbackMessage>;
  if (!data) return <p>Loading...</p>;

  const editing = draft !== null;
  const stopEditing = () => {
    setDraft(null);
    setMandatoryHint(null);
  };
  // Versi lain yang menunggu persetujuan menolak pengajuan baru (api-specs 08 §8.9 langkah 5), sama seperti AC-12.06.
  const startEditing = () => {
    update.reset();
    const pending = data.pendingVersionNumber !== null;
    setBlocked(pending);
    if (!pending) setDraft(toDraft(data.steps));
  };
  const toggle = (step: RouteStep) => {
    if (step.isMandatory) {
      setMandatoryHint(step.stepCode);
      return;
    }
    setMandatoryHint(null);
    setDraft((current) => current && { ...current, [step.stepCode]: !current[step.stepCode] });
  };
  const submit = () => {
    if (!draft) return;
    const steps = data.steps.map((step) => ({ stepCode: step.stepCode, isEnabled: draft[step.stepCode] ?? false }));
    update.mutate({ steps }, { onSuccess: stopEditing });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-8">Version {data.versionNumber}</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                data.status === "ACTIVE" ? "bg-success-lightest text-success" : "bg-primary-light text-primary"
              }`}
            >
              {ROUTE_VERSION_STATUS_LABELS[data.status]}
            </span>
          </div>
          {data.effectiveFrom && (
            <p className="text-xs text-neutral-5">Effective From {formatDateTime(data.effectiveFrom)}</p>
          )}
          {data.pendingVersionNumber !== null && (
            <p className="text-xs text-neutral-5">
              Pending <span className="font-semibold text-primary">Version {data.pendingVersionNumber}</span> ·{" "}
              {ROUTE_VERSION_STATUS_LABELS.WAITING_APPROVAL}
            </p>
          )}
        </div>
        {canEdit && !editing && (
          <Button onClick={startEditing}>
            <Pencil size={20} aria-hidden />
            Edit Route
          </Button>
        )}
      </div>
      {blocked && <FeedbackMessage type="error">{standardErrors.PENDING_CHANGE_REQUEST.message}</FeedbackMessage>}
      {update.error && <FeedbackMessage type="error">{update.error.message}</FeedbackMessage>}
      {update.isSuccess && !editing && <FeedbackMessage type="success">{update.data.message}</FeedbackMessage>}
      <RouteModuleTable
        steps={data.steps}
        enabled={draft ?? toDraft(data.steps)}
        editing={editing}
        onToggle={toggle}
        mandatoryHint={mandatoryHint}
      />
      {editing && (
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            disabled={update.isPending}
            onClick={() => {
              update.reset();
              stopEditing();
            }}
          >
            <X size={20} aria-hidden />
            Cancel
          </Button>
          <Button disabled={update.isPending} onClick={submit}>
            <Send size={20} aria-hidden />
            Submit for Approval
          </Button>
        </div>
      )}
    </div>
  );
}
