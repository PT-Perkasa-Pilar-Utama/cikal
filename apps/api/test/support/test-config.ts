import { randomBytes } from "node:crypto";
import type { AppConfig } from "../../src/platform/config/config.js";
import { testLicenseKeys } from "./license.js";

export const TEST_MASTER_KEY = randomBytes(32);

/**
 * Konfigurasi uji tanpa file secret. Database dan storage menunjuk ke alamat yang tidak menjawab kecuali di-override.
 * Lisensi diverifikasi dengan kunci uji (`support/license.ts`).
 */
export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    masterKey: TEST_MASTER_KEY,
    appEnv: "test",
    version: "0.0.0-test",
    port: 0,
    processRole: "api",
    logLevel: "warn",
    database: { url: "postgres://cikal:cikal@127.0.0.1:1/cikal", migrationUrl: null, poolMax: 2 },
    storage: {
      endpoint: "http://127.0.0.1:1",
      publicEndpoint: "http://127.0.0.1:1",
      region: "us-east-1",
      bucket: "cikal-test",
      accessKey: "test",
      secretKey: "test-secret",
      forcePathStyle: true,
    },
    gotenbergUrl: null,
    sessionCookieSecure: true,
    monitoringToken: "monitoring-test-token",
    resetApi: null,
    allowSimulationAdapters: true,
    regionApi: { url: "http://127.0.0.1:1", apiKey: null },
    smtp: null,
    worker: { concurrency: 1 },
    licensePublicKey: testLicenseKeys.publicKey,
    ...overrides,
  };
}
