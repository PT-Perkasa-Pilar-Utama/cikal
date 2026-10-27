import type { ApplicationTab, ApprovalDecision } from "@cikal/contracts";
import { formatDateTime } from "../../lib/format";
import { DecisionResult } from "../application-workflow/DecisionResult";
import { DedupResult, DukcapilResult } from "../application-workflow/IdentityResults";
import { ResultState, ResultTable } from "../application-workflow/ResultLayout";
import { CreditBureauResult, FraudResult } from "../application-workflow/RiskCheckResults";
import { RacResult, ScoringResult } from "../application-workflow/ScoringResults";
import type { StepResultProps } from "../application-workflow/step-result-props";
import { useApprovalChain } from "./api";
import { DASH } from "./labels";

/** Tab modul untuk proses terbaru, memakai panel hasil langkah tab "Workflow" (api-specs 19 s.d. 24). */
export function ModulePanel({ tab, ...props }: StepResultProps & { tab: ApplicationTab }) {
  switch (tab) {
    case "dedup":
      return <DedupResult {...props} />;
    case "dukcapil":
      return <DukcapilResult {...props} />;
    case "fraud":
      return <FraudResult {...props} />;
    case "scoring":
      return (
        <div className="flex flex-col gap-6">
          <RacResult {...props} />
          <ScoringResult {...props} />
        </div>
      );
    case "credit-bureau":
      return <CreditBureauResult {...props} />;
    case "decision":
      return <DecisionResult {...props} />;
    case "approval":
      return <ApprovalPanel applicationId={props.applicationId} />;
    default:
      return null;
  }
}

const DECISION_LABELS: Record<ApprovalDecision, string> = {
  PENDING: "Pending",
  APPROVE: "Approved",
  REJECT: "Rejected",
  RETURN: "Returned",
  AUTO_APPROVED: "Auto Approved",
};

/** Tab "Approval": rantai approver dari level terendah dengan keputusan dan komentarnya (api-specs 16 §16.5). */
function ApprovalPanel({ applicationId }: { applicationId: string }) {
  const { data, error } = useApprovalChain(applicationId);
  return (
    <ResultState data={data} error={error}>
      {(chain) => (
        <ResultTable
          caption="Approval Chain"
          headers={["Level", "Sub Level", "Description", "Approver", "Decision", "Comment", "Decided At"]}
          rows={chain.map((entry) => [
            entry.jobLevel,
            entry.subLevel,
            entry.description,
            entry.approver.username,
            DECISION_LABELS[entry.decision],
            entry.comment ?? DASH,
            entry.decidedAt ? formatDateTime(entry.decidedAt) : DASH,
          ])}
        />
      )}
    </ResultState>
  );
}
