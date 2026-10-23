import {
  type ApplicationDraftListResponse,
  type ApplicationDraftResponse,
  type ApplicationFormResponse,
  applicationDraftCreateRequestSchema,
  applicationDraftListQuerySchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetDraftFormUseCase } from "../application/get-draft-form.use-case.js";
import { ListDraftsUseCase } from "../application/list-drafts.use-case.js";
import { SaveDraftUseCase } from "../application/save-draft.use-case.js";

class DraftCreateDto extends createZodDto(applicationDraftCreateRequestSchema) {}
class DraftListQueryDto extends createZodDto(applicationDraftListQuerySchema) {}

/** Draft pengajuan web (api-specs 12 §12.2, §12.4, §12.5). */
@Controller("v1/applications")
export class ApplicationsController {
  constructor(
    private readonly saves: SaveDraftUseCase,
    private readonly lists: ListDraftsUseCase,
    private readonly forms: GetDraftFormUseCase,
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

  @Get(":id/form")
  @Requires("APP-ENTRY", "VIEW")
  form(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ApplicationFormResponse> {
    return this.forms.execute(ctx, id);
  }
}
