import type { DecisionOutcome, MatrixCombination } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, eq, type SQL } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { MatrixRule } from "../domain/matrix-rules.js";
import { decisionMatrix } from "./schema.js";

const ruleColumns = {
  id: decisionMatrix.id,
  priority: decisionMatrix.priority,
  dedupOutcome: decisionMatrix.dedupOutcome,
  dukcapilOutcome: decisionMatrix.dukcapilOutcome,
  fraudOutcome: decisionMatrix.fraudOutcome,
  racOutcome: decisionMatrix.racOutcome,
  scoringOutcome: decisionMatrix.scoringOutcome,
  creditBureauOutcome: decisionMatrix.creditBureauOutcome,
  decisionOutcome: decisionMatrix.decisionOutcome,
  description: decisionMatrix.description,
};

const filterBy = (decisionOutcome?: DecisionOutcome): SQL | undefined =>
  decisionOutcome ? eq(decisionMatrix.decisionOutcome, decisionOutcome) : undefined;

/** Akses tabel `m11_decision.decision_matrix` (technical-specs 06 §6.11 M11). */
@Injectable()
export class DecisionMatrixRepository {
  async list(
    tx: Tx,
    decisionOutcome: DecisionOutcome | undefined,
    page: { offset: number; limit: number },
  ): Promise<MatrixRule[]> {
    return tx
      .select(ruleColumns)
      .from(decisionMatrix)
      .where(filterBy(decisionOutcome))
      .orderBy(asc(decisionMatrix.priority), asc(decisionMatrix.id))
      .offset(page.offset)
      .limit(page.limit);
  }

  async count(tx: Tx, decisionOutcome: DecisionOutcome | undefined): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(decisionMatrix).where(filterBy(decisionOutcome));
    return row?.total ?? 0;
  }

  /** Seluruh baris tenant, untuk lookup dan penempatan prioritas. */
  async all(tx: Tx): Promise<MatrixRule[]> {
    return tx.select(ruleColumns).from(decisionMatrix).orderBy(asc(decisionMatrix.priority), asc(decisionMatrix.id));
  }

  async findById(tx: Tx, id: string): Promise<MatrixRule | null> {
    const [row] = await tx.select(ruleColumns).from(decisionMatrix).where(eq(decisionMatrix.id, id));
    return row ?? null;
  }

  async findByCombination(tx: Tx, combination: MatrixCombination): Promise<MatrixRule | null> {
    const [row] = await tx
      .select(ruleColumns)
      .from(decisionMatrix)
      .where(
        and(
          eq(decisionMatrix.dedupOutcome, combination.dedupOutcome),
          eq(decisionMatrix.dukcapilOutcome, combination.dukcapilOutcome),
          eq(decisionMatrix.fraudOutcome, combination.fraudOutcome),
          eq(decisionMatrix.racOutcome, combination.racOutcome),
          eq(decisionMatrix.scoringOutcome, combination.scoringOutcome),
          eq(decisionMatrix.creditBureauOutcome, combination.creditBureauOutcome),
        ),
      );
    return row ?? null;
  }

  async insert(tx: Tx, tenantId: string, rule: MatrixRule, actorId: string): Promise<void> {
    await tx.insert(decisionMatrix).values({ ...rule, tenantId, createdBy: actorId, updatedBy: actorId });
  }

  async update(tx: Tx, rule: MatrixRule, actorId: string): Promise<void> {
    const { id, ...fields } = rule;
    await tx
      .update(decisionMatrix)
      .set({ ...fields, updatedAt: new Date(), updatedBy: actorId })
      .where(eq(decisionMatrix.id, id));
  }

  async updatePriority(tx: Tx, id: string, priority: number, actorId: string): Promise<void> {
    await tx
      .update(decisionMatrix)
      .set({ priority, updatedAt: new Date(), updatedBy: actorId })
      .where(eq(decisionMatrix.id, id));
  }
}
