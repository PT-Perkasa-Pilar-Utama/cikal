import type { ChangeRequestAccepted, ProductPricingData, ProductPricingUpdateRequest } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { ProductsRepository } from "../db/products.repository.js";
import { SubProductsRepository } from "../db/sub-products.repository.js";
import { pricingRuleError, toPricingData } from "../domain/pricing-rules.js";
import { ProductChecks } from "./product-checks.js";

/** Maker mengatur suku bunga per periode dan biaya lewat ChangeRequest `PRODUCT_PRICING` (api-specs 08 §8.6). */
@Injectable()
export class RequestPricingUpdateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly products: ProductsRepository,
    private readonly subProducts: SubProductsRepository,
    private readonly checks: ProductChecks,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, id: string, body: ProductPricingUpdateRequest): Promise<ChangeRequestAccepted> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const product = await this.products.findById(tx, id);
      if (!product) throw DomainError.standard("NOT_FOUND");
      await this.checks.assertNoPendingChange(tx, id);
      const proposed = toPricingData(body, product);
      const error = pricingRuleError(proposed, product);
      if (error) throw error;
      const periods = await this.subProducts.listByProduct(tx, id);
      const current: ProductPricingData = {
        productCode: product.productCode,
        productName: product.productName,
        adminFee: product.adminFee,
        provisionFee: product.provisionFee,
        salesFee: product.salesFee,
        subProducts: periods.map(({ id: _periodId, ...period }) => period),
      };
      return this.changeRequests.submit(tx, ctx, {
        entityType: "PRODUCT_PRICING",
        entityId: id,
        oldData: current,
        newData: proposed,
      });
    });
  }
}
