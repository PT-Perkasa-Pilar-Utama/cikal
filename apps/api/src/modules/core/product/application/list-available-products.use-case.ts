import type { AvailableProductsQuery, AvailableProductsResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { ProductsRepository } from "../db/products.repository.js";
import { SubProductsRepository } from "../db/sub-products.repository.js";

/**
 * Dropdown "Product" step Application (api-specs 08 §8.7): produk tanpa rute ACTIVE tidak tampil (AC-20.06,
 * AC-39.05). Suku bunga hari ini ditampilkan read-only di form (AC-97.04).
 */
@Injectable()
export class ListAvailableProductsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly products: ProductsRepository,
    private readonly subProducts: SubProductsRepository,
  ) {}

  execute(ctx: RequestContext, query: AvailableProductsQuery): Promise<AvailableProductsResponse> {
    const today = businessDate(new Date());
    return this.db.withTenantTx(ctx, async (tx) => {
      const rows = await this.products.listAvailable(tx, query.productCategory, today);
      const rates = await this.subProducts.interestRatesOn(
        tx,
        rows.map((row) => row.id),
        today,
      );
      return { data: rows.map((row) => ({ ...row, currentInterestRate: rates.get(row.id) ?? null })) };
    });
  }
}
