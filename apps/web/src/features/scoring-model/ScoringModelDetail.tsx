import type { ScoringCriterion, ScoringModelDetail as ScoringModel } from "@cikal/contracts";
import { Link } from "@tanstack/react-router";
import { CopyPlus, FlaskConical, Plus, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { formatDecimal } from "../../lib/format";
import { useNewModelVersion, useScoringVariables, useSubmitModel } from "./api";
import { CriteriaList } from "./CriteriaList";
import { CriterionForm } from "./CriterionForm";
import { MODEL_GROUP_LABELS, MODEL_STATUS_LABELS } from "./labels";

function Summary({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-neutral-5">{label}</dt>
      <dd className="font-semibold text-neutral-8">{value ?? "-"}</dd>
    </div>
  );
}

const score = (value: string | null): string | null => value && formatDecimal(value);

interface ScoringModelDetailProps {
  model: ScoringModel;
  canUpdate: boolean;
  /** Membuka draft versi baru hasil "New Version". */
  onNewVersion: (modelId: string) => void;
}

/**
 * Detail satu versi model (api-specs 22 §22.2): draft bisa ditambah atau diubah kriterianya lalu diajukan lewat
 * "Submit for Approval" (AC-37.05); versi ACTIVE disalin dulu menjadi draft lewat "New Version" (§22.3). Semua versi
 * bisa diuji di "Scoring Model Test" (§22.5).
 */
export function ScoringModelDetail({ model, canUpdate, onNewVersion }: ScoringModelDetailProps) {
  const [editing, setEditing] = useState<ScoringCriterion | "new" | null>(null);
  const variables = useScoringVariables();
  const submit = useSubmitModel(model.id);
  const newVersion = useNewModelVersion(model.id);
  const editable = canUpdate && model.status === "DRAFT";
  const error = submit.error ?? newVersion.error ?? variables.error;

  return (
    <div className="flex flex-col gap-4">
      {submit.data?.message && <FeedbackMessage type="success">{submit.data.message}</FeedbackMessage>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <dl className="grid grid-cols-2 gap-4 rounded-lg bg-neutral-0 p-6 shadow-s md:grid-cols-4">
        <Summary label="Model Code" value={model.modelCode} />
        <Summary label="Model Name" value={model.modelName} />
        <Summary label="Model Group" value={MODEL_GROUP_LABELS[model.modelGroup]} />
        <Summary label="Version" value={`${model.versionNumber} (${MODEL_STATUS_LABELS[model.status]})`} />
        <Summary label="Constant" value={score(model.constant)} />
        <Summary label="Cut Off" value={score(model.cutOff)} />
        <Summary label="Review Lower Bound" value={score(model.reviewLowerBound)} />
      </dl>
      <div className="flex flex-col gap-4 rounded-lg bg-neutral-0 p-6 shadow-s">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-8">Criteria</h2>
          <div className="flex gap-3">
            <Link
              to="/master/scoring/$modelId/test"
              params={{ modelId: model.id }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-neutral-0 px-4 py-2.5 font-semibold text-primary hover:bg-primary-light/40"
            >
              <FlaskConical size={16} aria-hidden />
              Scoring Model Test
            </Link>
            {editable && (
              <>
                <Button variant="secondary" disabled={!variables.data} onClick={() => setEditing("new")}>
                  <Plus size={16} aria-hidden />
                  Add Criterion
                </Button>
                <Button disabled={submit.isPending} onClick={() => submit.mutate()}>
                  <Send size={16} aria-hidden />
                  Submit for Approval
                </Button>
              </>
            )}
            {canUpdate && model.status === "ACTIVE" && (
              <Button
                disabled={newVersion.isPending}
                onClick={() => newVersion.mutate(undefined, { onSuccess: (draft) => onNewVersion(draft.data.id) })}
              >
                <CopyPlus size={16} aria-hidden />
                New Version
              </Button>
            )}
          </div>
        </div>
        <CriteriaList criteria={model.criteria} onEdit={editable && variables.data ? setEditing : undefined} />
      </div>
      {editing && variables.data && (
        <CriterionForm
          modelId={model.id}
          criterion={editing === "new" ? undefined : editing}
          variables={variables.data}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
