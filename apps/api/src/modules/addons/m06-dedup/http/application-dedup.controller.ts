import { type ApplicationDedupResponse, stepResultQuerySchema } from "@cikal/contracts";
import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetApplicationDedupUseCase } from "../application/get-application-dedup.use-case.js";

class StepResultQueryDto extends createZodDto(stepResultQuerySchema) {}

/** Hasil Dedup satu pengajuan (api-specs 19 §19.2). */
@Controller("v1/applications")
export class ApplicationDedupController {
  constructor(private readonly dedup: GetApplicationDedupUseCase) {}

  @Get(":id/dedup")
  @Requires("APP-INQUIRY", "VIEW")
  get(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: StepResultQueryDto,
  ): Promise<ApplicationDedupResponse> {
    return this.dedup.execute(ctx, id, query);
  }
}
