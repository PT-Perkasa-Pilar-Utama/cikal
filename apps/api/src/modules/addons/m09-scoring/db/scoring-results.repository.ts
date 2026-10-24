import { Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { type ModelGroup, scoringModels, scoringResultDetails, scoringResults } from "./schema.js";

export type ScoringResultInsert = Omit<typeof scoringResults.$inferInsert, "ranAt">;
export type ScoringDetailInsert = Omit<typeof scoringResultDetails.$inferInsert, "tenantId" | "scoringResultId">;
export type ScoringDetailRow = typeof scoringResultDetails.$inferSelect;

export interface StoredResult {
  modelCode: string;
  versionNumber: number;
  constant: string | null;
  cutOff: string | null;
  totalScore: string | null;
  outcome: "PASS" | "REVIEW" | "FAIL";
  failedReasons: string[];
  details: ScoringDetailRow[];
}

/** Akses tabel hasil `m09_scoring` (technical-specs 06 §6.11 M09). */
@Injectable()
export class ScoringResultsRepository {
  async find(tx: Tx, processInstanceId: string, group: ModelGroup): Promise<StoredResult | null> {
    const [result] = await tx
      .select({
        id: scoringResults.id,
        modelCode: scoringModels.modelCode,
        versionNumber: scoringModels.versionNumber,
        constant: scoringModels.constant,
        cutOff: scoringModels.cutOff,
        totalScore: scoringResults.totalScore,
        outcome: scoringResults.outcome,
        failedReasons: scoringResults.failedReasons,
      })
      .from(scoringResults)
      .innerJoin(scoringModels, eq(scoringModels.id, scoringResults.modelId))
      .where(and(eq(scoringResults.processInstanceId, processInstanceId), eq(scoringResults.modelGroup, group)));
    if (!result) return null;
    const details = await tx
      .select()
      .from(scoringResultDetails)
      .where(eq(scoringResultDetails.scoringResultId, result.id))
      .orderBy(asc(scoringResultDetails.sortOrder));
    return { ...result, details };
  }

  /** Satu hasil per proses dan kelompok model: retry manual menghitung ulang dan mengganti hasil lama. */
  async replace(
    tx: Tx,
    result: ScoringResultInsert,
    details: readonly (ScoringDetailInsert & { id: string })[],
  ): Promise<void> {
    await tx
      .delete(scoringResults)
      .where(
        and(
          eq(scoringResults.processInstanceId, result.processInstanceId),
          eq(scoringResults.modelGroup, result.modelGroup),
        ),
      );
    await tx.insert(scoringResults).values(result);
    if (details.length > 0) {
      await tx
        .insert(scoringResultDetails)
        .values(details.map((detail) => ({ ...detail, tenantId: result.tenantId, scoringResultId: result.id })));
    }
  }
}
