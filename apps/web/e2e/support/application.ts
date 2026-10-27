import {
  type ApplicationSectionInput,
  applicationDraftResponseSchema,
  applicationSubmitResponseSchema,
  documentUploadResponseSchema,
  type EmergencyContactSectionInput,
  type OccupationSectionInput,
  type PersonalSectionInput,
  processTimelineResponseSchema,
  type SavableSection,
  sectionSaveResponseSchema,
} from "@cikal/contracts";
import { type APIRequestContext, request } from "@playwright/test";
import { z } from "zod";
import { ApiSession } from "./api-session";

/** Kode General Parameter seed `dev` (masterdata `general-parameters.ts`). */
export const KARYAWAN_SWASTA = "001";
export const BELUM_KAWIN = "001";
export const KAWIN = "002";

/** Tujuh dokumen wajib contoh AC-25.01 dan AC-47.01, sebagai `documentType` slot. */
export const SEVEN_DOCUMENTS = ["KTP", "KK", "NPWP", "SLIP_GAJI", "REKENING_KORAN", "SERTIFIKAT", "KTP_PASANGAN"];

const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

const applicationSection = (productId: string): ApplicationSectionInput => ({
  applicationType: "NTB",
  productCategory: "NON_COLLATERAL",
  productId,
  segment: "MIKRO",
  tenorProposed: 36,
  requestedLimit: "20000000.00",
});

/** Identitas pemohon; pemohon lain dipakai bila nama yang sama melewati aturan velocity Fraud dalam satu hari. */
export interface Applicant {
  fullName: string;
  idCardNumber: string;
}

const RUDI: Applicant = { fullName: "Rudi Hartono", idCardNumber: "3273011402900001" };

const personalSection = (marital: string, email: string, applicant: Applicant): PersonalSectionInput => ({
  fullName: applicant.fullName,
  fullNameId: applicant.fullName.toUpperCase(),
  placeOfBirth: "Bandung",
  dateOfBirth: "1990-02-14",
  gender: "L",
  religion: "ISLAM",
  nationality: "WNI",
  education: "S1",
  marital,
  motherMaidenName: "Siti",
  idType: "KTP",
  idCardNumber: applicant.idCardNumber,
  mobileNumber: "081298765432",
  email,
  addresses: { id: { address: "Jl. Merdeka No. 10" }, residence: { sameAsId: true } },
  consentGiven: true,
});

const occupationSection: OccupationSectionInput = {
  sourceOfIncome: "001",
  occupation: KARYAWAN_SWASTA,
  industryOfProfession: "001",
  tenureAtCurrentJob: "4",
  monthlyIncomeAllowance: "8000000.00",
  company: {
    name: "PT Maju Jaya",
    address: "Jl. Sudirman No. 1",
    provinceCode: "31",
    cityCode: "3171",
    districtCode: "317101",
    subDistrictCode: "3171011001",
    zipCode: "10110",
    phoneNumber: "0215551234",
  },
};

const emergencyContactSection: EmergencyContactSectionInput = {
  contactName: "Dewi",
  relationToApplicant: "002",
  mobileNumber: "081234567890",
  address: { address: "Jl. Melati No. 5" },
};

interface DraftOptions {
  marital?: string;
  email?: string;
  /** Section yang disimpan dengan "Next" setelah step Application, berurutan. */
  next?: SavableSection[];
  /** Section terakhir yang disimpan dengan "Save as Draft", sehingga draft dibuka di step itu. */
  draft?: SavableSection;
  documents?: readonly string[];
  applicant?: Applicant;
}

/**
 * Draft milik `sales.jkt01` yang disiapkan lewat API (api-specs 12 §12.2, §12.3, §12.7): step Application disimpan
 * dengan "Next", lalu section `next` berurutan, `draft` dengan "Save as Draft", dan `documents` diunggah.
 */
