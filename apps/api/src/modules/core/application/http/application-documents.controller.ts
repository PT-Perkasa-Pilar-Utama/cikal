import type { ApplicationDocumentsResponse, DocumentUploadResponse } from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Put } from "@nestjs/common";
import { RouteConfig } from "@nestjs/platform-fastify";
import { createZodDto } from "nestjs-zod";
import { Authenticated, Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { fileUploadSchema } from "../../../../platform/http/multipart.js";
import { ListApplicationDocumentsUseCase } from "../application/list-application-documents.use-case.js";
import { UploadApplicationDocumentUseCase } from "../application/upload-application-document.use-case.js";

/**
 * Batas baca berkas sama dengan nilai tertinggi `UPLOAD_MAX_MB` (20); batas tenant yang berlaku diperiksa modul
 * Document, dan berkas di atas batas baca ditandai `truncated` lalu ditolak `FILE_TOO_LARGE`.
 */
const UPLOAD_READ_LIMIT_BYTES = 20 * 1024 * 1024;

class DocumentUploadDto extends createZodDto(fileUploadSchema) {}

/** Slot dan unggah dokumen step "Document" (api-specs 12 §12.6, §12.7). */
@Controller("v1/applications/:id/documents")
export class ApplicationDocumentsController {
  constructor(
    private readonly lists: ListApplicationDocumentsUseCase,
    private readonly uploads: UploadApplicationDocumentUseCase,
  ) {}

  @Get()
  @Authenticated()
  list(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ApplicationDocumentsResponse> {
    return this.lists.execute(ctx, id);
  }

  @Put(":documentType")
  @HttpCode(200)
  @Requires("APP-ENTRY", "UPDATE")
  @RouteConfig({ multipartOptions: { limits: { fileSize: UPLOAD_READ_LIMIT_BYTES } } })
  upload(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("documentType") documentType: string,
    @Body() body: DocumentUploadDto,
  ): Promise<DocumentUploadResponse> {
    return this.uploads.execute(ctx, id, documentType, body.file);
  }
}
