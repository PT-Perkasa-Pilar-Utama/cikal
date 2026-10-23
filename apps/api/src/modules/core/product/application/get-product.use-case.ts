import { type ProductDetailResponse, productDataSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ProductsRepository } from "../db/products.repository.js";
import { RouteVersionsRepository } from "../db/route-versions.repository.js";
import { ProductChecks } from "./product-checks.js";

/** Detail produk untuk form edit dan tab "Pricing" (api-specs 08 §8.2). */
@Injectable()
export class GetProductUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly products: ProductsRepository,
    private readonly checks: ProductChecks,
    private readonly versions: RouteVersionsRepository,
  ) {}

  execute(ctx: RequestContext, id: string): Promise<ProductDetailResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const product = await this.products.findById(tx, id);
      if (!product) throw DomainError.standard("NOT_FOUND");
      const pending = await this.checks.pendingProductIds(tx, [id]);
      const routed = await this.versions.productIdsWithActiveRoute(tx, [id]);
      return {
        data: {
          ...productDataSchema.parse(product),
          id,
          hasActiveRoute: routed.has(id),
          hasPendingChange: pending.has(id),
          updatedAt: product.updatedAt.toISOString(),
        },
      };
    });
  }
}
