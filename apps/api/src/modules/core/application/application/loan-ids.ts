import { Injectable } from "@nestjs/common";
import type { TenantContext, Tx } from "../../../../platform/db/tenant-tx.js";
import { LoanIdCountersRepository } from "../db/loan-id-counters.repository.js";
import { formatLoanId, loanIdExhausted } from "../domain/loan-id.js";

/**
 * Pembentuk Loan ID draft pertama (technical-specs 05 §5.10 `saveDraft`, api-specs 12 §12.2 langkah 4). Dipanggil
 * sekali per pengajuan di transaksi yang menyimpan draft, sehingga nomor batal bersama draft yang gagal disimpan.
 */
@Injectable()
export class LoanIds {
  constructor(private readonly counters: LoanIdCountersRepository) {}

  async next(tx: Tx, actor: TenantContext, productCode: string, at: Date = new Date()): Promise<string> {
    const sequence = await this.counters.next(tx, actor, productCode);
    if (sequence === null) throw loanIdExhausted();
    return formatLoanId(at, productCode, sequence);
  }
}
