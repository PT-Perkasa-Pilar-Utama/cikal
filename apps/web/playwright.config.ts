import { defineConfig } from "@playwright/test";
import { BASE_URL } from "./e2e/support/seed-users";

/**
 * Satu spec per kartu wiring (technical-specs 04 §4.6). Dijalankan terhadap stack dev dengan seed qa. Satu worker
 * karena semua spec berbagi database dan user seed, dan satu user hanya boleh punya satu sesi.
 */
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: BASE_URL },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // `pnpm dev` root menyalakan API dan web; health lewat proxy web siap setelah keduanya menyala.
        command: "pnpm dev",
        cwd: "../..",
        url: "http://localhost:5173/api/health/live",
        timeout: 180_000,
        reuseExistingServer: true,
      },
});
