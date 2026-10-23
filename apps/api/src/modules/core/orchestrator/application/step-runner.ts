import type { SkipReason, StepContext, StepResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ApplicationProcess } from "../../application/index.js";
import { ProductRoutes } from "../../product/index.js";
import { Licensing } from "../../tenancy/index.js";
import type { ProcessRow } from "../db/process-instances.repository.js";
import { StepExecutionsRepository, type StepRow } from "../db/step-executions.repository.js";
import { currentStep, routeSkipReason } from "../domain/route-plan.js";
import { stepContext } from "../domain/step-context.js";
import { ProcessJobs } from "./process-jobs.js";
import { type StepHandler, StepHandlerRegistry } from "./step-handler.js";
import { StepResults } from "./step-results.js";

/** Langkah berlisensi di rute tanpa StepHandler terpasang: konfigurasi paket salah, bukan error sementara. */
function missingHandler(step: StepRow): StepResult {
  return {
    type: "ERROR",
    errorCategory: "CONFIG",
    errorMessage: `No step handler is installed for ${step.stepCode}`,
    retryable: false,
  };
}

/**
 * Satu putaran siklus `advance` untuk proses yang sudah dikunci (technical-specs 12 §12.3): lewati langkah
 * dengan alasannya, atau jalankan StepHandler dan catat hasilnya.
 */
@Injectable()
export class StepRunner {
  constructor(
    private readonly steps: StepExecutionsRepository,
    private readonly applications: ApplicationProcess,
    private readonly routes: ProductRoutes,
    private readonly handlers: StepHandlerRegistry,
    private readonly results: StepResults,
    private readonly jobs: ProcessJobs,
    private readonly licensing: Licensing,
  ) {}

  /** Proses harus RUNNING dan terkunci. ERROR pada langkah saat ini berarti retry otomatis yang sudah jatuh tempo. */
  async runCurrent(tx: Tx, process: ProcessRow): Promise<void> {
    const step = currentStep(await this.steps.listLatest(tx, process.id));
    if (!step) throw new Error(`Process ${process.id} is ${process.status} but has no step left`);
    if (step.status !== "PENDING" && step.status !== "ERROR") return;

    const application = await this.applications.find(tx, process.applicationId);
    if (!application) throw new Error(`Application ${process.applicationId} not found`);
    const handler = this.handlers.get(step.stepCode);
    const attempt = step.status === "ERROR" ? step.attempt + 1 : step.attempt;
    const ctx = stepContext({
      process,
      loanId: application.loanId,
      stepCode: step.stepCode,
      attempt,
      correlationId: uuidv7(),
    });

    if (step.status === "PENDING") {
      const reason = await this.skipReason(tx, process, step, handler, ctx);
      if (reason) {
        await this.steps.update(tx, step.id, { status: "SKIPPED", skipReason: reason });
        return this.jobs.advance(tx, process);
      }
    }

    const running = await this.markRunning(tx, process, step, attempt);
    await this.applications.setCurrentStep(tx, process.applicationId, step.stepCode);
    const result = handler ? await handler.execute(tx, ctx) : missingHandler(step);
    await this.results.apply(tx, { process, step: running, ctx }, result, null);
  }

  private async skipReason(
    tx: Tx,
    process: ProcessRow,
    step: StepRow,
    handler: StepHandler | undefined,
    ctx: StepContext,
  ): Promise<SkipReason | null> {
    const route = await this.routes.version(tx, process.routeVersionId);
    // Lisensi dibaca saat langkah PENDING akan dijalankan; langkah yang sudah berjalan tetap selesai (AC-85.06, LC-07).
    const licensed = (await this.licensing.state(tx)).modules;
    const reason = routeSkipReason(step.stepCode, route.steps, licensed);
    if (reason) return reason;
    if (handler?.isApplicable && !(await handler.isApplicable(tx, ctx))) return "CONDITION_NOT_MET";
    return null;
  }

  /** PENDING -> RUNNING di baris yang sama; ERROR -> RUNNING membuat baris attempt berikutnya (technical-specs 06 §6.13). */
  private async markRunning(tx: Tx, process: ProcessRow, step: StepRow, attempt: number): Promise<StepRow> {
    const startedAt = new Date();
    let id = step.id;
    if (step.status === "PENDING") {
      await this.steps.update(tx, id, { status: "RUNNING", startedAt });
    } else {
      id = uuidv7();
      await this.steps.insert(tx, [
        {
          id,
          tenantId: process.tenantId,
          processInstanceId: process.id,
          stepCode: step.stepCode,
          status: "RUNNING",
          attempt,
          startedAt,
        },
      ]);
    }
    const running = await this.steps.findById(tx, id);
    if (!running) throw new Error(`Step execution ${id} not found`);
    return running;
  }
}
