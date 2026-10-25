import type { Branch } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { branches, regionals } from "./schema.js";
import { codeOrName, type UnitPage, type UnitScope } from "./unit-filters.js";

export interface BranchFilter {
  regionalId?: string;
  q?: string;
  includeInactive: boolean;
  scope: UnitScope;
}

export interface BranchCode {
  id: string;
  branchCode: string;
  branchName: string;
}

const columns = {
  id: branches.id,
  branchCode: branches.branchCode,
  branchName: branches.branchName,
  regional: { id: regionals.id, regionalCode: regionals.regionalCode, regionalName: regionals.regionalName },
  isActive: branches.isActive,
};

/** Akses tabel `org.branches` (technical-specs 06 §6.5). */
@Injectable()
export class BranchesRepository {
  async list(tx: Tx, filter: BranchFilter, page: UnitPage & { sort: "branchCode" | "branchName" }): Promise<Branch[]> {
    const order = page.direction === "asc" ? asc : desc;
    return tx
      .select(columns)
      .from(branches)
      .innerJoin(regionals, eq(regionals.id, branches.regionalId))
      .where(this.matching(filter))
      .orderBy(order(branches[page.sort]), asc(branches.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async count(tx: Tx, filter: BranchFilter): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(branches).where(this.matching(filter));
    return row?.total ?? 0;
  }

  /** Cabang dalam lingkup data user, aktif atau tidak; `null` bila tidak ada. */
  async findInScope(tx: Tx, id: string, scope: UnitScope): Promise<{ id: string } | null> {
    const [row] = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.id, id), this.inScope(scope)));
    return row ?? null;
  }

  async findCodes(tx: Tx, ids: readonly string[]): Promise<BranchCode[]> {
    if (ids.length === 0) return [];
    return tx
      .select({ id: branches.id, branchCode: branches.branchCode, branchName: branches.branchName })
      .from(branches)
      .where(inArray(branches.id, [...ids]));
  }

  async findIdsByRegional(tx: Tx, regionalId: string): Promise<string[]> {
    const rows = await tx.select({ id: branches.id }).from(branches).where(eq(branches.regionalId, regionalId));
    return rows.map((row) => row.id);
  }

  private matching(filter: BranchFilter): SQL | undefined {
    return and(
      this.inScope(filter.scope),
      filter.regionalId ? eq(branches.regionalId, filter.regionalId) : undefined,
      filter.includeInactive ? undefined : eq(branches.isActive, true),
      codeOrName(branches.branchCode, branches.branchName, filter.q),
    );
  }

  /** Role cabang hanya melihat cabangnya, role wilayah cabang di regionalnya (TN-02). */
  private inScope(scope: UnitScope): SQL | undefined {
    if (scope.branchId) return eq(branches.id, scope.branchId);
    if (scope.regionalId) return eq(branches.regionalId, scope.regionalId);
    return undefined;
  }
}
