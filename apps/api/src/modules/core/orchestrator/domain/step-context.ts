import type { StepCode, StepContext } from "@cikal/contracts";

export interface ContextSource {
  process: {
    id: string;
    tenantId: string;
    applicationId: string;
    parameterSnapshot: Record<string, string>;
    formulaVersions: Record<string, string>;
  };
  loanId: string;
  stepCode: StepCode;
  attempt: number;
  correlationId: string;
}

/** Masukan StepHandler; kunci idempotensi = `processInstanceId` + `stepCode` + `attempt` (technical-specs 12 §12.1). */
export function stepContext({ process, loanId, stepCode, attempt, correlationId }: ContextSource): StepContext {
  return {
    tenantId: process.tenantId,
    applicationId: process.applicationId,
    loanId,
    processInstanceId: process.id,
    stepCode,
    attempt,
    idempotencyKey: `${process.id}:${stepCode}:${attempt}`,
    parameterSnapshot: process.parameterSnapshot,
    formulaVersions: process.formulaVersions,
    correlationId,
  };
}
