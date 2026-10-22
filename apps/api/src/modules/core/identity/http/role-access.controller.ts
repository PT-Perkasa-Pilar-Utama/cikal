import {
  type ChangeRequestAccepted,
  changeRequestAcceptedMock,
  type RoleAccessListResponse,
  roleAccessCreateRequestSchema,
  roleAccessListResponseMock,
  roleAccessUpdateRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";

class RoleAccessCreateDto extends createZodDto(roleAccessCreateRequestSchema) {}
class RoleAccessUpdateDto extends createZodDto(roleAccessUpdateRequestSchema) {}

/** Stub Role Access (api-specs 03 §3.3 s.d. §3.5); mengembalikan mock kontrak sampai BE-S1-04. */
@Controller("v1/role-access")
export class RoleAccessController {
  @Get()
  @Requires("IAM-ROLE-ACCESS", "VIEW")
  list(): RoleAccessListResponse {
    return roleAccessListResponseMock;
  }

  @Post()
  @HttpCode(202)
  @Requires("IAM-ROLE-ACCESS", "CREATE")
  create(@Body() _body: RoleAccessCreateDto): ChangeRequestAccepted {
    return changeRequestAcceptedMock("ROLE_ACCESS", null);
  }

  @Put(":id")
  @HttpCode(202)
  @Requires("IAM-ROLE-ACCESS", "UPDATE")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() _body: RoleAccessUpdateDto): ChangeRequestAccepted {
    return changeRequestAcceptedMock("ROLE_ACCESS", id);
  }
}
