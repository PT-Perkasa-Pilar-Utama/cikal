import type { ModuleSeed } from "../../../../platform/migrate/module-data.js";
import { seedMenus } from "./menus.js";
import { seedRoles } from "./roles.js";

export { seedMenuId } from "./menus.js";
export { seedRoleIds } from "./roles.js";

export const base: ModuleSeed = seedMenus;
export const dev: ModuleSeed = seedRoles;
