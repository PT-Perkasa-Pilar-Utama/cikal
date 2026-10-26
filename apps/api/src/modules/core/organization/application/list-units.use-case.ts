import type {
  BranchListQuery,
  BranchListResponse,
  PageMeta,
  RegionalListQuery,
  RegionalListResponse,
  SubBranchListQuery,
  SubBranchListResponse,
} from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { BranchesRepository } from "../db/branches.repository.js";
import { RegionalsRepository } from "../db/regionals.repository.js";
import { SubBranchesRepository } from "../db/sub-branches.repository.js";
import { UnitAccess } from "./unit-access.js";

/** `"branchCode,asc"` menjadi kolom dan arah urutan beserta offset halaman. */
function pageOf<S extends string>(
  query: { page: number; pageSize: number; sort: `${S},${"asc" | "desc"}` },
  columns: readonly [S, ...S[]],
) {
  const [name, direction] = query.sort.split(",");
  return {
    sort: columns.find((column) => column === name) ?? columns[0],
    direction: direction === "desc" ? ("desc" as const) : ("asc" as const),
    offset: (query.page - 1) * query.pageSize,
    limit: query.pageSize,
  };
}

const metaOf = (query: { page: number; pageSize: number }, totalItems: number): PageMeta => ({
  page: query.page,
  pageSize: query.pageSize,
  totalItems,
  totalPages: Math.ceil(totalItems / query.pageSize),
});

/** Dropdown regional, cabang, dan sub cabang dalam lingkup data user (api-specs 05 §5.1, §5.2, AC-17.06). */
@Injectable()
export class ListUnitsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly access: UnitAccess,
    private readonly regionals: RegionalsRepository,
    private readonly branches: BranchesRepository,
    private readonly subBranches: SubBranchesRepository,
  ) {}

  async listRegionals(ctx: RequestContext, query: RegionalListQuery): Promise<RegionalListResponse> {
    await this.access.authorize(ctx, query.includeInactive);
    return this.db.withTenantTx(ctx, async (tx) => {
      const filter = { q: query.q, includeInactive: query.includeInactive, scope: await this.access.scope(tx, ctx) };
      return {
        data: await this.regionals.list(tx, filter, pageOf(query, ["regionalCode", "regionalName"])),
        meta: metaOf(query, await this.regionals.count(tx, filter)),
      };
    });
  }

  async listBranches(ctx: RequestContext, query: BranchListQuery): Promise<BranchListResponse> {
    await this.access.authorize(ctx, query.includeInactive);
    return this.db.withTenantTx(ctx, async (tx) => {
      const { regionalId, q, includeInactive } = query;
      const filter = { regionalId, q, includeInactive, scope: await this.access.scope(tx, ctx) };
      return {
        data: await this.branches.list(tx, filter, pageOf(query, ["branchCode", "branchName"])),
        meta: metaOf(query, await this.branches.count(tx, filter)),
      };
    });
  }

  /** Cabang di luar lingkup data user dijawab `404 NOT_FOUND` (api-specs 01 §1.9). */
  async listSubBranches(
    ctx: RequestContext,
    branchId: string,
    query: SubBranchListQuery,
  ): Promise<SubBranchListResponse> {
    await this.access.authorize(ctx, query.includeInactive);
    return this.db.withTenantTx(ctx, async (tx) => {
      if (!(await this.branches.findInScope(tx, branchId, await this.access.scope(tx, ctx)))) {
        throw DomainError.standard("NOT_FOUND");
      }
      const filter = { branchId, q: query.q, includeInactive: query.includeInactive };
      return {
        data: await this.subBranches.list(tx, filter, pageOf(query, ["subBranchCode", "subBranchName"])),
        meta: metaOf(query, await this.subBranches.count(tx, filter)),
      };
    });
  }
}
