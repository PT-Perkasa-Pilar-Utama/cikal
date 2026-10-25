import type { MenuAccess, UserListQuery, UserListResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { BranchDirectory } from "../../organization/index.js";
import { Licensing } from "../../tenancy/index.js";
import { AccessRepository } from "../db/access.repository.js";
import { type UserListFilter, UserListRepository } from "../db/user-list.repository.js";
import { ACCESS_FLAG_OF } from "../domain/access-policy.js";
import { AccessService } from "./access.service.js";

/**
 * Dropdown user (api-specs 03 §3.6), terutama "Approver" di Approval Hierarchy dengan
 * `withAccess=OPS-APPROVAL:APPROVE` (AC-27.01, AC-27.02). Boleh dengan View di User atau di Approval Setup.
 */
@Injectable()
export class ListUsersUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly users: UserListRepository,
    private readonly access: AccessService,
    private readonly menus: AccessRepository,
    private readonly licensing: Licensing,
    private readonly branches: BranchDirectory,
  ) {}

  async execute(ctx: RequestContext, query: UserListQuery): Promise<UserListResponse> {
    if (!(await this.access.allows(ctx, "IAM-USER", "VIEW"))) {
      await this.access.authorize(ctx, "MST-APPROVAL", "VIEW");
    }
    const [sort, direction] =
      query.sort === "fullName,asc" || query.sort === "fullName,desc"
        ? (["fullName", query.sort === "fullName,desc" ? "desc" : "asc"] as const)
        : (["username", query.sort === "username,desc" ? "desc" : "asc"] as const);
    const page = { offset: (query.page - 1) * query.pageSize, limit: query.pageSize, sort, direction };
    const meta = (totalItems: number) => ({
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    });
    return this.db.withTenantTx(ctx, async (tx) => {
      const { q, status, branchId } = query;
      const filter: UserListFilter = { q, status, branchId };
      if (query.withAccess) {
        const withAccess = await this.grantFilter(tx, query.withAccess);
        if (!withAccess) return { data: [], meta: meta(0) };
        filter.withAccess = withAccess;
      }
      const rows = await this.users.list(tx, filter, page);
      const branches = await this.branches.describe(
        tx,
        rows.flatMap((row) => (row.branchId ? [row.branchId] : [])),
      );
      return {
        data: rows.map(({ branchId, ...row }) => ({
          ...row,
          branchCode: branchId ? (branches.get(branchId)?.branchCode ?? null) : null,
        })),
        meta: meta(await this.users.count(tx, filter)),
      };
    });
  }

  /** `null` bila tidak ada user yang bisa punya hak itu: menu tidak ada, nonaktif, atau modulnya tidak berlisensi. */
  private async grantFilter(tx: Tx, access: MenuAccess): Promise<UserListFilter["withAccess"] | null> {
    const menu = await this.menus.findMenu(tx, access.menuCode);
    if (!menu?.isActive) return null;
    const licensed: ReadonlySet<string> = (await this.licensing.state(tx)).modules;
    if (!licensed.has(menu.moduleCode)) return null;
    return { menuId: menu.id, flag: ACCESS_FLAG_OF[access.action], today: businessDate(new Date()) };
  }
}
