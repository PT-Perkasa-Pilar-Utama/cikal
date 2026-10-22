import { errorEnvelopeSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { insertProduct, ktaProduct, nextProductCode } from "./support/product.js";
import { createRole, createSession } from "./support/session.js";

/** Guard global: sesi, CSRF, ganti password, hak menu (api-specs 02 §2.5, technical-specs 07 §7.2). */
describe("access guard", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const expectError = (res: { statusCode: number; json(): unknown }, status: number, code: string, message: string) => {
    expect(res.statusCode).toBe(status);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
  };
  const listProducts = (headers: Record<string, string>) =>
    app.inject({ method: "GET", url: "/api/v1/products", headers });
  const createProduct = (headers: Record<string, string>) =>
    app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers,
      payload: { ...ktaProduct, productCode: nextProductCode("A") },
    });
  /** Setiap ubahan memakai produk baru agar tidak tertahan permintaan terbuka uji sebelumnya. */
  const updateProduct = async (headers: Record<string, string>) => {
    const productCode = nextProductCode("A");
    const productId = await insertProduct(db.owner, { productCode });
    return app.inject({
      method: "PUT",
      url: `/api/v1/products/${productId}`,
      headers,
      payload: { ...ktaProduct, productCode, productName: "KTA Diubah", isActive: true },
    });
  };

  describe("menu rights", () => {
    it("rejects a Sales creating a product through the API with ACTION_DENIED (AC-09.04)", async () => {
      const sales = await createSession(db.owner, { roleId: seedRoleIds.sales });
      expectError(
        await createProduct(sales.headers),
        403,
        "ACTION_DENIED",
        "You do not have permission to perform this action",
      );
    });

    it("denies the Product page to a role without View (AC-09.02 TRM_ACC_001)", async () => {
      const sales = await createSession(db.owner, { roleId: seedRoleIds.sales });
      expectError(await listProducts(sales.headers), 403, "ACCESS_DENIED", "You do not have access to this page");
    });

    it("lets View and Approve read products but not create or edit them (AC-09.02 TRM_ACC_002)", async () => {
      const roleId = await createRole(db.owner, "MRTM Checker", [
        { menuCode: "MST-PRODUCT", view: true, approve: true },
      ]);
      const checker = await createSession(db.owner, { roleId });
      expect((await listProducts(checker.headers)).statusCode).toBe(200);
      expectError(
        await createProduct(checker.headers),
        403,
        "ACTION_DENIED",
        "You do not have permission to perform this action",
      );
      expectError(
        await updateProduct(checker.headers),
        403,
        "ACTION_DENIED",
        "You do not have permission to perform this action",
      );
    });

    it("lets View, Create/Update, and Delete read, create, and edit products (AC-09.02 TRM_ACC_003)", async () => {
      const roleId = await createRole(db.owner, "MRTM Maker", [
        { menuCode: "MST-PRODUCT", view: true, create: true, update: true, delete: true },
      ]);
      const maker = await createSession(db.owner, { roleId });
      expect((await listProducts(maker.headers)).statusCode).toBe(200);
      expect((await createProduct(maker.headers)).statusCode).toBe(202);
      expect((await updateProduct(maker.headers)).statusCode).toBe(202);
    });

    it("lets a role with every right use every product route (AC-09.02 TRM_ACC_004)", async () => {
      const roleId = await createRole(db.owner, "MRTM Admin", [
        { menuCode: "MST-PRODUCT", view: true, create: true, update: true, delete: true, approve: true },
      ]);
      const admin = await createSession(db.owner, { roleId });
      expect((await listProducts(admin.headers)).statusCode).toBe(200);
      expect((await createProduct(admin.headers)).statusCode).toBe(202);
      expect((await updateProduct(admin.headers)).statusCode).toBe(202);
    });

    it("grants the seeded Maker the product rights of the seed matrix", async () => {
      const maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
      expect((await createProduct(maker.headers)).statusCode).toBe(202);
    });

    it("adds user access that is valid today to the role's rights", async () => {
      const sales = await createSession(db.owner, { roleId: seedRoleIds.sales });
      await db.owner.query(
        `insert into iam.user_access (id, tenant_id, user_id, menu_id, can_view, valid_from, valid_to)
         select '0192b6a6-0001-7000-8000-000000000001', u.tenant_id, u.id, m.id, true, current_date - 1, current_date + 1
         from iam.users u, iam.menus m where u.id = $1 and m.menu_code = 'MST-PRODUCT'`,
        [sales.userId],
      );
      expect((await listProducts(sales.headers)).statusCode).toBe(200);
    });
  });

  describe("session", () => {
    it("rejects a request without a session cookie with UNAUTHENTICATED", async () => {
      expectError(await listProducts({}), 401, "UNAUTHENTICATED", "Your session has expired. Please log in again");
    });

    it("rejects an unknown session token with UNAUTHENTICATED", async () => {
      expectError(
        await listProducts({ cookie: "cikal_sid=not-a-session" }),
        401,
        "UNAUTHENTICATED",
        "Your session has expired. Please log in again",
      );
    });

    it("keeps a session idle for 29 minutes active (AC-06.04)", async () => {
      const maker = await createSession(db.owner, { roleId: seedRoleIds.maker, idleMinutes: 29 });
      expect((await listProducts(maker.headers)).statusCode).toBe(200);
    });

    it("expires a session idle for 30 minutes with SESSION_EXPIRED (AC-06.03)", async () => {
      const maker = await createSession(db.owner, { roleId: seedRoleIds.maker, idleMinutes: 30 });
      expectError(
        await listProducts(maker.headers),
        401,
        "SESSION_EXPIRED",
        "Your session has expired. Please log in again",
      );
    });

    it("expires a session past its absolute limit with SESSION_EXPIRED", async () => {
      const maker = await createSession(db.owner, { roleId: seedRoleIds.maker, expiresInMinutes: -1 });
      expectError(
        await listProducts(maker.headers),
        401,
        "SESSION_EXPIRED",
        "Your session has expired. Please log in again",
      );
    });

    it("rejects the session of an inactive user with UNAUTHENTICATED", async () => {
      const maker = await createSession(db.owner, { roleId: seedRoleIds.maker, status: "INACTIVE" });
      expectError(
        await listProducts(maker.headers),
        401,
        "UNAUTHENTICATED",
        "Your session has expired. Please log in again",
      );
    });

    it("records activity on each request but not on background polling", async () => {
      const maker = await createSession(db.owner, { roleId: seedRoleIds.maker, idleMinutes: 10 });
      const lastActivity = async () =>
        (
          await db.owner.query<{ idle: number }>(
            "select (extract(epoch from now() - last_activity_at) / 60)::float8 as idle from iam.sessions where id = $1",
            [maker.sessionId],
          )
        ).rows[0]?.idle;

      await listProducts({ ...maker.headers, "x-background": "true" });
      expect(await lastActivity()).toBeGreaterThan(9);
      await listProducts(maker.headers);
      expect(await lastActivity()).toBeLessThan(1);
    });

    it("rejects a change without the matching X-CSRF-Token with CSRF_TOKEN_INVALID", async () => {
      const maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
      const res = await createProduct({ cookie: maker.headers.cookie ?? "", "x-csrf-token": "forged" });
      expectError(res, 403, "CSRF_TOKEN_INVALID", "Your session has expired. Please log in again");
    });

    it("blocks routes while the initial password must be changed with PASSWORD_CHANGE_REQUIRED", async () => {
      const maker = await createSession(db.owner, { roleId: seedRoleIds.maker, mustChangePassword: true });
      expectError(
        await listProducts(maker.headers),
        403,
        "PASSWORD_CHANGE_REQUIRED",
        "Please change your initial password before continuing",
      );
    });
  });
});
