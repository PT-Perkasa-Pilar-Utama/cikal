import type { RoleListQuery, RoleListResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { RolesRepository } from "../db/roles.repository.js";
import { AccessService } from "./access.service.js";

/** Dropdown "Role" (api-specs 03 §3.1): boleh dengan View di Role Access atau di Role. */
@Injectable()
export class ListRolesUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly roles: RolesRepository,
    private readonly access: AccessService,
  ) {}

  async execute(ctx: RequestContext, query: RoleListQuery): Promise<RoleListResponse> {
    if (!(await this.access.allows(ctx, "IAM-ROLE", "VIEW"))) {
      await this.access.authorize(ctx, "IAM-ROLE-ACCESS", "VIEW");
    }
    const filter = { isActive: query.isActive, q: query.q };
    const page = {
      offset: (query.page - 1) * query.pageSize,
      limit: query.pageSize,
      direction: query.sort === "roleName,desc" ? "desc" : "asc",
    } as const;
    return this.db.withTenantTx(ctx, async (tx) => {
      const totalItems = await this.roles.count(tx, filter);
      return {
        data: await this.roles.list(tx, filter, page),
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
