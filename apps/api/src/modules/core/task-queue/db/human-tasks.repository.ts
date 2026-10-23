import type { QueueCode, TaskStatus } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, type SQL, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { VisibilityScope } from "../domain/task-rules.js";
import { humanTasks } from "./schema.js";

export type TaskRow = typeof humanTasks.$inferSelect;
export type NewTaskRow = Omit<typeof humanTasks.$inferInsert, "version" | "createdAt" | "updatedAt">;

export interface TaskFilter {
  queueCode: QueueCode;
  statuses: TaskStatus[];
  assignedTo?: string;
  /** Potongan Loan ID, tanpa membedakan huruf besar dan kecil. */
  loanId?: string;
  scope: VisibilityScope;
}

export interface TaskPage {
  offset: number;
  limit: number;
  sort: "createdAt" | "loanId";
  direction: "asc" | "desc";
}

/** Akses tabel `taskqueue.human_tasks` (technical-specs 06 §6.10). */
@Injectable()
export class HumanTasksRepository {
  /** Tugas yang sudah ada untuk attempt langkah yang sama tidak digandakan (job yang diulang). */
  async insert(tx: Tx, row: NewTaskRow): Promise<void> {
    await tx.insert(humanTasks).values(row).onConflictDoNothing();
  }

  async findById(tx: Tx, id: string): Promise<TaskRow | null> {
    const [row] = await tx.select().from(humanTasks).where(eq(humanTasks.id, id));
    return row ?? null;
  }

  /** Mengunci tugas sampai transaksi selesai, untuk operasi penutup (api-specs 14 §14.5). */
  async lock(tx: Tx, id: string): Promise<TaskRow | null> {
    const [row] = await tx.select().from(humanTasks).where(eq(humanTasks.id, id)).for("update");
    return row ?? null;
  }

  async list(tx: Tx, filter: TaskFilter, page: TaskPage): Promise<TaskRow[]> {
    const order = page.direction === "asc" ? asc : desc;
    const column = page.sort === "loanId" ? humanTasks.loanId : humanTasks.createdAt;
    return tx
      .select()
      .from(humanTasks)
      .where(matching(filter))
      .orderBy(order(column), asc(humanTasks.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async count(tx: Tx, filter: TaskFilter): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(humanTasks).where(matching(filter));
    return row?.total ?? 0;
  }

  /** "Assign to Me" dengan penguncian optimistis; `null` bila tugas sudah tidak `OPEN` atau versinya berubah. */
  async assign(tx: Tx, id: string, version: number, userId: string): Promise<TaskRow | null> {
    const now = new Date();
    const [row] = await tx
      .update(humanTasks)
      .set({
        status: "ASSIGNED",
        assignedUserId: userId,
        assignedAt: now,
        version: sql`${humanTasks.version} + 1`,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(and(eq(humanTasks.id, id), eq(humanTasks.status, "OPEN"), eq(humanTasks.version, version)))
      .returning();
    return row ?? null;
  }

  /** Melepas tugas `ASSIGNED` versi ini; `null` bila status atau versinya berubah. */
  async release(tx: Tx, id: string, version: number, userId: string): Promise<TaskRow | null> {
    const [row] = await tx
      .update(humanTasks)
      .set({
        status: "OPEN",
        assignedUserId: null,
        assignedAt: null,
        version: sql`${humanTasks.version} + 1`,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(humanTasks.id, id), eq(humanTasks.status, "ASSIGNED"), eq(humanTasks.version, version)))
      .returning();
    return row ?? null;
  }

  async close(tx: Tx, id: string, resultCode: string, userId: string): Promise<void> {
    const now = new Date();
    await tx
      .update(humanTasks)
      .set({
        status: "CLOSED",
        closedAt: now,
        closedBy: userId,
        resultCode,
        version: sql`${humanTasks.version} + 1`,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(eq(humanTasks.id, id));
  }
}

function matching(filter: TaskFilter): SQL | undefined {
  return and(
    eq(humanTasks.queueCode, filter.queueCode),
    inArray(humanTasks.status, filter.statuses),
    filter.assignedTo ? eq(humanTasks.assignedUserId, filter.assignedTo) : undefined,
    filter.loanId ? ilike(humanTasks.loanId, `%${escapeLike(filter.loanId)}%`) : undefined,
    visible(filter.scope),
  );
}

/** Padanan SQL `isVisible` (domain/task-rules.ts) untuk satu antrean. */
function visible(scope: VisibilityScope): SQL | undefined {
  const eligible = scope.eligible
    ? and(
        inBranches(scope.eligible.branches),
        scope.eligible.roleId
          ? or(isNull(humanTasks.eligibleRoleId), eq(humanTasks.eligibleRoleId, scope.eligible.roleId))
          : isNull(humanTasks.eligibleRoleId),
      )
    : undefined;
  const supervised = scope.supervisedBranches ? inBranches(scope.supervisedBranches) : undefined;
  return or(eq(humanTasks.assignedUserId, scope.userId), eligible, supervised);
}

function inBranches(branches: "ALL" | string[]): SQL {
  if (branches === "ALL") return sql`true`;
  return branches.length > 0
    ? (or(isNull(humanTasks.branchId), inArray(humanTasks.branchId, branches)) ?? sql`false`)
    : isNull(humanTasks.branchId);
}

function escapeLike(value: string): string {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}
