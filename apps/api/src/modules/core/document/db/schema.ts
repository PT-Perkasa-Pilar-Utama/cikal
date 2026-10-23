import { sql } from "drizzle-orm";
import { bigint, check, pgSchema, text, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { companies } from "../../tenancy/index.js";

export const document = pgSchema("document");

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai ditulis ulang dari `domain/upload-rules.ts`.
const EXTENSIONS = ["png", "jpg", "jpeg", "pdf", "docx"] as const;
const textList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

/**
 * DOCUMENT_FILES, technical-specs 06 §6.8. Semua unggahan disimpan sebagai PDF (DC-02); `size_bytes` adalah ukuran
 * berkas yang diunggah user. Objek di `storage_key` tidak memuat nama file asli (technical-specs 07 §7.7).
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
    check("document_files_stored_format_check", sql`${table.storedFormat} = 'PDF'`),
    check("document_files_size_bytes_check", sql`${table.sizeBytes} > 0`),
    tenantIsolation(),
  ],
);
