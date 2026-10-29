import { Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { coreResponses } from "./schema.js";

export type NewCoreResponse = Omit<
  typeof coreResponses.$inferInsert,
  "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>;

const responseColumns = {
  channel: coreResponses.channel,
  outcome: coreResponses.outcome,
  disburseDate: coreResponses.disburseDate,
  coreLoanAccount: coreResponses.coreLoanAccount,
  cif: coreResponses.cif,
  failureReason: coreResponses.failureReason,
  createdAt: coreResponses.createdAt,
};
export type CoreResponseRow = Pick<typeof coreResponses.$inferSelect, keyof typeof responseColumns>;

/** Akses tabel `m15_disbursement.core_responses` (technical-specs 06 §6.11 M15). */
@Injectable()
export class CoreResponsesRepository {
  async insert(tx: Tx, row: NewCoreResponse, userId: string): Promise<void> {
    await tx.insert(coreResponses).values({ ...row, createdBy: userId, updatedBy: userId });
  }

  /** Respons `APPLIED` terakhir satu proses; proses sesudah Recontest punya respons sendiri. */
  async appliedFor(tx: Tx, processInstanceId: string): Promise<CoreResponseRow | null> {
    const [row] = await tx
      .select(responseColumns)
      .from(coreResponses)
      .where(and(eq(coreResponses.processInstanceId, processInstanceId), eq(coreResponses.processingStatus, "APPLIED")))
      .orderBy(desc(coreResponses.createdAt))
      .limit(1);
    return row ?? null;
  }
}
