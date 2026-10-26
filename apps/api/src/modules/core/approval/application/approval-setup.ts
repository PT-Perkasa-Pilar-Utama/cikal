import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import { BranchDirectory } from "../../organization/index.js";
import { ProductCodes } from "../../product/index.js";
import { HierarchiesRepository } from "../db/hierarchies.repository.js";
import { LevelsRepository } from "../db/levels.repository.js";
import type { RoutingSetup } from "../domain/approval-routing.js";

/** Approval Level dan Approval Hierarchy satu cabang dan produk sebagai masukan routing (RM-06). */
@Injectable()
export class ApprovalSetups {
  constructor(
    private readonly levels: LevelsRepository,
    private readonly hierarchies: HierarchiesRepository,
    private readonly branches: BranchDirectory,
    private readonly products: ProductCodes,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  /** Approver aktif = baris hierarki aktif dan user berstatus ACTIVE (AC-27.03, AC-27.04). */
  async of(tx: Tx, branchId: string, productId: string): Promise<RoutingSetup> {
    const levels = await this.levels.listFor(tx, branchId, productId);
    const rows = await this.hierarchies.listFor(tx, branchId, productId);
    const branches = await this.branches.describe(tx, [branchId]);
    const products = await this.products.describe(tx, [productId]);
    const approvers = await this.users.describe(
      tx,
      rows.map((row) => row.approverUserId),
    );
    return {
      levels,
      approvers: rows.map((row) => ({
        ...row,
        active: row.isActive && approvers.get(row.approverUserId)?.status === "ACTIVE",
      })),
      branchCode: branches.get(branchId)?.branchCode ?? branchId,
      productCode: products.get(productId) ?? productId,
    };
  }
}
