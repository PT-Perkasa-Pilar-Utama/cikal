import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../tenancy/index.js";
import { emailTemplates } from "../db/schema.js";

/** ID tetap template seed company 001. */
export const seedEmailTemplateIds = {
  appReceived: "0192b6aa-0001-7000-8000-000000000001",
  appDisbursed: "0192b6aa-0002-7000-8000-000000000001",
} as const;

/** Template email nasabah company 001 (api-specs 18 §18.1); subjek mengikuti AC-50.05 dan AC-101.01. */
export async function seedEmailTemplates(db: NodePgDatabase): Promise<void> {
  await db
    .insert(emailTemplates)
    .values([
      {
        id: seedEmailTemplateIds.appReceived,
        tenantId: seedCompanyIds.company001,
        templateCode: "APP_RECEIVED",
        subject: "Pengajuan kredit {{loanId}} telah kami terima",
        body:
          "Terima kasih, pengajuan kredit Anda dengan nomor {{loanId}} telah kami terima dan sedang diproses. " +
          "Kami akan menghubungi Anda bila membutuhkan data tambahan.",
      },
      {
        id: seedEmailTemplateIds.appDisbursed,
        tenantId: seedCompanyIds.company001,
        templateCode: "APP_DISBURSED",
        subject: "Kredit {{loanId}} telah dicairkan",
        body: "Kredit Anda dengan nomor {{loanId}} telah dicairkan. Terima kasih atas kepercayaan Anda.",
      },
    ])
    .onConflictDoNothing();
}
