import {
  type DocumentNumberFormatAccepted,
  type DocumentNumberFormatChangeData,
  type DocumentNumberFormatUpdateRequest,
  documentTypeSchema,
} from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { DocumentNumberFormatsRepository, type NumberFormatRow } from "../db/document-number-formats.repository.js";
import { NUMBER_FORMAT_ENTITY_TYPE } from "./number-format-change-handler.js";
import { NumberPreview } from "./number-preview.js";

function changeData(format: NumberFormatRow): DocumentNumberFormatChangeData {
  return {
    documentType: format.documentType,
    versionId: format.id,
    versionNumber: format.versionNumber,
    pattern: format.pattern,
    resetPeriod: format.resetPeriod,
    counterScope: format.counterScope,
    effectiveFrom: format.effectiveFrom?.toISOString() ?? null,
  };
}

/**
 * Maker mengajukan format nomor baru lewat ChangeRequest `DOCUMENT_NUMBER_FORMAT` (api-specs 10 §10.5). Format lama
 * tetap dipakai sampai Checker menyetujui (AC-102.01).
 */
@Injectable()
export class RequestNumberFormatUpdateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly formats: DocumentNumberFormatsRepository,
    private readonly preview: NumberPreview,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(
    ctx: RequestContext,
    documentTypeParam: string,
    body: DocumentNumberFormatUpdateRequest,
  ): Promise<DocumentNumberFormatAccepted> {
    const documentType = documentTypeSchema.safeParse(documentTypeParam);
    if (!documentType.success) throw DomainError.standard("NOT_FOUND");
    return this.db.withTenantTx(ctx, async (tx) => {
      const preview = await this.preview.render(tx, ctx.tenantId, body.pattern);
      await this.formats.lockType(tx, ctx.tenantId, documentType.data);
      const history = await this.formats.listVersions(tx, documentType.data);
      if (history.some((version) => version.status === "WAITING_APPROVAL")) {
        throw DomainError.standard("PENDING_CHANGE_REQUEST");
      }
      const active = history.find((version) => version.status === "ACTIVE");
      const draft = {
        id: uuidv7(),
        documentType: documentType.data,
        pattern: body.pattern,
        resetPeriod: body.resetPeriod,
        counterScope: body.counterScope,
        versionNumber: (history[0]?.versionNumber ?? 0) + 1,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
      };
      await this.formats.insert(tx, draft, "DRAFT", ctx);
      const accepted = await this.changeRequests.submit(tx, ctx, {
        entityType: NUMBER_FORMAT_ENTITY_TYPE,
        entityId: draft.id,
        oldData: active ? changeData(active) : null,
        newData: changeData({ ...draft, status: "DRAFT" }),
      });
      await this.formats.setStatus(tx, draft.id, { status: "WAITING_APPROVAL" }, ctx.userId);
      return {
        data: {
          changeRequestId: accepted.data.changeRequestId,
          entityType: NUMBER_FORMAT_ENTITY_TYPE,
          entityId: draft.id,
          status: "WAITING_APPROVAL",
          versionNumber: draft.versionNumber,
          preview,
        },
        message: "Data submitted for approval",
      };
    });
  }
}
