import type { ChangeRequestAccepted, ChangeRequestEntityType } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { sql } from "drizzle-orm";
import type pg from "pg";
import { v7 as uuidv7 } from "uuid";
import {
  ChangeRequestRegistry,
  type EntityHandler,
  SubmitChangeRequest,
  type SubmitInput,
} from "../../src/modules/core/change-request/index.js";
import { seedCompanyIds } from "../../src/modules/core/tenancy/index.js";
import { TenantTx } from "../../src/platform/db/tenant-tx.js";
import { DomainError } from "../../src/platform/http/domain-error.js";
import type { TestSession } from "./session.js";

/** Nama yang ditolak `validate` handler uji, meniru kode produk yang sudah dipakai sejak diajukan. */
export const TAKEN_NAME = "TAKEN";
export const TAKEN_MESSAGE = "Product code already exists";

/**
 * Tabel data master tiruan untuk handler uji: checker-maker cukup diuji lewat kontrak `EntityHandler`. Handler uji
 * memakai jenis entity yang modul pemiliknya belum mendaftar, karena registry menolak dua handler satu jenis.
 */
export async function createRecordsTable(owner: pg.Pool): Promise<void> {
  await owner.query("create schema cr_test");
  await owner.query(
    "create table cr_test.records (id uuid primary key, entity_type text not null, name text not null, payload jsonb)",
  );
  await owner.query("grant usage on schema cr_test to cikal_app");
  await owner.query("grant select, insert, update on cr_test.records to cikal_app");
}

const nameOf = (data: Record<string, unknown>) => (typeof data.name === "string" ? data.name : "");
const ruleViolation = (message: string) => new DomainError("BUSINESS_RULE_VIOLATION", message, 422);

/** Handler satu baris: `apply` menyimpan atau mengganti baris `cr_test.records`. */
export function recordHandler(entityType: ChangeRequestEntityType, auditModule: string): EntityHandler {
  return {
    entityType,
    auditModule,
    displayName: nameOf,
    async validate(_tx, request) {
      if (nameOf(request.newData) === TAKEN_NAME) throw ruleViolation(TAKEN_MESSAGE);
    },
    async apply(tx, request) {
      const id = request.entityId ?? uuidv7();
      await tx.execute(sql`
        insert into cr_test.records (id, entity_type, name, payload)
        values (${id}, ${entityType}, ${nameOf(request.newData)}, ${JSON.stringify(request.newData)})
        on conflict (id) do update set name = excluded.name, payload = excluded.payload`);
      return { entityId: id };
    },
  };
}

/** Handler paket impor: satu baris per `items[]`; item `invalid` gagal di tengah paket. */
export function packageHandler(entityType: ChangeRequestEntityType, auditModule: string): EntityHandler {
  return {
    entityType,
    auditModule,
    displayName: (data) => `Import of ${Array.isArray(data.items) ? data.items.length : 0} rows`,
    async validate() {},
    async apply(tx, request) {
      const items = Array.isArray(request.newData.items) ? request.newData.items : [];
      for (const item of items) {
        const name = typeof item === "object" && item !== null && "name" in item ? String(item.name) : "";
        await tx.execute(
          sql`insert into cr_test.records (id, entity_type, name) values (${uuidv7()}, ${entityType}, ${name})`,
        );
        if (name === "invalid") throw ruleViolation("Row 50: Value is required");
      }
      return { entityId: null };
    },
  };
}

/** Handler uji menggantikan handler asli modul pemilik jenis entity yang sama, contoh `SCORING_MODEL` M09. */
export function registerHandlers(app: NestFastifyApplication, handlers: EntityHandler[]): void {
  const registry = app.get(ChangeRequestRegistry);
  const installed = Reflect.get(registry, "handlers") as Map<ChangeRequestEntityType, EntityHandler>;
  for (const handler of handlers) {
    installed.delete(handler.entityType);
    registry.register(handler);
  }
}

/** Pengajuan Maker seperti dari modul pemilik, di transaksi tenant company 001. */
export function submitAs(
  app: NestFastifyApplication,
  maker: TestSession,
  input: SubmitInput,
): Promise<ChangeRequestAccepted["data"]> {
  const actor = { tenantId: seedCompanyIds.company001, userId: maker.userId, ipAddress: "10.10.1.10" };
  return app.get(TenantTx).withTenantTx(actor, (tx) => app.get(SubmitChangeRequest).execute(tx, actor, input));
}

export async function recordCount(owner: pg.Pool, entityType: ChangeRequestEntityType): Promise<number> {
  const { rows } = await owner.query<{ n: number }>(
    "select count(*)::int as n from cr_test.records where entity_type = $1",
    [entityType],
  );
  return rows[0]?.n ?? 0;
}

export interface AuditRow {
  user_id: string | null;
  role: string | null;
  module: string;
  action: string;
  record_id: string | null;
  description: string | null;
  ip_address: string | null;
}

/** Baris audit terakhir untuk satu pelaku dan aksi. */
export async function lastAudit(owner: pg.Pool, userId: string, action: string): Promise<AuditRow | undefined> {
  const { rows } = await owner.query<AuditRow>(
    `select user_id, role, module, action, record_id, description, host(ip_address) as ip_address
       from audit.audit_logs where user_id = $1 and action = $2 order by occurred_at desc, id desc limit 1`,
    [userId, action],
  );
  return rows[0];
}
