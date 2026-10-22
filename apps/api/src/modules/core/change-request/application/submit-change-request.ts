import type { ChangeRequestAccepted, ChangeRequestEntityType } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { AuditTrail } from "../../audit/index.js";
import { ChangeRequestsRepository } from "../db/change-requests.repository.js";
import type { JsonRecord } from "../db/schema.js";
import { ChangeRequestRegistry } from "./change-request-registry.js";

export interface SubmitInput {
  entityType: ChangeRequestEntityType;
  /** Kosong untuk data baru dan paket impor. */
  entityId: string | null;
  /** Data aktif saat submit, dibaca modul pemilik ("Current Data"); kosong untuk data baru. */
  oldData: JsonRecord | null;
  newData: JsonRecord;
  /** Jumlah baris satu impor; satu impor = satu paket (grooming v1 N-07, AC-12.07). */
  packageSize?: number;
}

/**
 * `submit(entityType, entityId?, newData)` (technical-specs 05 §5.6), dipanggil modul pemilik di transaksinya
 * setelah validasi field. Satu permintaan terbuka per data (AC-12.06).
 */
@Injectable()
export class SubmitChangeRequest {
  constructor(
    private readonly requests: ChangeRequestsRepository,
    private readonly registry: ChangeRequestRegistry,
    private readonly audit: AuditTrail,
  ) {}

  async execute(tx: Tx, maker: Actor, input: SubmitInput): Promise<ChangeRequestAccepted["data"]> {
    const handler = this.registry.get(input.entityType);
    const id = uuidv7();
    const accepted = await this.requests.insertOpen(tx, {
      id,
      tenantId: maker.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.entityId ? "UPDATE" : "CREATE",
      oldData: input.oldData,
      newData: input.newData,
      packageSize: input.packageSize ?? 1,
      submittedBy: maker.userId,
    });
    if (!accepted) throw DomainError.standard("PENDING_CHANGE_REQUEST");
    await this.audit.record(tx, maker, {
      module: handler.auditModule,
      action: "SUBMIT",
      recordId: input.entityId ?? id,
      oldData: input.oldData,
      newData: input.newData,
    });
    return { changeRequestId: id, entityType: input.entityType, entityId: input.entityId, status: "WAITING_APPROVAL" };
  }
}
