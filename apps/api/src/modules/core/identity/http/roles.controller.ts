import { type RoleListResponse, roleListResponseMock } from "@cikal/contracts";
import { Controller, Get } from "@nestjs/common";
import { Requires } from "../../../../platform/http/access.js";

/** Stub `GET /api/v1/roles` (api-specs 03 §3.1); mengembalikan mock kontrak sampai BE-S1-04. */
@Controller("v1/roles")
export class RolesController {
  @Get()
  @Requires("IAM-ROLE-ACCESS", "VIEW")
  list(): RoleListResponse {
    return roleListResponseMock;
  }
}
