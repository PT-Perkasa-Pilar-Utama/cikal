import {
  type ChangeRequestAccepted,
  changeRequestAcceptedMock,
  type ProductDetailResponse,
  type ProductListResponse,
  type ProductPricingResponse,
  pageQuerySchema,
  productCreateRequestSchema,
  productDetailResponseMock,
  productListResponseMock,
  productPricingResponseMock,
  productPricingUpdateRequestSchema,
  productUpdateRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";

class ProductListQueryDto extends createZodDto(pageQuerySchema) {}
class ProductCreateDto extends createZodDto(productCreateRequestSchema) {}
class ProductUpdateDto extends createZodDto(productUpdateRequestSchema) {}
class ProductPricingUpdateDto extends createZodDto(productPricingUpdateRequestSchema) {}

/** Stub produk dan harga (api-specs 08 §8.1 s.d. §8.6); mengembalikan mock kontrak sampai BE-S1-03. */
@Controller("v1/products")
export class ProductsController {
  @Get()
  @Requires("MST-PRODUCT", "VIEW")
  list(@Query() _query: ProductListQueryDto): ProductListResponse {
    return productListResponseMock;
  }

  @Get(":id")
  @Requires("MST-PRODUCT", "VIEW")
  detail(@Param("id", ParseUUIDPipe) _id: string): ProductDetailResponse {
    return productDetailResponseMock;
  }

  @Post()
  @HttpCode(202)
  @Requires("MST-PRODUCT", "CREATE")
  create(@Body() _body: ProductCreateDto): ChangeRequestAccepted {
    return changeRequestAcceptedMock("PRODUCT", null);
  }

  @Put(":id")
  @HttpCode(202)
  @Requires("MST-PRODUCT", "UPDATE")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() _body: ProductUpdateDto): ChangeRequestAccepted {
    return changeRequestAcceptedMock("PRODUCT", id);
  }

  @Get(":id/pricing")
  @Requires("MST-PRODUCT", "VIEW")
  pricing(@Param("id", ParseUUIDPipe) _id: string): ProductPricingResponse {
    return productPricingResponseMock;
  }

  @Put(":id/pricing")
  @HttpCode(202)
  @Requires("MST-PRODUCT", "UPDATE")
  updatePricing(@Param("id", ParseUUIDPipe) id: string, @Body() _body: ProductPricingUpdateDto): ChangeRequestAccepted {
    return changeRequestAcceptedMock("PRODUCT_PRICING", id);
  }
}
