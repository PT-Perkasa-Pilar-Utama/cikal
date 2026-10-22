import { roleAccessDataSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ApplyResult, ChangeRequestSnapshot, EntityHandler, JsonRecord } from "../../change-request/index.js";
import { RoleAccessRepository } from "../db/role-access.repository.js";
import { ROLE_ACCESS_AUDIT_MODULE, roleAccessDisplayName } from "../domain/role-access-rules.js";
import { RoleAccessChecks } from "./role-access-checks.js";

/**
 * Handler ChangeRequest `ROLE_ACCESS` (api-specs 07 §7.1, 03 §3.4, §3.5). Hak menu dibaca dari database di setiap
 * request, jadi sesi aktif memakai hak baru pada request berikutnya setelah disetujui (api-specs 03 §3.4 langkah 5).
 */
@Injectable()
export class RoleAccessChangeHandler implements EntityHandler {
  readonly entityType = "ROLE_ACCESS";
  readonly auditModule = ROLE_ACCESS_AUDIT_MODULE;

  constructor(
    private readonly roleAccess: RoleAccessRepository,
    private readonly checks: RoleAccessChecks,
  ) {}

  displayName(newData: JsonRecord): string {
    const parsed = roleAccessDataSchema.safeParse(newData);
    return parsed.success ? roleAccessDisplayName(parsed.data) : "";
  }

  async validate(tx: Tx, request: ChangeRequestSnapshot): Promise<void> {
    const data = roleAccessDataSchema.parse(request.newData);
    this.checks.assertViewGranted(data);
    await this.checks.target(tx, data.roleId, data.menuId);
    if (request.entityId === null) {
      await this.checks.assertUnused(tx, data.roleId, data.menuId, { includePending: false });
    }
  }

  async apply(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<ApplyResult> {
    const { roleId, menuId, canView, canCreate, canUpdate, canDelete, canApprove } = roleAccessDataSchema.parse(
      request.newData,
    );
    const flags = { canView, canCreate, canUpdate, canDelete, canApprove };
    if (request.entityId === null) {
      const id = uuidv7();
      await this.roleAccess.insert(tx, {
        ...flags,
        id,
        tenantId: reviewer.tenantId,
        roleId,
        menuId,
        userId: reviewer.userId,
      });
      return { entityId: id };
    }
    if (!(await this.roleAccess.findById(tx, request.entityId))) throw DomainError.standard("NOT_FOUND");
    await this.roleAccess.updateFlags(tx, request.entityId, flags, reviewer.userId);
    return { entityId: request.entityId };
  }
}
