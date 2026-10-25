import type { SubBranch } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, type SQL } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { subBranches } from "./schema.js";
import { codeOrName, type UnitPage } from "./unit-filters.js";

export interface SubBranchFilter {
  branchId: string;
  q?: string;
  includeInactive: boolean;
}

const columns = {
  id: subBranches.id,
  subBranchCode: subBranches.subBranchCode,
  subBranchName: subBranches.subBranchName,
  isActive: subBranches.isActive,
};

/** Akses tabel `org.sub_branches` (technical-specs 06 §6.5). */
@Injectable()
export class SubBranchesRepository {
  async list(
    tx: Tx,
    filter: SubBranchFilter,
    page: UnitPage & { sort: "subBranchCode" | "subBranchName" },
  ): Promise<SubBranch[]> {
    const order = page.direction === "asc" ? asc : desc;
    return tx
      .select(columns)
      .from(subBranches)
      .where(this.matching(filter))
      .orderBy(order(subBranches[page.sort]), asc(subBranches.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async count(tx: Tx, filter: SubBranchFilter): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(subBranches).where(this.matching(filter));
    return row?.total ?? 0;
  }

  private matching(filter: SubBranchFilter): SQL | undefined {
    return and(
      eq(subBranches.branchId, filter.branchId),
      filter.includeInactive ? undefined : eq(subBranches.isActive, true),
      codeOrName(subBranches.subBranchCode, subBranches.subBranchName, filter.q),
    );
  }
}