export async function salesDraft(
  productId: string,
  options: DraftOptions = {},
): Promise<{ id: string; loanId: string }> {
  const marital = options.marital ?? BELUM_KAWIN;
  const applicant = options.applicant ?? RUDI;
  const bodies: Record<SavableSection, object> = {
    application: applicationSection(productId),
    personal: personalSection(marital, options.email ?? "rudi@contoh.com", applicant),
    occupation: occupationSection,
    "emergency-contact": emergencyContactSection,
  };
  return ApiSession.as("sales.jkt01", async (sales) => {
    const created = await sales.post(applicationDraftResponseSchema, "/api/v1/applications", {
      application: bodies.application,
      personal: {
        idType: "KTP",
        idCardNumber: applicant.idCardNumber,
        fullName: applicant.fullName,
        fullNameId: applicant.fullName.toUpperCase(),
      },
      strict: true,
    });
    const { id, loanId } = created.data;
    const save = (section: SavableSection, strict: boolean) =>
      sales.put(
        sectionSaveResponseSchema,
        `/api/v1/applications/${id}/sections/${section}?strict=${strict}`,
        bodies[section],
      );
    for (const section of options.next ?? []) await save(section, true);
    if (options.draft) await save(options.draft, false);
    for (const documentType of options.documents ?? []) {
      await sales.putFile(documentUploadResponseSchema, `/api/v1/applications/${id}/documents/${documentType}`, {
        name: `${documentType.toLowerCase()}.pdf`,
        mimeType: "application/pdf",
        buffer: PDF,
      });
    }
    return { id, loanId };
  });
}

/** Submit draft lengkap oleh `sales.jkt01` lewat API (api-specs 12 §12.8). */
export async function submitApplication(applicationId: string): Promise<void> {
  await ApiSession.as("sales.jkt01", (sales) =>
    sales.post(
      applicationSubmitResponseSchema,
      `/api/v1/applications/${applicationId}/submit`,
      {},
      { "Idempotency-Key": crypto.randomUUID() },
    ),
  );
}

/** Timeline proses terbaru pengajuan (api-specs 13 §13.2), dibaca Sales lewat hak APP-INQUIRY View. */
export function processTimeline(applicationId: string) {
  return ApiSession.as("sales.jkt01", (sales) =>
    sales.get(processTimelineResponseSchema, `/api/v1/applications/${applicationId}/process`),
  );
}

const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025";
const mailpitSearchSchema = z.object({
  messages: z.array(z.object({ Subject: z.string(), To: z.array(z.object({ Address: z.string() })) })),
});

async function withMailpit<T>(work: (mailpit: APIRequestContext) => Promise<T>): Promise<T> {
  const mailpit = await request.newContext({ baseURL: MAILPIT_URL });
  try {
    return await work(mailpit);
  } finally {
    await mailpit.dispose();
  }
}

const bySubject = (subject: string) => ({ query: `subject:"${subject}"` });

/** Penerima email di Mailpit (penampung email dev, port 8025) yang subjeknya `subject`. */
export function mailRecipients(subject: string): Promise<string[]> {
  return withMailpit(async (mailpit) => {
    const response = await mailpit.get("/api/v1/search", { params: bySubject(subject) });
    if (!response.ok()) throw new Error(`Mailpit search failed with ${response.status()}`);
    const { messages } = mailpitSearchSchema.parse(await response.json());
    return messages.flatMap((message) => message.To.map((to) => to.Address));
  });
}

/**
 * Hapus email bersubjek `subject` dari run sebelumnya: reset database mengulang counter Loan ID, tetapi Mailpit
 * tetap menyimpan emailnya.
 */
export function clearMail(subject: string): Promise<void> {
  return withMailpit(async (mailpit) => {
    const response = await mailpit.delete("/api/v1/search", { params: bySubject(subject) });
    if (!response.ok()) throw new Error(`Mailpit delete failed with ${response.status()}`);
  });
}
