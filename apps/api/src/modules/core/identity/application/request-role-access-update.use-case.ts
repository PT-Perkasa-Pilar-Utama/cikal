import type { ChangeRequestAccepted, RoleAccessData, RoleAccessUpdateRequest } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { RoleAccessRepository } from "../db/role-access.repository.js";
import { roleAccessError, sameFlags } from "../domain/role-access-rules.js";
import { RoleAccessChecks } from "./role-access-checks.js";

/** Maker mengubah toggle aksi lewat ChangeRequest `ROLE_ACCESS`/`UPDATE` (api-specs 03 §3.5). */
@Injectable()
export class RequestRoleAccessUpdateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly roleAccess: RoleAccessRepository,
    private readonly checks: RoleAccessChecks,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, id: string, body: RoleAccessUpdateRequest): Promise<ChangeRequestAccepted> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const current = await this.roleAccess.findById(tx, id);
      if (!current) throw DomainError.standard("NOT_FOUND");
      if ((await this.checks.pendingIds(tx, [id])).has(id)) throw DomainError.standard("PENDING_CHANGE_REQUEST");
      this.checks.assertViewGranted(body);
      if (sameFlags(current, body)) throw roleAccessError("NO_CHANGES");
      const target = {
        roleId: current.role.id,
        roleName: current.role.roleName,
        menuId: current.menu.id,
        menuCode: current.menu.menuCode,
        menuName: current.menu.menuName,
      };
      const oldData: RoleAccessData = {
        ...target,
        canView: current.canView,
        canCreate: current.canCreate,
        canUpdate: current.canUpdate,
        canDelete: current.canDelete,
        canApprove: current.canApprove,
      };
      return this.changeRequests.submit(tx, ctx, {
        entityType: "ROLE_ACCESS",
        entityId: id,
        oldData,
        newData: { ...target, ...body },
      });
    });
  }
}
