import { licensedModuleData } from "../../licensed-modules.generated.js";
import { platformData } from "../platform.data.js";
import type { ModuleData } from "./module-data.js";

/** Semua skema yang dipasang runner: platform lebih dulu, lalu modul berlisensi sesuai urutan dependensi (MS-04). */
export const installedModuleData: readonly ModuleData[] = [platformData, ...licensedModuleData];
