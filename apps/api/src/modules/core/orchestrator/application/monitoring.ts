import type { ProcessStatus } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { TASK_QUEUE_PORT, type TaskQueuePort } from "../../../../platform/http/task-queue-port.js";
import { ApplicationProcess } from "../../application/index.js";
import { ProcessInstancesRepository, type ProcessRow } from "../db/process-instances.repository.js";
import { StepExecutionsRepository, type StepRow } from "../db/step-executions.repository.js";
import { currentStep } from "../domain/route-plan.js";
import { PROCESS_ERROR_QUEUE } from "./step-results.js";
import { StepRunner } from "./step-runner.js";

const ACTIVE: ReadonlySet<ProcessStatus> = new Set(["RUNNING", "WAITING"]);

/**
 * `retry(stepId, by)` dan `finish(processId, reason, by)` (technical-specs 12 §12.6) untuk Process Monitoring
 * (US-86), di transaksi pemanggil dengan ProcessInstance terkunci.
 */
@Injectable()
export class ProcessMonitoring {
  constructor(
    private readonly processes: ProcessInstancesRepository,
    private readonly steps: StepExecutionsRepository,
    private readonly applications: ApplicationProcess,
    private readonly runner: StepRunner,
    @Inject(TASK_QUEUE_PORT) private readonly tasks: TaskQueuePort,
  ) {}

  /**
   * Menjalankan ulang langkah saat ini yang ERROR dengan attempt + 1 (api-specs 13 §13.4). Bila berhasil, tugas
   * PROCESS_ERROR pengajuan ditutup (AC-86.01); bila ERROR lagi, attempt baru tetap ERROR (AC-86.03).
   */
  async retry(tx: Tx, processInstanceId: string, stepExecutionId: string, userId: string): Promise<StepRetried> {
    const process = await this.lockProcess(tx, processInstanceId);
    const step = await this.steps.findById(tx, stepExecutionId);
    if (step?.processInstanceId !== processInstanceId) throw DomainError.standard("NOT_FOUND");
    const current = currentStep(await this.steps.listLatest(tx, processInstanceId));
    if (!ACTIVE.has(process.status) || current?.id !== step.id || step.status !== "ERROR") {
      throw DomainError.standard("INVALID_STATE");
    }
    const retried = await this.runner.retry(tx, process, step);
    if (retried.status !== "ERROR") {
      await this.tasks.closeOpen(
        tx,
        { applicationId: process.applicationId, queueCode: PROCESS_ERROR_QUEUE },
        "STEP_RETRIED",
        userId,
      );
    }
    return { process, step: retried };
  }

  /**
   * Menghentikan proses dengan alasan (api-specs 13 §13.5): ProcessInstance CANCELLED, Application
   * FINISHED_CANCELLED, dan semua tugas terbuka pengajuan ditutup (AC-86.02).
   */
  async finish(tx: Tx, processInstanceId: string, reason: string, userId: string): Promise<ProcessRow> {
    const process = await this.lockProcess(tx, processInstanceId);
    if (!ACTIVE.has(process.status)) throw DomainError.standard("INVALID_STATE");
    await this.processes.finish(tx, process.id, reason, userId);
    await this.applications.transition(tx, process.applicationId, "FINISHED_CANCELLED", { userId });
    await this.tasks.closeOpen(tx, { applicationId: process.applicationId }, "PROCESS_FINISHED", userId);
    return process;
  }

  private async lockProcess(tx: Tx, processInstanceId: string): Promise<ProcessRow> {
    const process = await this.processes.lock(tx, processInstanceId);
    if (!process) throw DomainError.standard("NOT_FOUND");
    return process;
  }
}

export interface StepRetried {
  process: ProcessRow;
  step: StepRow;
}
