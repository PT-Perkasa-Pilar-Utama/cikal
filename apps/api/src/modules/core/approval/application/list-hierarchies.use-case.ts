import type { ApprovalHierarchy, ApprovalHierarchyListQuery, ApprovalHierarchyListResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import { BranchDirectory } from "../../organization/index.js";
import { ProductCodes } from "../../product/index.js";
import { HierarchiesRepository } from "../db/hierarchies.repository.js";
import { LevelsRepository, levelKeyOf } from "../db/levels.repository.js";
import { compareHierarchies } from "../domain/hierarchy-rules.js";
import { HierarchyChecks } from "./hierarchy-checks.js";

/**
 * Halaman "Approval Hierarchy" (api-specs 16 §16.1); approver yang tidak aktif ditandai `approverInactive` (AC-27.03).
 * Kode cabang dan produk milik modul lain, jadi baris diurutkan dan dipotong per halaman di sini. Setup approval
 * berukuran kecil (puluhan baris per company), jadi semua baris yang cocok filter dimuat.
 */
@Injectable()
export class ListHierarchiesUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly hierarchies: HierarchiesRepository,
    private readonly levels: LevelsRepository,
    private readonly checks: HierarchyChecks,
    private readonly branches: BranchDirectory,
    private readonly products: ProductCodes,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  execute(ctx: RequestContext, query: ApprovalHierarchyListQuery): Promise<ApprovalHierarchyListResponse> {
    const { branchId, productId, jobLevel, page, pageSize } = query;
    const [sort, direction] = query.sort.startsWith("jobLevel")
      ? (["jobLevel", query.sort === "jobLevel,desc" ? "desc" : "asc"] as const)
      : (["branchCode", query.sort === "branchCode,desc" ? "desc" : "asc"] as const);
    return this.db.withTenantTx(ctx, async (tx) => {
      const rows = await this.hierarchies.list(tx, { branchId, productId, jobLevel });
      const branches = await this.branches.describe(
        tx,
        rows.map((row) => row.branchId),
      );
      const products = await this.products.describe(
        tx,
        rows.map((row) => row.productId),
      );
      const approvers = await this.users.describe(
        tx,
        rows.map((row) => row.approverUserId),
      );
      const descriptions = await this.levels.descriptions(tx);
      const items = rows.flatMap((row) => {
        const branch = branches.get(row.branchId);
        const productCode = products.get(row.productId);
        const approver = approvers.get(row.approverUserId);
        if (!branch || !productCode || !approver) return [];
        return [
          {
            id: row.id,
            branch: { id: row.branchId, branchCode: branch.branchCode },
            product: { id: row.productId, productCode },
            branchCode: branch.branchCode,
            productCode,
            jobLevel: row.jobLevel,
            subLevel: row.subLevel,
            levelDescription: descriptions.get(levelKeyOf(row)) ?? "",
            upLevel: row.upLevel,
            upSubLevel: row.upSubLevel,
            approver: {
              id: approver.id,
              username: approver.username,
              fullName: approver.fullName,
              status: approver.status,
            },
            approverInactive: approver.status !== "ACTIVE",
            isActive: row.isActive,
          },
        ];
      });
      const pageItems = items.sort(compareHierarchies(sort, direction)).slice((page - 1) * pageSize, page * pageSize);
      const pending = await this.checks.pendingIds(
        tx,
        pageItems.map((item) => item.id),
      );
      const data: ApprovalHierarchy[] = pageItems.map(({ branchCode: _b, productCode: _p, ...item }) => ({
        ...item,
        hasPendingChange: pending.has(item.id),
      }));
      return {
        data,
        meta: { page, pageSize, totalItems: items.length, totalPages: Math.ceil(items.length / pageSize) },
      };
    });
  }
}
