import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

/** User seed yang sesinya disiapkan global setup dan dipakai ulang oleh spec. */
export const SESSION_USERS = ["maker.01", "checker.001", "admin.sistem"] as const;
export type SessionUser = (typeof SESSION_USERS)[number];

const secretFile = (name: string) =>
  fileURLToPath(new URL(`../../../../deploy/compose/.secrets/${name}`, import.meta.url));

/** File storage state sesi user seed; di-gitignore karena berisi cookie sesi. */
export const authFile = (username: SessionUser): string =>
  fileURLToPath(new URL(`../../playwright/.auth/${username}.json`, import.meta.url));

/** Password akun seed satu per lingkungan, dari file secret yang dibuat `pnpm dev:secrets` (DEPLOYMENT_PLAN §6.5). */
export function seedPassword(): string {
  return readFileSync(process.env.E2E_SEED_PASSWORD_FILE ?? secretFile("seed_user_password"), "utf8").trim();
}

/** Isi `X-Reset-Token` untuk `POST /api/admin/reset-state` (api-specs 27 §27.4). */
export function resetToken(): string {
  return readFileSync(process.env.E2E_RESET_TOKEN_FILE ?? secretFile("reset_token"), "utf8").trim();
}

/** Login lewat layar "Login" sebagai user seed lalu menunggu Dashboard. */
export async function loginAs(page: Page, username: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/^Username/).fill(username);
  await page.getByLabel(/^Password/).fill(seedPassword());
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
