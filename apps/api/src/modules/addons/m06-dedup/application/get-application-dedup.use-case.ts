import type { ApplicationDedup, ApplicationDedupResponse, StepResultQuery } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationProcess } from "../../../core/application/index.js";
import { OrchestratorApi } from "../../../core/orchestrator/index.js";
import { Licensing } from "../../../core/tenancy/index.js";
import { type DedupResultRow, DedupResultsRepository } from "../db/dedup-results.repository.js";
import { applicationNotFound } from "../domain/dedup-errors.js";

const MODULE_CODE = "M06";

/**
 * Tab "Dedup" dan klik langkah Dedup di timeline (api-specs 19 §19.2, AC-59.01, AC-59.02). Menu `APP-INQUIRY`
 * milik CORE, jadi lisensi M06 tenant diperiksa di sini (`MODULE_NOT_LICENSED`). Langkah yang belum menghasilkan
 * data dijawab `200` dengan `data: null` dan status langkahnya.
 */
@Injectable()
export class GetApplicationDedupUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationProcess,
    private readonly licensing: Licensing,
    private readonly orchestrator: OrchestratorApi,
    private readonly results: DedupResultsRepository,
  ) {}

  execute(ctx: TenantContext, applicationId: string, query: StepResultQuery): Promise<ApplicationDedupResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      if (!(await this.licensing.state(tx)).modules.has(MODULE_CODE)) {
        throw DomainError.standard("MODULE_NOT_LICENSED");
      }
      if (!(await this.applications.find(tx, applicationId))) throw applicationNotFound();
      const step = await this.orchestrator.stepOf(tx, applicationId, "DEDUP", query.processInstanceId);
      if (!step) {
        if (query.processInstanceId) throw DomainError.standard("NOT_FOUND");
        return { data: null, meta: { stepStatus: "PENDING" } };
      }
      const result = await this.results.findByProcess(tx, step.processInstanceId);
      if (!result) return { data: null, meta: { stepStatus: step.status } };
      return { data: await this.present(tx, result) };
    });
  }

  private async present(tx: Tx, result: DedupResultRow): Promise<ApplicationDedup> {
    const candidates = await this.results.candidatesOf(tx, result.id);
    const row = result.matrixRowId ? await this.results.matrixRow(tx, result.matrixRowId) : null;
    const matched = candidates.find((candidate) => candidate.candidateApplicationId === result.matchedApplicationId);
    return {
      outcome: result.outcome,
      ranAt: result.ranAt.toISOString(),
      matchedApplication: matched ? { id: matched.candidateApplicationId, loanId: matched.candidateLoanId } : null,
      matrixRow:
        row && result.matrixRowPriority !== null
          ? {
              id: row.id,
              priority: result.matrixRowPriority,
              nik: row.nik,
              fullNameId: row.fullNameId,
              dob: row.dob,
              pob: row.pob,
              motherMaidenName: row.motherMaidenName,
            }
          : null,
      candidates: candidates.map((candidate) => ({
        loanId: candidate.candidateLoanId,
        status: candidate.candidateStatus,
        nikResult: candidate.nikResult,
        dobResult: candidate.dobResult,
        pobResult: candidate.pobResult,
        nameScore: candidate.nameScore,
        motherNameScore: candidate.motherNameScore,
      })),
      review: null,
    };
  }
}
