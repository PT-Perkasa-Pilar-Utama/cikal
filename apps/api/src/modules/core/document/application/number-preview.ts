import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { CompanyDirectory } from "../../tenancy/index.js";
import { parsePattern, renderNumber } from "../domain/number-pattern.js";

/** Contoh cabang dan produk pratinjau (api-specs 10 §10.4): cabang `011` dan produk KPR seed. */
const PREVIEW_SAMPLE = { branchCode: "011", productCode: "KPR" } as const;

/** Pratinjau nomor pertama sebuah pola tanpa menyentuh counter (grooming v3 DN-09, AC-102.01). */
@Injectable()
export class NumberPreview {
  constructor(private readonly companies: CompanyDirectory) {}

  /** Validasi pola api-specs 10 §10.5 langkah 1 dan 2 lebih dulu (AC-102.04, AC-102.05). */
  async render(tx: Tx, tenantId: string, pattern: string): Promise<string> {
    const parsed = parsePattern(pattern);
    const { companyCode } = await this.companies.summary(tx, tenantId);
    return renderNumber(parsed, { ...PREVIEW_SAMPLE, companyCode, date: businessDate(new Date()) }, 1);
  }
}
