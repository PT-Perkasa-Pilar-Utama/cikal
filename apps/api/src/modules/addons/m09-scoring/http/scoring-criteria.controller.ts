import { type CriterionResponse, criterionInputSchema } from "@cikal/contracts";
import { Body, Controller, Delete, HttpCode, Param, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { EditCriteriaUseCase } from "../application/edit-criteria.use-case.js";

class CriterionInputDto extends createZodDto(criterionInputSchema) {}

/** Kriteria versi draft model scoring dan RAC (api-specs 22 §22.3). */
@Controller("v1/scoring-models/:id/criteria")
export class ScoringCriteriaController {
  constructor(private readonly criteria: EditCriteriaUseCase) {}

  @Post()
  @Requires("MST-SCORING", "UPDATE")
  add(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: CriterionInputDto,
  ): Promise<CriterionResponse> {
    return this.criteria.add(ctx, id, body);
  }

  @Put(":criterionId")
  @Requires("MST-SCORING", "UPDATE")
  update(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("criterionId", ParseUUIDPipe) criterionId: string,
    @Body() body: CriterionInputDto,
  ): Promise<CriterionResponse> {
    return this.criteria.update(ctx, id, criterionId, body);
  }

  @Delete(":criterionId")
  @HttpCode(204)
  @Requires("MST-SCORING", "UPDATE")
  remove(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("criterionId", ParseUUIDPipe) criterionId: string,
  ): Promise<void> {
    return this.criteria.remove(ctx, id, criterionId);
  }
}
