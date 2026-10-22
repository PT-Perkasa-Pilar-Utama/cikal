import type { ModuleSeed } from "../../../../platform/migrate/module-data.js";
import { seedCompanies } from "./companies.js";

export { seedCompanyIds } from "./companies.js";

export const dev: ModuleSeed = seedCompanies;
