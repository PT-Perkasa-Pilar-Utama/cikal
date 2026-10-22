import { type APIRequestContext, request } from "@playwright/test";
import type { z } from "zod";
import { authFile, BASE_URL, type SessionUser, seedPassword } from "./seed-users";

const CSRF_COOKIE = "cikal_csrf";

/**
 * Sesi API user seed untuk menyiapkan data uji tanpa layar. Cookie sesi dibawa context, dan `X-CSRF-Token`
 * disalin dari cookie `cikal_csrf` seperti klien web (api-specs 02 §2.5).
 */
export class ApiSession {
  private constructor(
    private readonly context: APIRequestContext,
    private readonly csrf: string,
  ) {}

  private static async open(context: APIRequestContext): Promise<ApiSession> {
    const { cookies } = await context.storageState();
    const csrf = cookies.find((cookie) => cookie.name === CSRF_COOKIE)?.value;
    if (!csrf) throw new Error(`The session has no ${CSRF_COOKIE} cookie`);
    return new ApiSession(context, csrf);
  }

  /** Login dengan password seed; dipakai global setup saja karena login dibatasi 10 per menit per IP (api-specs 02 §2.2). */
  static async login(username: string): Promise<ApiSession> {
    const context = await request.newContext({ baseURL: BASE_URL });
    const response = await context.post("/api/v1/auth/login", { data: { username, password: seedPassword() } });
    if (!response.ok()) throw new Error(`Login as ${username} failed with ${response.status()}`);
    return ApiSession.open(context);
  }

  /** Menjalankan `work` dengan sesi yang disimpan global setup, sama dengan sesi halaman user itu. */
  static async as<T>(username: SessionUser, work: (session: ApiSession) => Promise<T>): Promise<T> {
    const session = await ApiSession.open(
      await request.newContext({ baseURL: BASE_URL, storageState: authFile(username) }),
    );
    try {
      return await work(session);
    } finally {
      await session.dispose();
    }
  }

  async post<T>(schema: z.ZodType<T>, path: string, body: object, headers: Record<string, string> = {}): Promise<T> {
    const response = await this.context.post(path, { data: body, headers: { "X-CSRF-Token": this.csrf, ...headers } });
    if (!response.ok()) throw new Error(`POST ${path} failed with ${response.status()}: ${await response.text()}`);
    return schema.parse(await response.json());
  }

  async saveState(path: string): Promise<void> {
    await this.context.storageState({ path });
  }

  dispose(): Promise<void> {
    return this.context.dispose();
  }
}
