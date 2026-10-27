import type { ApplicationInquirySortField, ApplicationStatus, StepCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, ne, or, type SQL, sql } from "drizzle-orm";
import { businessDayRange } from "../../../../platform/clock/business-date.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationInquiry } from "./schema.js";

export type InquiryRow = typeof applicationInquiry.$inferSelect;

/** Saringan "Application Inquiry" dan lingkup data pembacanya (api-specs 17 §17.1, TN-02). */
export interface InquiryFilter {
  q?: string;
  state?: StepCode;
  status?: ApplicationStatus;
  productId?: string;
  branchId?: string;
  submittedFrom?: string;
  submittedTo?: string;
  viewerId: string;
  branches: "ALL" | readonly string[];
}

export interface InquiryPage {
  sort: ApplicationInquirySortField;
  direction: "asc" | "desc";
  offset: number;
  limit: number;
}

const SORT_COLUMNS = {
  modifiedAt: applicationInquiry.modifiedAt,
  submittedAt: applicationInquiry.submittedAt,
  loanId: applicationInquiry.loanId,
  fullName: applicationInquiry.fullName,
  requestedLimit: applicationInquiry.requestedLimit,
} as const satisfies Record<ApplicationInquirySortField, unknown>;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/** Bacaan view `reporting.application_inquiry` (XM-07). */
@Injectable()
export class ApplicationInquiryRepository {
  async list(tx: Tx, filter: InquiryFilter, page: InquiryPage): Promise<InquiryRow[]> {
    const order = page.direction === "asc" ? asc : desc;
    return tx
      .select()
      .from(applicationInquiry)
      .where(this.where(filter))
      .orderBy(sql`${order(SORT_COLUMNS[page.sort])} nulls last`, asc(applicationInquiry.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async count(tx: Tx, filter: InquiryFilter): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(applicationInquiry).where(this.where(filter));
    return row?.total ?? 0;
  }

  /** Draft hanya untuk pembuatnya; pengajuan lain di cabang lingkup data user. */
  private where(filter: InquiryFilter): SQL | undefined {
    const view = applicationInquiry;
    const pattern = filter.q === undefined ? undefined : `%${escapeLike(filter.q)}%`;
    const inScope =
      filter.branches === "ALL"
        ? ne(view.status, "DRAFT")
        : filter.branches.length > 0
          ? and(ne(view.status, "DRAFT"), inArray(view.branchId, [...filter.branches]))
          : undefined;
    const ownDraft = and(eq(view.status, "DRAFT"), eq(view.createdBy, filter.viewerId));
    return and(
      inScope ? or(ownDraft, inScope) : ownDraft,
      pattern === undefined ? undefined : or(ilike(view.loanId, pattern), ilike(view.fullName, pattern)),
      filter.state === undefined ? undefined : eq(view.state, filter.state),
      filter.status === undefined ? undefined : eq(view.status, filter.status),
      filter.productId === undefined ? undefined : eq(view.productId, filter.productId),
      filter.branchId === undefined ? undefined : eq(view.branchId, filter.branchId),
      filter.submittedFrom === undefined
        ? undefined
        : gte(view.submittedAt, businessDayRange(filter.submittedFrom).start),
      filter.submittedTo === undefined ? undefined : lt(view.submittedAt, businessDayRange(filter.submittedTo).end),
    );
  }
}
