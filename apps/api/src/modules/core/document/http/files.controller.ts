import { type FileDownloadUrlResponse, fileDownloadQuerySchema } from "@cikal/contracts";
import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetDownloadUrlUseCase } from "../application/get-download-url.use-case.js";

class FileDownloadQueryDto extends createZodDto(fileDownloadQuerySchema) {}

/**
 * File (api-specs 10 §10.1). `@Authenticated()` karena hak lihat mengikuti pemilik file, bukan satu menu; use case
 * menanyakannya ke modul pemilik.
 */
@Controller("v1/files")
export class FilesController {
  constructor(private readonly downloads: GetDownloadUrlUseCase) {}

  @Get(":fileId/download-url")
  @Authenticated()
  downloadUrl(
    @CurrentContext() ctx: RequestContext,
    @Param("fileId", ParseUUIDPipe) fileId: string,
    @Query() query: FileDownloadQueryDto,
  ): Promise<FileDownloadUrlResponse> {
    return this.downloads.execute(ctx, fileId, query);
  }
}
