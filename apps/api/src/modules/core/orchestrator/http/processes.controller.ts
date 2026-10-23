import { type ProcessTimelineResponse, processTimelineQuerySchema } from "@cikal/contracts";
import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetProcessTimelineUseCase } from "../application/get-process-timeline.use-case.js";

class ProcessTimelineQueryDto extends createZodDto(processTimelineQuerySchema) {}

/** Timeline proses pengajuan, tab "Workflow" (api-specs 13 §13.2). */
@Controller("v1/applications")
export class ProcessesController {
  constructor(private readonly timelines: GetProcessTimelineUseCase) {}

  @Get(":id/process")
  @Requires("APP-INQUIRY", "VIEW")
  timeline(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ProcessTimelineQueryDto,
  ): Promise<ProcessTimelineResponse> {
    return this.timelines.execute(ctx, id, query);
  }
}
