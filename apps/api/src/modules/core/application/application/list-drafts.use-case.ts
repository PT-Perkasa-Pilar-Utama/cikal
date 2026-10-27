import type { ApplicationDraftListQuery, ApplicationDraftListResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { ProductCodes } from "../../product/index.js";
import { DraftListRepository } from "../db/draft-list.repository.js";

/**
 * "Application List" Sales (api-specs 12 §12.4): hanya draft yang dibuatnya, termasuk pengajuan yang dikembalikan
 * ke draft (AC-49.06).
 */
@Injectable()
export class ListDraftsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly drafts: DraftListRepository,
    private readonly productCodes: ProductCodes,
  ) {}

  execute(ctx: RequestContext, query: ApplicationDraftListQuery): Promise<ApplicationDraftListResponse> {
    const filter = { createdBy: ctx.userId, q: query.q };
    const direction = query.sort === "updatedAt,asc" ? "asc" : "desc";
    const page = { offset: (query.page - 1) * query.pageSize, limit: query.pageSize, direction } as const;
    return this.db.withTenantTx(ctx, async (tx) => {
      const rows = await this.drafts.listDrafts(tx, filter, page);
      const totalItems = await this.drafts.countDrafts(tx, filter);
      const codes = await this.productCodes.describe(
        tx,
        rows.map((row) => row.productId),
      );
      return {
        data: rows.map(({ productId, updatedAt, ...row }) => ({
          ...row,
          productCode: codes.get(productId) ?? "",
          updatedAt: updatedAt.toISOString(),
        })),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / query.pageSize),
        },
      };
    });
  }
}
