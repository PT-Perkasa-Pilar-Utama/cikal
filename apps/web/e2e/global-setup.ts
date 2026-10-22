import { resetStateResponseSchema } from "@cikal/contracts";
import { ApiSession } from "./support/api-session";
import { authFile, resetToken, SESSION_USERS } from "./support/seed-users";

/**
 * Setiap run e2e mulai dari seed `qa` (DEVELOPMENT_SCENARIO_GUIDE §5, technical-specs 04 §4.6) agar spec kartu
 * wiring bisa memakai kode produk yang sama di setiap run. Reset menghapus semua sesi, jadi sesi user seed dibuat
 * sesudahnya, sekali per run.
 */
export default async function globalSetup(): Promise<void> {
  const qa = await ApiSession.login("qa.01");
  try {
    await qa.post(
      resetStateResponseSchema,
      "/api/admin/reset-state",
      { seed: "qa" },
      { "X-Reset-Token": resetToken() },
    );
  } finally {
    await qa.dispose();
  }
  for (const username of SESSION_USERS) {
    const session = await ApiSession.login(username);
    await session.saveState(authFile(username));
    await session.dispose();
  }
}
