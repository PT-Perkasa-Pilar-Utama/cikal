import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import {
  type ChecklistCombination,
  type ChecklistItemRow,
  DocumentChecklistsRepository,
} from "../db/document-checklists.repository.js";

export type { ChecklistCombination, ChecklistItemRow };

/** Checklist dokumen untuk modul Application (technical-specs 05 §5.5), dibaca di transaksi pemanggil. */
@Injectable()
export class ApplicationChecklists {
  constructor(private readonly checklists: DocumentChecklistsRepository) {}

  /** Item checklist aktif untuk produk, pekerjaan, dan status kawin pengajuan; `null` bila tidak ada (AC-25.05). */
  async items(tx: Tx, combination: ChecklistCombination): Promise<ChecklistItemRow[] | null> {
    const checklist = await this.checklists.findActive(tx, combination);
    return checklist?.items ?? null;
  }
}
