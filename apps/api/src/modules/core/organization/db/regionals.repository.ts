import type { Regional } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { branches, regionals } from "./schema.js";
import { codeOrName, type UnitPage, type UnitScope } from "./unit-filters.js";

export interface RegionalFilter {
  q?: string;
  includeInactive: boolean;
  scope: UnitScope;
}

const columns = {
  id: regionals.id,
  regionalCode: regionals.regionalCode,
  regionalName: regionals.regionalName,
  isActive: regionals.isActive,
};

/** Akses tabel `org.regionals` (technical-specs 06 §6.5). */
@Injectable()
export class RegionalsRepository {
  async list(
    tx: Tx,
    filter: RegionalFilter,
    page: UnitPage & { sort: "regionalCode" | "regionalName" },
  ): Promise<Regional[]> {
    const order = page.direction === "asc" ? asc : desc;
    return tx
      .select(columns)
      .from(regionals)
      .where(this.matching(tx, filter))
      .orderBy(order(regionals[page.sort]), asc(regionals.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async count(tx: Tx, filter: RegionalFilter): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(regionals).where(this.matching(tx, filter));
    return row?.total ?? 0;
  }

  /** Regional unit kerja user, atau regional cabangnya bila user hanya punya cabang. */
  private matching(tx: Tx, filter: RegionalFilter): SQL | undefined {
    const { regionalId, branchId } = filter.scope;
    const inScope = regionalId
      ? eq(regionals.id, regionalId)
      : branchId
        ? inArray(regionals.id, tx.select({ id: branches.regionalId }).from(branches).where(eq(branches.id, branchId)))
        : undefined;
    return and(
      inScope,
      filter.includeInactive ? undefined : eq(regionals.isActive, true),
      codeOrName(regionals.regionalCode, regionals.regionalName, filter.q),
    );
  }
}
