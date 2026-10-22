import { type ProductDetailResponse, productDataSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ProductsRepository } from "../db/products.repository.js";
import { ProductChecks } from "./product-checks.js";

/** Detail produk untuk form edit dan tab "Pricing" (api-specs 08 §8.2). */
@Injectable()
export class GetProductUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly products: ProductsRepository,
    private readonly checks: ProductChecks,
  ) {}

  execute(ctx: RequestContext, id: string): Promise<ProductDetailResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const product = await this.products.findById(tx, id);
      if (!product) throw DomainError.standard("NOT_FOUND");
      const pending = await this.checks.pendingProductIds(tx, [id]);
      return {
        data: {
          ...productDataSchema.parse(product),
          id,
          // Rute ACTIVE dibaca setelah versi rute dibangun di kartu BE-S2-01 (AC-20.06).
          hasActiveRoute: false,
          hasPendingChange: pending.has(id),
          updatedAt: product.updatedAt.toISOString(),
        },
      };
    });
  }
}
