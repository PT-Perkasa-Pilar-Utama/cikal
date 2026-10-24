import { type ApplicationDukcapilResponse, stepResultQuerySchema } from "@cikal/contracts";
import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetApplicationDukcapilUseCase } from "../application/get-application-dukcapil.use-case.js";

class StepResultQueryDto extends createZodDto(stepResultQuerySchema) {}

/** Hasil Dukcapil satu pengajuan (api-specs 20 §20.2). */
@Controller("v1/applications")
export class ApplicationDukcapilController {
  constructor(private readonly dukcapil: GetApplicationDukcapilUseCase) {}

  @Get(":id/dukcapil")
  @Requires("APP-INQUIRY", "VIEW")
  get(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: StepResultQueryDto,
  ): Promise<ApplicationDukcapilResponse> {
    return this.dukcapil.execute(ctx, id, query);
  }
}
