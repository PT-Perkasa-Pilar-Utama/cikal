import type { ApprovalHierarchyData } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { BranchDirectory } from "../../organization/index.js";
import { ProductCodes } from "../../product/index.js";
import { HierarchiesRepository, type HierarchyRow } from "../db/hierarchies.repository.js";
import { LevelsRepository } from "../db/levels.repository.js";
import { approvalLevelNotFound, approverWithoutAccess, hierarchyExists } from "../domain/hierarchy-errors.js";

export const APPROVAL_HIERARCHY_ENTITY_TYPE = "APPROVAL_HIERARCHY";

/** Isi satu baris hierarki tanpa id: kunci level, approver, level berikutnya, dan status aktif. */
export type HierarchyFields = Omit<HierarchyRow, "id">;

/** Aturan bersama pengajuan dan persetujuan baris Approval Hierarchy (api-specs 16 §16.2, §16.3). */
@Injectable()
export class HierarchyChecks {
  constructor(
    private readonly levels: LevelsRepository,
    private readonly hierarchies: HierarchiesRepository,
    private readonly branches: BranchDirectory,
    private readonly products: ProductCodes,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  /**
   * Urutan api-specs 16 §16.2: level ada di Approval Level cabang dan produk, approver punya hak Approve efektif
   * pada `OPS-APPROVAL` (AC-27.02), lalu kombinasi belum dipakai baris lain atau, saat pengajuan, permintaan lain.
   */
  async validate(
    tx: Tx,
    fields: HierarchyFields,
    options: { excludeId: string | null; includePending: boolean },
  ): Promise<ApprovalHierarchyData> {
    const { branchId, productId, jobLevel, upLevel } = fields;
    if ((await this.levels.findDescription(tx, { branchId, productId, jobLevel })) === null) {
      throw approvalLevelNotFound(jobLevel, "jobLevel");
    }
    if (
      upLevel !== null &&
      (await this.levels.findDescription(tx, { branchId, productId, jobLevel: upLevel })) === null
    ) {
      throw approvalLevelNotFound(upLevel, "upLevel");
    }
    if (!(await this.users.hasAccess(tx, fields.approverUserId, "OPS-APPROVAL", "APPROVE"))) {
      throw approverWithoutAccess();
    }
    const existing = await this.hierarchies.findAssignment(tx, fields);
    if (existing && existing.id !== options.excludeId) throw hierarchyExists();
    if (options.includePending && (await this.assignmentProposed(tx, fields))) throw hierarchyExists();
    return this.describe(tx, fields);
  }

  /** `newData` ChangeRequest: isi baris beserta kode cabang, produk, deskripsi level, dan username approver. */
  async describe(tx: Tx, fields: HierarchyFields): Promise<ApprovalHierarchyData> {
    const { branchId, productId, jobLevel, approverUserId } = fields;
    const branch = (await this.branches.describe(tx, [branchId])).get(branchId);
    const productCode = (await this.products.describe(tx, [productId])).get(productId);
    const approver = (await this.users.describe(tx, [approverUserId])).get(approverUserId);
    const levelDescription = await this.levels.findDescription(tx, { branchId, productId, jobLevel });
    if (!branch || !productCode || !approver || levelDescription === null) throw DomainError.standard("NOT_FOUND");
    return {
      ...fields,
      branchCode: branch.branchCode,
      productCode,
      levelDescription,
      approverUsername: approver.username,
    };
  }

  async assertNoPendingChange(tx: Tx, id: string): Promise<void> {
    if ((await this.pendingIds(tx, [id])).has(id)) throw DomainError.standard("PENDING_CHANGE_REQUEST");
  }

  pendingIds(tx: Tx, ids: readonly string[]): Promise<Set<string>> {
    return this.changeRequests.pendingEntityIds(tx, [APPROVAL_HIERARCHY_ENTITY_TYPE], ids);
  }

  private assignmentProposed(tx: Tx, fields: HierarchyFields): Promise<boolean> {
    return this.changeRequests.hasProposed(tx, APPROVAL_HIERARCHY_ENTITY_TYPE, {
      branchId: fields.branchId,
      productId: fields.productId,
      jobLevel: String(fields.jobLevel),
      subLevel: String(fields.subLevel),
      approverUserId: fields.approverUserId,
    });
  }
}
