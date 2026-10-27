import {
  type ApplicationDetailResponse,
  type ApplicationDraftListResponse,
  type ApplicationDraftResponse,
  type ApplicationFormResponse,
  type ApplicationSubmitResponse,
  applicationDraftCreateRequestSchema,
  applicationDraftListQuerySchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { IdempotencyRequired } from "../../../../platform/http/idempotency.interceptor.js";
import { GetApplicationDetailUseCase } from "../application/get-application-detail.use-case.js";
import { GetDraftFormUseCase } from "../application/get-draft-form.use-case.js";
import { ListDraftsUseCase } from "../application/list-drafts.use-case.js";
import { SaveDraftUseCase } from "../application/save-draft.use-case.js";
import { SubmitApplicationUseCase } from "../application/submit-application.use-case.js";

class DraftCreateDto extends createZodDto(applicationDraftCreateRequestSchema) {}
class DraftListQueryDto extends createZodDto(applicationDraftListQuerySchema) {}

/** Draft, submit, dan detail pengajuan web (api-specs 12 §12.2, §12.4, §12.5, §12.8 s.d. §12.10). */
@Controller("v1/applications")
export class ApplicationsController {
  constructor(
    private readonly saves: SaveDraftUseCase,
    private readonly lists: ListDraftsUseCase,
    private readonly forms: GetDraftFormUseCase,
    private readonly submits: SubmitApplicationUseCase,
    private readonly details: GetApplicationDetailUseCase,
  ) {}

  @Post()
  @HttpCode(201)
  @Requires("APP-ENTRY", "CREATE")
  create(@CurrentContext() ctx: RequestContext, @Body() body: DraftCreateDto): Promise<ApplicationDraftResponse> {
    return this.saves.execute(ctx, body);
  }

  @Get("drafts")
  @Requires("APP-ENTRY", "VIEW")
  drafts(
    @CurrentContext() ctx: RequestContext,
    @Query() query: DraftListQueryDto,
  ): Promise<ApplicationDraftListResponse> {
    return this.lists.execute(ctx, query);
  }

  @Get("by-loan-id/:loanId")
  @Requires("APP-INQUIRY", "VIEW")
  byLoanId(@CurrentContext() ctx: RequestContext, @Param("loanId") loanId: string): Promise<ApplicationDetailResponse> {
    return this.details.execute(ctx, { loanId });
  }

  @Get(":id")
  @Requires("APP-INQUIRY", "VIEW")
  detail(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ApplicationDetailResponse> {
    return this.details.execute(ctx, { id });
  }

  @Get(":id/form")
  @Requires("APP-ENTRY", "VIEW")
  form(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ApplicationFormResponse> {
    return this.forms.execute(ctx, id);
  }

  @Post(":id/submit")
  @HttpCode(200)
  @Requires("APP-ENTRY", "CREATE")
  @IdempotencyRequired()
  submit(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ApplicationSubmitResponse> {
    return this.submits.execute(ctx, id);
  }
}
