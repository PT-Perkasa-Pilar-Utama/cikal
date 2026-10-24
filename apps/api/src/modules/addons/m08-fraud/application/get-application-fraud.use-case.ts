import type { ApplicationFraud, ApplicationFraudResponse, StepResultQuery } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationProcess } from "../../../core/application/index.js";
import { OrchestratorApi } from "../../../core/orchestrator/index.js";
import { Licensing } from "../../../core/tenancy/index.js";
import { FraudRepository, type FraudResultRow } from "../db/fraud.repository.js";
import { applicationNotFound } from "../domain/fraud-errors.js";

const MODULE_CODE = "M08";

/**
 * Tab "Fraud" dan klik langkah Fraud di timeline (api-specs 21 §21.2, AC-65.01, AC-65.02). Menu `APP-INQUIRY`
 * milik CORE, jadi lisensi M08 tenant diperiksa di sini.
 */
@Injectable()
export class GetApplicationFraudUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationProcess,
    private readonly licensing: Licensing,
    private readonly orchestrator: OrchestratorApi,
    private readonly fraud: FraudRepository,
  ) {}

  execute(ctx: TenantContext, applicationId: string, query: StepResultQuery): Promise<ApplicationFraudResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      if (!(await this.licensing.state(tx)).modules.has(MODULE_CODE)) {
        throw DomainError.standard("MODULE_NOT_LICENSED");
      }
      if (!(await this.applications.find(tx, applicationId))) throw applicationNotFound();
      const step = await this.orchestrator.stepOf(tx, applicationId, "FRAUD", query.processInstanceId);
      if (!step) {
        if (query.processInstanceId) throw DomainError.standard("NOT_FOUND");
        return { data: null, meta: { stepStatus: "PENDING" } };
      }
      const result = await this.fraud.findByProcess(tx, step.processInstanceId);
      if (!result) return { data: null, meta: { stepStatus: step.status } };
      return { data: await this.present(tx, result) };
    });
  }

  private async present(tx: Tx, result: FraudResultRow): Promise<ApplicationFraud> {
    const row = result.matrixRowId ? await this.fraud.matrixRow(tx, result.matrixRowId) : null;
    return {
      outcome: result.outcome,
      isBlacklisted: result.isBlacklisted,
      ipCheck: {
        status: result.ipStatus,
        ipAddress: result.ipAddress,
        category: result.ipCategory,
        providerCode: result.ipProviderCode,
      },
      velocityHits: result.velocityHits,
      matrixRow:
        row && result.matrixRowPriority !== null
          ? {
              id: row.id,
              priority: result.matrixRowPriority,
              nameCondition: row.nameCondition,
              ipCondition: row.ipCondition,
            }
          : null,
      review: null,
    };
  }
}
