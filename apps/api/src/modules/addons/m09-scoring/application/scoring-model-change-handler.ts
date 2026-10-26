import { scoringModelChangeDataSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type {
  ApplyResult,
  ChangeRequestSnapshot,
  EntityHandler,
  JsonRecord,
} from "../../../core/change-request/index.js";
import { type ModelRow, ScoringModelDraftsRepository } from "../db/scoring-model-drafts.repository.js";
import { ScoringModelActivation } from "./scoring-model-activation.js";
import { SCORING_MODEL_ENTITY_TYPE } from "./scoring-model-changes.js";

/** Handler ChangeRequest `SCORING_MODEL` (api-specs 07 §7.1, api-specs 22 §22.4): versi model scoring dan RAC. */
@Injectable()
export class ScoringModelChangeHandler implements EntityHandler {
  readonly entityType = SCORING_MODEL_ENTITY_TYPE;
  readonly auditModule = "Scoring Model";

  constructor(
    private readonly models: ScoringModelDraftsRepository,
    private readonly activation: ScoringModelActivation,
  ) {}

  displayName(newData: JsonRecord): string {
    const data = scoringModelChangeDataSchema.safeParse(newData);
    return data.success ? `${data.data.modelCode} version ${data.data.versionNumber}` : "";
  }

  async validate(tx: Tx, request: ChangeRequestSnapshot): Promise<void> {
    await this.waitingModel(tx, scoringModelChangeDataSchema.parse(request.newData).modelId);
  }

  async apply(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<ApplyResult> {
    const data = scoringModelChangeDataSchema.parse(request.newData);
    const model = await this.waitingModel(tx, data.modelId);
    const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();
    await this.activation.approve(tx, model, effectiveFrom, reviewer);
    return { entityId: model.id, versionNumber: model.versionNumber };
  }

  /** Versi yang ditolak kembali ke `DRAFT`, tidak pernah ACTIVE (technical-specs 06 §6.13). */
  async reject(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<void> {
    const { modelId } = scoringModelChangeDataSchema.parse(request.newData);
    await this.models.setStatus(tx, modelId, { status: "DRAFT", effectiveFrom: null }, reviewer.userId);
  }

  private async waitingModel(tx: Tx, modelId: string): Promise<ModelRow> {
    const model = await this.models.lock(tx, modelId);
    if (model?.status !== "WAITING_APPROVAL") throw DomainError.standard("INVALID_STATE");
    return model;
  }
}
