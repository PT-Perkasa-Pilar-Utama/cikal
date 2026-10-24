import type { ApplicationDecisionQuery, ApplicationDecisionResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationProcess } from "../../../core/application/index.js";
import { OrchestratorApi } from "../../../core/orchestrator/index.js";
import { Licensing } from "../../../core/tenancy/index.js";
import { DecisionResultsRepository } from "../db/decision-results.repository.js";
import { applicationNotFound } from "../domain/decision-errors.js";
import { shortOutcomes } from "../domain/step-outcome-mapping.js";

const MODULE_CODE = "M11";

/**
 * Klik langkah "Decision" di timeline (api-specs 24 §24.4, AC-69.01 s.d. AC-69.03): keputusan proses yang dipilih,
 * atau proses terakhir yang sudah sampai DECISION. Menu `APP-INQUIRY` milik CORE, jadi lisensi M11 tenant diperiksa
 * di sini (`MODULE_NOT_LICENSED`).
 */
@Injectable()
export class GetApplicationDecisionUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationProcess,
    private readonly licensing: Licensing,
    private readonly results: DecisionResultsRepository,
    private readonly orchestrator: OrchestratorApi,
  ) {}

  execute(
    ctx: TenantContext,
    applicationId: string,
    query: ApplicationDecisionQuery,
  ): Promise<ApplicationDecisionResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      if (!(await this.licensing.state(tx)).modules.has(MODULE_CODE)) {
        throw DomainError.standard("MODULE_NOT_LICENSED");
      }
      if (!(await this.applications.find(tx, applicationId))) throw applicationNotFound();
      const result = query.processInstanceId
        ? await this.results.findByProcess(tx, query.processInstanceId)
        : await this.results.findLatestByApplication(tx, applicationId);
      if (!result || result.applicationId !== applicationId) throw DomainError.standard("NOT_FOUND");
      const nextStep =
        result.decisionOutcome === "GO"
          ? await this.orchestrator.nextStep(tx, result.processInstanceId, "DECISION")
          : null;
      const { matrixRowId, matrixRowPriority } = result;
      return {
        data: {
          decisionOutcome: result.decisionOutcome,
          outcomes: shortOutcomes(result.outcomes),
          matchedRow:
            matrixRowId && matrixRowPriority !== null ? { id: matrixRowId, priority: matrixRowPriority } : null,
          description: result.description,
          nextStep,
        },
      };
    });
  }
}
