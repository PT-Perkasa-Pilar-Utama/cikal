import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { businessDate, id, money } from "../common/scalars.js";
import { applicationStatusSchema } from "./application.schema.js";
import { draftApplicationInputSchema, draftPersonalInputSchema, formSectionSchema } from "./drafts.schema.js";

/** Pesan aturan section (api-specs 12 §12.3); angka diisi dari produk dan parameter aktif. */
export const APPLICATION_SECTION_MESSAGES = {
  required: "This field is required",
  mobileNumber: "Mobile number must start with 08 and contain 10 to 13 digits",
  invalidIncome: "Monthly income must be greater than 0",
  occupationNotEligible: "This product is only available for self-employed applicants",
  emergencyContactSameNumber: "Emergency contact number must be different from applicant number",
  insuranceNotAvailable: "Selected insurance is not available",
  limitOutOfRange: (min: string, max: string): string => `Requested limit must be between ${min} and ${max}`,
  tenorOutOfRange: (min: number, max: number): string => `Tenor must be between ${min} and ${max} months`,
  ageOutOfRange: (min: number, max: number): string =>
    `Applicant age must be between ${min} and ${max} years for this product`,
  npwpRequired: (limit: string): string => `NPWP is required for requested limit above ${limit}`,
  ageAtMaturityExceeded: (years: string): string => `Applicant age at maturity must not exceed ${years} years`,
  spouseIdSameAsApplicant: "Spouse ID number must be different from applicant ID number",
  businessLaunchInFuture: "Business launch date must not be in the future",
  businessTooNew: (months: number): string => `Business must have been running for at least ${months} months`,
  vehicleYearInFuture: (year: number): string => `Vehicle year must not be later than ${year}`,
  collateralTypeNotAllowed: "Selected collateral type is not available for this product",
} as const;

/** Section yang bisa disimpan lewat `PUT /applications/{id}/sections/{section}` di rilis POC (api-specs 12 §12.1). */
export const savableSectionSchema = z.enum([
  "application",
  "personal",
  "spouse",
  "occupation",
  "business",
  "collateral",
  "emergency-contact",
]);
export type SavableSection = z.infer<typeof savableSectionSchema>;

const text = (max: number) => z.string().trim().max(max);
const paramId = text(50);
const regionCode = text(20);
/** Format nomor HP dan telepon, dipakai juga section Spouse dan Business. */
export const mobileNumberField = z
  .string()
  .trim()
  .regex(/^08\d{8,11}$/, APPLICATION_SECTION_MESSAGES.mobileNumber);
export const phoneNumberField = z
  .string()
  .trim()
  .regex(/^\+?\d{6,15}$/, "Phone number must contain 6 to 15 digits");

/** Alamat KTP, domisili, atau kontak; kode wilayah dari api-specs 06 §6.3. */
export const addressInputSchema = z.object({
  address: text(200).optional(),
  rt: text(3).optional(),
  rw: text(3).optional(),
  provinceCode: regionCode.optional(),
  cityCode: regionCode.optional(),
  districtCode: regionCode.optional(),
  subDistrictCode: regionCode.optional(),
  zipCode: text(10).optional(),
});
export type AddressInput = z.infer<typeof addressInputSchema>;

/**
 * Field section dikirim apa adanya; field wajib mode strict diperiksa API agar setiap field kosong mendapat
 * pesan "This field is required" (AC-39.02). Format field terisi diperiksa di kedua mode (api-specs 12 §12.1).
 */
export const applicationSectionInputSchema = draftApplicationInputSchema.extend({
  sourceCode: text(50).optional(),
  salesCode: text(50).optional(),
  referralCode: text(50).optional(),
  marketingCode: text(50).optional(),
});
export type ApplicationSectionInput = z.infer<typeof applicationSectionInputSchema>;

export const personalSectionInputSchema = draftPersonalInputSchema.extend({
  placeOfBirth: text(100).optional(),
  dateOfBirth: businessDate.optional(),
  gender: paramId.optional(),
  religion: paramId.optional(),
  nationality: paramId.optional(),
  education: paramId.optional(),
  marital: paramId.optional(),
  motherMaidenName: text(100).optional(),
  idIssuedDate: businessDate.optional(),
  idExpiredDate: z.union([z.literal("SEUMUR HIDUP"), businessDate]).optional(),
  npwpNumber: z
    .string()
    .trim()
    .regex(/^\d{15,16}$/, "NPWP number must be 15 or 16 digits")
    .optional(),
  kkNumber: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "KK number must be 16 digits")
    .optional(),
  mobileNumber: mobileNumberField.optional(),
  phoneNumber: phoneNumberField.optional(),
  email: z.email().max(100).optional(),
  addresses: z
    .object({
      id: addressInputSchema.default({}),
      residence: addressInputSchema.extend({ sameAsId: z.boolean().default(false) }).default({ sameAsId: false }),
    })
    .default({ id: {}, residence: { sameAsId: false } }),
  consentGiven: z.boolean().default(false),
});
export type PersonalSectionInput = z.infer<typeof personalSectionInputSchema>;

export const occupationSectionInputSchema = z.object({
  sourceOfIncome: paramId.optional(),
  occupation: paramId.optional(),
  industryOfProfession: paramId.optional(),
  position: text(100).optional(),
  tenureAtCurrentJob: z
    .string()
    .regex(/^\d{1,3}(\.\d)?$/, "Tenure must be a number with at most one decimal digit")
    .optional(),
  monthlyIncomeAllowance: money.optional(),
  organization: text(100).optional(),
  previousEmployer: text(100).optional(),
  pensionInstance: paramId.optional(),
  company: z
    .object({
      name: text(100).optional(),
      address: text(200).optional(),
      provinceCode: regionCode.optional(),
      cityCode: regionCode.optional(),
      districtCode: regionCode.optional(),
      subDistrictCode: regionCode.optional(),
      zipCode: text(10).optional(),
      phoneNumber: phoneNumberField.optional(),
    })
    .default({}),
});
export type OccupationSectionInput = z.infer<typeof occupationSectionInputSchema>;

export const emergencyContactSectionInputSchema = z.object({
  contactName: text(100).optional(),
  relationToApplicant: paramId.optional(),
  mobileNumber: mobileNumberField.optional(),
  homePhoneNumber: phoneNumberField.optional(),
  altPhoneNumber: phoneNumberField.optional(),
  address: addressInputSchema.default({}),
});
export type EmergencyContactSectionInput = z.infer<typeof emergencyContactSectionInputSchema>;

/** Query `PUT /applications/{id}/sections/{section}`: `strict=true` tombol "Next", `false` "Save as Draft". */
export const sectionSaveQuerySchema = z.object({
  strict: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});
export type SectionSaveQuery = z.infer<typeof sectionSaveQuerySchema>;

/** Respons 200 simpan section; `message` hanya pada `strict=false` (AC-49.03). */
export const sectionSaveResponseSchema = dataEnvelope(
  z.object({
    id,
    loanId: z.string(),
    status: applicationStatusSchema,
    savedSection: savableSectionSchema,
    nextSection: formSectionSchema.nullable(),
    steps: z.array(formSectionSchema),
  }),
);
export type SectionSaveResponse = z.infer<typeof sectionSaveResponseSchema>;
