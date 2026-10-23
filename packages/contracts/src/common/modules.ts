import { z } from "zod";

/** Kode modul paket dan lisensi (tech ref 3.1, technical-specs 06 §6.5 `module_entitlements.module_code`). */
export const moduleCodes = [
  "CORE",
  "M01",
  "M02",
  "M03",
  "M04",
  "M05",
  "M06",
  "M07",
  "M08",
  "M09",
  "M10",
  "M11",
  "M12",
  "M13",
  "M14",
  "M15",
  "M16",
] as const;
export const moduleCodeSchema = z.enum(moduleCodes);
export type ModuleCode = z.infer<typeof moduleCodeSchema>;

/** Nama modul di halaman "License" dan pesan editor rute (tech ref 3.1; api-specs 04 §4.1). */
export const moduleNames = {
  CORE: "Core",
  M01: "Mobile Sales",
  M02: "API Mitra",
  M03: "Bulk Upload",
  M04: "OCR KTP",
  M05: "Survey & Appraisal",
  M06: "Dedup",
  M07: "Dukcapil",
  M08: "Fraud",
  M09: "Scoring & RAC",
  M10: "Credit Bureau",
  M11: "Decision Engine",
  M12: "SIKP",
  M13: "Kredit Pensiun",
  M14: "E-Polis",
  M15: "Pencairan & Core",
  M16: "Name Screening",
} as const satisfies Record<ModuleCode, string>;
