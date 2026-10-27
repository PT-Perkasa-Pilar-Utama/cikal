import type { FormSection } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationPersonals, applications } from "./schema.js";

export interface DraftListRow {
  id: string;
  loanId: string;
  fullName: string;
  productId: string;
  requestedLimit: string | null;
  currentSection: FormSection;
  returnNote: string | null;
  updatedAt: Date;
}

/** Draft milik pembuatnya, dengan pencarian Loan ID atau nama (api-specs 12 §12.4, AC-49.06). */
export interface DraftFilter {
  createdBy: string;
  q?: string;
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/** Daftar draft "Application List" Sales dari tabel `application.applications` (api-specs 12 §12.4). */
@Injectable()
export class DraftListRepository {
  async listDrafts(
    tx: Tx,
    filter: DraftFilter,
    page: { offset: number; limit: number; direction: "asc" | "desc" },
  ): Promise<DraftListRow[]> {
    const order = page.direction === "asc" ? asc : desc;
    return tx
      .select({
        id: applications.id,
        loanId: applications.loanId,
        fullName: applicationPersonals.fullName,
        productId: applications.productId,
        requestedLimit: applications.requestedLimit,
        currentSection: applications.currentSection,
        returnNote: applications.returnNote,
        updatedAt: applications.updatedAt,
      })
      .from(applications)
      .innerJoin(applicationPersonals, eq(applicationPersonals.applicationId, applications.id))
      .where(this.draftsOf(filter))
      .orderBy(order(applications.updatedAt), asc(applications.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async countDrafts(tx: Tx, filter: DraftFilter): Promise<number> {
    const [row] = await tx
      .select({ total: count() })
      .from(applications)
      .innerJoin(applicationPersonals, eq(applicationPersonals.applicationId, applications.id))
      .where(this.draftsOf(filter));
    return row?.total ?? 0;
  }

  private draftsOf(filter: DraftFilter): SQL | undefined {
    const pattern = filter.q === undefined ? undefined : `%${escapeLike(filter.q)}%`;
    return and(
      eq(applications.status, "DRAFT"),
      eq(applications.createdBy, filter.createdBy),
      pattern === undefined
        ? undefined
        : or(ilike(applications.loanId, pattern), ilike(applicationPersonals.fullName, pattern)),
    );
  }
}
