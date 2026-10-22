import { Global, Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ACCESS_PORT } from "../../../platform/http/access-port.js";
import { USER_DIRECTORY_PORT } from "../../../platform/http/user-directory-port.js";
import { AuditModule } from "../audit/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { AccessService } from "./application/access.service.js";
import { GetSessionUseCase } from "./application/get-session.use-case.js";
import { LoginUseCase } from "./application/login.use-case.js";
import { LogoutUseCase } from "./application/logout.use-case.js";
import { PasswordHasher } from "./application/password-hasher.js";
import { UserDirectory } from "./application/user-directory.js";
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
 * Global karena mendaftarkan port platform `ACCESS_PORT` dan `USER_DIRECTORY_PORT`: modul lain memakai port itu
 * tanpa mengimpor modul identity, sehingga identity tetap boleh bergantung pada Audit dan Change Request.
 */
@Global()
@Module({
  imports: [TenancyModule, AuditModule, ThrottlerModule.forRoot([LOGIN_RATE_LIMIT])],
  controllers: [AuthController, RolesController, MenusController, RoleAccessController],
  providers: [
    AccessService,
    LoginUseCase,
    LogoutUseCase,
    GetSessionUseCase,
    PasswordHasher,
    UserDirectory,
    AccessRepository,
    LoginAttemptsRepository,
    MenusRepository,
    SessionsRepository,
    UsersRepository,
    { provide: ACCESS_PORT, useExisting: AccessService },
    { provide: USER_DIRECTORY_PORT, useExisting: UserDirectory },
  ],
  exports: [ACCESS_PORT, USER_DIRECTORY_PORT, AccessService],
})
export class IdentityModule {}
