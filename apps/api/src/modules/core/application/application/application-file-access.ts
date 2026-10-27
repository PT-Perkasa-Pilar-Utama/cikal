import { Injectable, type OnModuleInit } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { type FileAccessPolicy, FileAccessRegistry } from "../../document/index.js";
import { ApplicationDocumentsRepository } from "../db/application-documents.repository.js";
import { ApplicationsRepository } from "../db/applications.repository.js";
import { ApplicationVisibility } from "./application-visibility.js";

/**
 * File slot dokumen terlihat oleh pembuat draft (AC-47.05) dan pembaca `APP-INQUIRY` dalam lingkup data
 * (api-specs 10 §10.1, AC-84.02).
 */
@Injectable()
export class ApplicationFileAccess implements FileAccessPolicy, OnModuleInit {
  constructor(
    private readonly registry: FileAccessRegistry,
    private readonly documents: ApplicationDocumentsRepository,
    private readonly applications: ApplicationsRepository,
    private readonly visibility: ApplicationVisibility,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async canView(tx: Tx, ctx: RequestContext, fileId: string): Promise<boolean> {
    if (await this.documents.isOwnedFile(tx, fileId, ctx.userId)) return true;
    const applicationId = await this.documents.applicationOfFile(tx, fileId);
    const application = applicationId && (await this.applications.findDetail(tx, { id: applicationId }));
    return application ? this.visibility.canInquire(tx, ctx, application) : false;
  }
}
