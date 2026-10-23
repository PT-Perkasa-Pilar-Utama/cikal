import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { provisionTenantKeys } from "../src/platform/crypto/provision-tenant-keys.js";
import { TenantEncryption } from "../src/platform/crypto/tenant-encryption.js";
import { type TenantContext, TenantTx } from "../src/platform/db/tenant-tx.js";
import { installedModuleData } from "../src/platform/migrate/installed-modules.js";
import { seedModules } from "../src/platform/migrate/runner.js";
import { seedContext, startDatabase, type TestDatabase } from "./support/database.js";

const tenantId = seedCompanyIds.company001;
const actor: TenantContext = { tenantId, userId: "0192b6f0-0001-7000-8000-000000000001" };
const otherActor = { ...actor, tenantId: "0192b6a0-0002-7000-8000-000000000002" };
const NIK = "3273011402900001";

describe("TL-S3-05 tenant encryption", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  beforeAll(async () => {
    db = await startDatabase("dev");
    await db.owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '002', 'Bank Dua', 'Jakarta')",
      [otherActor.tenantId],
    );
    await drizzle(db.owner).transaction((tx) => provisionTenantKeys(tx, db.config.masterKey, otherActor.tenantId));
    app = await createApp(db.config);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("provisions both wrapped keys with company creation in dev seed", async () => {
    const { rows } = await db.owner.query(
      "select key_purpose, key_version, status from platform.tenant_keys where tenant_id = $1 order by key_purpose",
      [tenantId],
    );
    expect(rows).toEqual([
      { key_purpose: "BLIND_INDEX", key_version: 1, status: "ACTIVE" },
      { key_purpose: "ENCRYPTION", key_version: 1, status: "ACTIVE" },
    ]);
  });

  it("round-trips a field with random ciphertext for each encryption", async () => {
    await app.get(TenantTx).withTenantTx(actor, async (tx) => {
      const crypto = app.get(TenantEncryption);
      const first = await crypto.encrypt(tx, NIK);
      const second = await crypto.encrypt(tx, NIK);
      expect(first.keyVersion).toBe(1);
      expect(first.ciphertext.equals(second.ciphertext)).toBe(false);
      expect(first.ciphertext.includes(Buffer.from(NIK))).toBe(false);
      expect(await crypto.decrypt(tx, first)).toBe(NIK);
      expect(await crypto.decrypt(tx, second)).toBe(NIK);
    });
  });

  it("keeps a stable blind index within one tenant and separates tenants", async () => {
    const index = (who: typeof actor) =>
      app.get(TenantTx).withTenantTx(who, (tx) => app.get(TenantEncryption).blindIndex(tx, NIK));
    const first = await index(actor);
    expect(first.length).toBe(32);
    expect(await index(actor)).toEqual(first);
    expect(await index(otherActor)).not.toEqual(first);
  });

  it("rejects decryption with another tenant's key", async () => {
    const encrypted = await app.get(TenantTx).withTenantTx(actor, (tx) => app.get(TenantEncryption).encrypt(tx, NIK));
    await expect(
      app.get(TenantTx).withTenantTx(otherActor, (tx) => app.get(TenantEncryption).decrypt(tx, encrypted)),
    ).rejects.toThrow();
  });

  it("rejects tampered ciphertext and unknown key versions", async () => {
    await app.get(TenantTx).withTenantTx(actor, async (tx) => {
      const crypto = app.get(TenantEncryption);
      const value = await crypto.encrypt(tx, NIK);
      const corrupt = Buffer.from(value.ciphertext);
      corrupt[corrupt.length - 1] = (corrupt[corrupt.length - 1] ?? 0) ^ 1;
      await expect(crypto.decrypt(tx, { ...value, ciphertext: corrupt })).rejects.toThrow();
      await expect(crypto.decrypt(tx, { ...value, keyVersion: 999 })).rejects.toThrow("Tenant key is not available");
      await expect(crypto.decrypt(tx, { ...value, ciphertext: Buffer.alloc(4) })).rejects.toThrow(
        "Invalid encrypted value",
      );
    });
  });

  it("reads retired versions but never uses them for new encryption", async () => {
    const value = await app.get(TenantTx).withTenantTx(actor, (tx) => app.get(TenantEncryption).encrypt(tx, NIK));
    await db.owner.query(
      "update platform.tenant_keys set status = 'RETIRED' where tenant_id = $1 and key_purpose = 'ENCRYPTION'",
      [tenantId],
    );
    try {
      await app.get(TenantTx).withTenantTx(actor, async (tx) => {
        expect(await app.get(TenantEncryption).decrypt(tx, value)).toBe(NIK);
        await expect(app.get(TenantEncryption).encrypt(tx, NIK)).rejects.toThrow("Tenant key is not available");
      });
    } finally {
      await db.owner.query("update platform.tenant_keys set status = 'ACTIVE' where tenant_id = $1", [tenantId]);
    }
  });

  it("keeps existing ciphertext readable across repeated base and dev seeds", async () => {
    const value = await app.get(TenantTx).withTenantTx(actor, (tx) => app.get(TenantEncryption).encrypt(tx, NIK));
    const before = await db.owner.query("select id, wrapped_key from platform.tenant_keys order by id");
    await seedModules(db.owner, installedModuleData, "base", seedContext);
    await seedModules(db.owner, installedModuleData, "dev", seedContext);
    expect((await db.owner.query("select id, wrapped_key from platform.tenant_keys order by id")).rows).toEqual(
      before.rows,
    );
    expect(await app.get(TenantTx).withTenantTx(actor, (tx) => app.get(TenantEncryption).decrypt(tx, value))).toBe(NIK);
  });

  it("requires tenant context and keeps other tenants' keys invisible through RLS", async () => {
    await expect(drizzle(db.app).transaction((tx) => app.get(TenantEncryption).encrypt(tx, NIK))).rejects.toThrow(
      "Tenant context is required for encryption",
    );
    expect((await db.app.query("select id from platform.tenant_keys")).rows).toEqual([]);
    await app.get(TenantTx).withTenantTx(actor, async (tx) => {
      const rows = await tx.execute(sql`select id from platform.tenant_keys where tenant_id = ${otherActor.tenantId}`);
      expect(rows.rowCount).toBe(0);
    });
  });

  it("base seed provisions keys for an existing company", async () => {
    const third = { ...actor, tenantId: "0192b6a0-0003-7000-8000-000000000003" };
    await db.owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '003', 'Bank Tiga', 'Jakarta')",
      [third.tenantId],
    );
    await seedModules(db.owner, installedModuleData, "base", seedContext);
    await app.get(TenantTx).withTenantTx(third, async (tx) => {
      const crypto = app.get(TenantEncryption);
      expect(await crypto.decrypt(tx, await crypto.encrypt(tx, NIK))).toBe(NIK);
      expect((await crypto.blindIndex(tx, NIK)).length).toBe(32);
    });
  });
});
