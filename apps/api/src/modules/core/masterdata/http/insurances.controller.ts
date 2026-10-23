import { type InsuranceListResponse, insuranceListQuerySchema } from "@cikal/contracts";
import { Controller, Get, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListInsurancesUseCase } from "../application/list-insurances.use-case.js";

class InsuranceListQueryDto extends createZodDto(insuranceListQuerySchema) {}

/** Asuransi (api-specs 06 §6.2). `@Authenticated()` karena View `APP-ENTRY` atau `MST-PARAMETER` cukup; use case memeriksa haknya. */
@Controller("v1/insurances")
export class InsurancesController {
  constructor(private readonly insurances: ListInsurancesUseCase) {}

  @Get()
  @Authenticated()
  list(@CurrentContext() ctx: RequestContext, @Query() query: InsuranceListQueryDto): Promise<InsuranceListResponse> {
    return this.insurances.execute(ctx, query);
  }
}
