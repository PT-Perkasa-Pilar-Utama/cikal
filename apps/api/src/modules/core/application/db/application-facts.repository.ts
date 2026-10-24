import { Injectable } from "@nestjs/common";
import { and, count, eq, gte, ne, type SQL, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationAddresses, applicationOccupations, applicationPersonals, applications } from "./schema.js";

/** Data pengajuan yang dinilai modul langkah, contoh variabel kriteria RAC dan Scoring (api-specs 09 §9.2). */
export interface ApplicationFactsRow {
  applicationId: string;
  productId: string;
  requestedLimit: string | null;
  tenorProposed: number | null;
  purposeOfLoan: string | null;
  clientIpAddress: string | null;
  fullNameId: string | null;
  dateOfBirth: string | null;
  marital: string | null;
  education: string | null;
  /** Provinsi alamat KTP, dibandingkan dengan lokasi IP oleh Fraud (TRM_FRD_005). */
  idProvinceCode: string | null;
  occupation: string | null;
  monthlyIncomeAllowance: string | null;
  tenureAtCurrentJob: string | null;
}

/** Dimensi FraudVelocityRule yang punya data di pengajuan (technical-specs 06 §6.11 M08). */
export type SubmissionKey =
  | { dimension: "FULL_NAME"; fullNameId: string }
  | { dimension: "ID_CARD_NUMBER"; nikBlindIndex: Buffer }
  | { dimension: "IP_ADDRESS"; clientIpAddress: string };

function keyCondition(key: SubmissionKey): SQL {
  if (key.dimension === "FULL_NAME") {
    return sql`upper(trim(${applicationPersonals.fullNameId})) = upper(trim(${key.fullNameId}))`;
  }
  if (key.dimension === "ID_CARD_NUMBER") return eq(applicationPersonals.idCardNumberBidx, key.nikBlindIndex);
  return sql`${applications.clientIpAddress} = ${key.clientIpAddress}::inet`;
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
        clientIpAddress: applications.clientIpAddress,
        fullNameId: applicationPersonals.fullNameId,
        dateOfBirth: applicationPersonals.dateOfBirth,
        marital: applicationPersonals.marital,
        education: applicationPersonals.education,
        idProvinceCode: applicationAddresses.provinceCode,
        occupation: applicationOccupations.occupation,
        monthlyIncomeAllowance: applicationOccupations.monthlyIncomeAllowance,
        tenureAtCurrentJob: applicationOccupations.tenureAtCurrentJob,
      })
      .from(applications)
      .leftJoin(applicationPersonals, eq(applicationPersonals.applicationId, applications.id))
      .leftJoin(
        applicationAddresses,
        and(eq(applicationAddresses.applicationId, applications.id), eq(applicationAddresses.addressType, "ID")),
      )
      .leftJoin(applicationOccupations, eq(applicationOccupations.applicationId, applications.id))
      .where(eq(applications.id, applicationId));
    return row ?? null;
  }

  /** Jumlah pengajuan yang sudah disubmit sejak `since` dengan kunci yang sama, termasuk pengajuan pemanggil. */
  async countSubmitted(tx: Tx, key: SubmissionKey, since: Date): Promise<number> {
    const [row] = await tx
      .select({ total: count() })
      .from(applications)
      .innerJoin(applicationPersonals, eq(applicationPersonals.applicationId, applications.id))
      .where(and(ne(applications.status, "DRAFT"), gte(applications.submittedAt, since), keyCondition(key)));
    return row?.total ?? 0;
  }
}
