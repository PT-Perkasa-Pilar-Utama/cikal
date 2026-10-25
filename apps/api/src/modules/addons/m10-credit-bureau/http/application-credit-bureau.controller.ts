import { type ApplicationCreditBureauResponse, stepResultQuerySchema } from "@cikal/contracts";
import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetApplicationCreditBureauUseCase } from "../application/get-application-credit-bureau.use-case.js";

class StepResultQueryDto extends createZodDto(stepResultQuerySchema) {}

/** Hasil SLIK satu pengajuan (api-specs 23 §23.3). */
@Controller("v1/applications")
export class ApplicationCreditBureauController {
  constructor(private readonly creditBureau: GetApplicationCreditBureauUseCase) {}

  @Get(":id/credit-bureau")
  @Requires("APP-INQUIRY", "VIEW")
  get(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: StepResultQueryDto,
  ): Promise<ApplicationCreditBureauResponse> {
    return this.creditBureau.execute(ctx, id, query);
  }
}
