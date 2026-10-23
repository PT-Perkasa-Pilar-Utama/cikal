import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { Database } from "./database.js";
import { tenantKeys } from "./schema.js";

export type KeyPurpose = "ENCRYPTION" | "BLIND_INDEX";
type KeyDatabase = Pick<Database, "select" | "insert">;

/** Akses kunci tenant dibatasi RLS dan filter tenant eksplisit (technical-specs 06 §6.3). */
@Injectable()
export class TenantKeysRepository {
  async find(
    db: KeyDatabase,
    tenantId: string,
    purpose: KeyPurpose,
    version?: number,
  ): Promise<typeof tenantKeys.$inferSelect | null> {
    const [row] = await db
      .select()
      .from(tenantKeys)
      .where(
        and(
          eq(tenantKeys.tenantId, tenantId),
          eq(tenantKeys.keyPurpose, purpose),
          version === undefined ? eq(tenantKeys.status, "ACTIVE") : eq(tenantKeys.keyVersion, version),
        ),
      );
    return row ?? null;
  }

  async insert(db: KeyDatabase, row: typeof tenantKeys.$inferInsert): Promise<void> {
    await db.insert(tenantKeys).values(row).onConflictDoNothing();
  }
}
