import type { ChangeRequestAccepted, DocumentChecklistUpdateRequest } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { DocumentChecklistsRepository } from "../db/document-checklists.repository.js";
import { CHECKLIST_ENTITY_TYPE, ChecklistChecks } from "./checklist-checks.js";

/** Maker mengubah isi atau status checklist lewat ChangeRequest (api-specs 08 §8.12, api-specs 01 §1.8). */
@Injectable()
export class RequestChecklistUpdateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly checklists: DocumentChecklistsRepository,
    private readonly checks: ChecklistChecks,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, id: string, body: DocumentChecklistUpdateRequest): Promise<ChangeRequestAccepted> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const current = await this.checklists.findById(tx, id);
      if (!current) throw DomainError.standard("NOT_FOUND");
      await this.checks.assertNoPendingChange(tx, id);
      const combination = { productId: current.productId, occupation: current.occupation, marital: current.marital };
      const newData = await this.checks.resolve(tx, { ...combination, ...body });
      const labels = await this.checks.labels(tx);
      const oldData = {
        ...newData,
        items: current.items.map((item) => ({
          ...item,
          documentName: labels.document.get(item.documentType) ?? item.documentType,
        })),
        isActive: current.isActive,
      };
      return this.changeRequests.submit(tx, ctx, { entityType: CHECKLIST_ENTITY_TYPE, entityId: id, oldData, newData });
    });
  }
}
