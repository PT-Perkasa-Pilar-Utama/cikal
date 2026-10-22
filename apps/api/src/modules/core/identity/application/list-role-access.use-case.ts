import type { RoleAccessListQuery, RoleAccessListResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { type RoleAccessPage, RoleAccessRepository } from "../db/role-access.repository.js";
import { RoleAccessChecks } from "./role-access-checks.js";

const SORTS = {
  "roleName,asc": ["roleName", "asc"],
  "roleName,desc": ["roleName", "desc"],
  "menuName,asc": ["menuName", "asc"],
  "menuName,desc": ["menuName", "desc"],
} as const satisfies Record<
  RoleAccessListQuery["sort"],
  readonly [RoleAccessPage["sort"], RoleAccessPage["direction"]]
>;

/** Halaman "Role Access" (api-specs 03 §3.3): hanya hak yang sudah disetujui (api-specs 01 §1.8). */
@Injectable()
export class ListRoleAccessUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly roleAccess: RoleAccessRepository,
    private readonly checks: RoleAccessChecks,
  ) {}

  execute(ctx: RequestContext, query: RoleAccessListQuery): Promise<RoleAccessListResponse> {
    const [sort, direction] = SORTS[query.sort];
    const filter = { roleId: query.roleId, menuId: query.menuId };
    const page = { offset: (query.page - 1) * query.pageSize, limit: query.pageSize, sort, direction };

    return this.db.withTenantTx(ctx, async (tx) => {
      const rows = await this.roleAccess.list(tx, filter, page);
      const totalItems = await this.roleAccess.count(tx, filter);
      const pending = await this.checks.pendingIds(
        tx,
        rows.map((row) => row.id),
      );
      return {
        data: rows.map((row) => ({ ...row, hasPendingChange: pending.has(row.id) })),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / query.pageSize),
        },
      };
    });
  }
}
