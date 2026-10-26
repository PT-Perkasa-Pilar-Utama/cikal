import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import {
  ApplicationDocumentReview,
  ApplicationProcess,
  type ProcessApplication,
  type ReviewDocument,
} from "../../application/index.js";
import { OrchestratorApi } from "../../orchestrator/index.js";

/** Pengajuan yang sedang di langkah VERIFICATION beserta dokumennya. */
export interface VerificationCase {
  application: ProcessApplication;
  processInstanceId: string;
  documents: ReviewDocument[];
}

/** Aturan bersama operasi verifikasi (api-specs 15): pengajuan ada dan langkah saat ini `VERIFICATION`. */
@Injectable()
export class VerificationCases {
  constructor(
    private readonly applications: ApplicationProcess,
    private readonly review: ApplicationDocumentReview,
    private readonly orchestrator: OrchestratorApi,
  ) {}

  /**
   * Tidak ada: `404 APPLICATION_NOT_FOUND`. Langkah VERIFICATION tidak menunggu: `notWaiting`, yaitu `409 INVALID_STATE`
   * untuk layar (api-specs 15 §15.1) dan `409 ALREADY_PROCESSED` untuk simpan dan submit (§15.3).
   */
  async current(tx: Tx, applicationId: string, notWaiting: () => DomainError): Promise<VerificationCase> {
    const application = await this.applications.find(tx, applicationId);
    if (!application) throw new DomainError("APPLICATION_NOT_FOUND", "Application not found", 404);
    const step = await this.orchestrator.stepOf(tx, applicationId, "VERIFICATION");
    if (!step || step.status !== "WAITING_HUMAN") throw notWaiting();
    const documents = await this.review.documentsOf(tx, applicationId);
    return { application, processInstanceId: step.processInstanceId, documents };
  }
}
