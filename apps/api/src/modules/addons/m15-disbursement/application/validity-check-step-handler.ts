import type { StepContext, StepResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ApplicationProcess } from "../../../core/application/index.js";
import { ApprovedFinancings } from "../../../core/approval/index.js";
import type { StepHandler } from "../../../core/orchestrator/index.js";
import { DisbursementsRepository } from "../db/disbursements.repository.js";

export const VALIDITY_CHECK_QUEUE = "VALIDITY_CHECK";

/** Payload penutupan tugas VALIDITY_CHECK dari `POST /applications/{id}/validity-check` (api-specs 25 §25.2). */
export const closedValidityCheckSchema = z.object({ reason: z.string().nullable() });

/**
 * StepHandler `VALIDITY_CHECK` M15 (technical-specs 05 §5.18): menyiapkan data pencairan dari struktur kredit yang
 * disetujui, lalu tugas antrean `VALIDITY_CHECK` di cabang pengajuan. Valid lanjut ke langkah berikutnya (AC-76.01);
 * Not Valid kembali ke Draft dengan alasan sebagai catatan (AC-76.04).
 */
@Injectable()
export class ValidityCheckStepHandler implements StepHandler {
  readonly stepCode = "VALIDITY_CHECK";
  readonly moduleCode = "M15";

  constructor(
    private readonly applications: ApplicationProcess,
    private readonly financings: ApprovedFinancings,
    private readonly disbursements: DisbursementsRepository,
  ) {}

  async execute(tx: Tx, ctx: StepContext): Promise<StepResult> {
    const financing = await this.financings.find(tx, ctx.applicationId);
    if (!financing) throw new Error(`Application ${ctx.loanId} has no approved financing`);
    await this.disbursements.open(tx, {
      tenantId: ctx.tenantId,
      applicationId: ctx.applicationId,
      processInstanceId: ctx.processInstanceId,
      disbursementAmount: financing.netDisbursement,
    });
    const application = await this.applications.find(tx, ctx.applicationId);
    return {
      type: "WAIT_HUMAN",
      queueCode: VALIDITY_CHECK_QUEUE,
      branchId: application?.branchId ?? null,
      summary: "Waiting for validity check",
    };
  }

  async onHumanTaskClosed(_tx: Tx, _ctx: StepContext, resultCode: string, payload: unknown): Promise<StepResult> {
    const { reason } = closedValidityCheckSchema.parse(payload);
    if (resultCode === "VALID")
      return { type: "CONTINUE", outcomeCode: "VALID", summary: "Disbursement data validated" };
    return { type: "BACK_TO_DRAFT", outcomeCode: "NOT_VALID", returnNote: reason ?? "" };
  }
}
