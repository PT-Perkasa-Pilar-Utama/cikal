import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { companies } from "../db/schema.js";

/** ID tetap company seed agar seed modul lain bisa merujuknya lewat `index.ts` tenancy. */
export const seedCompanyIds = { company001: "0192b6a0-0001-7000-8000-000000000001" } as const;

/** Company 001 untuk seed `dev` dan `qa` (TL-S1-02). */
export async function seedCompanies(db: NodePgDatabase): Promise<void> {
  await db
    .insert(companies)
    .values({
      id: seedCompanyIds.company001,
      companyCode: "001",
      companyName: "Bank Contoh",
      platformCode: "01",
      address: "Jl. Jenderal Sudirman Kav. 1, Jakarta Pusat",
    })
    .onConflictDoNothing();
}
