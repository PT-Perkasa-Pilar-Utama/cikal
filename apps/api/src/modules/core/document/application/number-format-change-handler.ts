import { documentNumberFormatChangeDataSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ApplyResult, ChangeRequestSnapshot, EntityHandler, JsonRecord } from "../../change-request/index.js";
import { DocumentNumberFormatsRepository, type NumberFormatRow } from "../db/document-number-formats.repository.js";
import { NumberFormatActivation } from "./number-format-activation.js";

export const NUMBER_FORMAT_ENTITY_TYPE = "DOCUMENT_NUMBER_FORMAT";
const COMPARED_FIELDS = ["pattern", "resetPeriod", "counterScope"] as const;

/** Handler ChangeRequest `DOCUMENT_NUMBER_FORMAT` (api-specs 07 §7.1, api-specs 10 §10.5). */
@Injectable()
export class NumberFormatChangeHandler implements EntityHandler {
  readonly entityType = NUMBER_FORMAT_ENTITY_TYPE;
  readonly auditModule = "Document Number Format";

  constructor(
    private readonly formats: DocumentNumberFormatsRepository,
    private readonly activation: NumberFormatActivation,
  ) {}

  displayName(newData: JsonRecord): string {
    const data = documentNumberFormatChangeDataSchema.safeParse(newData);
    return data.success ? `${data.data.documentType} version ${data.data.versionNumber}` : "";
  }

  diff(oldData: JsonRecord | null, newData: JsonRecord): string[] {
    const proposed = documentNumberFormatChangeDataSchema.parse(newData);
    if (!oldData) return [...COMPARED_FIELDS];
    const current = documentNumberFormatChangeDataSchema.parse(oldData);
    return COMPARED_FIELDS.filter((field) => current[field] !== proposed[field]);
  }

  async validate(tx: Tx, request: ChangeRequestSnapshot): Promise<void> {
    await this.waitingFormat(tx, documentNumberFormatChangeDataSchema.parse(request.newData).versionId);
  }

  async apply(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<ApplyResult> {
    const data = documentNumberFormatChangeDataSchema.parse(request.newData);
    const format = await this.waitingFormat(tx, data.versionId);
    const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();
    await this.activation.approve(tx, format, effectiveFrom, reviewer);
    return { entityId: format.id, versionNumber: format.versionNumber };
  }

  /** Versi yang ditolak kembali ke `DRAFT`, tidak pernah ACTIVE (technical-specs 06 §6.13). */
  async reject(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<void> {
    const { versionId } = documentNumberFormatChangeDataSchema.parse(request.newData);
    await this.formats.setStatus(tx, versionId, { status: "DRAFT" }, reviewer.userId);
  }

  private async waitingFormat(tx: Tx, versionId: string): Promise<NumberFormatRow> {
    const format = await this.formats.findById(tx, versionId);
    if (format?.status !== "WAITING_APPROVAL") throw DomainError.standard("INVALID_STATE");
    return format;
  }
}
