import {
  VERIFICATION_MESSAGES,
  type VerificationSaveRequest,
  type VerificationSaveResponse,
  type VerificationSubmitResponse,
} from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationDocumentReview, ApplicationProcess } from "../../application/index.js";
import { OrchestratorApi } from "../../orchestrator/index.js";
import { TaskQueue } from "../../task-queue/index.js";
import { DocumentVerificationsRepository } from "../db/document-verifications.repository.js";
import { type DocumentState, merged, submission } from "../domain/verification-rules.js";
import { type VerificationCase, VerificationCases } from "./verification-cases.js";
import { VERIFICATION_QUEUE } from "./verification-step-handler.js";

/**
 * Simpan sebagian (api-specs 15 §15.2, AC-64.04) dan submit (§15.3, AC-64.01 s.d. AC-64.03) oleh pemilik tugas
 * VERIFICATION. Submit menutup tugas lewat Task Queue sehingga StepHandler menentukan hasil langkah.
 */
@Injectable()
export class SaveVerificationUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly cases: VerificationCases,
    private readonly review: ApplicationDocumentReview,
    private readonly verifications: DocumentVerificationsRepository,
    private readonly tasks: TaskQueue,
    private readonly applications: ApplicationProcess,
    private readonly orchestrator: OrchestratorApi,
  ) {}

  save(ctx: RequestContext, applicationId: string, body: VerificationSaveRequest): Promise<VerificationSaveResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const verification = await this.working(tx, ctx, applicationId);
      const documents = merged(verification.documents, body.documents);
      await this.store(tx, ctx, verification, documents, "IN_PROGRESS");
      const pendingCount = documents.filter((document) => document.verificationStatus === "PENDING").length;
      return {
        data: { savedCount: documents.length - pendingCount, pendingCount },
        message: VERIFICATION_MESSAGES.saved,
      };
    });
  }

  submit(
    ctx: RequestContext,
    applicationId: string,
    body: VerificationSaveRequest,
  ): Promise<VerificationSubmitResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const verification = await this.working(tx, ctx, applicationId);
      const documents = merged(verification.documents, body.documents);
      const { result, returnNote } = submission(documents);
      await this.store(tx, ctx, verification, documents, result);
      await this.tasks.closeFor(
        tx,
        { applicationId, queueCode: VERIFICATION_QUEUE },
        {
          userId: ctx.userId,
          resultCode: result,
          payload: { returnNote },
          alreadyProcessedMessage: VERIFICATION_MESSAGES.alreadyProcessed,
        },
      );
      const nextStep =
        result === "ALL_MATCH"
          ? await this.orchestrator.nextStep(tx, verification.processInstanceId, "VERIFICATION")
          : null;
      const after = await this.applications.find(tx, applicationId);
      return {
        data: { result, nextStep, applicationStatus: after?.status ?? verification.application.status },
        message: VERIFICATION_MESSAGES.submitted,
      };
    });
  }

  /** Langkah VERIFICATION menunggu dan tugasnya `ASSIGNED` ke user sesi (api-specs 14 §14.5). */
  private async working(tx: Tx, ctx: RequestContext, applicationId: string): Promise<VerificationCase> {
    const verification = await this.cases.current(tx, applicationId, () =>
      DomainError.standard("ALREADY_PROCESSED", VERIFICATION_MESSAGES.alreadyProcessed),
    );
    await this.tasks.assertWorking(
      tx,
      { applicationId, queueCode: VERIFICATION_QUEUE },
      { userId: ctx.userId, alreadyProcessedMessage: VERIFICATION_MESSAGES.alreadyProcessed },
    );
    return verification;
  }

  private async store(
    tx: Tx,
    ctx: RequestContext,
    verification: VerificationCase,
    documents: readonly DocumentState[],
    result: "IN_PROGRESS" | "ALL_MATCH" | "HAS_NOT_MATCH",
  ): Promise<void> {
    const { application, processInstanceId } = verification;
    await this.review.save(tx, application.id, documents, ctx.userId);
    await this.verifications.save(tx, {
      tenantId: ctx.tenantId,
      applicationId: application.id,
      processInstanceId,
      verifierUserId: ctx.userId,
      result,
      submittedAt: result === "IN_PROGRESS" ? null : new Date(),
    });
  }
}
