import type { ApplicationScoringResponse, RacResult, ScoringResult, StepResultQuery } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationProcess } from "../../../core/application/index.js";
import { OrchestratorApi } from "../../../core/orchestrator/index.js";
import { Licensing } from "../../../core/tenancy/index.js";
import { ScoringResultsRepository, type StoredResult } from "../db/scoring-results.repository.js";

const MODULE_CODE = "M09";
const NO_SCORE = "0.00";

function racView(result: StoredResult): RacResult {
  return {
    modelCode: result.modelCode,
    versionNumber: result.versionNumber,
    result: result.outcome === "PASS" ? "PASS" : "FAIL",
    failedReasons: result.failedReasons,
    criteria: result.details.map(({ displayText, actualValue, isMet }) => ({ displayText, actualValue, isMet })),
  };
}

function scoringView(result: StoredResult): ScoringResult {
  return {
    modelCode: result.modelCode,
    versionNumber: result.versionNumber,
    constant: result.constant ?? NO_SCORE,
    cutOff: result.cutOff ?? NO_SCORE,
    totalScore: result.totalScore ?? NO_SCORE,
    result: result.outcome,
    criteria: result.details.map(({ displayText, actualValue, isMet, appliedWeight }) => ({
      displayText,
      actualValue,
      isMet,
      appliedWeight,
    })),
  };
}

/**
 * Klik langkah "RAC" dan "Scoring" di timeline (api-specs 22 §22.6, AC-67.01 s.d. AC-67.03). Menu `APP-INQUIRY`
 * milik CORE, jadi lisensi M09 tenant diperiksa di sini. Langkah yang belum berjalan atau dilewati bernilai `null`.
 */
@Injectable()
export class GetApplicationScoringUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationProcess,
    private readonly licensing: Licensing,
    private readonly orchestrator: OrchestratorApi,
    private readonly results: ScoringResultsRepository,
  ) {}

  execute(ctx: TenantContext, applicationId: string, query: StepResultQuery): Promise<ApplicationScoringResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      if (!(await this.licensing.state(tx)).modules.has(MODULE_CODE)) {
        throw DomainError.standard("MODULE_NOT_LICENSED");
      }
      if (!(await this.applications.find(tx, applicationId))) {
        throw new DomainError("APPLICATION_NOT_FOUND", "Application not found", 404);
      }
      const step = await this.orchestrator.stepOf(tx, applicationId, "RAC", query.processInstanceId);
      if (!step) {
        if (query.processInstanceId) throw DomainError.standard("NOT_FOUND");
        return { data: { rac: null, scoring: null } };
      }
      const rac = await this.results.find(tx, step.processInstanceId, "RAC");
      const scoring = await this.results.find(tx, step.processInstanceId, "SCORING");
      return { data: { rac: rac ? racView(rac) : null, scoring: scoring ? scoringView(scoring) : null } };
    });
  }
}
