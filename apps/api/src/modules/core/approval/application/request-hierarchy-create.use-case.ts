import type { ApprovalHierarchyCreate, ChangeRequestAccepted } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { APPROVAL_HIERARCHY_ENTITY_TYPE, HierarchyChecks } from "./hierarchy-checks.js";

/** Maker menetapkan approver satu level dan sub level lewat ChangeRequest (api-specs 16 §16.2, AC-27.01). */
@Injectable()
export class RequestHierarchyCreateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly checks: HierarchyChecks,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, body: ApprovalHierarchyCreate): Promise<ChangeRequestAccepted> {
    const fields = { ...body, upLevel: body.upLevel ?? null, upSubLevel: body.upSubLevel ?? null, isActive: true };
    return this.db.withTenantTx(ctx, async (tx) => {
      const newData = await this.checks.validate(tx, fields, { excludeId: null, includePending: true });
      return this.changeRequests.submit(tx, ctx, {
        entityType: APPROVAL_HIERARCHY_ENTITY_TYPE,
        entityId: null,
        oldData: null,
        newData,
      });
    });
  }
}
