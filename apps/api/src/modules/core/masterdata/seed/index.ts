import type { ModuleSeed } from "../../../../platform/migrate/module-data.js";
import { seedSystemParameterDefinitions, seedSystemParameterValues } from "./system-parameters.js";

export const base: ModuleSeed = seedSystemParameterDefinitions;

export const dev: ModuleSeed = seedSystemParameterValues;
