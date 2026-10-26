import type { ApprovalHierarchyUpdate, ChangeRequestAccepted } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { HierarchiesRepository } from "../db/hierarchies.repository.js";
import { APPROVAL_HIERARCHY_ENTITY_TYPE, HierarchyChecks } from "./hierarchy-checks.js";

/** Maker mengganti approver, level berikutnya, atau status baris hierarki lewat ChangeRequest (api-specs 16 §16.3). */
@Injectable()
export class RequestHierarchyUpdateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly hierarchies: HierarchiesRepository,
    private readonly checks: HierarchyChecks,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, id: string, body: ApprovalHierarchyUpdate): Promise<ChangeRequestAccepted> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const current = await this.hierarchies.findById(tx, id);
      if (!current) throw DomainError.standard("NOT_FOUND");
      await this.checks.assertNoPendingChange(tx, id);
      const { id: _id, ...currentFields } = current;
      const fields = {
        ...currentFields,
        approverUserId: body.approverUserId,
        upLevel: body.upLevel ?? null,
        upSubLevel: body.upSubLevel ?? null,
        isActive: body.isActive,
      };
      const newData = await this.checks.validate(tx, fields, { excludeId: id, includePending: true });
      return this.changeRequests.submit(tx, ctx, {
        entityType: APPROVAL_HIERARCHY_ENTITY_TYPE,
        entityId: id,
        oldData: await this.checks.describe(tx, currentFields),
        newData,
      });
    });
  }
}
