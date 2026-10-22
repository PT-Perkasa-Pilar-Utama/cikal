import type { ModuleSeed } from "../../../../platform/migrate/module-data.js";
import { seedMenus } from "./menus.js";
import { seedRoles } from "./roles.js";
import { seedUsers } from "./users.js";

export { seedMenuId } from "./menus.js";
export { seedRoleAccessId, seedRoleIds } from "./roles.js";

export const base: ModuleSeed = seedMenus;

export const dev: ModuleSeed = async (db, ctx) => {
  await seedRoles(db);
  await seedUsers(db, ctx);
};
