import type { ProductPricingResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ProductsRepository } from "../db/products.repository.js";
import { SubProductsRepository } from "../db/sub-products.repository.js";
import { ProductChecks } from "./product-checks.js";

/** Tab "Pricing": biaya, suku bunga per periode, dan rentang Approver (api-specs 08 §8.5). */
@Injectable()
export class GetProductPricingUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly products: ProductsRepository,
    private readonly subProducts: SubProductsRepository,
    private readonly checks: ProductChecks,
  ) {}

  execute(ctx: RequestContext, id: string): Promise<ProductPricingResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const product = await this.products.findById(tx, id);
      if (!product) throw DomainError.standard("NOT_FOUND");
      const pending = await this.checks.pendingProductIds(tx, [id]);
      return {
        data: {
          productId: id,
          interestType: product.interestType,
          adminFee: product.adminFee,
          provisionFee: product.provisionFee,
          salesFee: product.salesFee,
          subProducts: await this.subProducts.listByProduct(tx, id),
          hasPendingChange: pending.has(id),
        },
      };
    });
  }
}
