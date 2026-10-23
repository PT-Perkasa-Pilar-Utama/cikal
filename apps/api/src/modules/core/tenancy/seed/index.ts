import type { ModuleSeed } from "../../../../platform/migrate/module-data.js";
import { seedCompanies } from "./companies.js";
import { seedCompanyKeys } from "./company-keys.js";
import { seedLicenses } from "./licenses.js";

export { seedCompanyIds } from "./companies.js";

export const base: ModuleSeed = seedCompanyKeys;

export const dev: ModuleSeed = async (db, ctx) => {
  await seedCompanies(db);
  await seedCompanyKeys(db, ctx);
  await seedLicenses(db);
};
