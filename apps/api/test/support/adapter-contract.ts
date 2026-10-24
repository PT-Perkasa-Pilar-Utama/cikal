import type { AdapterDescriptor, IntegrationPort, ResolvedConfig } from "@cikal/contracts";
import { describe, expect, it } from "vitest";

/** Konfigurasi ACTIVE contoh untuk memanggil adapter di luar Integration Registry. */
export function configFor(adapter: AdapterDescriptor<unknown, unknown>): ResolvedConfig {
  return {
    tenantId: "0192b6a0-0001-7000-8000-000000000001",
    moduleCode: adapter.moduleCode,
    providerCode: adapter.providerCode,
    mode: adapter.supportedModes[0] ?? "SYNC",
    endpointUrl: null,
    timeoutSeconds: 30,
    maxRetries: 3,
    asyncWaitHours: null,
    settings: {},
  };
}

/**
 * Uji kontrak bersama setiap adapter (technical-specs 13 §13.7): adapter melayani modul port-nya, pengaturan
 * kosong sah, setiap contoh permintaan dijawab sesuai kontrak kanonik, dan test connection lulus. Adapter asli
 * memakai suite yang sama dengan rekaman respons.
 */
export function describeAdapterContract<Req, Res>(
  adapter: AdapterDescriptor<Req, Res>,
  port: IntegrationPort<Req, Res>,
  requests: readonly Req[],
): void {
  describe(`${adapter.providerCode} adapter contract`, () => {
    it("serves the module of its port with at least one mode", () => {
      expect(adapter.moduleCode).toBe(port.moduleCode);
      expect(adapter.supportedModes.length).toBeGreaterThan(0);
      expect(adapter.adapterVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("accepts empty provider settings", () => {
      expect(adapter.settingsSchema.safeParse({}).success).toBe(true);
    });

    it("answers every sample request with a response that matches the canonical contract", async () => {
      for (const request of requests) {
        const outcome = await adapter.call(port.request.parse(request), configFor(adapter));

        expect(outcome.ok, JSON.stringify(request)).toBe(true);
        if (outcome.ok) expect(port.response.safeParse(outcome.response).success).toBe(true);
      }
    });

    it("passes the connection test", async () => {
      await expect(adapter.testConnection(configFor(adapter))).resolves.toBeUndefined();
    });
  });
}

/** `true` bila `promise` belum selesai setelah `ms` milidetik; untuk adapter simulasi timeout. */
export async function stillPendingAfter(promise: Promise<unknown>, ms: number): Promise<boolean> {
  const marker = Symbol("pending");
  let timer: NodeJS.Timeout | undefined;
  const wait = new Promise<symbol>((resolve) => {
    timer = setTimeout(() => resolve(marker), ms);
  });
  try {
    return (await Promise.race([promise, wait])) === marker;
  } finally {
    clearTimeout(timer);
  }
}
