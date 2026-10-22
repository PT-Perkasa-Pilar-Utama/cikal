import { productPricingDataSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ApplyResult, ChangeRequestSnapshot, EntityHandler, JsonRecord } from "../../change-request/index.js";
import { type ProductRow, ProductsRepository } from "../db/products.repository.js";
import { SubProductsRepository } from "../db/sub-products.repository.js";
import { pricingRuleError } from "../domain/pricing-rules.js";
import { PRODUCT_AUDIT_MODULE } from "./product-change-handler.js";

/** Handler ChangeRequest `PRODUCT_PRICING` (api-specs 07 §7.1): biaya dan suku bunga per periode (api-specs 08 §8.6). */
@Injectable()
export class PricingChangeHandler implements EntityHandler {
  readonly entityType = "PRODUCT_PRICING";
  readonly auditModule = PRODUCT_AUDIT_MODULE;

  constructor(
    private readonly products: ProductsRepository,
    private readonly subProducts: SubProductsRepository,
  ) {}

  displayName(newData: JsonRecord): string {
    return typeof newData.productName === "string" ? newData.productName : "";
  }

  async validate(tx: Tx, request: ChangeRequestSnapshot): Promise<void> {
    const data = productPricingDataSchema.parse(request.newData);
    const product = await this.productOf(tx, request);
    const error = pricingRuleError(data, product);
    if (error) throw error;
  }

  async apply(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<ApplyResult> {
    const { adminFee, provisionFee, salesFee, subProducts } = productPricingDataSchema.parse(request.newData);
    const product = await this.productOf(tx, request);
    await this.products.update(tx, product.id, { adminFee, provisionFee, salesFee }, reviewer.userId);
    await this.subProducts.replaceForProduct(
      tx,
      { productId: product.id, tenantId: reviewer.tenantId, userId: reviewer.userId },
      subProducts,
    );
    return { entityId: product.id };
  }

  private async productOf(tx: Tx, request: ChangeRequestSnapshot): Promise<ProductRow> {
    const product = request.entityId ? await this.products.findById(tx, request.entityId) : null;
    if (!product) throw DomainError.standard("NOT_FOUND");
    return product;
  }
}
