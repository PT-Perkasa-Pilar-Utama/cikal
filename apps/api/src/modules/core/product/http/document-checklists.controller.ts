import {
  type ChangeRequestAccepted,
  type DocumentChecklistListResponse,
  documentChecklistCreateRequestSchema,
  documentChecklistListQuerySchema,
  documentChecklistUpdateRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListChecklistsUseCase } from "../application/list-checklists.use-case.js";
import { RequestChecklistCreateUseCase } from "../application/request-checklist-create.use-case.js";
import { RequestChecklistUpdateUseCase } from "../application/request-checklist-update.use-case.js";

class ChecklistListQueryDto extends createZodDto(documentChecklistListQuerySchema) {}
class ChecklistCreateDto extends createZodDto(documentChecklistCreateRequestSchema) {}
class ChecklistUpdateDto extends createZodDto(documentChecklistUpdateRequestSchema) {}

/** Checklist dokumen lewat checker-maker (api-specs 08 §8.11, §8.12). */
@Controller("v1/document-checklists")
export class DocumentChecklistsController {
  constructor(
    private readonly lists: ListChecklistsUseCase,
    private readonly creates: RequestChecklistCreateUseCase,
    private readonly updates: RequestChecklistUpdateUseCase,
  ) {}

  @Get()
  @Requires("MST-CHECKLIST", "VIEW")
  list(
    @CurrentContext() ctx: RequestContext,
    @Query() query: ChecklistListQueryDto,
  ): Promise<DocumentChecklistListResponse> {
    return this.lists.execute(ctx, query);
  }

  @Post()
  @HttpCode(202)
  @Requires("MST-CHECKLIST", "CREATE")
  create(@CurrentContext() ctx: RequestContext, @Body() body: ChecklistCreateDto): Promise<ChangeRequestAccepted> {
    return this.creates.execute(ctx, body);
  }

  @Put(":id")
  @HttpCode(202)
  @Requires("MST-CHECKLIST", "UPDATE")
  update(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ChecklistUpdateDto,
  ): Promise<ChangeRequestAccepted> {
    return this.updates.execute(ctx, id, body);
  }
}
