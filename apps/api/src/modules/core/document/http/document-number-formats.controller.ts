import {
  type DocumentNumberFormatAccepted,
  type DocumentNumberFormatListResponse,
  type DocumentNumberPreviewResponse,
  documentNumberFormatUpdateRequestSchema,
  documentNumberPreviewRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListNumberFormatsUseCase } from "../application/list-number-formats.use-case.js";
import { PreviewNumberUseCase } from "../application/preview-number.use-case.js";
import { RequestNumberFormatUpdateUseCase } from "../application/request-number-format-update.use-case.js";

class DocumentNumberPreviewDto extends createZodDto(documentNumberPreviewRequestSchema) {}
class DocumentNumberFormatUpdateDto extends createZodDto(documentNumberFormatUpdateRequestSchema) {}

/** Format nomor dokumen berversi lewat checker-maker (api-specs 10 §10.3 s.d. §10.5). */
@Controller("v1/document-number-formats")
export class DocumentNumberFormatsController {
  constructor(
    private readonly list: ListNumberFormatsUseCase,
    private readonly previews: PreviewNumberUseCase,
    private readonly updates: RequestNumberFormatUpdateUseCase,
  ) {}

  @Get()
  @Requires("MST-NUMBERING", "VIEW")
  formats(@CurrentContext() ctx: RequestContext): Promise<DocumentNumberFormatListResponse> {
    return this.list.execute(ctx);
  }

  @Post("preview")
  @HttpCode(200)
  @Requires("MST-NUMBERING", "VIEW")
  preview(
    @CurrentContext() ctx: RequestContext,
    @Body() body: DocumentNumberPreviewDto,
  ): Promise<DocumentNumberPreviewResponse> {
    return this.previews.execute(ctx, body);
  }

  @Put(":documentType")
  @HttpCode(202)
  @Requires("MST-NUMBERING", "UPDATE")
  update(
    @CurrentContext() ctx: RequestContext,
    @Param("documentType") documentType: string,
    @Body() body: DocumentNumberFormatUpdateDto,
  ): Promise<DocumentNumberFormatAccepted> {
    return this.updates.execute(ctx, documentType, body);
  }
}
