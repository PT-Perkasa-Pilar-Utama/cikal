import type { ApplicationDocumentsResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationsRepository } from "../db/applications.repository.js";
import { DraftDocuments } from "./draft-documents.js";

/** Slot step Document untuk pembuat draft (api-specs 12 §12.6; AC-25.04, AC-25.05, AC-47.06). */
@Injectable()
export class ListApplicationDocumentsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationsRepository,
    private readonly documents: DraftDocuments,
  ) {}

  execute(ctx: RequestContext, id: string): Promise<ApplicationDocumentsResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.applications.findOwned(tx, id, ctx.userId);
      if (!draft) throw DomainError.standard("NOT_FOUND");
      return { data: await this.documents.view(tx, draft) };
    });
  }
}
