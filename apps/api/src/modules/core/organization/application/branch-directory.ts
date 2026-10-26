import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { type BranchCode, BranchesRepository } from "../db/branches.repository.js";

/** Kode dan nama cabang untuk tampilan modul lain, contoh kolom Branch di Approval Hierarchy (technical-specs 05 §5.3). */
@Injectable()
export class BranchDirectory {
  constructor(private readonly branches: BranchesRepository) {}

  /** Cabang tenant transaksi `tx`, aktif atau tidak; id yang tidak ditemukan tidak ada di hasil. */
  async describe(tx: Tx, branchIds: readonly string[]): Promise<Map<string, BranchCode>> {
    const rows = await this.branches.findCodes(tx, [...new Set(branchIds)]);
    return new Map(rows.map((row) => [row.id, row]));
  }

  /** Semua cabang satu regional, aktif atau tidak, untuk lingkup data user regional (technical-specs 09 §9.4). */
  idsInRegional(tx: Tx, regionalId: string): Promise<string[]> {
    return this.branches.findIdsByRegional(tx, regionalId);
  }
}
