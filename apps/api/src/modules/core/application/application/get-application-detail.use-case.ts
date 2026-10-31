import type { ApplicationDetailResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { PROCESS_VIEW_PORT, type ProcessViewPort } from "../../../../platform/http/process-view-port.js";
import { AuditTrail } from "../../audit/index.js";
import { BranchDirectory } from "../../organization/index.js";
import { ProductCodes } from "../../product/index.js";
import { type ApplicationKey, ApplicationsRepository, type DetailRow } from "../db/applications.repository.js";
import { applicationTabs } from "../domain/application-tabs.js";
import { ApplicationVisibility } from "./application-visibility.js";
import { DraftFormSections } from "./draft-form-sections.js";
import { DraftSteps } from "./draft-steps.js";

const applicationNotFound = () => new DomainError("APPLICATION_NOT_FOUND", "Application not found", 404);

/**
 * "Application Detail" dari id atau Loan ID (api-specs 12 §12.9, §12.10). Pengajuan tenant lain, di luar lingkup
 * data, atau tidak ada dijawab sama (AC-84.04, AC-84.05); setiap pembukaan dicatat di audit trail (AC-84.06).
 */
@Injectable()
export class GetApplicationDetailUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationsRepository,
    private readonly visibility: ApplicationVisibility,
    private readonly sections: DraftFormSections,
    private readonly steps: DraftSteps,
    private readonly productCodes: ProductCodes,
    private readonly branches: BranchDirectory,
    @Inject(PROCESS_VIEW_PORT) private readonly processes: ProcessViewPort,
    private readonly audit: AuditTrail,
  ) {}

  execute(ctx: RequestContext, key: ApplicationKey): Promise<ApplicationDetailResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const row = await this.applications.findDetail(tx, key);
      const visible = row !== null && (await this.visibility.canInquire(tx, ctx, row));
      const sections = visible ? await this.sections.load(tx, row) : null;
      if (!row || !sections) throw applicationNotFound();
      const process = await this.processes.view(tx, row.id);
      await this.audit.record(tx, ctx, {
        module: "Application",
        action: "VIEW_APPLICATION",
        recordId: row.id,
        description: `Application ${row.loanId} viewed`,
      });
      return {
        data: {
          id: row.id,
          loanId: row.loanId,
          status: row.status,
          currentStep: row.currentStep,
          currentStepStatus: row.currentStep ? (process.stepStatuses[row.currentStep] ?? null) : null,
          summary: await this.summary(tx, row),
          tabs: applicationTabs(await this.steps.of(tx, row), process.activeSteps, process.processInstances.length > 0),
          sections,
          processInstances: process.processInstances,
        },
      };
    });
  }

  private async summary(tx: Tx, row: DetailRow): Promise<ApplicationDetailResponse["data"]["summary"]> {
    const productCode = (await this.productCodes.describe(tx, [row.productId])).get(row.productId);
    const branch = row.branchId ? (await this.branches.describe(tx, [row.branchId])).get(row.branchId) : undefined;
    return {
      applicationType: row.applicationType,
      loanAmount: row.loanAmount ?? row.requestedLimit,
      tenorApproved: row.tenorApproved,
      productCode: productCode ?? "",
      branchCode: branch?.branchCode ?? null,
      submittedAt: row.submittedAt?.toISOString() ?? null,
    };
  }
}
