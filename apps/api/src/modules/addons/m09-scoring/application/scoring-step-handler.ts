import type { StepContext, StepResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { StepHandler } from "../../../core/orchestrator/index.js";
import { ModelStep } from "./model-step.js";

/** StepHandler `SCORING` M09 (technical-specs 05 §5.18): skor model scoring aktif produk (AC-67.01, AC-67.04). */
@Injectable()
export class ScoringStepHandler implements StepHandler {
  readonly stepCode = "SCORING";
  readonly moduleCode = "M09";

  constructor(private readonly step: ModelStep) {}

  execute(tx: Tx, ctx: StepContext): Promise<StepResult> {
    return this.step.run(tx, ctx, "SCORING");
  }
}
