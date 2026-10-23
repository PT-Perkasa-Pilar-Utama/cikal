import type { ApplicationFormResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationsRepository } from "../db/applications.repository.js";
import { formSteps } from "../domain/form-steps.js";
import { DraftDocuments } from "./draft-documents.js";
import { DraftFormSections } from "./draft-form-sections.js";

/**
 * Melanjutkan draft dari step terakhir (api-specs 12 §12.5, AC-49.05). Hanya pembuat draft yang bisa membuka; NIK
 * dikembalikan utuh hanya kepadanya (AC-49.06).
 */
@Injectable()
export class GetDraftFormUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationsRepository,
    private readonly sections: DraftFormSections,
    private readonly documents: DraftDocuments,
  ) {}

  execute(ctx: RequestContext, id: string): Promise<ApplicationFormResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.applications.findOwned(tx, id, ctx.userId);
      const sections = draft && (await this.sections.load(tx, draft));
      if (!draft || !sections) throw DomainError.standard("NOT_FOUND");
      return {
        data: {
          id: draft.id,
          loanId: draft.loanId,
          status: draft.status,
          currentSection: draft.currentSection,
          steps: formSteps(),
          sections,
          documentCompleteness: await this.documents.completenessOrNull(tx, draft),
          returnNote: draft.returnNote,
        },
      };
    });
  }
}
