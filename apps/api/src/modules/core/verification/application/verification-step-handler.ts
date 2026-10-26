import { type StepContext, type StepResult, verificationResultSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ApplicationProcess } from "../../application/index.js";
import type { StepHandler } from "../../orchestrator/index.js";

export const VERIFICATION_QUEUE = "VERIFICATION";

/** Payload penutupan tugas VERIFICATION dari submit verifikasi (api-specs 15 §15.3). */
export const closedVerificationSchema = z.object({ returnNote: z.string().nullable() });

/**
 * StepHandler `VERIFICATION` CORE (technical-specs 05 §5.13): tugas antrean `VERIFICATION` di cabang pengajuan,
 * lalu submit Verifikator menutupnya. Semua Match lanjut (AC-64.01); ada Not Match kembali ke Draft dengan catatan
 * per dokumen (AC-64.02).
 */
@Injectable()
export class VerificationStepHandler implements StepHandler {
  readonly stepCode = "VERIFICATION";
  readonly moduleCode = "CORE";

  constructor(private readonly applications: ApplicationProcess) {}

  async execute(tx: Tx, ctx: StepContext): Promise<StepResult> {
    const application = await this.applications.find(tx, ctx.applicationId);
    return {
      type: "WAIT_HUMAN",
      queueCode: VERIFICATION_QUEUE,
      branchId: application?.branchId ?? null,
      summary: "Waiting for document verification",
    };
  }

  async onHumanTaskClosed(_tx: Tx, _ctx: StepContext, resultCode: string, payload: unknown): Promise<StepResult> {
    const result = verificationResultSchema.exclude(["IN_PROGRESS"]).parse(resultCode);
    const { returnNote } = closedVerificationSchema.parse(payload);
    if (result === "ALL_MATCH") return { type: "CONTINUE", outcomeCode: result, summary: "All documents match" };
    return { type: "BACK_TO_DRAFT", outcomeCode: result, returnNote: returnNote ?? "" };
  }
}
