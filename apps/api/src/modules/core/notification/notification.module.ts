import { Module } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../../../platform/config/config.js";
import { ApplicationModule } from "../application/index.js";
import { MemoryEmailAdapter } from "./adapters/memory-email.adapter.js";
import { SmtpEmailAdapter } from "./adapters/smtp-email.adapter.js";
import { ApplicationEmails } from "./application/application-emails.js";
import { Notifications } from "./application/notifications.js";
import { EmailTemplatesRepository } from "./db/email-templates.repository.js";
import { NotificationLogsRepository } from "./db/notification-logs.repository.js";
import { EMAIL_PORT, type EmailPort } from "./ports/email.port.js";

/** SMTP bila dikonfigurasi; konfigurasi uji tanpa SMTP memakai adapter memori (technical-specs 04 tabel adapter). */
function emailAdapter(config: AppConfig): EmailPort {
  return config.smtp ? new SmtpEmailAdapter(config.smtp) : new MemoryEmailAdapter();
}

/** Notification: email lewat EmailPort dari event outbox (technical-specs 05 §5.8). */
@Module({
  imports: [ApplicationModule],
  providers: [
    { provide: EMAIL_PORT, inject: [APP_CONFIG], useFactory: emailAdapter },
    EmailTemplatesRepository,
    NotificationLogsRepository,
    Notifications,
    ApplicationEmails,
  ],
})
export class NotificationModule {}
