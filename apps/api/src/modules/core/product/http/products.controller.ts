import {
  type AvailableProductsResponse,
  availableProductsQuerySchema,
  type ChangeRequestAccepted,
  type ProductDetailResponse,
  type ProductListResponse,
  type ProductPricingResponse,
  productCreateRequestSchema,
  productListQuerySchema,
  productPricingUpdateRequestSchema,
  productUpdateRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetProductUseCase } from "../application/get-product.use-case.js";
import { GetProductPricingUseCase } from "../application/get-product-pricing.use-case.js";
import { ListAvailableProductsUseCase } from "../application/list-available-products.use-case.js";
import { ListProductsUseCase } from "../application/list-products.use-case.js";
import { RequestPricingUpdateUseCase } from "../application/request-pricing-update.use-case.js";
import { RequestProductCreateUseCase } from "../application/request-product-create.use-case.js";
import { RequestProductUpdateUseCase } from "../application/request-product-update.use-case.js";

class ProductListQueryDto extends createZodDto(productListQuerySchema) {}
class AvailableProductsQueryDto extends createZodDto(availableProductsQuerySchema) {}
class ProductCreateDto extends createZodDto(productCreateRequestSchema) {}
class ProductUpdateDto extends createZodDto(productUpdateRequestSchema) {}
class ProductPricingUpdateDto extends createZodDto(productPricingUpdateRequestSchema) {}

/** Produk dan harga lewat checker-maker, dan dropdown produk pengajuan (api-specs 08 §8.1 s.d. §8.7). */
@Controller("v1/products")
export class ProductsController {
  constructor(
    private readonly lists: ListProductsUseCase,
    private readonly availables: ListAvailableProductsUseCase,
    private readonly details: GetProductUseCase,
    private readonly creates: RequestProductCreateUseCase,
    private readonly updates: RequestProductUpdateUseCase,
    private readonly pricings: GetProductPricingUseCase,
    private readonly pricingUpdates: RequestPricingUpdateUseCase,
  ) {}

  @Get()
  @Requires("MST-PRODUCT", "VIEW")
  list(@CurrentContext() ctx: RequestContext, @Query() query: ProductListQueryDto): Promise<ProductListResponse> {
    return this.lists.execute(ctx, query);
  }

  @Get("available")
  @Requires("APP-ENTRY", "VIEW")
  available(
    @CurrentContext() ctx: RequestContext,
    @Query() query: AvailableProductsQueryDto,
  ): Promise<AvailableProductsResponse> {
    return this.availables.execute(ctx, query);
  }

  @Get(":id")
  @Requires("MST-PRODUCT", "VIEW")
  detail(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ProductDetailResponse> {
    return this.details.execute(ctx, id);
  }

  @Post()
  @HttpCode(202)
  @Requires("MST-PRODUCT", "CREATE")
  create(@CurrentContext() ctx: RequestContext, @Body() body: ProductCreateDto): Promise<ChangeRequestAccepted> {
    return this.creates.execute(ctx, body);
  }

  @Put(":id")
  @HttpCode(202)
  @Requires("MST-PRODUCT", "UPDATE")
  update(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ProductUpdateDto,
  ): Promise<ChangeRequestAccepted> {
    return this.updates.execute(ctx, id, body);
  }

  @Get(":id/pricing")
  @Requires("MST-PRODUCT", "VIEW")
  pricing(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ProductPricingResponse> {
    return this.pricings.execute(ctx, id);
  }

  @Put(":id/pricing")
  @HttpCode(202)
  @Requires("MST-PRODUCT", "UPDATE")
  updatePricing(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ProductPricingUpdateDto,
  ): Promise<ChangeRequestAccepted> {
    return this.pricingUpdates.execute(ctx, id, body);
  }
}
