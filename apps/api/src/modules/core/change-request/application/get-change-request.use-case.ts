import type { ChangeRequestDetailResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import { ChangeRequestsRepository } from "../db/change-requests.repository.js";
import { ENTITY_MENU } from "../domain/entity-menus.js";
import { ChangeRequestRegistry } from "./change-request-registry.js";
import { toDetail } from "./change-request-view.js";

/** `GET /change-requests/{id}` (api-specs 07 §7.3). Permintaan tenant lain tidak terlihat RLS, jadi `404`. */
@Injectable()
export class GetChangeRequestUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly requests: ChangeRequestsRepository,
    private readonly registry: ChangeRequestRegistry,
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  async execute(ctx: RequestContext, id: string): Promise<ChangeRequestDetailResponse> {
    const found = await this.db.withTenantTx(ctx, async (tx) => {
      const row = await this.requests.findById(tx, id);
      return row ? { row, users: await this.users.describe(tx, [row.submittedBy]) } : null;
    });
    if (!found) throw DomainError.standard("NOT_FOUND");
    const menu = ENTITY_MENU[found.row.entityType];
    await this.access.authorize(ctx, menu, "VIEW");
    const viewer = { userId: ctx.userId, canApprove: await this.access.allows(ctx, menu, "APPROVE") };
    return { data: toDetail(found.row, this.registry.get(found.row.entityType), found.users, viewer) };
  }
}
