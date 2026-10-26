import type { QueueCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { OrchestratorApi } from "../../orchestrator/index.js";
import { HumanTasksRepository, type TaskRow } from "../db/human-tasks.repository.js";
import { taskErrors } from "../domain/task-errors.js";

export interface TaskClosing {
  userId: string;
  resultCode: string;
  payload: unknown;
  /** Teks AC modul penutup untuk `ALREADY_PROCESSED` (api-specs 14 §14.5). */
  alreadyProcessedMessage?: string;
}

/** Tugas belum ditutup satu pengajuan pada satu antrean, contoh tugas `APPROVAL` approver. */
export interface TaskScope {
  applicationId: string;
  queueCode: QueueCode;
}

/** Antarmuka publik Task Queue untuk modul penutup tugas (technical-specs 05 §5.12). */
@Injectable()
export class TaskQueue {
  constructor(
    private readonly tasks: HumanTasksRepository,
    private readonly orchestrator: OrchestratorApi,
  ) {}

  /**
   * `taskQueue.close`: aturan bersama api-specs 14 §14.5 sebelum logika modul, lalu `completeHumanStep` di
   * transaksi yang sama sehingga tugas dan langkahnya selesai bersama.
   */
  async close(tx: Tx, taskId: string, closing: TaskClosing): Promise<void> {
    await this.complete(tx, this.checked(await this.tasks.lock(tx, taskId), closing), closing);
  }

  /** `close` untuk tugas belum ditutup pengajuan pada antrean itu; tanpa tugas = sudah diproses. */
  async closeFor(tx: Tx, scope: TaskScope, closing: TaskClosing): Promise<void> {
    const task = await this.openOf(tx, scope, closing);
    await this.complete(tx, task, closing);
  }

  /**
   * Menutup tugas user sesi dan memberi langkah yang sama tugas baru untuk `nextUserId`, tanpa menyelesaikan
   * langkahnya: contoh level approval bawah yang menyetujui (api-specs 16 §16.6 langkah 7).
   */
  async handOver(tx: Tx, scope: TaskScope, closing: TaskClosing, nextUserId: string): Promise<void> {
    const task = await this.openOf(tx, scope, closing);
    await this.tasks.close(tx, task.id, closing.resultCode, closing.userId);
    await this.tasks.insert(tx, {
      id: uuidv7(),
      tenantId: task.tenantId,
      stepExecutionId: task.stepExecutionId,
      applicationId: task.applicationId,
      loanId: task.loanId,
      queueCode: task.queueCode,
      branchId: task.branchId,
      eligibleRoleId: task.eligibleRoleId,
      assignedUserId: nextUserId,
      assignedAt: new Date(),
      status: "ASSIGNED",
    });
  }

  private async openOf(tx: Tx, scope: TaskScope, closing: TaskClosing): Promise<TaskRow> {
    const task = await this.tasks.lockOpenOf(tx, scope.applicationId, scope.queueCode);
    if (!task) throw DomainError.standard("ALREADY_PROCESSED", closing.alreadyProcessedMessage);
    return this.checked(task, closing);
  }

  private checked(task: TaskRow | null, closing: TaskClosing): TaskRow {
    if (!task) throw DomainError.standard("NOT_FOUND");
    if (task.status === "CLOSED") throw DomainError.standard("ALREADY_PROCESSED", closing.alreadyProcessedMessage);
    if (task.status !== "ASSIGNED" || task.assignedUserId !== closing.userId) throw taskErrors.notAssignedToYou();
    return task;
  }

  private async complete(tx: Tx, task: TaskRow, closing: TaskClosing): Promise<void> {
    await this.tasks.close(tx, task.id, closing.resultCode, closing.userId);
    await this.orchestrator.completeHumanStep(
      tx,
      task.stepExecutionId,
      closing.resultCode,
      closing.payload,
      closing.userId,
    );
  }
}
