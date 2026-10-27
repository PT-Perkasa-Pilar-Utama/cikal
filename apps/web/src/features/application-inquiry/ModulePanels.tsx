import type { ApplicationTab } from "@cikal/contracts";
import { DecisionResult } from "../application-workflow/DecisionResult";
import { DedupResult, DukcapilResult } from "../application-workflow/IdentityResults";
import { CreditBureauResult, FraudResult } from "../application-workflow/RiskCheckResults";
import { RacResult, ScoringResult } from "../application-workflow/ScoringResults";
import type { StepResultProps } from "../application-workflow/step-result-props";

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
    default:
      return null;
  }
}
