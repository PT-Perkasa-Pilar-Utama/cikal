import type { TaskItem, TaskListQuery, TaskListResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import { ApplicationProcess } from "../../application/index.js";
import { BranchDirectory } from "../../organization/index.js";
import { ProductCodes } from "../../product/index.js";
import { HumanTasksRepository, type TaskFilter, type TaskPage, type TaskRow } from "../db/human-tasks.repository.js";
import { QUEUE_CATALOG } from "../domain/queue-catalog.js";
import { allowedActions, type TaskViewer, visibilityScope } from "../domain/task-rules.js";
import { TaskAccess } from "./task-access.js";

const SORTS = {
  "createdAt,asc": ["createdAt", "asc"],
  "createdAt,desc": ["createdAt", "desc"],
  "loanId,asc": ["loanId", "asc"],
  "loanId,desc": ["loanId", "desc"],
} as const satisfies Record<TaskListQuery["sort"], readonly [TaskPage["sort"], TaskPage["direction"]]>;

/**
 * Halaman antrean, contoh "Verification Document" (api-specs 14 §14.2). Supervisor tanpa hak menu antrean tetap
 * melihat tugas cabangnya untuk dilepas.
 */
@Injectable()
export class ListTasksUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly tasks: HumanTasksRepository,
    private readonly access: TaskAccess,
    private readonly applications: ApplicationProcess,
    private readonly products: ProductCodes,
    @Inject(ACCESS_PORT) private readonly menus: AccessPort,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
    private readonly branches: BranchDirectory,
  ) {}

  async execute(ctx: RequestContext, query: TaskListQuery): Promise<TaskListResponse> {
    const { menuCode, selfAssign } = QUEUE_CATALOG[query.queueCode];
    const viewer = await this.access.viewer(ctx, query.queueCode);
    if (!viewer.canView && !(selfAssign && viewer.isSupervisor)) await this.menus.authorize(ctx, menuCode, "VIEW");

    const [sort, direction] = SORTS[query.sort];
    const filter: TaskFilter = {
      queueCode: query.queueCode,
      statuses: query.status,
      ...(query.assignedToMe ? { assignedTo: ctx.userId } : {}),
      ...(query.q ? { loanId: query.q } : {}),
      scope: visibilityScope(query.queueCode, viewer),
    };
    const page = { offset: (query.page - 1) * query.pageSize, limit: query.pageSize, sort, direction };

    return this.db.withTenantTx(ctx, async (tx) => {
      const rows = await this.tasks.list(tx, filter, page);
      const totalItems = await this.tasks.count(tx, filter);
      return {
        data: await this.items(tx, rows, viewer),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / query.pageSize),
        },
      };
    });
  }

  /** Data pengajuan, produk, cabang, dan pengambil dibaca lewat antarmuka modul pemiliknya (XM-02). */
  private async items(tx: Tx, rows: TaskRow[], viewer: TaskViewer): Promise<TaskItem[]> {
    const applications = new Map(
      (
        await this.applications.findMany(
          tx,
          rows.map((row) => row.applicationId),
        )
      ).map((app) => [app.id, app]),
    );
    const productCodes = await this.products.describe(
      tx,
      [...applications.values()].map((app) => app.productId),
    );
    const assignees = await this.users.describe(
      tx,
      rows.flatMap((row) => (row.assignedUserId ? [row.assignedUserId] : [])),
    );
    const branches = await this.branches.describe(
      tx,
      rows.flatMap((row) => (row.branchId ? [row.branchId] : [])),
    );
    return rows.map((row) => {
      const productId = applications.get(row.applicationId)?.productId ?? "";
      const assignee = row.assignedUserId ? assignees.get(row.assignedUserId) : undefined;
      return {
        id: row.id,
        queueCode: row.queueCode,
        applicationId: row.applicationId,
        loanId: row.loanId,
        fullName: null,
        productCode: productCodes.get(productId) ?? "",
        branchCode: row.branchId ? (branches.get(row.branchId)?.branchCode ?? null) : null,
        status: row.status,
        assignedTo: assignee ? { id: assignee.id, username: assignee.username } : null,
        assignedAt: row.assignedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        version: row.version,
        allowedActions: allowedActions(row, viewer),
      };
    });
  }
}
