import { type UserListResponse, userListQuerySchema } from "@cikal/contracts";
import { Controller, Get, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListUsersUseCase } from "../application/list-users.use-case.js";

class UserListQueryDto extends createZodDto(userListQuerySchema) {}

/**
 * `GET /api/v1/users` (api-specs 03 §3.6). Hak View di User atau di Approval Setup diperiksa di use case, karena
 * `@Requires` hanya menerima satu menu.
 */
@Controller("v1/users")
export class UsersController {
  constructor(private readonly users: ListUsersUseCase) {}

  @Get()
  @Authenticated()
  list(@CurrentContext() ctx: RequestContext, @Query() query: UserListQueryDto): Promise<UserListResponse> {
    return this.users.execute(ctx, query);
  }
}
