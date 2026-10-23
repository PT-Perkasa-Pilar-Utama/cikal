import type { SkipReason, StepCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { Outbox } from "../../../../platform/queue/outbox.js";
import type { ProcessRow } from "../db/process-instances.repository.js";

export type StepEventType = "StepCompleted" | "StepFailed" | "StepSkipped";

/** Hasil satu attempt langkah untuk penerima event (Reporting, Audit, UI), tanpa data pemohon. */
export interface StepEventDetail {
  stepCode: StepCode;
  attempt: number;
  outcomeCode: string | null;
  skipReason: SkipReason | null;
}

/** Event langkah ke outbox di transaksi langkah (technical-specs 12 §12.3 baris terakhir, XM-04). */
@Injectable()
export class StepEvents {
  constructor(private readonly outbox: Outbox) {}

  async publish(tx: Tx, process: ProcessRow, eventType: StepEventType, detail: StepEventDetail): Promise<void> {
    await this.outbox.publish(tx, {
      tenantId: process.tenantId,
      eventType,
      aggregateId: process.applicationId,
      payload: { processInstanceId: process.id, applicationId: process.applicationId, ...detail },
    });
  }
}
