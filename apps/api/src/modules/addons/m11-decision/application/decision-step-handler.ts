import { MATRIX_VALUE_LABELS, type StepContext, type StepResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { OrchestratorApi, type StepHandler } from "../../../core/orchestrator/index.js";
import { DecisionMatrixRepository } from "../db/decision-matrix.repository.js";
import { type DecisionResultRow, DecisionResultsRepository } from "../db/decision-results.repository.js";
import { decide } from "../domain/matrix-rules.js";
import { moduleOutcomesFrom } from "../domain/step-outcome-mapping.js";

function summaryOf(result: DecisionResultRow): string {
  const label = MATRIX_VALUE_LABELS[result.decisionOutcome] ?? result.decisionOutcome;
  if (result.matrixRowPriority === null) return `${label}: ${result.description ?? ""}`.trim();
  return `${label} (Decision Matrix priority ${result.matrixRowPriority})`;
}

/** Go lanjut ke langkah berikutnya; NotGo membawa pengajuan ke Recontest tanpa email ke pemohon (AC-69.02). */
function stepResultOf(result: DecisionResultRow): StepResult {
  const summary = summaryOf(result);
  return result.decisionOutcome === "GO"
    ? { type: "CONTINUE", outcomeCode: result.decisionOutcome, summary }
    : { type: "RECONTEST", outcomeCode: result.decisionOutcome, summary };
}

/**
 * StepHandler `DECISION` M11 (technical-specs 05 §5.18): membaca hasil enam langkah lewat Orchestrator, bukan tabel
 * modul lain (XM-02), lalu lookup Decision Matrix. Keputusan disimpan sekali per proses, jadi attempt ulang memakai
 * keputusan yang sama (idempotensi technical-specs 12 §12.1).
 */
@Injectable()
export class DecisionStepHandler implements StepHandler {
  readonly stepCode = "DECISION";
  readonly moduleCode = "M11";

  constructor(
    private readonly orchestrator: OrchestratorApi,
    private readonly matrix: DecisionMatrixRepository,
    private readonly results: DecisionResultsRepository,
  ) {}

  async execute(tx: Tx, ctx: StepContext): Promise<StepResult> {
    const existing = await this.results.findByProcess(tx, ctx.processInstanceId);
    if (existing) return stepResultOf(existing);
    const mapping = moduleOutcomesFrom(await this.orchestrator.outcomes(tx, ctx.processInstanceId));
    if (!mapping.ok) return { type: "ERROR", errorCategory: "CONFIG", errorMessage: mapping.message, retryable: false };
    const { decisionOutcome, matchedRow, note } = decide(await this.matrix.all(tx), mapping.outcomes);
    const result: DecisionResultRow = {
      id: uuidv7(),
      applicationId: ctx.applicationId,
      processInstanceId: ctx.processInstanceId,
      outcomes: mapping.outcomes,
      decisionOutcome,
      matrixRowId: matchedRow?.id ?? null,
      matrixRowPriority: matchedRow?.priority ?? null,
      description: matchedRow ? matchedRow.description : note,
    };
    await this.results.insert(tx, { ...result, tenantId: ctx.tenantId });
    return stepResultOf(result);
  }
}
