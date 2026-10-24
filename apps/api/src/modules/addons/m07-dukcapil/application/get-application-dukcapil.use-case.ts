import type { ApplicationDukcapilResponse, StepResultQuery } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationProcess } from "../../../core/application/index.js";
import { OrchestratorApi } from "../../../core/orchestrator/index.js";
import { Licensing } from "../../../core/tenancy/index.js";
import { DukcapilRepository } from "../db/dukcapil.repository.js";
import { applicationNotFound } from "../domain/dukcapil-errors.js";

const MODULE_CODE = "M07";

/**
 * Tab "Dukcapil" dan klik langkah Dukcapil di timeline (api-specs 20 §20.2, AC-61.01, AC-61.02). Menu `APP-INQUIRY`
 * milik CORE, jadi lisensi M07 tenant diperiksa di sini. Respons mentah penyedia tidak dikembalikan.
 */
@Injectable()
export class GetApplicationDukcapilUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationProcess,
    private readonly licensing: Licensing,
    private readonly orchestrator: OrchestratorApi,
    private readonly dukcapil: DukcapilRepository,
  ) {}

  execute(ctx: TenantContext, applicationId: string, query: StepResultQuery): Promise<ApplicationDukcapilResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      if (!(await this.licensing.state(tx)).modules.has(MODULE_CODE)) {
        throw DomainError.standard("MODULE_NOT_LICENSED");
      }
      if (!(await this.applications.find(tx, applicationId))) throw applicationNotFound();
      const step = await this.orchestrator.stepOf(tx, applicationId, "DUKCAPIL", query.processInstanceId);
      if (!step) {
        if (query.processInstanceId) throw DomainError.standard("NOT_FOUND");
        return { data: null, meta: { stepStatus: "PENDING" } };
      }
      const result = await this.dukcapil.findByProcess(tx, step.processInstanceId);
      if (!result) return { data: null, meta: { stepStatus: step.status } };
      return {
        data: {
          outcome: result.outcome,
          recordFound: result.recordFound,
          providerCode: result.providerCode,
          providerReference: result.providerReference,
          dobStatus: result.dobStatus,
          pobStatus: result.pobStatus,
          fullNameScore: result.fullNameScore,
          motherNameScore: result.motherNameScore,
          finalScore: result.finalScore,
          rule: result.rule,
          reviews: [],
        },
      };
    });
  }
}
