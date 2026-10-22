import { type MenuTreeResponse, menuTreeResponseMock } from "@cikal/contracts";
import { Controller, Get } from "@nestjs/common";
import { Requires } from "../../../../platform/http/access.js";

/** Stub `GET /api/v1/menus` (api-specs 03 §3.2); mengembalikan mock kontrak sampai BE-S1-04. */
@Controller("v1/menus")
export class MenusController {
  @Get()
  @Requires("IAM-ROLE-ACCESS", "VIEW")
  tree(): MenuTreeResponse {
    return menuTreeResponseMock;
  }
}
