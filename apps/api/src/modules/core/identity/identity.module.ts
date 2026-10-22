import { Module } from "@nestjs/common";
import { MenusController } from "./http/menus.controller.js";
import { RoleAccessController } from "./http/role-access.controller.js";
import { RolesController } from "./http/roles.controller.js";

/**
 * Identity & Access: login, sesi, user, role, hak akses (technical-specs 05 §5.1).
 * Rute login, logout, dan sesi dibangun di kartu BE-S1-01.
 */
@Module({
  controllers: [RolesController, MenusController, RoleAccessController],
})
export class IdentityModule {}
