import type { ApplicationDocumentsResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationsRepository } from "../db/applications.repository.js";
import { ApplicationVisibility } from "./application-visibility.js";
import { DraftDocuments } from "./draft-documents.js";

/**
 * Slot step Document untuk pembuat draft dan tab "Document" Application Detail (api-specs 12 §12.6; AC-25.04,
 * AC-25.05, AC-47.06, AC-84.02).
 */
@Injectable()
export class ListApplicationDocumentsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationsRepository,
    private readonly visibility: ApplicationVisibility,
    private readonly documents: DraftDocuments,
  ) {}

  execute(ctx: RequestContext, id: string): Promise<ApplicationDocumentsResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const application = await this.applications.findDetail(tx, { id });
      const visible = application !== null && (await this.visibility.canViewDocuments(tx, ctx, application));
      if (!application || !visible) throw DomainError.standard("NOT_FOUND");
      return { data: await this.documents.view(tx, application) };
    });
  }
}
