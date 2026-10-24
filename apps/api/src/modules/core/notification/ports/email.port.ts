/** Satu email teks ke satu penerima. */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

/** Seam pengiriman email (technical-specs 05 §5.8): SMTP, Mailpit di dev, adapter memori di uji. */
export interface EmailPort {
  /** Gagal kirim dilempar sebagai error; penerima mencatatnya `FAILED`. */
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_PORT = Symbol("EMAIL_PORT");
