import { type ApplicationDecisionResponse, applicationDecisionQuerySchema } from "@cikal/contracts";
import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetApplicationDecisionUseCase } from "../application/get-application-decision.use-case.js";

class ApplicationDecisionQueryDto extends createZodDto(applicationDecisionQuerySchema) {}

/** Keputusan awal Go/NotGo satu pengajuan (api-specs 24 §24.4). */
@Controller("v1/applications")
export class ApplicationDecisionController {
  constructor(private readonly decisions: GetApplicationDecisionUseCase) {}

  @Get(":id/decision")
  @Requires("APP-INQUIRY", "VIEW")
  get(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ApplicationDecisionQueryDto,
  ): Promise<ApplicationDecisionResponse> {
    return this.decisions.execute(ctx, id, query);
  }
}
