import { timingSafeEqual } from "node:crypto";
import { type ResetStateResponse, resetStateRequestSchema } from "@cikal/contracts";
import { Body, Controller, Headers, HttpCode, Inject, Post } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { LicenseExempt, Requires } from "../http/access.js";
import { DomainError } from "../http/domain-error.js";
import { ResetService } from "./reset.service.js";

class ResetStateDto extends createZodDto(resetStateRequestSchema) {}

/**
 * `POST /api/admin/reset-state` (api-specs 27 §27.4). Controller ini hanya didaftarkan `OpsModule.register`
 * bila `APP_ENV` dev/test/sit/uat dan `ENABLE_RESET_API=true`; di production rute tidak ada.
 * Sesi, CSRF, dan hak `QA-RESET` diperiksa guard global (`AccessGuard`). Lisensi tidak diperiksa karena reset
 * memasang ulang lisensi seed, termasuk saat lisensi tersimpan hilang atau kedaluwarsa.
 */
@Controller("admin")
export class ResetController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly resets: ResetService,
  ) {}

  @Post("reset-state")
  @HttpCode(200)
  @Requires("QA-RESET", "UPDATE")
  @LicenseExempt()
  reset(@Headers("x-reset-token") token: string | undefined, @Body() body: ResetStateDto): Promise<ResetStateResponse> {
    const expected = Buffer.from(this.config.resetApi?.token ?? "");
    const given = Buffer.from(token ?? "");
    if (expected.length === 0 || given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new DomainError("RESET_TOKEN_INVALID", "Reset token is invalid", 403);
    }
    return this.resets.reset(body.seed);
  }
}
