import type { ValidityCheckRequest, ValidityCheckResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationProcess } from "../../../core/application/index.js";
import { ApprovedFinancings } from "../../../core/approval/index.js";
import { DisbursementsRepository } from "../db/disbursements.repository.js";
import { assertDisbursementDate } from "../domain/validity-rules.js";
import { DisbursementTasks } from "./disbursement-tasks.js";

/** Skema kontrak sudah mewajibkan field per hasil; ini hanya penyempit tipe. */
function required(value: string | undefined): string {
  if (!value) throw DomainError.standard("VALIDATION_FAILED");
  return value;
}

/**
 * Admin Operasional menyatakan data pencairan Valid atau Not Valid (api-specs 25 §25.2). Penutupan tugas
 * VALIDITY_CHECK membuat StepHandler melanjutkan proses (AC-76.01) atau mengembalikannya ke Draft (AC-76.04).
 */
@Injectable()
export class SubmitValidityCheckUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationProcess,
    private readonly financings: ApprovedFinancings,
    private readonly disbursements: DisbursementsRepository,
    private readonly tasks: DisbursementTasks,
  ) {}

  execute(ctx: RequestContext, applicationId: string, body: ValidityCheckRequest): Promise<ValidityCheckResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const working = await this.tasks.working(tx, ctx, applicationId, "VALIDITY_CHECK");
      const { application } = working;
      if (body.result === "NOT_VALID") {
        const reason = required(body.reason);
        await this.disbursements.recordValidity(
          tx,
          applicationId,
          { validityStatus: "NOT_VALID", disbursementDate: null, notValidReason: reason },
          ctx.userId,
        );
        await this.tasks.close(tx, ctx, working, "VALIDITY_CHECK", { resultCode: "NOT_VALID", payload: { reason } });
        const after = await this.applications.find(tx, applicationId);
        return {
          data: { validityStatus: "NOT_VALID", applicationStatus: after?.status ?? application.status },
          message: "Disbursement data marked as not valid",
        };
      }

      const disbursementDate = required(body.disbursementDate);
      assertDisbursementDate(disbursementDate, businessDate(new Date()));
      const financing = await this.financings.find(tx, applicationId);
      if (!financing) throw new Error(`Application ${application.loanId} has no approved financing`);
      const firstInstallmentDate = body.firstInstallmentDate ?? financing.firstInstallmentDate;
      if (firstInstallmentDate !== financing.firstInstallmentDate) {
        await this.financings.reschedule(
          tx,
          { tenantId: ctx.tenantId, applicationId, productId: application.productId },
          firstInstallmentDate,
          ctx.userId,
        );
      }
      await this.disbursements.recordValidity(
        tx,
        applicationId,
        { validityStatus: "VALID", disbursementDate, notValidReason: null },
        ctx.userId,
      );
      const nextStep = await this.tasks.close(tx, ctx, working, "VALIDITY_CHECK", {
        resultCode: "VALID",
        payload: { reason: null },
      });
      return {
        data: { validityStatus: "VALID", disbursementDate, firstInstallmentDate, nextStep },
        message: "Disbursement data validated",
      };
    });
  }
}
