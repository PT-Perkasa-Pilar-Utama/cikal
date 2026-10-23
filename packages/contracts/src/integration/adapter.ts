import type { z } from "zod";
import type { ModuleCode } from "../common/modules.js";

/** Mode interaksi integrasi (IN-08, technical-specs 13 §13.3). */
export const integrationModes = ["SYNC", "ASYNC", "MANUAL"] as const;
export type IntegrationMode = (typeof integrationModes)[number];

/** Kategori kegagalan panggilan adapter (IN-07, technical-specs 13 §13.2). */
export const adapterErrorCategories = [
  "TIMEOUT",
  "CONNECTION",
  "PROVIDER_ERROR",
  "AUTH",
  "CONFIG",
  "INVALID_RESPONSE",
] as const;
export type AdapterErrorCategory = (typeof adapterErrorCategories)[number];

/** Kategori sementara yang diretry otomatis oleh orchestrator (IN-07, technical-specs 13 §13.2 aturan 4). */
export const retryableAdapterCategories: ReadonlySet<AdapterErrorCategory> = new Set([
  "TIMEOUT",
  "CONNECTION",
  "PROVIDER_ERROR",
]);

/** IntegrationConfig ACTIVE yang sudah diresolusi untuk satu panggilan (data dictionary IntegrationConfig). */
export interface ResolvedConfig {
  tenantId: string;
  moduleCode: ModuleCode;
  providerCode: string;
  mode: IntegrationMode;
  endpointUrl: string | null;
  timeoutSeconds: number;
  maxRetries: number;
  asyncWaitHours: number | null;
  settings: Readonly<Record<string, unknown>>;
}

/** Data masuk dari penyedia untuk mode ASYNC (technical-specs 13 §13.4). */
export interface InboundRequest {
  headers: Readonly<Record<string, string | undefined>>;
  body: unknown;
}

export type AdapterOutcome<Res> =
  | { ok: true; response: Res; raw: unknown }
  | { ok: false; category: AdapterErrorCategory; message: string; raw?: unknown };

/**
 * Kontrak kanonik port satu modul (tech ref 10.4). `request` membuang field di luar kontrak sebelum adapter
 * dipanggil (IN-11); `response` memeriksa jawaban adapter, yang tidak sesuai menjadi `INVALID_RESPONSE`.
 */
export interface IntegrationPort<Req, Res> {
  moduleCode: ModuleCode;
  request: z.ZodType<Req>;
  response: z.ZodType<Res>;
}

/** Satu adapter penyedia; kode adapter ada di modul pemiliknya (technical-specs 13 §13.1, §13.2). */
export interface AdapterDescriptor<Req, Res> {
  /** Contoh `DUKCAPIL_ASIS`, `SIMULATION_M07`. */
  providerCode: string;
  moduleCode: ModuleCode;
  supportedModes: ReadonlyArray<IntegrationMode>;
  isSimulation: boolean;
  /** Skema pengaturan khusus penyedia (IN-05). */
  settingsSchema: z.ZodType;
  adapterVersion: string;
  call(req: Req, cfg: ResolvedConfig): Promise<AdapterOutcome<Res>>;
  testConnection(cfg: ResolvedConfig): Promise<void>;
  parseInbound?(raw: InboundRequest, cfg: ResolvedConfig): Promise<{ externalReference: string; payload: Res }>;
}
