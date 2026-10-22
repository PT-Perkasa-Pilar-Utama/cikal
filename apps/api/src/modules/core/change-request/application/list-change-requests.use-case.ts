import type { ChangeRequestListQuery, ChangeRequestListResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import { ChangeRequestsRepository } from "../db/change-requests.repository.js";
import { sharedMenu } from "../domain/entity-menus.js";
import { ChangeRequestRegistry } from "./change-request-registry.js";
import { toListItem } from "./change-request-view.js";

/** Halaman "Pending <Data>" per jenis entity (api-specs 07 §7.2); hak mengikuti menu entity (§7.1). */
@Injectable()
export class ListChangeRequestsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly requests: ChangeRequestsRepository,
    private readonly registry: ChangeRequestRegistry,
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  async execute(ctx: RequestContext, query: ChangeRequestListQuery): Promise<ChangeRequestListResponse> {
    const menu = sharedMenu(query.entityType);
    if (!menu) {
      throw DomainError.standard("VALIDATION_FAILED", undefined, [
        { field: "entityType", code: "MIXED_MENUS", message: "Entity types must belong to the same menu" },
      ]);
    }
    await this.access.authorize(ctx, menu, "VIEW");
    const viewer = { userId: ctx.userId, canApprove: await this.access.allows(ctx, menu, "APPROVE") };
    const filter = { entityTypes: query.entityType, statuses: query.status, submittedBy: query.submittedBy };
    const page = {
      offset: (query.page - 1) * query.pageSize,
      limit: query.pageSize,
      direction: query.sort === "submittedAt,asc" ? "asc" : "desc",
    } as const;

    return this.db.withTenantTx(ctx, async (tx) => {
      const rows = await this.requests.list(tx, filter, page);
      const totalItems = await this.requests.count(tx, filter);
      const users = await this.users.describe(
        tx,
        rows.map((row) => row.submittedBy),
      );
      return {
        data: rows.map((row) => toListItem(row, this.registry.get(row.entityType), users, viewer)),
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
