import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import { type BranchCode, BranchesRepository } from "../db/branches.repository.js";
import { SubBranchesRepository } from "../db/sub-branches.repository.js";

/** Kode dan nama cabang untuk tampilan modul lain, contoh kolom Branch di Approval Hierarchy (technical-specs 05 §5.3). */
@Injectable()
export class BranchDirectory {
  constructor(
    private readonly branches: BranchesRepository,
    private readonly subBranches: SubBranchesRepository,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  /** Cabang tenant transaksi `tx`, aktif atau tidak; id yang tidak ditemukan tidak ada di hasil. */
  async describe(tx: Tx, branchIds: readonly string[]): Promise<Map<string, BranchCode>> {
    const rows = await this.branches.findCodes(tx, [...new Set(branchIds)]);
    return new Map(rows.map((row) => [row.id, row]));
  }

  /** Semua cabang satu regional, aktif atau tidak, untuk lingkup data user regional (technical-specs 09 §9.4). */
  idsInRegional(tx: Tx, regionalId: string): Promise<string[]> {
    return this.branches.findIdsByRegional(tx, regionalId);
  }

  /** Cabang unit kerja user: cabangnya, atau cabang induk sub cabangnya; `null` untuk role regional dan pusat. */
  async branchOf(tx: Tx, unit: { branchId: string | null; subBranchId: string | null }): Promise<string | null> {
    if (unit.branchId) return unit.branchId;
    return unit.subBranchId ? this.subBranches.findBranchId(tx, unit.subBranchId) : null;
  }

  /**
   * Cabang pengajuan yang boleh dilihat user (TN-02, technical-specs 09 §9.4): seluruh company untuk role pusat,
   * cabang regionalnya, atau cabang unit kerjanya. User yang tidak ada di tenant tidak melihat cabang apa pun.
   */
  async dataScope(tx: Tx, userId: string): Promise<"ALL" | string[]> {
    const unit = await this.users.scope(tx, userId);
    if (!unit) return [];
    if (unit.branchId || unit.subBranchId) {
      const branchId = await this.branchOf(tx, unit);
      return branchId ? [branchId] : [];
    }
    return unit.regionalId ? this.idsInRegional(tx, unit.regionalId) : "ALL";
  }
}
