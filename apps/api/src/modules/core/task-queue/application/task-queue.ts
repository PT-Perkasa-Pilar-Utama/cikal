import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { OrchestratorApi } from "../../orchestrator/index.js";
import { HumanTasksRepository } from "../db/human-tasks.repository.js";
import { taskErrors } from "../domain/task-errors.js";

export interface TaskClosing {
  userId: string;
  resultCode: string;
  payload: unknown;
  /** Teks AC modul penutup untuk `ALREADY_PROCESSED` (api-specs 14 §14.5). */
  alreadyProcessedMessage?: string;
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
    const task = await this.tasks.lock(tx, taskId);
    if (!task) throw DomainError.standard("NOT_FOUND");
    if (task.status === "CLOSED") throw DomainError.standard("ALREADY_PROCESSED", closing.alreadyProcessedMessage);
    if (task.status !== "ASSIGNED" || task.assignedUserId !== closing.userId) throw taskErrors.notAssignedToYou();
    await this.tasks.close(tx, taskId, closing.resultCode, closing.userId);
    await this.orchestrator.completeHumanStep(
      tx,
      task.stepExecutionId,
      closing.resultCode,
      closing.payload,
      closing.userId,
    );
  }
}
