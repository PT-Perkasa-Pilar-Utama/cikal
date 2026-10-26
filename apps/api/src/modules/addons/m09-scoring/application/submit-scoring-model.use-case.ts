import { type ChangeRequestAccepted, SCORING_MODEL_MESSAGES, type ScoringModelSubmit } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ChangeRequestPort } from "../../../core/change-request/index.js";
import { ScoringModelDraftsRepository } from "../db/scoring-model-drafts.repository.js";
import { DraftModels } from "./draft-models.js";
import { SCORING_MODEL_ENTITY_TYPE, ScoringModelChanges } from "./scoring-model-changes.js";

/**
 * Maker mengajukan versi draft lewat ChangeRequest `SCORING_MODEL` (api-specs 22 §22.4). Versi ACTIVE tetap dipakai
 * langkah RAC dan SCORING sampai versi baru disetujui (AC-37.05).
 */
@Injectable()
export class SubmitScoringModelUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly models: ScoringModelDraftsRepository,
    private readonly drafts: DraftModels,
    private readonly changes: ScoringModelChanges,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, id: string, body: ScoringModelSubmit): Promise<ChangeRequestAccepted> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.drafts.lockDraft(tx, id);
      if ((await this.models.criteriaOf(tx, id)).length === 0) {
        throw new DomainError("MODEL_WITHOUT_CRITERIA", SCORING_MODEL_MESSAGES.modelWithoutCriteria, 422);
      }
      if (draft.modelGroup === "SCORING" && draft.cutOff === null) {
        const message = SCORING_MODEL_MESSAGES.cutOffRequired;
        throw DomainError.standard("VALIDATION_FAILED", undefined, [
          { field: "cutOff", code: "VALIDATION_FAILED", message },
        ]);
      }
      const versions = await this.models.versionsOf(tx, draft.modelCode);
      if (versions.some((version) => version.status === "WAITING_APPROVAL")) {
        throw DomainError.standard("PENDING_CHANGE_REQUEST");
      }
      const active = versions.find((version) => version.status === "ACTIVE");
      const effectiveFrom = body.effectiveFrom ? new Date(body.effectiveFrom) : null;
      const accepted = await this.changeRequests.submit(tx, ctx, {
        entityType: SCORING_MODEL_ENTITY_TYPE,
        entityId: draft.id,
        oldData: active ? await this.changes.dataOf(tx, active, active.effectiveFrom) : null,
        newData: await this.changes.dataOf(tx, draft, effectiveFrom),
      });
      await this.models.setStatus(tx, draft.id, { status: "WAITING_APPROVAL", effectiveFrom }, ctx.userId);
      return accepted;
    });
  }
}
