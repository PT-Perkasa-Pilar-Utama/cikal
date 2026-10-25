import type { ComponentType } from "react";
import { Popup } from "../../components/ui/Popup";
import { DecisionResult } from "./DecisionResult";
import { DedupResult, DukcapilResult } from "./IdentityResults";
import { type ResultStep, stepName } from "./labels";
import { CreditBureauResult, FraudResult } from "./RiskCheckResults";
import { RacResult, ScoringResult } from "./ScoringResults";
import type { StepResultProps } from "./step-result-props";

const RESULT_PANELS: Record<ResultStep, ComponentType<StepResultProps>> = {
  DEDUP: DedupResult,
  DUKCAPIL: DukcapilResult,
  FRAUD: FraudResult,
  RAC: RacResult,
  SCORING: ScoringResult,
  CREDIT_BUREAU: CreditBureauResult,
  DECISION: DecisionResult,
};

interface StepResultPopupProps extends StepResultProps {
  stepCode: ResultStep;
  onClose: () => void;
}

/** Popup hasil satu langkah otomatis yang diklik di timeline, untuk proses yang dipilih (api-specs 19 s.d. 24). */
export function StepResultPopup({ stepCode, onClose, ...props }: StepResultPopupProps) {
  const Panel = RESULT_PANELS[stepCode];
  return (
    <Popup title={stepName(stepCode)} onClose={onClose}>
      <Panel {...props} />
    </Popup>
  );
}
