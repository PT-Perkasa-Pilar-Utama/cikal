import { type StepCode, stepCodes } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ProductRoutes } from "../../product/index.js";
import { Licensing } from "../../tenancy/index.js";
import { ProcessInstancesRepository } from "../db/process-instances.repository.js";
import { StepExecutionsRepository } from "../db/step-executions.repository.js";
import { routeSkipReason } from "../domain/route-plan.js";
import { stepContext } from "../domain/step-context.js";
import { stepOutcomes } from "../domain/step-outcomes.js";
import { StepHandlerRegistry } from "./step-handler.js";

/** Bacaan hasil dan langkah berikutnya satu proses untuk modul lain (technical-specs 12 §12.6). */
@Injectable()
export class ProcessOutlook {
  constructor(
    private readonly processes: ProcessInstancesRepository,
    private readonly steps: StepExecutionsRepository,
    private readonly routes: ProductRoutes,
    private readonly licensing: Licensing,
    private readonly handlers: StepHandlerRegistry,
  ) {}

  async outcomes(tx: Tx, processInstanceId: string): Promise<Partial<Record<StepCode, string>>> {
    return stepOutcomes(await this.steps.listLatest(tx, processInstanceId));
  }

  /**
   * Langkah yang berjalan sesudah `after`: langkah yang sudah dimulai atau selesai dibaca dari riwayat; langkah
   * PENDING dinilai dengan aturan lewati yang sama dengan `advance` (rute, lisensi, syarat langkah).
   */
  async nextStep(tx: Tx, processInstanceId: string, after: StepCode): Promise<StepCode | null> {
    const process = await this.processes.findById(tx, processInstanceId);
    if (!process) throw new Error(`Process ${processInstanceId} not found`);
    const latest = new Map((await this.steps.listLatest(tx, process.id)).map((step) => [step.stepCode, step]));
    const route = await this.routes.version(tx, process.routeVersionId);
    const licensed = (await this.licensing.state(tx)).modules;
    for (const stepCode of stepCodes.slice(stepCodes.indexOf(after) + 1)) {
      const step = latest.get(stepCode);
      if (!step || step.status === "SKIPPED") continue;
      if (step.status !== "PENDING") return stepCode;
      if (routeSkipReason(stepCode, route.steps, licensed)) continue;
      const handler = this.handlers.get(stepCode);
      if (handler?.isApplicable) {
        const ctx = stepContext({
          process,
          loanId: process.loanId,
          stepCode,
          attempt: step.attempt,
          correlationId: uuidv7(),
        });
        if (!(await handler.isApplicable(tx, ctx))) continue;
      }
      return stepCode;
    }
    return null;
  }
}
