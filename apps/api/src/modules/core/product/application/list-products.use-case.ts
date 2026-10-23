import type { ProductListQuery, ProductListResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { type ProductPage, ProductsRepository } from "../db/products.repository.js";
import { RouteVersionsRepository } from "../db/route-versions.repository.js";
import { ProductChecks } from "./product-checks.js";

const SORTS = {
  "productCode,asc": ["productCode", "asc"],
  "productCode,desc": ["productCode", "desc"],
  "productName,asc": ["productName", "asc"],
  "productName,desc": ["productName", "desc"],
} as const satisfies Record<ProductListQuery["sort"], readonly [ProductPage["sort"], ProductPage["direction"]]>;

/** Halaman "Product" (api-specs 08 §8.1): hanya data yang sudah disetujui (api-specs 01 §1.8). */
@Injectable()
export class ListProductsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly products: ProductsRepository,
    private readonly checks: ProductChecks,
    private readonly versions: RouteVersionsRepository,
  ) {}

  execute(ctx: RequestContext, query: ProductListQuery): Promise<ProductListResponse> {
    const [sort, direction] = SORTS[query.sort];
    const filter = { q: query.q, productCategory: query.productCategory, isActive: query.isActive };
    const page = { offset: (query.page - 1) * query.pageSize, limit: query.pageSize, sort, direction };

    return this.db.withTenantTx(ctx, async (tx) => {
      const rows = await this.products.list(tx, filter, page);
      const totalItems = await this.products.count(tx, filter);
      const ids = rows.map((row) => row.id);
      const pending = await this.checks.pendingProductIds(tx, ids);
      const routed = await this.versions.productIdsWithActiveRoute(tx, ids);
      return {
        data: rows.map((row) => ({
          ...row,
          hasActiveRoute: routed.has(row.id),
          hasPendingChange: pending.has(row.id),
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
