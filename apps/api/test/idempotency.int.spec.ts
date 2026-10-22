import { changeRequestAcceptedSchema, errorEnvelopeSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createSession, type TestSession } from "./support/session.js";

const roleAccessId = "0192b6a3-0002-7000-8000-000000000014";
const flags = { canView: true, canCreate: false, canUpdate: false, canDelete: false, canApprove: true };

/** `Idempotency-Key` opsional pada PUT terautentikasi (api-specs 01 §1.7). */
describe("Idempotency-Key", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const update = (key: string, payload: object = flags) =>
    app.inject({
      method: "PUT",
      url: `/api/v1/role-access/${roleAccessId}`,
      headers: { ...maker.headers, "idempotency-key": key },
      payload,
    });

  it("replays the first status and body for the same key and body", async () => {
    const key = "0192b6a8-0001-7000-8000-000000000001";
    const first = await update(key);
    const second = await update(key);
    expect(first.statusCode).toBe(202);
    expect(changeRequestAcceptedSchema.safeParse(first.json()).success).toBe(true);
    expect(first.headers["idempotent-replayed"]).toBeUndefined();
    expect(second.statusCode).toBe(202);
    expect(second.json()).toEqual(first.json());
    expect(second.headers["idempotent-replayed"]).toBe("true");
  });

  it("rejects the same key with a different body with IDEMPOTENCY_KEY_REUSED", async () => {
    const key = "0192b6a8-0002-7000-8000-000000000002";
    await update(key);
    const res = await update(key, { ...flags, canApprove: false });
    expect(res.statusCode).toBe(409);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "IDEMPOTENCY_KEY_REUSED",
      message: "Idempotency-Key was used with a different request",
    });
  });

  it("scopes keys per user", async () => {
    const key = "0192b6a8-0003-7000-8000-000000000003";
    const other = await createSession(db.owner, { roleId: seedRoleIds.maker });
    await update(key);
    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/role-access/${roleAccessId}`,
      headers: { ...other.headers, "idempotency-key": key },
      payload: { ...flags, canApprove: false },
    });
    expect(res.statusCode).toBe(202);
    expect(res.headers["idempotent-replayed"]).toBeUndefined();
  });

  it("does not keep a key whose first request failed", async () => {
    const key = "0192b6a8-0004-7000-8000-000000000004";
    expect((await update(key, { ...flags, canView: "yes" })).statusCode).toBe(400);
    expect((await update(key)).headers["idempotent-replayed"]).toBeUndefined();
  });

  it("rejects a key that is not a UUID with VALIDATION_FAILED", async () => {
    const res = await update("not-a-uuid");
    expect(res.statusCode).toBe(400);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [{ field: "Idempotency-Key", code: "invalid_format", message: "Idempotency-Key must be a UUID" }],
    });
  });
});
