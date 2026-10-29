import type { StepCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationProcess, type ProcessApplication } from "../../../core/application/index.js";
import { OrchestratorApi } from "../../../core/orchestrator/index.js";
import { TaskQueue } from "../../../core/task-queue/index.js";
import { ALREADY_PROCESSED_MESSAGE, applicationNotFound } from "./disbursement-errors.js";

/** Langkah pencairan manusia M15; kode antrean tugas sama dengan kode langkahnya. */
export type DisbursementStep = Extract<StepCode, "VALIDITY_CHECK" | "PRINT_AKAD">;

/** Pengajuan yang langkahnya menunggu tugas user sesi. */
export interface WorkingStep {
  application: ProcessApplication;
  processInstanceId: string;
}

/** Tugas Validity Check dan Print Akad milik user sesi (api-specs 14 §14.5, api-specs 25 §25.2, §25.3). */
@Injectable()
export class DisbursementTasks {
  constructor(
    private readonly applications: ApplicationProcess,
    private readonly orchestrator: OrchestratorApi,
    private readonly tasks: TaskQueue,
  ) {}

  /** Pengajuan ada, langkahnya `WAITING_HUMAN`, dan tugasnya `ASSIGNED` ke user sesi. */
  async working(tx: Tx, ctx: RequestContext, applicationId: string, step: DisbursementStep): Promise<WorkingStep> {
    const application = await this.applications.find(tx, applicationId);
    if (!application) throw applicationNotFound();
    const execution = await this.orchestrator.stepOf(tx, applicationId, step);
    if (execution?.status !== "WAITING_HUMAN") {
      throw DomainError.standard("ALREADY_PROCESSED", ALREADY_PROCESSED_MESSAGE);
    }
    await this.tasks.assertWorking(
      tx,
      { applicationId, queueCode: step },
      { userId: ctx.userId, alreadyProcessedMessage: ALREADY_PROCESSED_MESSAGE },
    );
    return { application, processInstanceId: execution.processInstanceId };
  }

  /** Menutup tugas sehingga StepHandler menentukan langkah berikutnya; mengembalikan langkah sesudahnya. */
  async close(
    tx: Tx,
    ctx: RequestContext,
    working: WorkingStep,
    step: DisbursementStep,
    closing: { resultCode: string; payload: unknown },
  ): Promise<StepCode | null> {
    await this.tasks.closeFor(
      tx,
      { applicationId: working.application.id, queueCode: step },
      { userId: ctx.userId, ...closing, alreadyProcessedMessage: ALREADY_PROCESSED_MESSAGE },
    );
    return this.orchestrator.nextStep(tx, working.processInstanceId, step);
  }
}
