import type { FileDownloadQuery, FileDownloadUrlResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { StorageService } from "../../../../platform/storage/storage.module.js";
import { AuditTrail } from "../../audit/index.js";
import { DocumentFilesRepository } from "../db/document-files.repository.js";
import {
  contentDisposition,
  DOWNLOAD_URL_TTL_SECONDS,
  pdfFileName,
  STORED_CONTENT_TYPE,
} from "../domain/file-download.js";
import { FileAccessRegistry } from "./file-access-registry.js";

/** Pratinjau atau unduhan file lewat URL S3 bertanda tangan (api-specs 10 §10.1). */
@Injectable()
export class GetDownloadUrlUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly files: DocumentFilesRepository,
    private readonly access: FileAccessRegistry,
    private readonly storage: StorageService,
    private readonly audit: AuditTrail,
  ) {}

  execute(ctx: RequestContext, fileId: string, query: FileDownloadQuery): Promise<FileDownloadUrlResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const file = await this.files.find(tx, fileId);
      if (!file || !(await this.access.canView(tx, ctx, file.id))) throw DomainError.standard("NOT_FOUND");
      const fileName = pdfFileName(file.fileName);
      const expiresAt = new Date(Date.now() + DOWNLOAD_URL_TTL_SECONDS * 1000);
      const url = await this.storage.signedGetUrl(file.storageKey, {
        expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
        contentType: STORED_CONTENT_TYPE,
        contentDisposition: contentDisposition(query.disposition, fileName),
      });
      await this.audit.record(tx, ctx, {
        module: "Document",
        action: "VIEW_DOCUMENT",
        recordId: file.id,
        description: `File ${fileName} viewed`,
      });
      return {
        data: {
          url,
          expiresAt: expiresAt.toISOString(),
          fileName,
          contentType: STORED_CONTENT_TYPE,
          sizeBytes: file.sizeBytes,
        },
      };
    });
  }
}
