import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { emailTemplates } from "./schema.js";

export interface EmailTemplateRow {
  subject: string;
  body: string;
}

/** Akses tabel `notification.email_templates` (technical-specs 06 §6.8). */
@Injectable()
export class EmailTemplatesRepository {
  /** Template tenant transaksi; `null` bila belum dipasang. */
  async find(tx: Tx, templateCode: string): Promise<EmailTemplateRow | null> {
    const [row] = await tx
      .select({ subject: emailTemplates.subject, body: emailTemplates.body })
      .from(emailTemplates)
      .where(eq(emailTemplates.templateCode, templateCode));
    return row ?? null;
  }
}
