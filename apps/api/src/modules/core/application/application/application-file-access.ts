import { Injectable, type OnModuleInit } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { type FileAccessPolicy, FileAccessRegistry } from "../../document/index.js";
import { ApplicationDocumentsRepository } from "../db/application-documents.repository.js";

/**
 * Pembuat draft boleh melihat file di slot dokumennya (api-specs 10 §10.1, AC-47.05). Akses `APP-INQUIRY` sesuai
 * lingkup data dipasang di kartu FE-S5-04.
 */
@Injectable()
export class ApplicationFileAccess implements FileAccessPolicy, OnModuleInit {
  constructor(
    private readonly registry: FileAccessRegistry,
    private readonly documents: ApplicationDocumentsRepository,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  canView(tx: Tx, ctx: RequestContext, fileId: string): Promise<boolean> {
    return this.documents.isOwnedFile(tx, fileId, ctx.userId);
  }
}
