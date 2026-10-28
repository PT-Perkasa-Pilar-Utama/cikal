import {
  type DisbursementDetailResponse,
  type ValidityCheckResponse,
  validityCheckRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated, Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { IdempotencyRequired } from "../../../../platform/http/idempotency.interceptor.js";
import { GetDisbursementUseCase } from "../application/get-disbursement.use-case.js";
import { SubmitValidityCheckUseCase } from "../application/submit-validity-check.use-case.js";

class ValidityCheckDto extends createZodDto(validityCheckRequestSchema) {}

/** Disbursement Detail dan Validity Check (api-specs 25 §25.1, §25.2). */
@Controller("v1/applications/:id")
export class DisbursementController {
  constructor(
    private readonly details: GetDisbursementUseCase,
    private readonly validityChecks: SubmitValidityCheckUseCase,
  ) {}

  /** `OPS-VALIDITY`, `OPS-PRINT-AKAD`, `OPS-DISBURSEMENT`, atau `APP-INQUIRY` VIEW; diperiksa use case. */
  @Get("disbursement")
  @Authenticated()
  detail(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<DisbursementDetailResponse> {
    return this.details.execute(ctx, id);
  }

  @Post("validity-check")
  @HttpCode(200)
  @Requires("OPS-VALIDITY", "UPDATE")
  @IdempotencyRequired()
  validityCheck(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ValidityCheckDto,
  ): Promise<ValidityCheckResponse> {
    return this.validityChecks.execute(ctx, id, body);
  }
}
