import { type MenuTreeResponse, menuTreeQuerySchema } from "@cikal/contracts";
import { Controller, Get, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListMenusUseCase } from "../application/list-menus.use-case.js";

class MenuTreeQueryDto extends createZodDto(menuTreeQuerySchema) {}

/** `GET /api/v1/menus` (api-specs 03 §3.2). */
@Controller("v1/menus")
export class MenusController {
  constructor(private readonly menus: ListMenusUseCase) {}

  @Get()
  @Requires("IAM-ROLE-ACCESS", "VIEW")
  tree(@CurrentContext() ctx: RequestContext, @Query() query: MenuTreeQueryDto): Promise<MenuTreeResponse> {
    return this.menus.execute(ctx, query);
  }
}
