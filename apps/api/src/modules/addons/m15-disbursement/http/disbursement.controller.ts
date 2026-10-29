import {
  type AkadPrintResponse,
  akadPrintRequestSchema,
  type DisbursementDetailResponse,
  type DisbursementRecordResponse,
  disbursementRecordRequestSchema,
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
import { PrintAkadUseCase } from "../application/print-akad.use-case.js";
import { RecordDisbursementUseCase } from "../application/record-disbursement.use-case.js";
import { SubmitValidityCheckUseCase } from "../application/submit-validity-check.use-case.js";

class ValidityCheckDto extends createZodDto(validityCheckRequestSchema) {}
class AkadPrintDto extends createZodDto(akadPrintRequestSchema) {}
class DisbursementRecordDto extends createZodDto(disbursementRecordRequestSchema) {}

/** Disbursement Detail, Validity Check, Print Akad, dan Record Disbursement (api-specs 25 §25.1 s.d. §25.4). */
@Controller("v1/applications/:id")
export class DisbursementController {
  constructor(
    private readonly details: GetDisbursementUseCase,
    private readonly validityChecks: SubmitValidityCheckUseCase,
    private readonly akadPrints: PrintAkadUseCase,
    private readonly records: RecordDisbursementUseCase,
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

  @Post("akad/print")
  @HttpCode(200)
  @Requires("OPS-PRINT-AKAD", "UPDATE")
  @IdempotencyRequired()
  printAkad(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: AkadPrintDto,
  ): Promise<AkadPrintResponse> {
    return this.akadPrints.execute(ctx, id, body);
  }

  @Post("disbursement/record")
  @HttpCode(200)
  @Requires("OPS-DISBURSEMENT", "UPDATE")
  @IdempotencyRequired()
  recordDisbursement(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: DisbursementRecordDto,
  ): Promise<DisbursementRecordResponse> {
    return this.records.execute(ctx, id, body);
  }
}
