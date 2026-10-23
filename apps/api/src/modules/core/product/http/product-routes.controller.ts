import {
  type ChangeRequestAccepted,
  type ProductRouteResponse,
  productRouteQuerySchema,
  productRouteUpdateRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Put, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetProductRouteUseCase } from "../application/get-product-route.use-case.js";
import { RequestRouteUpdateUseCase } from "../application/request-route-update.use-case.js";

class ProductRouteQueryDto extends createZodDto(productRouteQuerySchema) {}
class ProductRouteUpdateDto extends createZodDto(productRouteUpdateRequestSchema) {}

/** Rute produk berversi lewat checker-maker (api-specs 08 §8.9, §8.10). */
@Controller("v1/products/:id/route")
export class ProductRoutesController {
  constructor(
    private readonly routes: GetProductRouteUseCase,
    private readonly updates: RequestRouteUpdateUseCase,
  ) {}

  @Get()
  @Requires("MST-ROUTE", "VIEW")
  detail(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ProductRouteQueryDto,
  ): Promise<ProductRouteResponse> {
    return this.routes.execute(ctx, id, query);
  }

  @Put()
  @HttpCode(202)
  @Requires("MST-ROUTE", "UPDATE")
  update(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ProductRouteUpdateDto,
  ): Promise<ChangeRequestAccepted> {
    return this.updates.execute(ctx, id, body);
  }
}
