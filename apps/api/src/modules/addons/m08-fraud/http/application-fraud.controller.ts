import { type ApplicationFraudResponse, stepResultQuerySchema } from "@cikal/contracts";
import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetApplicationFraudUseCase } from "../application/get-application-fraud.use-case.js";

class StepResultQueryDto extends createZodDto(stepResultQuerySchema) {}

/** Hasil Fraud satu pengajuan (api-specs 21 §21.2). */
@Controller("v1/applications")
export class ApplicationFraudController {
  constructor(private readonly fraud: GetApplicationFraudUseCase) {}

  @Get(":id/fraud")
  @Requires("APP-INQUIRY", "VIEW")
  get(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: StepResultQueryDto,
  ): Promise<ApplicationFraudResponse> {
    return this.fraud.execute(ctx, id, query);
  }
}
