import type { StepContext, StepResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { StepHandler } from "../../../core/orchestrator/index.js";
import { ModelStep } from "./model-step.js";

/** StepHandler `RAC` M09 (technical-specs 05 §5.18): kriteria wajib model RAC aktif produk (AC-67.02, AC-67.03). */
@Injectable()
export class RacStepHandler implements StepHandler {
  readonly stepCode = "RAC";
  readonly moduleCode = "M09";

  constructor(private readonly step: ModelStep) {}

  execute(tx: Tx, ctx: StepContext): Promise<StepResult> {
    return this.step.run(tx, ctx, "RAC");
  }
}
