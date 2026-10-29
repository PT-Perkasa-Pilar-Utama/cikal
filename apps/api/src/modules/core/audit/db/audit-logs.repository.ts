import type { AuditEventType } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, gte, inArray, lt, notInArray, type SQL } from "drizzle-orm";
import { businessDayRange } from "../../../../platform/clock/business-date.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { APPLICATION_MODULES, AUTHENTICATION_ACTIONS, DATA_ACCESS_ACTIONS } from "../domain/audit-event-type.js";
import { auditLogs } from "./schema.js";

export type AuditLogInsert = typeof auditLogs.$inferInsert;
export type AuditLogRow = typeof auditLogs.$inferSelect;

/** Saringan halaman "Audit Trail" (api-specs 17 §17.2); tanggal adalah tanggal bisnis inklusif. */
export interface AuditLogFilter {
  occurredFrom: string;
  occurredTo: string;
  module?: string;
  eventType?: AuditEventType;
  userId?: string;
  recordId?: string;
}

export interface AuditLogPage {
  direction: "asc" | "desc";
  offset: number;
  limit: number;
}

const SPECIAL_ACTIONS = [...AUTHENTICATION_ACTIONS, ...DATA_ACCESS_ACTIONS];

/** Kondisi SQL setara `auditEventType` di domain. */
const EVENT_TYPE_CONDITIONS: Record<AuditEventType, () => SQL | undefined> = {
  AUTHENTICATION: () => inArray(auditLogs.action, [...AUTHENTICATION_ACTIONS]),
  DATA_ACCESS: () => inArray(auditLogs.action, [...DATA_ACCESS_ACTIONS]),
  APPLICATION_ACTION: () =>
    and(notInArray(auditLogs.action, SPECIAL_ACTIONS), inArray(auditLogs.module, [...APPLICATION_MODULES])),
  MASTER_DATA: () =>
    and(notInArray(auditLogs.action, SPECIAL_ACTIONS), notInArray(auditLogs.module, [...APPLICATION_MODULES])),
};

/** Akses tabel `audit.audit_logs`; hanya menambah dan membaca baris (technical-specs 05 §5.7, AD-03). */
@Injectable()
export class AuditLogsRepository {
  async insert(tx: Tx, row: AuditLogInsert): Promise<void> {
    await tx.insert(auditLogs).values(row);
  }

  async list(tx: Tx, filter: AuditLogFilter, page: AuditLogPage): Promise<AuditLogRow[]> {
    const order = page.direction === "asc" ? asc : desc;
    return tx
      .select()
      .from(auditLogs)
      .where(this.where(filter))
      .orderBy(order(auditLogs.occurredAt), order(auditLogs.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async count(tx: Tx, filter: AuditLogFilter): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(auditLogs).where(this.where(filter));
    return row?.total ?? 0;
  }

  async findById(tx: Tx, id: string): Promise<AuditLogRow | null> {
    const [row] = await tx.select().from(auditLogs).where(eq(auditLogs.id, id));
    return row ?? null;
  }

  private where(filter: AuditLogFilter): SQL | undefined {
    return and(
      gte(auditLogs.occurredAt, businessDayRange(filter.occurredFrom).start),
      lt(auditLogs.occurredAt, businessDayRange(filter.occurredTo).end),
      filter.module ? eq(auditLogs.module, filter.module) : undefined,
      filter.eventType ? EVENT_TYPE_CONDITIONS[filter.eventType]() : undefined,
      filter.userId ? eq(auditLogs.userId, filter.userId) : undefined,
      filter.recordId ? eq(auditLogs.recordId, filter.recordId) : undefined,
    );
  }
}
