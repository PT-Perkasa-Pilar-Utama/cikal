import {
  type ChangeRequestAccepted,
  type RoleAccessListResponse,
  roleAccessCreateRequestSchema,
  roleAccessListQuerySchema,
  roleAccessUpdateRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListRoleAccessUseCase } from "../application/list-role-access.use-case.js";
import { RequestRoleAccessCreateUseCase } from "../application/request-role-access-create.use-case.js";
import { RequestRoleAccessUpdateUseCase } from "../application/request-role-access-update.use-case.js";

class RoleAccessListQueryDto extends createZodDto(roleAccessListQuerySchema) {}
class RoleAccessCreateDto extends createZodDto(roleAccessCreateRequestSchema) {}
class RoleAccessUpdateDto extends createZodDto(roleAccessUpdateRequestSchema) {}

/** Role Access lewat checker-maker (api-specs 03 §3.3 s.d. §3.5). */
@Controller("v1/role-access")
export class RoleAccessController {
  constructor(
    private readonly lists: ListRoleAccessUseCase,
    private readonly creates: RequestRoleAccessCreateUseCase,
    private readonly updates: RequestRoleAccessUpdateUseCase,
  ) {}

  @Get()
  @Requires("IAM-ROLE-ACCESS", "VIEW")
  list(@CurrentContext() ctx: RequestContext, @Query() query: RoleAccessListQueryDto): Promise<RoleAccessListResponse> {
    return this.lists.execute(ctx, query);
  }

  @Post()
  @HttpCode(202)
  @Requires("IAM-ROLE-ACCESS", "CREATE")
  create(@CurrentContext() ctx: RequestContext, @Body() body: RoleAccessCreateDto): Promise<ChangeRequestAccepted> {
    return this.creates.execute(ctx, body);
  }

  @Put(":id")
  @HttpCode(202)
  @Requires("IAM-ROLE-ACCESS", "UPDATE")
  update(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: RoleAccessUpdateDto,
  ): Promise<ChangeRequestAccepted> {
    return this.updates.execute(ctx, id, body);
  }
}
