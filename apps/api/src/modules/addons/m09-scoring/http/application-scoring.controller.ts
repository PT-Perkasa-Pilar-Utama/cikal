import { type ApplicationScoringResponse, stepResultQuerySchema } from "@cikal/contracts";
import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetApplicationScoringUseCase } from "../application/get-application-scoring.use-case.js";

class StepResultQueryDto extends createZodDto(stepResultQuerySchema) {}

/** Hasil RAC dan Scoring satu pengajuan (api-specs 22 §22.6). */
@Controller("v1/applications")
export class ApplicationScoringController {
  constructor(private readonly scoring: GetApplicationScoringUseCase) {}

  @Get(":id/scoring")
  @Requires("APP-INQUIRY", "VIEW")
  get(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: StepResultQueryDto,
  ): Promise<ApplicationScoringResponse> {
    return this.scoring.execute(ctx, id, query);
  }
}
