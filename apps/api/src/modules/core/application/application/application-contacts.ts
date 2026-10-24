import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ApplicationPersonalsRepository } from "../db/application-personals.repository.js";

/** Kontak pemohon untuk modul lain, contoh email konfirmasi Notification (technical-specs 05 §5.8). */
@Injectable()
export class ApplicationContacts {
  constructor(private readonly personals: ApplicationPersonalsRepository) {}

  /** Email pemohon di section Personal; `null` bila kosong atau pengajuan tidak ada di tenant transaksi. */
  async applicantEmail(tx: Tx, applicationId: string): Promise<string | null> {
    const personal = await this.personals.findByApplication(tx, applicationId);
    return personal?.email ?? null;
  }
}
