import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ACCESS_PORT } from "../../../platform/http/access-port.js";
import { TenancyModule } from "../tenancy/index.js";
import { AccessService } from "./application/access.service.js";
import { GetSessionUseCase } from "./application/get-session.use-case.js";
import { LoginUseCase } from "./application/login.use-case.js";
import { LogoutUseCase } from "./application/logout.use-case.js";
import { PasswordHasher } from "./application/password-hasher.js";
import { AccessRepository } from "./db/access.repository.js";
import { LoginAttemptsRepository } from "./db/login-attempts.repository.js";
import { MenusRepository } from "./db/menus.repository.js";
import { SessionsRepository } from "./db/sessions.repository.js";
import { UsersRepository } from "./db/users.repository.js";
import { AuthController } from "./http/auth.controller.js";
import { MenusController } from "./http/menus.controller.js";
import { RoleAccessController } from "./http/role-access.controller.js";
import { RolesController } from "./http/roles.controller.js";

/** Login 10 request per menit per IP (technical-specs 07 §7.5). */
const LOGIN_RATE_LIMIT = { ttl: 60_000, limit: 10 };

/**
 * Identity & Access: login, sesi, user, role, hak akses (technical-specs 05 §5.1).
 * Mendaftarkan `ACCESS_PORT` untuk guard global.
 */
@Module({
  imports: [TenancyModule, ThrottlerModule.forRoot([LOGIN_RATE_LIMIT])],
  controllers: [AuthController, RolesController, MenusController, RoleAccessController],
  providers: [
    AccessService,
    LoginUseCase,
    LogoutUseCase,
    GetSessionUseCase,
    PasswordHasher,
    AccessRepository,
    LoginAttemptsRepository,
    MenusRepository,
    SessionsRepository,
    UsersRepository,
    { provide: ACCESS_PORT, useExisting: AccessService },
  ],
  exports: [ACCESS_PORT, AccessService],
})
export class IdentityModule {}
