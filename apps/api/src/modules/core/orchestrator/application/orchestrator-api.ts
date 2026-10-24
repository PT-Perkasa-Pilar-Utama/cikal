import type { StepCode, StepStatus } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ProcessOutlook } from "./process-outlook.js";
import { StartProcess } from "./start-process.js";
import { type ExternalMatch, WaitingSteps } from "./waiting-steps.js";

/**
 * Antarmuka publik Orchestrator untuk modul lain (technical-specs 12 §12.6), dipanggil di transaksi pemanggil.
 * `retry` dan `finish` hanya dipakai Process Monitoring modul ini (`monitoring.ts`).
 */
@Injectable()
export class OrchestratorApi {
  constructor(
    private readonly starter: StartProcess,
    private readonly waiting: WaitingSteps,
    private readonly outlook: ProcessOutlook,
  ) {}

  /** Dipanggil `application.submit` di transaksi yang sama (api-specs 12 §12.8 langkah 5). */
  start(tx: Tx, applicationId: string): Promise<{ processInstanceId: string }> {
    return this.starter.execute(tx, applicationId);
  }

  /** Dipanggil `taskQueue.close` (technical-specs 05 §5.12). */
  completeHumanStep(
    tx: Tx,
    stepExecutionId: string,
    resultCode: string,
    payload: unknown,
    userId: string,
  ): Promise<void> {
    return this.waiting.completeHumanStep(tx, stepExecutionId, resultCode, payload, userId);
  }

  /** Dipanggil endpoint data masuk Integration Registry (IN-15). */
  receiveExternal(tx: Tx, externalReference: string, payload: unknown): Promise<ExternalMatch> {
    return this.waiting.receiveExternal(tx, externalReference, payload);
  }

  /** `outcomeCode` langkah yang selesai dan `SKIP` untuk yang dilewati; dibaca M11 Decision (XM-02, DEP-02). */
  outcomes(tx: Tx, processInstanceId: string): Promise<Partial<Record<StepCode, string>>> {
    return this.outlook.outcomes(tx, processInstanceId);
  }

  /** Proses dan status langkah untuk endpoint hasil langkah modul; `null` bila proses tidak ada. */
  stepOf(
    tx: Tx,
    applicationId: string,
    stepCode: StepCode,
    processInstanceId?: string,
  ): Promise<{ processInstanceId: string; status: StepStatus } | null> {
    return this.outlook.stepOf(tx, applicationId, stepCode, processInstanceId);
  }

  /** Langkah sesudah `after` menurut rute proses, contoh SIKP atau APPROVAL sesudah DECISION (AC-69.01). */
  nextStep(tx: Tx, processInstanceId: string, after: StepCode): Promise<StepCode | null> {
    return this.outlook.nextStep(tx, processInstanceId, after);
  }
}
