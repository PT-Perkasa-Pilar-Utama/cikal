import {
  type ChangeRequestAccepted,
  type DecisionMatrixListResponse,
  type DecisionSimulationResponse,
  decisionMatrixListQuerySchema,
  decisionMatrixRowInputSchema,
  decisionSimulationRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListDecisionMatrixUseCase } from "../application/list-decision-matrix.use-case.js";
import { RequestMatrixRowCreateUseCase } from "../application/request-matrix-row-create.use-case.js";
import { RequestMatrixRowUpdateUseCase } from "../application/request-matrix-row-update.use-case.js";
import { SimulateDecisionUseCase } from "../application/simulate-decision.use-case.js";

class DecisionMatrixListQueryDto extends createZodDto(decisionMatrixListQuerySchema) {}
class DecisionMatrixRowDto extends createZodDto(decisionMatrixRowInputSchema) {}
class DecisionSimulationDto extends createZodDto(decisionSimulationRequestSchema) {}

/** Decision Matrix lewat checker-maker dan simulasinya (api-specs 24 §24.2, §24.3). */
@Controller("v1/decision-matrix")
export class DecisionMatrixController {
  constructor(
    private readonly lists: ListDecisionMatrixUseCase,
    private readonly creates: RequestMatrixRowCreateUseCase,
    private readonly updates: RequestMatrixRowUpdateUseCase,
    private readonly simulations: SimulateDecisionUseCase,
  ) {}

  @Get()
  @Requires("MST-DECISION", "VIEW")
  list(
    @CurrentContext() ctx: RequestContext,
    @Query() query: DecisionMatrixListQueryDto,
  ): Promise<DecisionMatrixListResponse> {
    return this.lists.execute(ctx, query);
  }

  @Post("rows")
  @HttpCode(202)
  @Requires("MST-DECISION", "CREATE")
  create(@CurrentContext() ctx: RequestContext, @Body() body: DecisionMatrixRowDto): Promise<ChangeRequestAccepted> {
    return this.creates.execute(ctx, body);
  }

  @Put("rows/:id")
  @HttpCode(202)
  @Requires("MST-DECISION", "UPDATE")
  update(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: DecisionMatrixRowDto,
  ): Promise<ChangeRequestAccepted> {
    return this.updates.execute(ctx, id, body);
  }

  @Post("simulate")
  @HttpCode(200)
  @Requires("MST-DECISION", "VIEW")
  simulate(
    @CurrentContext() ctx: RequestContext,
    @Body() body: DecisionSimulationDto,
  ): Promise<DecisionSimulationResponse> {
    return this.simulations.execute(ctx, body);
  }
}
