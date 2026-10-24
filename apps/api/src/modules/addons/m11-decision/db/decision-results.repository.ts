import { Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { decisionResults } from "./schema.js";

export type DecisionResultRow = Pick<
  typeof decisionResults.$inferSelect,
  | "id"
  | "applicationId"
  | "processInstanceId"
  | "outcomes"
  | "decisionOutcome"
  | "matrixRowId"
  | "matrixRowPriority"
  | "description"
>;
export type DecisionResultInsert = DecisionResultRow & { tenantId: string };

const resultColumns = {
  id: decisionResults.id,
  applicationId: decisionResults.applicationId,
  processInstanceId: decisionResults.processInstanceId,
  outcomes: decisionResults.outcomes,
  decisionOutcome: decisionResults.decisionOutcome,
  matrixRowId: decisionResults.matrixRowId,
  matrixRowPriority: decisionResults.matrixRowPriority,
  description: decisionResults.description,
};

/** Akses tabel `m11_decision.decision_results` (technical-specs 06 §6.11 M11). */
@Injectable()
export class DecisionResultsRepository {
  async findByProcess(tx: Tx, processInstanceId: string): Promise<DecisionResultRow | null> {
    const [row] = await tx
      .select(resultColumns)
      .from(decisionResults)
      .where(eq(decisionResults.processInstanceId, processInstanceId));
    return row ?? null;
  }

  /** Keputusan terbaru pengajuan, yaitu milik proses awal atau recontest terakhir yang sudah sampai DECISION. */
  async findLatestByApplication(tx: Tx, applicationId: string): Promise<DecisionResultRow | null> {
    const [row] = await tx
      .select(resultColumns)
      .from(decisionResults)
      .where(eq(decisionResults.applicationId, applicationId))
      .orderBy(desc(decisionResults.createdAt), desc(decisionResults.id))
      .limit(1);
    return row ?? null;
  }

  async insert(tx: Tx, row: DecisionResultInsert): Promise<void> {
    await tx.insert(decisionResults).values(row);
  }
}
