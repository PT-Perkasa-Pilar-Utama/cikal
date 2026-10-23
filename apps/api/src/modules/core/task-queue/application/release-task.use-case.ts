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
import { canReleaseOther } from "../domain/task-rules.js";
import { TaskAccess } from "./task-access.js";
import { taskState } from "./task-state.js";

/**
 * "Release Me" oleh pemilik dan "Release" oleh Supervisor (api-specs 14 §14.4). Progres yang tersimpan di modul
 * langkah tetap ada; audit mencatat pelepas (AC-58.05).
 */
@Injectable()
export class ReleaseTaskUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly tasks: HumanTasksRepository,
    private readonly access: TaskAccess,
    private readonly audit: AuditTrail,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  async execute(ctx: RequestContext, id: string, { version }: TaskVersionRequest): Promise<TaskStateResponse> {
    const { task, viewer } = await this.access.visibleTask(ctx, id);
    if (task.assignedUserId === ctx.userId) await this.access.requireWork(ctx, viewer, task.queueCode);
    else if (!canReleaseOther(task, viewer)) throw DomainError.standard("ACTION_DENIED");
    const ownerId = task.status === "ASSIGNED" ? task.assignedUserId : null;
    if (!ownerId || !QUEUE_CATALOG[task.queueCode].selfAssign) throw DomainError.standard("INVALID_STATE");

    return this.db.withTenantTx(ctx, async (tx) => {
      const released = await this.tasks.release(tx, id, version, ctx.userId);
      if (!released) throw await this.lostRace(tx, id, version);
      const owner = (await this.users.describe(tx, [ownerId])).get(ownerId)?.username ?? ownerId;
      await this.audit.record(tx, ctx, {
        module: TASK_AUDIT_MODULE,
        action: "RELEASE",
        recordId: id,
        description: `${released.queueCode} task ${released.loanId} released from ${owner}`,
        oldData: { status: task.status, assignedUserId: ownerId },
        newData: { status: released.status, assignedUserId: null },
      });
      return taskState(tx, this.users, released);
    });
  }

  private async lostRace(tx: Tx, id: string, version: number): Promise<DomainError> {
    const current = await this.tasks.findById(tx, id);
    if (current && current.version !== version) return taskErrors.versionConflict();
    return DomainError.standard("INVALID_STATE");
  }
}
