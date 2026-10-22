import { timingSafeEqual } from "node:crypto";
import { Controller, Headers, HttpCode, Inject, Post } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { Requires } from "../http/access.js";
import { DomainError } from "../http/domain-error.js";

/**
 * `POST /api/admin/reset-state` (api-specs 27 §27.4). Controller ini hanya didaftarkan `OpsModule.register`
 * bila `APP_ENV` dev/test/sit/uat dan `ENABLE_RESET_API=true`; di production rute tidak ada.
 * Langkah drop, migrasi, dan seed dipasang di kartu TL-S1-02.
 */
@Controller("admin")
export class ResetController {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  @Post("reset-state")
  @HttpCode(200)
  @Requires("QA-RESET", "UPDATE")
  reset(@Headers("x-reset-token") token: string | undefined): never {
    const expected = Buffer.from(this.config.resetApi?.token ?? "");
    const given = Buffer.from(token ?? "");
    if (expected.length === 0 || given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new DomainError("RESET_TOKEN_INVALID", "Reset token is invalid", 403);
    }
    throw DomainError.standard("NOT_IMPLEMENTED", "Reset state is not implemented yet");
  }
}
