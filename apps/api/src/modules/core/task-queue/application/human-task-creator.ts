import { queueCodeSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { HumanTaskRequest, TaskQueuePort } from "../../../../platform/http/task-queue-port.js";
import { ApplicationProcess } from "../../application/index.js";
import { HumanTasksRepository } from "../db/human-tasks.repository.js";

/**
 * `taskQueue.create` (technical-specs 05 §5.12) di transaksi langkah lewat `TASK_QUEUE_PORT`. Antrean yang
 * ditugaskan per user (contoh APPROVAL) langsung `ASSIGNED` ke user itu.
 */
@Injectable()
export class HumanTaskCreator implements TaskQueuePort {
  constructor(
    private readonly tasks: HumanTasksRepository,
    private readonly applications: ApplicationProcess,
  ) {}

  async create(tx: Tx, request: HumanTaskRequest): Promise<void> {
    const queueCode = queueCodeSchema.safeParse(request.queueCode);
    if (!queueCode.success) throw new Error(`Queue ${request.queueCode} is not in the HumanTask catalog`);
    const application = await this.applications.find(tx, request.applicationId);
    // Foreign key langkah menjamin pengajuan ada di tenant yang sama.
    if (!application) throw new Error(`Application ${request.applicationId} not found`);
    const assignee = request.assigneeUserId;
    await this.tasks.insert(tx, {
      id: uuidv7(),
      tenantId: application.tenantId,
      stepExecutionId: request.stepExecutionId,
      applicationId: application.id,
      loanId: application.loanId,
      queueCode: queueCode.data,
      branchId: request.branchId,
      eligibleRoleId: request.eligibleRoleId,
      assignedUserId: assignee,
      assignedAt: assignee ? new Date() : null,
      status: assignee ? "ASSIGNED" : "OPEN",
    });
  }
}
