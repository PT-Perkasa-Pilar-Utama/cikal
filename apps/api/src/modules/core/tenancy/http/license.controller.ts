import type { LicenseInstallResponse, LicenseResponse } from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { RouteConfig } from "@nestjs/platform-fastify";
import { createZodDto } from "nestjs-zod";
import { LicenseExempt, Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { IdempotencyRequired } from "../../../../platform/http/idempotency.interceptor.js";
import { fileUploadSchema } from "../../../../platform/http/multipart.js";
import { GetLicenseUseCase } from "../application/get-license.use-case.js";
import { InstallLicenseUseCase } from "../application/install-license.use-case.js";

/** File lisensi maksimal 64 KB (api-specs 04 §4.2); lebih besar dari itu ditandai `truncated`. */
const LICENSE_FILE_MAX_BYTES = 64 * 1024;

class LicenseUploadDto extends createZodDto(fileUploadSchema) {}

/** Halaman "License": lisensi terpasang dan pemasangan file lisensi (api-specs 04 §4.1, §4.2). */
@Controller("v1/license")
export class LicenseController {
  constructor(
    private readonly licenses: GetLicenseUseCase,
    private readonly installs: InstallLicenseUseCase,
  ) {}

  @Get()
  @Requires("SYS-LICENSE", "VIEW")
  @LicenseExempt()
  get(@CurrentContext() ctx: RequestContext): Promise<LicenseResponse> {
    return this.licenses.execute(ctx);
  }

  @Post()
  @HttpCode(200)
  @Requires("SYS-LICENSE", "UPDATE")
  @LicenseExempt()
  @IdempotencyRequired()
  @RouteConfig({ multipartOptions: { limits: { fileSize: LICENSE_FILE_MAX_BYTES } } })
  install(@CurrentContext() ctx: RequestContext, @Body() body: LicenseUploadDto): Promise<LicenseInstallResponse> {
    return this.installs.execute(ctx, body.file);
  }
}
