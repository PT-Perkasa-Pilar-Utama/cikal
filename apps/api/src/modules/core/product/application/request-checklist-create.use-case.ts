import type { ChangeRequestAccepted, DocumentChecklistCreateRequest } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { CHECKLIST_ENTITY_TYPE, ChecklistChecks } from "./checklist-checks.js";

/** Maker membuat checklist dokumen lewat ChangeRequest `DOCUMENT_CHECKLIST` (api-specs 08 §8.11, AC-25.01). */
@Injectable()
export class RequestChecklistCreateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly checks: ChecklistChecks,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, body: DocumentChecklistCreateRequest): Promise<ChangeRequestAccepted> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const data = await this.checks.resolve(tx, { ...body, isActive: true });
      await this.checks.assertCombinationFree(tx, data, { includePending: true });
      return this.changeRequests.submit(tx, ctx, {
        entityType: CHECKLIST_ENTITY_TYPE,
        entityId: null,
        oldData: null,
        newData: data,
      });
    });
  }
}
