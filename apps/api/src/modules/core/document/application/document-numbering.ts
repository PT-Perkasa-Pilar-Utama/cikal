import type { DocumentType } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { CompanyDirectory } from "../../tenancy/index.js";
import { DocumentNumberCountersRepository } from "../db/document-number-counters.repository.js";
import { DocumentNumberFormatsRepository } from "../db/document-number-formats.repository.js";
import {
  numberExhausted,
  numberFormatNotSet,
  parsePattern,
  periodKey,
  renderNumber,
  scopeKey,
  sequenceCapacity,
} from "../domain/number-pattern.js";

/** Cakupan satu dokumen; `date` tanggal bisnis `YYYY-MM-DD`. Kode company dibaca dari tenant transaksi. */
export interface NumberScope {
  tenantId: string;
  branchCode: string;
  productCode: string;
  date: string;
}

/**
 * `nextNumber(documentType, scope, date)` technical-specs 05 §5.9, api-specs 10 §10.6: nomor dari format ACTIVE di
 * transaksi pemanggil, sehingga nomor batal bersama operasinya. Pemanggil menyimpan nomor dan memakainya lagi untuk
 * cetak ulang (DN-06, AC-102.08).
 */
@Injectable()
export class DocumentNumbering {
  constructor(
    private readonly formats: DocumentNumberFormatsRepository,
    private readonly counters: DocumentNumberCountersRepository,
    private readonly companies: CompanyDirectory,
  ) {}

  async nextNumber(tx: Tx, documentType: DocumentType, scope: NumberScope, userId: string | null): Promise<string> {
    const format = await this.formats.findActive(tx, documentType);
    if (!format) throw numberFormatNotSet(documentType);
    const { companyCode } = await this.companies.summary(tx, scope.tenantId);
    const ctx = { ...scope, companyCode };
    const pattern = parsePattern(format.pattern);
    const sequence = await this.counters.next(
      tx,
      {
        tenantId: scope.tenantId,
        formatId: format.id,
        scopeKey: scopeKey(format.counterScope, ctx),
        periodKey: periodKey(format.resetPeriod, scope.date),
      },
      sequenceCapacity(pattern),
      userId,
    );
    if (sequence === null) throw numberExhausted(documentType);
    return renderNumber(pattern, ctx, sequence);
  }
}
