import { type FormulaVariableListResponse, formulaVariableQuerySchema } from "@cikal/contracts";
import { Controller, Get, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListFormulaVariablesUseCase } from "../application/list-formula-variables.use-case.js";

class FormulaVariableQueryDto extends createZodDto(formulaVariableQuerySchema) {}

/** Katalog variabel rumus (api-specs 09 §9.2); `MST-SCORING` atau `MST-FORMULA` VIEW diperiksa use case. */
@Controller("v1/formula-variables")
export class FormulaVariablesController {
  constructor(private readonly variables: ListFormulaVariablesUseCase) {}

  @Get()
  @Authenticated()
  list(
    @CurrentContext() ctx: RequestContext,
    @Query() query: FormulaVariableQueryDto,
  ): Promise<FormulaVariableListResponse> {
    return this.variables.execute(ctx, query);
  }
}
