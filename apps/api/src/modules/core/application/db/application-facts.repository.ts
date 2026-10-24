import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationOccupations, applicationPersonals, applications } from "./schema.js";

/** Data pengajuan yang dinilai modul langkah, contoh variabel kriteria RAC dan Scoring (api-specs 09 §9.2). */
export interface ApplicationFactsRow {
  applicationId: string;
  productId: string;
  requestedLimit: string | null;
  tenorProposed: number | null;
  purposeOfLoan: string | null;
  dateOfBirth: string | null;
  marital: string | null;
  education: string | null;
  occupation: string | null;
  monthlyIncomeAllowance: string | null;
  tenureAtCurrentJob: string | null;
}

/** Bacaan gabungan `application`, `application_personals`, dan `application_occupations` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationFactsRepository {
  async find(tx: Tx, applicationId: string): Promise<ApplicationFactsRow | null> {
    const [row] = await tx
      .select({
        applicationId: applications.id,
        productId: applications.productId,
        requestedLimit: applications.requestedLimit,
        tenorProposed: applications.tenorProposed,
        purposeOfLoan: applications.purposeOfLoan,
        dateOfBirth: applicationPersonals.dateOfBirth,
        marital: applicationPersonals.marital,
        education: applicationPersonals.education,
        occupation: applicationOccupations.occupation,
        monthlyIncomeAllowance: applicationOccupations.monthlyIncomeAllowance,
        tenureAtCurrentJob: applicationOccupations.tenureAtCurrentJob,
      })
      .from(applications)
      .leftJoin(applicationPersonals, eq(applicationPersonals.applicationId, applications.id))
      .leftJoin(applicationOccupations, eq(applicationOccupations.applicationId, applications.id))
      .where(eq(applications.id, applicationId));
    return row ?? null;
  }
}
