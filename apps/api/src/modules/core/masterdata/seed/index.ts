import type { ModuleSeed } from "../../../../platform/migrate/module-data.js";
import { seedRegions } from "./regions.js";
import { seedSystemParameterDefinitions, seedSystemParameterValues } from "./system-parameters.js";

export const base: ModuleSeed = seedSystemParameterDefinitions;

export const dev: ModuleSeed = async (db) => {
  await seedSystemParameterValues(db);
  await seedRegions(db);
};
