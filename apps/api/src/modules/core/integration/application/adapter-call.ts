import type { AdapterOutcome, ResolvedConfig } from "@cikal/contracts";
import type { z } from "zod";
import type { RegisteredAdapter } from "../domain/registry.js";

const SECOND_MS = 1_000;
const INVALID_RESPONSE = "Provider response does not match the contract";

type Failure = Extract<AdapterOutcome<never>, { ok: false }>;

/** Error yang dilempar adapter (contoh jaringan putus) dianggap gangguan koneksi sementara (IN-07). */
function thrownFailure(error: unknown): Failure {
  return { ok: false, category: "CONNECTION", message: error instanceof Error ? error.message : String(error) };
}

/**
 * Satu panggilan adapter dibatasi `timeoutSeconds` (COM-04); jawaban yang tidak sesuai kontrak kanonik menjadi
 * `INVALID_RESPONSE`. Panggilan yang melewati batas waktu tidak ditunggu lagi.
 */
export async function callAdapter<Res>(
  adapter: RegisteredAdapter,
  config: ResolvedConfig,
  request: unknown,
  response: z.ZodType<Res>,
): Promise<AdapterOutcome<Res>> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<Failure>((resolve) => {
    timer = setTimeout(
      () =>
        resolve({
          ok: false,
          category: "TIMEOUT",
          message: `Provider did not respond within ${config.timeoutSeconds} seconds`,
        }),
      config.timeoutSeconds * SECOND_MS,
    );
  });
  try {
    const outcome = await Promise.race([adapter.call(request, config).catch(thrownFailure), timeout]);
    if (!outcome.ok) return outcome;
    const parsed = response.safeParse(outcome.response);
    if (!parsed.success) {
      return { ok: false, category: "INVALID_RESPONSE", message: INVALID_RESPONSE, raw: outcome.raw };
    }
    return { ok: true, response: parsed.data, raw: outcome.raw };
  } finally {
    clearTimeout(timer);
  }
}
