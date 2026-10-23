import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { InsurancesRepository } from "../db/insurances.repository.js";

/** Asuransi untuk modul lain, dibaca di transaksi pemanggil (RLS). */
@Injectable()
export class Insurances {
  constructor(private readonly insurances: InsurancesRepository) {}

  /** Asuransi boleh dipilih pengajuan: ada di tenant transaksi dan aktif (api-specs 06 §6.2). */
  isSelectable(tx: Tx, id: string): Promise<boolean> {
    return this.insurances.isActive(tx, id);
  }
}
