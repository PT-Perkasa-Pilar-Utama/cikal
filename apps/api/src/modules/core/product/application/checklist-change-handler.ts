import { documentChecklistDataSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ApplyResult, ChangeRequestSnapshot, EntityHandler, JsonRecord } from "../../change-request/index.js";
import { DocumentChecklistsRepository } from "../db/document-checklists.repository.js";
import { checklistDisplayName } from "../domain/checklist-rules.js";
import { CHECKLIST_ENTITY_TYPE, ChecklistChecks } from "./checklist-checks.js";

/** Handler ChangeRequest `DOCUMENT_CHECKLIST` (api-specs 07 §7.1): checklist baru dan perubahan isinya (§8.11, §8.12). */
@Injectable()
export class ChecklistChangeHandler implements EntityHandler {
  readonly entityType = CHECKLIST_ENTITY_TYPE;
  readonly auditModule = "Document Checklist";

  constructor(
    private readonly checklists: DocumentChecklistsRepository,
    private readonly checks: ChecklistChecks,
  ) {}

  displayName(newData: JsonRecord): string {
    const data = documentChecklistDataSchema.safeParse(newData);
    return data.success ? checklistDisplayName(data.data) : "";
  }

  /** Produk dan `paramId` masih berlaku saat disetujui; checklist baru juga kombinasinya masih bebas. */
  async validate(tx: Tx, request: ChangeRequestSnapshot): Promise<void> {
    const data = documentChecklistDataSchema.parse(request.newData);
    await this.checks.resolve(tx, data);
    if (request.entityId === null) await this.checks.assertCombinationFree(tx, data, { includePending: false });
  }

  async apply(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<ApplyResult> {
    const data = documentChecklistDataSchema.parse(request.newData);
    const items = data.items.map(({ documentType, isMandatory }) => ({ documentType, isMandatory }));
    if (request.entityId === null) {
      const id = uuidv7();
      const { productId, occupation, marital, isActive } = data;
      await this.checklists.insert(
        tx,
        { id, tenantId: reviewer.tenantId, productId, occupation, marital, isActive, items },
        reviewer.userId,
      );
      return { entityId: id };
    }
    if (!(await this.checklists.findById(tx, request.entityId))) throw DomainError.standard("NOT_FOUND");
    await this.checklists.update(
      tx,
      request.entityId,
      { tenantId: reviewer.tenantId, isActive: data.isActive, items },
      reviewer.userId,
    );
    return { entityId: request.entityId };
  }
}
