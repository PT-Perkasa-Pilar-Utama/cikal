import { type ParameterOptionsResponse, parameterOptionsQuerySchema } from "@cikal/contracts";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListParameterOptionsUseCase } from "../application/list-parameter-options.use-case.js";

class ParameterOptionsQueryDto extends createZodDto(parameterOptionsQuerySchema) {}

/**
 * General Parameter (api-specs 06 §6.1). `@Authenticated()` karena View pada `APP-ENTRY`, `APP-INQUIRY`, atau menu
 * `MST-*` mana pun cukup; use case memeriksa haknya.
 */
@Controller("v1/parameters")
export class ParametersController {
  constructor(private readonly options: ListParameterOptionsUseCase) {}

  @Get(":paramType/options")
  @Authenticated()
  list(
    @CurrentContext() ctx: RequestContext,
    @Param("paramType") paramType: string,
    @Query() query: ParameterOptionsQueryDto,
  ): Promise<ParameterOptionsResponse> {
    return this.options.execute(ctx, paramType, query);
  }
}
