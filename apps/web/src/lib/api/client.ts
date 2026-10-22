import { type ErrorEnvelope, errorEnvelopeSchema } from "@cikal/contracts";
import type { z } from "zod";

/** Error API dengan envelope API-04; `message` sudah berisi teks AC untuk ditampilkan apa adanya. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly envelope: ErrorEnvelope,
  ) {
    super(envelope.message);
    this.name = "ApiError";
  }
}

const UNKNOWN_ERROR: ErrorEnvelope = {
  code: "INTERNAL_ERROR",
  message: "An unexpected error occurred. Please try again",
  details: [],
  correlationId: "",
};

const CSRF_COOKIE = "cikal_csrf";
/** Metode selain ini wajib membawa `X-CSRF-Token` (api-specs 02 §2.5 langkah 2). */
const SAFE_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD"]);

/** Token CSRF dari cookie `cikal_csrf`, yang sengaja tidak HttpOnly agar bisa disalin ke header (api-specs 02 §2.1). */
function csrfToken(): string | undefined {
  const prefix = `${CSRF_COOKIE}=`;
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
}

/** Panggil API dan validasi respons dengan skema kontrak dari `@cikal/contracts` (RP-04). */
export async function apiRequest<T extends z.ZodType>(
  schema: T,
  path: string,
  init: RequestInit = {},
): Promise<z.infer<T>> {
  const csrf = SAFE_METHODS.has((init.method ?? "GET").toUpperCase()) ? undefined : csrfToken();
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...init.headers,
    },
  });
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorEnvelopeSchema.safeParse(body);
    throw new ApiError(response.status, parsed.success ? parsed.data : UNKNOWN_ERROR);
  }
  return schema.parse(body);
}
