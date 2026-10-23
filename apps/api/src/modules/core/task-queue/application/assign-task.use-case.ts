import type { TaskStateResponse, TaskVersionRequest } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import { AuditTrail } from "../../audit/index.js";
import { HumanTasksRepository } from "../db/human-tasks.repository.js";
import { QUEUE_CATALOG, TASK_AUDIT_MODULE } from "../domain/queue-catalog.js";
import { taskErrors } from "../domain/task-errors.js";
import { isEligible } from "../domain/task-rules.js";
import { TaskAccess } from "./task-access.js";
import { taskState } from "./task-state.js";

/** "Assign to Me" (api-specs 14 §14.3): pengambil pertama menang lewat penguncian optimistis (AC-58.04). */
@Injectable()
export class AssignTaskUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly tasks: HumanTasksRepository,
    private readonly access: TaskAccess,
    private readonly audit: AuditTrail,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  async execute(ctx: RequestContext, id: string, { version }: TaskVersionRequest): Promise<TaskStateResponse> {
    const { task, viewer } = await this.access.visibleTask(ctx, id);
    await this.access.requireWork(ctx, viewer, task.queueCode);
    if (task.status === "CLOSED" || !QUEUE_CATALOG[task.queueCode].selfAssign) {
      throw DomainError.standard("INVALID_STATE");
    }
    if (!isEligible(task, viewer)) throw DomainError.standard("ACTION_DENIED");

    return this.db.withTenantTx(ctx, async (tx) => {
      const assigned = await this.tasks.assign(tx, id, version, ctx.userId);
      if (!assigned) throw await this.lostRace(tx, id);
      await this.audit.record(tx, ctx, {
        module: TASK_AUDIT_MODULE,
        action: "ASSIGN",
        recordId: id,
        description: `${assigned.queueCode} task ${assigned.loanId} assigned`,
        oldData: { status: task.status, assignedUserId: null },
        newData: { status: assigned.status, assignedUserId: assigned.assignedUserId },
      });
      return taskState(tx, this.users, assigned);
    });
  }

  /** Penyebab update nol baris: tugas sudah diambil, ditutup, atau berubah versinya. */
  private async lostRace(tx: Tx, id: string): Promise<DomainError> {
    const current = await this.tasks.findById(tx, id);
    if (current?.status === "ASSIGNED" && current.assignedUserId) {
      const owner = (await this.users.describe(tx, [current.assignedUserId])).get(current.assignedUserId);
      return taskErrors.alreadyAssigned(owner?.username ?? current.assignedUserId);
    }
    if (current?.status === "OPEN") return taskErrors.versionConflict();
    return DomainError.standard("INVALID_STATE");
  }
}
