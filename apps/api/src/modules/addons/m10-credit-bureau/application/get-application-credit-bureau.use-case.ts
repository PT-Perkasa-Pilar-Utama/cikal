import type { ApplicationCreditBureau, ApplicationCreditBureauResponse, StepResultQuery } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationProcess } from "../../../core/application/index.js";
import { OrchestratorApi } from "../../../core/orchestrator/index.js";
import { Licensing } from "../../../core/tenancy/index.js";
import { CreditBureauRepository, type CreditBureauResultRow } from "../db/credit-bureau.repository.js";
import { collectibilityLabel } from "../domain/collectibility.js";

const MODULE_CODE = "M10";

/**
 * Klik langkah "SLIK" di timeline (api-specs 23 §23.3, AC-68.01, AC-68.02). Menu `APP-INQUIRY` milik CORE, jadi
 * lisensi M10 tenant diperiksa di sini. Respons mentah penyedia tidak dikembalikan.
 */
@Injectable()
export class GetApplicationCreditBureauUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationProcess,
    private readonly licensing: Licensing,
    private readonly orchestrator: OrchestratorApi,
    private readonly creditBureau: CreditBureauRepository,
  ) {}

  execute(ctx: TenantContext, applicationId: string, query: StepResultQuery): Promise<ApplicationCreditBureauResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      if (!(await this.licensing.state(tx)).modules.has(MODULE_CODE)) {
        throw DomainError.standard("MODULE_NOT_LICENSED");
      }
      if (!(await this.applications.find(tx, applicationId))) {
        throw new DomainError("APPLICATION_NOT_FOUND", "Application not found", 404);
      }
      const step = await this.orchestrator.stepOf(tx, applicationId, "CREDIT_BUREAU", query.processInstanceId);
      if (!step) {
        if (query.processInstanceId) throw DomainError.standard("NOT_FOUND");
        return { data: null, meta: { stepStatus: "PENDING" } };
      }
      const result = await this.creditBureau.findByProcess(tx, step.processInstanceId);
      if (!result) return { data: null, meta: { stepStatus: step.status } };
      return { data: await this.present(tx, result) };
    });
  }

  private async present(tx: Tx, result: CreditBureauResultRow): Promise<ApplicationCreditBureau> {
    const facilities = await this.creditBureau.facilitiesOf(tx, result.id);
    return {
      mode: result.mode,
      providerCode: result.providerCode,
      reportReference: result.reportReference,
      reportDate: result.reportDate,
      hasHistory: result.hasHistory,
      aggregatedCollectibility: result.aggregatedCollectibility,
      quality: result.quality,
      outcome: result.outcome,
      label: collectibilityLabel({
        collectibility: result.aggregatedCollectibility,
        quality: result.quality,
        outcome: result.outcome,
      }),
      reportFileId: result.reportFileId,
      facilities: facilities.map((facility) => ({
        lenderName: facility.lenderName,
        facilityType: facility.facilityType,
        plafond: facility.plafond,
        outstanding: facility.outstanding,
        collectibility: facility.collectibility,
        daysPastDue: facility.daysPastDue,
        condition: facility.condition,
        lastUpdated: facility.lastUpdated,
      })),
    };
  }
}
