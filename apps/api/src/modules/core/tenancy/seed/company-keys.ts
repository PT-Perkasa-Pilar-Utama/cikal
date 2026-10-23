import { provisionTenantKeys } from "../../../../platform/crypto/provision-tenant-keys.js";
import type { ModuleSeed } from "../../../../platform/migrate/module-data.js";
import { companies } from "../db/schema.js";

/** Company yang sudah ada mendapat kedua kunci saat seed base; tidak mengganti versi lama (TL-S3-05). */
export const seedCompanyKeys: ModuleSeed = async (db, ctx) => {
  for (const company of await db.select({ id: companies.id }).from(companies)) {
    await provisionTenantKeys(db, ctx.masterKey, company.id);
  }
};
