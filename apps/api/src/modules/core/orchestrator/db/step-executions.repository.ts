import { Injectable } from "@nestjs/common";
import { asc, desc, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { stepExecutions } from "./schema.js";

type StepColumns = typeof stepExecutions.$inferSelect;

export type StepRow = Pick<
  StepColumns,
  | "id"
  | "processInstanceId"
  | "stepCode"
  | "status"
  | "attempt"
  | "outcomeCode"
  | "resultType"
  | "skipReason"
  | "externalReference"
  | "waitDeadline"
  | "errorCategory"
  | "errorMessage"
  | "actorUserId"
  | "startedAt"
  | "endedAt"
  | "aging"
  | "summary"
>;

export type StepInsert = Pick<
  StepColumns,
  "id" | "tenantId" | "processInstanceId" | "stepCode" | "status" | "attempt"
> &
  Partial<Omit<StepRow, "id" | "processInstanceId" | "stepCode" | "status" | "attempt">>;

export type StepChanges = Partial<Omit<StepRow, "id" | "processInstanceId" | "stepCode" | "attempt">>;

const stepColumns = {
  id: stepExecutions.id,
  processInstanceId: stepExecutions.processInstanceId,
  stepCode: stepExecutions.stepCode,
  status: stepExecutions.status,
  attempt: stepExecutions.attempt,
  outcomeCode: stepExecutions.outcomeCode,
  resultType: stepExecutions.resultType,
  skipReason: stepExecutions.skipReason,
  externalReference: stepExecutions.externalReference,
  waitDeadline: stepExecutions.waitDeadline,
  errorCategory: stepExecutions.errorCategory,
  errorMessage: stepExecutions.errorMessage,
  actorUserId: stepExecutions.actorUserId,
  startedAt: stepExecutions.startedAt,
  endedAt: stepExecutions.endedAt,
  aging: stepExecutions.aging,
  summary: stepExecutions.summary,
};

/** Akses tabel `orchestrator.step_executions` (technical-specs 06 §6.10). */
@Injectable()
export class StepExecutionsRepository {
  async insert(tx: Tx, rows: StepInsert[]): Promise<void> {
    await tx.insert(stepExecutions).values(rows);
  }

  /** Attempt terakhir setiap langkah satu proses. */
  async listLatest(tx: Tx, processInstanceId: string): Promise<StepRow[]> {
    return tx
      .selectDistinctOn([stepExecutions.stepCode], stepColumns)
      .from(stepExecutions)
      .where(eq(stepExecutions.processInstanceId, processInstanceId))
      .orderBy(asc(stepExecutions.stepCode), desc(stepExecutions.attempt));
  }

  async findById(tx: Tx, id: string): Promise<StepRow | null> {
    const [row] = await tx.select(stepColumns).from(stepExecutions).where(eq(stepExecutions.id, id));
    return row ?? null;
  }

  /** Langkah terbaru yang membawa `externalReference` dari adapter (IN-08, IN-15). */
  async findByExternalReference(tx: Tx, externalReference: string): Promise<StepRow | null> {
    const [row] = await tx
      .select(stepColumns)
      .from(stepExecutions)
      .where(eq(stepExecutions.externalReference, externalReference))
      .orderBy(desc(stepExecutions.createdAt))
      .limit(1);
    return row ?? null;
  }

  async update(tx: Tx, id: string, changes: StepChanges): Promise<void> {
    await tx
      .update(stepExecutions)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(stepExecutions.id, id));
  }
}
