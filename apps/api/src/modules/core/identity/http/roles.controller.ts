import { type RoleListResponse, roleListQuerySchema } from "@cikal/contracts";
import { Controller, Get, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListRolesUseCase } from "../application/list-roles.use-case.js";

class RoleListQueryDto extends createZodDto(roleListQuerySchema) {}

/**
 * `GET /api/v1/roles` (api-specs 03 §3.1). Hak View di Role Access atau di Role diperiksa di use case, karena
 * `@Requires` hanya menerima satu menu.
 */
@Controller("v1/roles")
export class RolesController {
  constructor(private readonly roles: ListRolesUseCase) {}

  @Get()
  @Authenticated()
  list(@CurrentContext() ctx: RequestContext, @Query() query: RoleListQueryDto): Promise<RoleListResponse> {
    return this.roles.execute(ctx, query);
  }
}
