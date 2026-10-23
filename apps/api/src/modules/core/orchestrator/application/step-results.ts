import type { ProcessStatus, StepContext, StepResult } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { TASK_QUEUE_PORT, type TaskQueuePort } from "../../../../platform/http/task-queue-port.js";
import { ApplicationProcess } from "../../application/index.js";
import { ProcessInstancesRepository, type ProcessRow } from "../db/process-instances.repository.js";
import { type StepChanges, StepExecutionsRepository, type StepRow } from "../db/step-executions.repository.js";
import { calendarDayAging } from "../domain/aging.js";
import { automaticRetryDelaySeconds } from "../domain/retry-policy.js";
import {
  canProcessTransition,
  canStepTransition,
  processStatusAfter,
  stepStatusFor,
} from "../domain/step-transitions.js";
import { ProcessJobs } from "./process-jobs.js";

/** Satu attempt langkah yang hasilnya sedang dicatat. */
export interface StepRun {
  process: ProcessRow;
  step: StepRow;
  ctx: StepContext;
}

/** Antrean Risk Manager untuk hasil RECONTEST (technical-specs 12 §12.3, data dictionary HumanTask). */
const RECONTEST_QUEUE = "RECONTEST";

/**
 * Pencatatan tujuh hasil langkah (technical-specs 12 §12.3) di transaksi langkah: StepExecution, ProcessInstance,
 * status Application, tugas antrean, dan job berikutnya commit bersama.
 */
@Injectable()
export class StepResults {
  constructor(
    private readonly steps: StepExecutionsRepository,
    private readonly processes: ProcessInstancesRepository,
    private readonly applications: ApplicationProcess,
    private readonly jobs: ProcessJobs,
    @Inject(TASK_QUEUE_PORT) private readonly tasks: TaskQueuePort,
  ) {}

  /** `actorUserId`: penutup tugas manusia; `null` untuk langkah otomatis. */
  async apply(tx: Tx, run: StepRun, result: StepResult, actorUserId: string | null): Promise<void> {
    const status = stepStatusFor(result);
    if (!canStepTransition(run.step.status, status)) {
      throw new Error(`Step ${run.step.stepCode} cannot move from ${run.step.status} to ${status}`);
    }
    const retryDelay = result.type === "ERROR" ? automaticRetryDelaySeconds(result, run.step.attempt) : null;
    await this.steps.update(tx, run.step.id, { status, ...stepChanges(run.step, result, actorUserId, new Date()) });
    await this.moveProcess(tx, run.process, processStatusAfter(result, retryDelay !== null));
    await this.followUp(tx, run, result, actorUserId, retryDelay);
    // Event StepCompleted, StepFailed, StepSkipped (technical-specs 12 §12.3) ditulis ke outbox platform yang
    // dibangun kartu BE-S3-03 bersama event pertama, ApplicationSubmitted (api-specs 12 §12.8 langkah 6).
  }

  private async moveProcess(tx: Tx, process: ProcessRow, to: ProcessStatus): Promise<void> {
    if (!canProcessTransition(process.status, to)) {
      throw new Error(`Process ${process.id} cannot move from ${process.status} to ${to}`);
    }
    if (to === process.status) return;
    const ended = to === "COMPLETED" || to === "CANCELLED";
    await this.processes.updateStatus(tx, process.id, to, ended ? new Date() : null);
  }

  private async followUp(
    tx: Tx,
    { process, step }: StepRun,
    result: StepResult,
    userId: string | null,
    retryDelay: number | null,
  ): Promise<void> {
    switch (result.type) {
      case "CONTINUE":
        return this.jobs.advance(tx, process);
      case "WAIT_HUMAN":
        return this.tasks.create(tx, {
          stepExecutionId: step.id,
          applicationId: process.applicationId,
          queueCode: result.queueCode,
          branchId: result.branchId,
          eligibleRoleId: result.eligibleRoleId ?? null,
          assigneeUserId: result.assigneeUserId ?? null,
        });
      case "WAIT_EXTERNAL":
        return this.jobs.waitDeadline(tx, process.tenantId, step.id, result.waitDeadline);
      case "BACK_TO_DRAFT":
        return this.applications.transition(tx, process.applicationId, "DRAFT", {
          userId,
          returnNote: result.returnNote,
        });
      case "RECONTEST":
        await this.applications.transition(tx, process.applicationId, "RECONTEST", { userId });
        return this.tasks.create(tx, {
          stepExecutionId: step.id,
          applicationId: process.applicationId,
          queueCode: RECONTEST_QUEUE,
          branchId: null,
          eligibleRoleId: null,
          assigneeUserId: null,
        });
      case "FINISH":
        return this.applications.transition(tx, process.applicationId, result.applicationStatus, { userId });
      case "ERROR":
        // Tugas antrean PROCESS_ERROR untuk ERROR akhir dibuat di kartu BE-S2-02 (butuh tabel human_tasks).
        if (retryDelay !== null) await this.jobs.advance(tx, process, retryDelay);
        return;
    }
  }
}

/** Kolom StepExecution per hasil; langkah selesai mencatat waktu selesai dan aging (ER-06). */
function stepChanges(step: StepRow, result: StepResult, actorUserId: string | null, now: Date): StepChanges {
  const common: StepChanges = { resultType: result.type, ...(actorUserId ? { actorUserId } : {}) };
  const completed = { endedAt: now, aging: calendarDayAging(step.startedAt ?? now, now) };
  switch (result.type) {
    case "CONTINUE":
    case "RECONTEST":
    case "FINISH":
      return { ...common, ...completed, outcomeCode: result.outcomeCode, summary: result.summary };
    case "BACK_TO_DRAFT":
      return { ...common, ...completed, outcomeCode: result.outcomeCode, summary: result.returnNote };
    case "WAIT_HUMAN":
      return { ...common, summary: result.summary };
    case "WAIT_EXTERNAL":
      return {
        ...common,
        summary: result.summary,
        externalReference: result.externalReference,
        waitDeadline: result.waitDeadline,
      };
    case "ERROR":
      return { ...common, errorCategory: result.errorCategory, errorMessage: result.errorMessage };
  }
}
