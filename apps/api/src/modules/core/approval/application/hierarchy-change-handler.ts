import { approvalHierarchyDataSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ApplyResult, ChangeRequestSnapshot, EntityHandler, JsonRecord } from "../../change-request/index.js";
import { HierarchiesRepository } from "../db/hierarchies.repository.js";
import { hierarchyDisplayName, hierarchyFieldsOf } from "../domain/hierarchy-rules.js";
import { APPROVAL_HIERARCHY_ENTITY_TYPE, HierarchyChecks } from "./hierarchy-checks.js";

/**
 * Handler ChangeRequest `APPROVAL_HIERARCHY` (api-specs 07 §7.1, 16 §16.2, §16.3). Routing approval membaca hierarki
 * dari tabel setiap kali dijalankan, jadi approver pengganti dipakai saat langkah yang Error di-retry (AC-27.04).
 */
@Injectable()
export class HierarchyChangeHandler implements EntityHandler {
  readonly entityType = APPROVAL_HIERARCHY_ENTITY_TYPE;
  readonly auditModule = "Approval Hierarchy";

  constructor(
    private readonly hierarchies: HierarchiesRepository,
    private readonly checks: HierarchyChecks,
  ) {}

  displayName(newData: JsonRecord): string {
    const data = approvalHierarchyDataSchema.safeParse(newData);
    return data.success ? hierarchyDisplayName(data.data) : "";
  }

  /** Level, hak approver, dan kombinasi diperiksa ulang terhadap data saat disetujui. */
  async validate(tx: Tx, request: ChangeRequestSnapshot): Promise<void> {
    const data = approvalHierarchyDataSchema.parse(request.newData);
    if (request.entityId !== null && !(await this.hierarchies.findById(tx, request.entityId))) {
      throw DomainError.standard("NOT_FOUND");
    }
    await this.checks.validate(tx, hierarchyFieldsOf(data), { excludeId: request.entityId, includePending: false });
  }

  async apply(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<ApplyResult> {
    const data = approvalHierarchyDataSchema.parse(request.newData);
    const row = { ...hierarchyFieldsOf(data), id: request.entityId ?? uuidv7() };
    if (request.entityId === null) await this.hierarchies.insert(tx, reviewer.tenantId, row, reviewer.userId);
    else await this.hierarchies.update(tx, row, reviewer.userId);
    return { entityId: row.id };
  }
}
