import {
  type ApplicationVerificationResponse,
  type VerificationSaveResponse,
  type VerificationSubmitResponse,
  verificationSaveRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { IdempotencyRequired } from "../../../../platform/http/idempotency.interceptor.js";
import { GetVerificationUseCase } from "../application/get-verification.use-case.js";
import { SaveVerificationUseCase } from "../application/save-verification.use-case.js";

class VerificationSaveDto extends createZodDto(verificationSaveRequestSchema) {}

/** Verifikasi dokumen pengajuan oleh Verifikator (api-specs 15 §15.1 s.d. §15.3). */
@Controller("v1/applications/:id/verification")
export class VerificationController {
  constructor(
    private readonly reads: GetVerificationUseCase,
    private readonly saves: SaveVerificationUseCase,
  ) {}

  @Get()
  @Requires("OPS-VERIFICATION", "VIEW")
  get(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ApplicationVerificationResponse> {
    return this.reads.execute(ctx, id);
  }

  @Put()
  @Requires("OPS-VERIFICATION", "UPDATE")
  save(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: VerificationSaveDto,
  ): Promise<VerificationSaveResponse> {
    return this.saves.save(ctx, id, body);
  }

  @Post("submit")
  @HttpCode(200)
  @Requires("OPS-VERIFICATION", "UPDATE")
  @IdempotencyRequired()
  submit(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: VerificationSaveDto,
  ): Promise<VerificationSubmitResponse> {
    return this.saves.submit(ctx, id, body);
  }
}
