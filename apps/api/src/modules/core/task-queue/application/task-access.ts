import type { QueueCode } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import { BranchDirectory } from "../../organization/index.js";
import { HumanTasksRepository, type TaskRow } from "../db/human-tasks.repository.js";
import { QUEUE_CATALOG, SUPERVISOR_MENU } from "../domain/queue-catalog.js";
import { isVisible, type TaskViewer } from "../domain/task-rules.js";

/** Hak user sesi atas satu antrean (technical-specs 09 §9.4 baris Antrean). */
@Injectable()
export class TaskAccess {
  constructor(
    private readonly db: TenantTx,
    private readonly tasks: HumanTasksRepository,
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
    private readonly branches: BranchDirectory,
  ) {}

  async viewer(ctx: RequestContext, queueCode: QueueCode): Promise<TaskViewer> {
    const { menuCode } = QUEUE_CATALOG[queueCode];
    const [canView, canWork, isSupervisor, scope] = await Promise.all([
      this.access.allows(ctx, menuCode, "VIEW"),
      this.access.allows(ctx, menuCode, "UPDATE"),
      this.access.allows(ctx, SUPERVISOR_MENU, "UPDATE"),
      this.db.withTenantTx(ctx, async (tx) => {
        const user = await this.users.scope(tx, ctx.userId);
        const regional = user?.regionalId && !user.branchId && !user.subBranchId ? user.regionalId : null;
        return user && { ...user, regionalBranchIds: regional ? await this.branches.idsInRegional(tx, regional) : [] };
      }),
    ]);
    if (!scope) throw DomainError.standard("UNAUTHENTICATED");
    const { roleId, ...workUnit } = scope;
    return { userId: ctx.userId, roleId, workUnit, canView, canWork, isSupervisor };
  }

  /** Tugas yang tampil di antrean user; tugas lain `NOT_FOUND` (api-specs 14 §14.3). */
  async visibleTask(ctx: RequestContext, id: string): Promise<{ task: TaskRow; viewer: TaskViewer }> {
    const task = await this.db.withTenantTx(ctx, (tx) => this.tasks.findById(tx, id));
    if (!task) throw DomainError.standard("NOT_FOUND");
    const viewer = await this.viewer(ctx, task.queueCode);
    if (!isVisible(task, viewer)) throw DomainError.standard("NOT_FOUND");
    return { task, viewer };
  }

  /** Melempar error hak menu antrean dari guard, contoh `ACTION_DENIED` atau `MODULE_NOT_LICENSED`. */
  async requireWork(ctx: RequestContext, viewer: TaskViewer, queueCode: QueueCode): Promise<void> {
    if (viewer.canWork) return;
    await this.access.authorize(ctx, QUEUE_CATALOG[queueCode].menuCode, "UPDATE");
    throw DomainError.standard("ACTION_DENIED");
  }
}
