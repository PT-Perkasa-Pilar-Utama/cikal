import type { AppConfig } from "../../src/platform/config/config.js";

/** Konfigurasi uji tanpa file secret. Database dan storage menunjuk ke alamat yang tidak menjawab kecuali di-override. */
export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    appEnv: "test",
    version: "0.0.0-test",
    port: 0,
    processRole: "api",
    logLevel: "warn",
    database: { url: "postgres://cikal:cikal@127.0.0.1:1/cikal", poolMax: 2 },
    storage: {
      endpoint: "http://127.0.0.1:1",
      region: "us-east-1",
      bucket: "cikal-test",
      accessKey: "test",
      secretKey: "test-secret",
      forcePathStyle: true,
    },
    monitoringToken: "monitoring-test-token",
    resetApi: null,
    ...overrides,
  };
}
