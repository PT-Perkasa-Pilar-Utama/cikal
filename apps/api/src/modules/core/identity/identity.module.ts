import { Module } from "@nestjs/common";
import { ACCESS_PORT } from "../../../platform/http/access-port.js";
import { AccessService } from "./application/access.service.js";
import { AccessRepository } from "./db/access.repository.js";
import { SessionsRepository } from "./db/sessions.repository.js";
import { UsersRepository } from "./db/users.repository.js";
import { MenusController } from "./http/menus.controller.js";
import { RoleAccessController } from "./http/role-access.controller.js";
import { RolesController } from "./http/roles.controller.js";

/**
 * Identity & Access: login, sesi, user, role, hak akses (technical-specs 05 §5.1).
 * Mendaftarkan `ACCESS_PORT` untuk guard global. Rute login, logout, dan sesi dibangun di kartu BE-S1-01.
 */
@Module({
  controllers: [RolesController, MenusController, RoleAccessController],
  providers: [
    AccessService,
    AccessRepository,
    SessionsRepository,
    UsersRepository,
    { provide: ACCESS_PORT, useExisting: AccessService },
  ],
  exports: [ACCESS_PORT, AccessService],
})
export class IdentityModule {}
