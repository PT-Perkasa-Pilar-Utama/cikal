import type { ChangeRequestAccepted, RoleAccessCreateRequest, RoleAccessData } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { RoleAccessChecks } from "./role-access-checks.js";

/** Maker memberi akses menu ke role lewat ChangeRequest `ROLE_ACCESS`/`CREATE` (api-specs 03 §3.4, AC-09.01). */
@Injectable()
export class RequestRoleAccessCreateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly checks: RoleAccessChecks,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, body: RoleAccessCreateRequest): Promise<ChangeRequestAccepted> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const { role, menu } = await this.checks.target(tx, body.roleId, body.menuId);
      this.checks.assertViewGranted(body);
      await this.checks.assertUnused(tx, role.id, menu.id, { includePending: true });
      const data: RoleAccessData = {
        ...body,
        roleName: role.roleName,
        menuCode: menu.menuCode,
        menuName: menu.menuName,
      };
      return this.changeRequests.submit(tx, ctx, {
        entityType: "ROLE_ACCESS",
        entityId: null,
        oldData: null,
        newData: data,
      });
    });
  }
}
