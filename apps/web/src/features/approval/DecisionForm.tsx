import {
  APPROVAL_MESSAGES,
  type ApplicationApproval,
  type ApprovalAction,
  type ApprovalDecisionRequest,
} from "@cikal/contracts";
import { CornerUpLeft, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Popup } from "../../components/ui/Popup";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";
import { formatPercent } from "../../lib/format";
import { useApprovalDecision } from "./api";
import { checkDecision } from "./approval-values";

const ACTIONS: { action: ApprovalAction; label: string; icon: typeof ThumbsUp }[] = [
  { action: "APPROVE", label: "Approve", icon: ThumbsUp },
  { action: "REJECT", label: "Reject", icon: ThumbsDown },
  { action: "RETURN", label: "Return", icon: CornerUpLeft },
];

/** Konfirmasi Approve dari AC-72.01; Reject dan Return memakai pola yang sama (teks usulan engineering). */
const CONFIRMATIONS: Record<ApprovalAction, string> = {
  APPROVE: "Are you sure you want to approve this application?",
  REJECT: "Are you sure you want to reject this application?",
  RETURN: "Are you sure you want to return this application?",
};

interface DecisionFormProps {
  approval: ApplicationApproval;
  onDecided: (message: string | undefined) => void;
}

/**
 * "Approval Comments", "Interest Rate" dalam rentang Approver (AC-97.05, AC-97.06), dan tombol dari `allowedActions`
 * (AC-73.03) dengan konfirmasi "Yes" (AC-72.01, AC-73.01, AC-73.02). Level bawah yang belum memutuskan menonaktifkan
 * ketiga tombol dengan keterangannya (AC-72.03); penginput pengajuan tidak mendapat tombol (AC-72.05).
 */
export function DecisionForm({ approval, onDecided }: DecisionFormProps) {
  const [comment, setComment] = useState("");
  const [interestRate, setInterestRate] = useState(formatPercent(approval.interestRate));
  const [confirming, setConfirming] = useState<{ action: ApprovalAction; request: ApprovalDecisionRequest }>();
  const [invalid, setInvalid] = useState<string>();
  const decision = useApprovalDecision(approval.applicationId);
  const { allowedActions, blockedReason } = approval;
  const waiting = blockedReason !== null && blockedReason !== APPROVAL_MESSAGES.submitterCannotApprove;
  const actions = waiting ? ACTIONS : ACTIONS.filter(({ action }) => allowedActions.includes(action));
  const error = invalid ?? decision.error?.message;

  function choose(action: ApprovalAction) {
    decision.reset();
    const check = checkDecision(approval, { action, comment, interestRate });
    if ("error" in check) {
      setInvalid(check.error);
      return;
    }
    setInvalid(undefined);
    setConfirming({ action, request: check.request });
  }

  function confirm() {
    if (!confirming) return;
    setConfirming(undefined);
    decision.mutate(confirming.request, { onSuccess: (result) => onDecided(result.message) });
  }

  if (approval.myLevel === null || (actions.length === 0 && !blockedReason)) return null;
  return (
    <div className="flex flex-col gap-4">
      {error && <FeedbackMessage type="error">{error}</FeedbackMessage>}
      {blockedReason && <FeedbackMessage type="info">{blockedReason}</FeedbackMessage>}
      {actions.length > 0 && (
        <>
          {approval.rateEditable && (
            <div className="max-w-xs">
              <TextField
                label="Interest Rate"
                inputMode="decimal"
                value={interestRate}
                disabled={waiting}
                onChange={(event) => setInterestRate(event.target.value)}
              />
            </div>
          )}
          <TextAreaField
            label="Approval Comments"
            required
            rows={4}
            value={comment}
            disabled={waiting}
            onChange={(event) => setComment(event.target.value)}
          />
          <div className="flex justify-end gap-3">
            {actions.map(({ action, label, icon: Icon }) => (
              <Button
                key={action}
                variant={action === "APPROVE" ? "primary" : "secondary"}
                disabled={waiting || decision.isPending}
                onClick={() => choose(action)}
              >
                <Icon size={16} aria-hidden />
                {label}
              </Button>
            ))}
          </div>
        </>
      )}
      {confirming && (
        <Popup title="Confirmation" size="sm" onClose={() => setConfirming(undefined)}>
          <p className="text-neutral-8">{CONFIRMATIONS[confirming.action]}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirming(undefined)}>
              No
            </Button>
            <Button onClick={confirm}>Yes</Button>
          </div>
        </Popup>
      )}
    </div>
  );
}
