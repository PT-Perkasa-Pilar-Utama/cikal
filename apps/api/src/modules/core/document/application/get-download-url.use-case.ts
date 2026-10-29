import type { FileDownloadQuery, FileDownloadUrlResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { AuditTrail } from "../../audit/index.js";
import { STORED_CONTENT_TYPE } from "../domain/file-download.js";
import { DocumentFiles } from "./document-files.js";
import { FileAccessRegistry } from "./file-access-registry.js";

/** Pratinjau atau unduhan file lewat URL S3 bertanda tangan (api-specs 10 §10.1). */
@Injectable()
export class GetDownloadUrlUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly files: DocumentFiles,
    private readonly access: FileAccessRegistry,
    private readonly audit: AuditTrail,
  ) {}

  execute(ctx: RequestContext, fileId: string, query: FileDownloadQuery): Promise<FileDownloadUrlResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      if (!(await this.access.canView(tx, ctx, fileId))) throw DomainError.standard("NOT_FOUND");
      const link = await this.files.link(tx, fileId, query.disposition);
      if (!link) throw DomainError.standard("NOT_FOUND");
      await this.audit.record(tx, ctx, {
        module: "Document",
        action: "VIEW_DOCUMENT",
        recordId: link.fileId,
        description: `File ${link.fileName} viewed`,
      });
      return {
        data: {
          url: link.url,
          expiresAt: link.expiresAt.toISOString(),
          fileName: link.fileName,
          contentType: STORED_CONTENT_TYPE,
          sizeBytes: link.sizeBytes,
        },
      };
    });
  }
}
