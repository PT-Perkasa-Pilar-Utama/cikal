import type { ModuleSeed } from "../../../../platform/migrate/module-data.js";
import { seedCompanies } from "./companies.js";
import { seedLicenses } from "./licenses.js";

export { seedCompanyIds } from "./companies.js";

export const dev: ModuleSeed = async (db) => {
  await seedCompanies(db);
  await seedLicenses(db);
};
