import nodemailer, { type Transporter } from "nodemailer";
import type { SmtpConfig } from "../../../../platform/config/config.js";
import type { EmailMessage, EmailPort } from "../ports/email.port.js";

/** Relay SMTP bank, Mailpit di dev (technical-specs 04 tabel adapter, 11 §11.2). */
export class SmtpEmailAdapter implements EmailPort {
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      ...(config.auth ? { auth: { user: config.auth.user, pass: config.auth.password } } : {}),
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: message.to,
      subject: message.subject,
      text: message.body,
    });
  }
}
