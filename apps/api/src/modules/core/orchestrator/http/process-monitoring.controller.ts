import {
  type ProcessFinishResponse,
  type ProcessMonitoringResponse,
  processFinishRequestSchema,
  processMonitoringQuerySchema,
  type StepRetryResponse,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { IdempotencyRequired } from "../../../../platform/http/idempotency.interceptor.js";
import { FinishProcessUseCase } from "../application/finish-process.use-case.js";
import { ListProcessMonitoringUseCase } from "../application/list-process-monitoring.use-case.js";
import { RetryStepUseCase } from "../application/retry-step.use-case.js";

class ProcessMonitoringQueryDto extends createZodDto(processMonitoringQuerySchema) {}
class ProcessFinishDto extends createZodDto(processFinishRequestSchema) {}

/** Halaman "Process Monitoring": daftar, Retry, dan Finish (api-specs 13 §13.3 s.d. §13.5). */
@Controller("v1")
export class ProcessMonitoringController {
  constructor(
    private readonly lists: ListProcessMonitoringUseCase,
    private readonly retries: RetryStepUseCase,
    private readonly finishes: FinishProcessUseCase,
  ) {}

  @Get("process-monitoring")
  @Requires("OPS-MONITORING", "VIEW")
  list(
    @CurrentContext() ctx: RequestContext,
    @Query() query: ProcessMonitoringQueryDto,
  ): Promise<ProcessMonitoringResponse> {
    return this.lists.execute(ctx, query);
  }

  @Post("processes/:processInstanceId/steps/:stepExecutionId/retry")
  @HttpCode(200)
  @Requires("OPS-MONITORING", "UPDATE")
  @IdempotencyRequired()
  retry(
    @CurrentContext() ctx: RequestContext,
    @Param("processInstanceId", ParseUUIDPipe) processInstanceId: string,
    @Param("stepExecutionId", ParseUUIDPipe) stepExecutionId: string,
  ): Promise<StepRetryResponse> {
    return this.retries.execute(ctx, processInstanceId, stepExecutionId);
  }

  @Post("processes/:processInstanceId/finish")
  @HttpCode(200)
  @Requires("OPS-MONITORING", "UPDATE")
  @IdempotencyRequired()
  finish(
    @CurrentContext() ctx: RequestContext,
    @Param("processInstanceId", ParseUUIDPipe) processInstanceId: string,
    @Body() body: ProcessFinishDto,
  ): Promise<ProcessFinishResponse> {
    return this.finishes.execute(ctx, processInstanceId, body);
  }
}
