import type { AdapterDescriptor } from "@cikal/contracts";

export type RegisteredAdapter = AdapterDescriptor<unknown, unknown>;

/**
 * Katalog adapter dari modul yang dimuat (technical-specs 13 §13.7, data dictionary IntegrationProvider). Modul
 * pemilik adapter mendaftar saat `onModuleInit`; kode penyedia unik di seluruh instalasi (IN-13).
 */
export class AdapterRegistry {
  private readonly adapters = new Map<string, RegisteredAdapter>();

  register(adapter: RegisteredAdapter): void {
    if (this.adapters.has(adapter.providerCode)) {
      throw new Error(`Adapter ${adapter.providerCode} is already registered`);
    }
    this.adapters.set(adapter.providerCode, adapter);
  }

  get(providerCode: string): RegisteredAdapter | undefined {
    return this.adapters.get(providerCode);
  }
}
