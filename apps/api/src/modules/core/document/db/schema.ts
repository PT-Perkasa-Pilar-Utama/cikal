import type { CounterScope, DocumentType, NumberFormatStatus, ResetPeriod } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { companies } from "../../tenancy/index.js";

export const document = pgSchema("document");

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai ditulis ulang dari `domain/upload-rules.ts`.
const EXTENSIONS = ["png", "jpg", "jpeg", "pdf", "docx"] as const;
const STORED_FORMATS = ["PDF", "DOCX"] as const;
const DOCUMENT_TYPES = ["SP3K", "CONTRACT"] as const;
const RESET_PERIODS = ["NONE", "YEARLY", "MONTHLY", "DAILY"] as const;
const COUNTER_SCOPES = ["COMPANY", "BRANCH", "PRODUCT", "BRANCH_PRODUCT"] as const;
const FORMAT_STATUSES = ["DRAFT", "WAITING_APPROVAL", "ACTIVE", "SUPERSEDED"] as const;
const textList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

/**
 * DOCUMENT_FILES, technical-specs 06 §6.8. Semua unggahan disimpan sebagai PDF (DC-02); template Word disimpan
 * sebagai DOCX. `size_bytes` adalah ukuran berkas yang diunggah user. Objek di `storage_key` tidak memuat nama file asli (technical-specs 07 §7.7).
 */
export const documentFiles = document.table(
  "document_files",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    fileName: text("file_name").notNull(),
    originalExtension: text("original_extension").notNull(),
    storedFormat: text("stored_format").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    storageKey: text("storage_key").notNull().unique(),
    ...auditColumns(),
  },
  (table) => [
    check("document_files_original_extension_check", sql`${table.originalExtension} in (${textList(EXTENSIONS)})`),
    check("document_files_stored_format_check", sql`${table.storedFormat} in (${textList(STORED_FORMATS)})`),
    check("document_files_size_bytes_check", sql`${table.sizeBytes} > 0`),
    tenantIsolation(),
  ],
);

/**
 * DOCUMENT_TEMPLATES, technical-specs 06 §6.8. Template Word per kode dokumen, contoh `AKAD-KPR`; `product_id` kosong
 * berarti semua produk. `placeholders` adalah tag hasil deteksi di isi template.
 */
export const documentTemplates = document.table(
  "document_templates",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    documentCode: text("document_code").notNull(),
    productId: uuid("product_id"),
    fileId: uuid("file_id")
      .notNull()
      .references(() => documentFiles.id),
    placeholders: jsonb("placeholders").$type<string[]>().notNull(),
    ...auditColumns(),
  },
  (table) => [
    unique("document_templates_code_product_unique")
      .on(table.tenantId, table.documentCode, table.productId)
      .nullsNotDistinct(),
    tenantIsolation(),
  ],
);

/**
 * DOCUMENT_NUMBER_FORMATS, technical-specs 06 §6.8: pola nomor berversi per jenis dokumen (grooming v3 DN-01, DN-05).
 * `effective_from` diisi saat disetujui; satu versi ACTIVE per tenant dan jenis dokumen.
 */
export const documentNumberFormats = document.table(
  "document_number_formats",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    documentType: text("document_type").$type<DocumentType>().notNull(),
    pattern: text("pattern").notNull(),
    resetPeriod: text("reset_period").$type<ResetPeriod>().notNull(),
    counterScope: text("counter_scope").$type<CounterScope>().notNull(),
    versionNumber: integer("version_number").notNull(),
    status: text("status").$type<NumberFormatStatus>().notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    ...auditColumns(),
  },
  (table) => [
    unique("document_number_formats_version_unique").on(table.tenantId, table.documentType, table.versionNumber),
    uniqueIndex("document_number_formats_active_unique")
      .on(table.tenantId, table.documentType)
      .where(sql`${table.status} = 'ACTIVE'`),
    check("document_number_formats_document_type_check", sql`${table.documentType} in (${textList(DOCUMENT_TYPES)})`),
    check("document_number_formats_reset_period_check", sql`${table.resetPeriod} in (${textList(RESET_PERIODS)})`),
    check("document_number_formats_counter_scope_check", sql`${table.counterScope} in (${textList(COUNTER_SCOPES)})`),
    check("document_number_formats_status_check", sql`${table.status} in (${textList(FORMAT_STATUSES)})`),
    check("document_number_formats_version_number_check", sql`${table.versionNumber} >= 1`),
    check(
      "document_number_formats_effective_from_check",
      sql`${table.status} <> 'ACTIVE' or ${table.effectiveFrom} is not null`,
    ),
    tenantIsolation(),
  ],
);

/**
 * DOCUMENT_NUMBER_COUNTERS, technical-specs 06 §6.8: nomor urut terakhir per format, cakupan, dan periode (DN-04,
 * DN-07). Dinaikkan dengan `UPDATE ... RETURNING` sehingga permintaan bersamaan mendapat nomor berbeda.
 */
export const documentNumberCounters = document.table(
  "document_number_counters",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    formatId: uuid("format_id")
      .notNull()
      .references(() => documentNumberFormats.id),
    scopeKey: text("scope_key").notNull(),
    periodKey: text("period_key").notNull(),
    lastNumber: bigint("last_number", { mode: "number" }).notNull(),
    ...auditColumns(),
  },
  (table) => [
    unique("document_number_counters_key_unique").on(table.formatId, table.scopeKey, table.periodKey),
    check("document_number_counters_last_number_check", sql`${table.lastNumber} >= 0`),
    tenantIsolation(),
  ],
);
