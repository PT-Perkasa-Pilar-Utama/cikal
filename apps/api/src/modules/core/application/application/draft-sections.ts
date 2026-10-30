import { draftSavedMessage, type SavableSection, type SectionSaveResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationsRepository, type DraftChanges, type DraftRow } from "../db/applications.repository.js";
import { stepAfter } from "../domain/form-steps.js";
import { DraftSteps } from "./draft-steps.js";

/** Langkah bersama simpan section (api-specs 12 §12.3): kunci draft milik pembuat, lalu catat posisi form. */
@Injectable()
export class DraftSections {
  constructor(
    private readonly applications: ApplicationsRepository,
    private readonly steps: DraftSteps,
  ) {}

  /** Draft milik Sales lain sama dengan tidak ada (AC-49.06); pengajuan selain `DRAFT` tidak bisa diubah. */
  async lock(tx: Tx, ctx: RequestContext, id: string): Promise<DraftRow> {
    const draft = await this.applications.lockOwned(tx, id, ctx.userId);
    if (!draft) throw DomainError.standard("NOT_FOUND");
    if (draft.status !== "DRAFT") throw DomainError.standard("INVALID_STATE");
    return draft;
  }

  /** Seperti `lock`, untuk section bersyarat: section di luar `steps[]` draft dijawab `404 NOT_FOUND`. */
  async lockInSteps(tx: Tx, ctx: RequestContext, id: string, section: SavableSection): Promise<DraftRow> {
    const draft = await this.lock(tx, ctx, id);
    if (!(await this.steps.of(tx, draft)).includes(section)) throw DomainError.standard("NOT_FOUND");
    return draft;
  }

  /**
   * "Next" memindahkan draft ke step berikutnya, "Save as Draft" tetap di section yang disimpan (api-specs 12
   * §12.5). `steps[]` dihitung ulang dari data tersimpan. Loan ID tidak berubah (AC-49.03); pesan draft hanya pada
   * `strict=false`.
   */
  async saved(
    tx: Tx,
    ctx: RequestContext,
    draft: DraftRow,
    section: SavableSection,
    strict: boolean,
    changes: DraftChanges = {},
  ): Promise<SectionSaveResponse> {
    const steps = await this.steps.of(tx, draft);
    const nextSection = stepAfter(steps, section);
    const currentSection = strict ? (nextSection ?? section) : section;
    await this.applications.updateDraft(tx, draft.id, { ...changes, currentSection }, ctx.userId);
    return {
      data: {
        id: draft.id,
        loanId: draft.loanId,
        status: draft.status,
        savedSection: section,
        nextSection,
        steps,
      },
      ...(strict ? {} : { message: draftSavedMessage(draft.loanId) }),
    };
  }
}
