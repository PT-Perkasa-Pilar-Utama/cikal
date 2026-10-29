import type { DisbursementRecordRequest, DisbursementRecordResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CoreResponsesRepository } from "../db/core-responses.repository.js";
import { DisbursementsRepository } from "../db/disbursements.repository.js";
import { assertNotBeforeValidated } from "../domain/validity-rules.js";
import { required } from "./disbursement-errors.js";
import { DisbursementTasks } from "./disbursement-tasks.js";

/** Kode penyedia respons yang dicatat manual dari halaman "Record Disbursement". */
const MANUAL_PROVIDER = "MANUAL";

/**
 * Admin Operasional mencatat hasil pencairan dari core secara manual (api-specs 25 §25.4, US-101). Respons core kanal
 * `MANUAL` disimpan, lalu penutupan tugas DISBURSEMENT membuat StepHandler menyelesaikan pengajuan sebagai DISBURSED
 * (AC-101.01) atau memindahkannya ke Recontest (AC-101.02).
 */
@Injectable()
export class RecordDisbursementUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly tasks: DisbursementTasks,
    private readonly disbursements: DisbursementsRepository,
    private readonly responses: CoreResponsesRepository,
  ) {}

  execute(
    ctx: RequestContext,
    applicationId: string,
    body: DisbursementRecordRequest,
  ): Promise<DisbursementRecordResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const working = await this.tasks.working(tx, ctx, applicationId, "DISBURSEMENT");
      const { application } = working;
      const disbursement = await this.disbursements.findByApplication(tx, applicationId);
      if (!disbursement?.disbursementDate) throw new Error(`Application ${application.loanId} has no validated date`);
      const response = {
        id: uuidv7(),
        tenantId: ctx.tenantId,
        applicationId,
        processInstanceId: working.processInstanceId,
        loanId: application.loanId,
        providerCode: MANUAL_PROVIDER,
        channel: "MANUAL",
        processingStatus: "APPLIED",
        enteredBy: ctx.userId,
      } as const;

      if (body.result === "FAILED") {
        const reason = required(body.reason);
        await this.responses.insert(tx, { ...response, outcome: "GAGAL", failureReason: reason }, ctx.userId);
        await this.tasks.close(tx, ctx, working, "DISBURSEMENT", { resultCode: "FAILED", payload: { reason } });
        return { data: { applicationStatus: "RECONTEST" }, message: "Disbursement failure recorded" };
      }

      const disbursementDate = required(body.disbursementDate);
      const coreLoanNumber = required(body.coreLoanNumber);
      assertNotBeforeValidated(disbursementDate, disbursement.disbursementDate);
      await this.responses.insert(
        tx,
        {
          ...response,
          outcome: "SUKSES",
          disburseDate: disbursementDate,
          coreLoanAccount: coreLoanNumber,
          cif: body.cif || null,
        },
        ctx.userId,
      );
      await this.tasks.close(tx, ctx, working, "DISBURSEMENT", { resultCode: "DISBURSED", payload: { reason: null } });
      return {
        data: { applicationStatus: "DISBURSED", disbursementDate, coreLoanNumber },
        message: "Disbursement recorded",
      };
    });
  }
}
