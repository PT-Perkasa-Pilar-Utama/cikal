import { Inject, Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { EmailTemplatesRepository } from "../db/email-templates.repository.js";
import { NotificationLogsRepository } from "../db/notification-logs.repository.js";
import type { NotificationStatus } from "../db/schema.js";
import { renderTemplate } from "../domain/email-template.js";
import { EMAIL_PORT, type EmailPort } from "../ports/email.port.js";

/** Riwayat email tanpa alamat penerima (TRM_NTF_006). */
const SKIPPED_NO_EMAIL = "Notification skipped - no email";

/** Satu email dari satu event outbox. */
export interface EmailRequest {
  eventId: string;
  templateCode: string;
  applicationId: string | null;
  /** `null` atau kosong: dicatat `SKIPPED`. */
  recipient: string | null;
  values: Readonly<Record<string, string>>;
}

/**
 * `send(templateCode, recipient, data)` Notification (technical-specs 05 §5.8). Setiap email dicatat `SENT`, `FAILED`,
 * atau `SKIPPED`; gagal kirim hanya dicatat sehingga proses pengajuan tidak berhenti. Event yang sudah dicatat
 * tidak dikirim lagi (handler idempotent, technical-specs 05 §5.0.1).
 */
@Injectable()
export class Notifications {
  constructor(
    private readonly templates: EmailTemplatesRepository,
    private readonly logs: NotificationLogsRepository,
    @Inject(EMAIL_PORT) private readonly email: EmailPort,
  ) {}

  async send(tx: Tx, tenantId: string, request: EmailRequest): Promise<void> {
    if (await this.logs.exists(tx, request.eventId, request.templateCode)) return;
    const log = (status: NotificationStatus, errorMessage: string | null) =>
      this.logs.insert(tx, {
        id: uuidv7(),
        tenantId,
        eventId: request.eventId,
        applicationId: request.applicationId,
        templateCode: request.templateCode,
        recipient: request.recipient ?? "",
        status,
        sentAt: status === "SENT" ? new Date() : null,
        errorMessage,
      });
    if (!request.recipient) return log("SKIPPED", SKIPPED_NO_EMAIL);
    const template = await this.templates.find(tx, request.templateCode);
    if (!template) return log("FAILED", `Email template ${request.templateCode} is not configured`);
    try {
      await this.email.send({
        to: request.recipient,
        subject: renderTemplate(template.subject, request.values),
        body: renderTemplate(template.body, request.values),
      });
    } catch (error) {
      return log("FAILED", error instanceof Error ? error.message : String(error));
    }
    return log("SENT", null);
  }
}
