import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import { CHANGE_REQUEST_PORT } from "../../../platform/http/change-request-port.js";
import type { ChangeRequestPort } from "../change-request/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { GetProductUseCase } from "./application/get-product.use-case.js";
import { GetProductPricingUseCase } from "./application/get-product-pricing.use-case.js";
import { GetProductRouteUseCase } from "./application/get-product-route.use-case.js";
import { ListAvailableProductsUseCase } from "./application/list-available-products.use-case.js";
import { ListProductsUseCase } from "./application/list-products.use-case.js";
import { PricingChangeHandler } from "./application/pricing-change-handler.js";
import { ProductChangeHandler } from "./application/product-change-handler.js";
import { ProductChecks } from "./application/product-checks.js";
import { ProductRoutes } from "./application/product-routes.js";
import { ProductTerms } from "./application/product-terms.js";
import { RequestPricingUpdateUseCase } from "./application/request-pricing-update.use-case.js";
import { RequestProductCreateUseCase } from "./application/request-product-create.use-case.js";
import { RequestProductUpdateUseCase } from "./application/request-product-update.use-case.js";
import { RequestRouteUpdateUseCase } from "./application/request-route-update.use-case.js";
import { RouteActivation } from "./application/route-activation.js";
import { RouteChangeHandler } from "./application/route-change-handler.js";
import { RouteChecks } from "./application/route-checks.js";
import { ProductsRepository } from "./db/products.repository.js";
import { RouteVersionsRepository } from "./db/route-versions.repository.js";
import { SubProductsRepository } from "./db/sub-products.repository.js";
import { ProductRoutesController } from "./http/product-routes.controller.js";
import { ProductsController } from "./http/products.controller.js";
import { RouteActivationJob } from "./jobs/route-activation.job.js";

/** Product & Route: produk, harga, rute berversi, checklist dokumen (technical-specs 05 §5.5). */
@Module({
  imports: [TenancyModule],
  controllers: [ProductsController, ProductRoutesController],
  providers: [
    ProductsRepository,
    SubProductsRepository,
    RouteVersionsRepository,
    ProductChecks,
    RouteChecks,
    ProductChangeHandler,
    PricingChangeHandler,
    RouteChangeHandler,
    RouteActivation,
    RouteActivationJob,
    ListProductsUseCase,
    ListAvailableProductsUseCase,
    GetProductUseCase,
    RequestProductCreateUseCase,
    RequestProductUpdateUseCase,
    GetProductPricingUseCase,
    RequestPricingUpdateUseCase,
    GetProductRouteUseCase,
    RequestRouteUpdateUseCase,
    ProductRoutes,
    ProductTerms,
  ],
  exports: [ProductRoutes, ProductTerms],
})
export class ProductModule implements OnModuleInit {
  constructor(
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
    private readonly productHandler: ProductChangeHandler,
    private readonly pricingHandler: PricingChangeHandler,
    private readonly routeHandler: RouteChangeHandler,
  ) {}

  /** `registerEntity` untuk `PRODUCT`, `PRODUCT_PRICING`, dan `ROUTE` (technical-specs 05 §5.6). */
  onModuleInit(): void {
    this.changeRequests.register(this.productHandler);
    this.changeRequests.register(this.pricingHandler);
    this.changeRequests.register(this.routeHandler);
  }
}
