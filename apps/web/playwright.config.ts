import { defineConfig } from "@playwright/test";

/** Satu spec per kartu wiring (technical-specs 04 §4.6). Dijalankan terhadap stack dev dengan seed qa. */
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173" },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "pnpm dev", url: "http://localhost:5173", reuseExistingServer: true },
});
