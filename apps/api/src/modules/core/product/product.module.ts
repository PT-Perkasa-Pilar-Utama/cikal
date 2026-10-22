import { Module, type OnModuleInit } from "@nestjs/common";
import { ChangeRequestModule, ChangeRequestRegistry } from "../change-request/index.js";
import { GetProductUseCase } from "./application/get-product.use-case.js";
import { GetProductPricingUseCase } from "./application/get-product-pricing.use-case.js";
import { ListProductsUseCase } from "./application/list-products.use-case.js";
import { PricingChangeHandler } from "./application/pricing-change-handler.js";
import { ProductChangeHandler } from "./application/product-change-handler.js";
import { ProductChecks } from "./application/product-checks.js";
import { RequestPricingUpdateUseCase } from "./application/request-pricing-update.use-case.js";
import { RequestProductCreateUseCase } from "./application/request-product-create.use-case.js";
import { RequestProductUpdateUseCase } from "./application/request-product-update.use-case.js";
import { ProductsRepository } from "./db/products.repository.js";
import { SubProductsRepository } from "./db/sub-products.repository.js";
import { ProductsController } from "./http/products.controller.js";

/** Product & Route: produk, harga, rute berversi, checklist dokumen (technical-specs 05 §5.5). */
@Module({
  imports: [ChangeRequestModule],
  controllers: [ProductsController],
  providers: [
    ProductsRepository,
    SubProductsRepository,
    ProductChecks,
    ProductChangeHandler,
    PricingChangeHandler,
    ListProductsUseCase,
    GetProductUseCase,
    RequestProductCreateUseCase,
    RequestProductUpdateUseCase,
    GetProductPricingUseCase,
    RequestPricingUpdateUseCase,
  ],
})
export class ProductModule implements OnModuleInit {
  constructor(
    private readonly registry: ChangeRequestRegistry,
    private readonly productHandler: ProductChangeHandler,
    private readonly pricingHandler: PricingChangeHandler,
  ) {}

  /** `registerEntity` untuk `PRODUCT` dan `PRODUCT_PRICING` (technical-specs 05 §5.6). */
  onModuleInit(): void {
    this.registry.register(this.productHandler);
    this.registry.register(this.pricingHandler);
  }
}
