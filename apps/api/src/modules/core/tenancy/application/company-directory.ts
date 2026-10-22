import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { CompaniesRepository, type CompanySummary } from "../db/companies.repository.js";

export type { CompanySummary } from "../db/companies.repository.js";

/** Identitas company untuk modul lain, di transaksi pemanggil (technical-specs 05 §5.2). */
@Injectable()
export class CompanyDirectory {
  constructor(private readonly companies: CompaniesRepository) {}

  /** Company tenant pemanggil; gagal keras bila tenant sesi tidak punya baris company. */
  async summary(tx: Tx, tenantId: string): Promise<CompanySummary> {
    const company = await this.companies.findSummary(tx, tenantId);
    if (!company) throw new Error(`Company ${tenantId} does not exist`);
    return company;
  }
}
