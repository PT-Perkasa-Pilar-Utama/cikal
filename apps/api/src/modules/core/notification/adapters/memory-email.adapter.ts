import type { EmailMessage, EmailPort } from "../ports/email.port.js";

/** Adapter uji: email disimpan di memori agar uji bisa memeriksanya (technical-specs 04 tabel adapter). */
export class MemoryEmailAdapter implements EmailPort {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}
