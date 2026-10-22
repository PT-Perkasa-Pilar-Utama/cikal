import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { companies } from "./schema.js";

export interface CompanySummary {
  companyCode: string;
  companyName: string;
  platformCode: string;
}

/** Akses tabel `tenancy.companies` (technical-specs 06 §6.5). */
@Injectable()
export class CompaniesRepository {
  async findSummary(tx: Tx, id: string): Promise<CompanySummary | null> {
    const [row] = await tx
      .select({
        companyCode: companies.companyCode,
        companyName: companies.companyName,
        platformCode: companies.platformCode,
      })
      .from(companies)
      .where(eq(companies.id, id));
    return row ?? null;
  }
}
