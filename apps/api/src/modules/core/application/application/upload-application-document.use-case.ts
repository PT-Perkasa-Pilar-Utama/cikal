import { APPLICATION_SUBMIT_MESSAGES, type DocumentUploadResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { UploadedFile } from "../../../../platform/http/multipart.js";
import { DocumentFiles } from "../../document/index.js";
import { ApplicationDocumentsRepository } from "../db/application-documents.repository.js";
import { DraftDocuments } from "./draft-documents.js";
import { DraftSections } from "./draft-sections.js";

/**
 * Unggah atau ganti file satu slot checklist (api-specs 12 §12.7; AC-47.01, AC-47.05). Jenis file, ukuran, dan
 * konversi PDF diperiksa modul Document; file lama tidak lagi dirujuk slot.
 */
@Injectable()
export class UploadApplicationDocumentUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly sections: DraftSections,
    private readonly documents: DraftDocuments,
    private readonly slots: ApplicationDocumentsRepository,
    private readonly files: DocumentFiles,
  ) {}

  execute(ctx: RequestContext, id: string, documentType: string, file: UploadedFile): Promise<DocumentUploadResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.sections.lock(tx, ctx, id);
      const items = await this.documents.items(tx, draft);
      if (!items.some((item) => item.documentType === documentType)) {
        throw new DomainError("BUSINESS_RULE_VIOLATION", APPLICATION_SUBMIT_MESSAGES.documentNotInChecklist, 422);
      }
      const stored = await this.files.upload(tx, ctx, {
        fileName: file.filename,
        data: file.data,
        truncated: file.truncated,
      });
      await this.slots.attach(
        tx,
        { applicationId: draft.id, tenantId: ctx.tenantId },
        { id: uuidv7(), documentType, fileId: stored.fileId },
        ctx.userId,
      );
      return {
        data: {
          documentType,
          file: { ...stored, uploadedAt: stored.uploadedAt.toISOString() },
          completeness: await this.documents.completeness(tx, draft, items),
        },
      };
    });
  }
}
