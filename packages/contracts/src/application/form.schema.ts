import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { businessDate, id, money, timestamp } from "../common/scalars.js";
import { productCategorySchema } from "../product/products.schema.js";
import { applicationStatusSchema } from "./application.schema.js";
import { documentCompletenessSchema } from "./documents.schema.js";
import { formSectionSchema } from "./drafts.schema.js";

const nullableText = z.string().nullable();

export const addressSchema = z.object({
  address: nullableText,
  rt: nullableText,
  rw: nullableText,
  provinceCode: nullableText,
  cityCode: nullableText,
  districtCode: nullableText,
  subDistrictCode: nullableText,
  zipCode: nullableText,
});
export type Address = z.infer<typeof addressSchema>;

const applicationSectionSchema = z.object({
  applicationType: nullableText,
  productCategory: productCategorySchema,
  productId: id,
  segment: nullableText,
  purposeOfLoan: nullableText,
  tenorProposed: z.number().int().nullable(),
  requestedLimit: money.nullable(),
  insuranceId: id.nullable(),
  sourceCode: nullableText,
  salesCode: nullableText,
  referralCode: nullableText,
  marketingCode: nullableText,
});

const personalSectionSchema = z.object({
  idType: z.enum(["KTP"]),
  idCardNumber: z.string(),
  fullName: z.string(),
  fullNameId: z.string(),
  placeOfBirth: nullableText,
  dateOfBirth: businessDate.nullable(),
  gender: nullableText,
  religion: nullableText,
  nationality: nullableText,
  education: nullableText,
  marital: nullableText,
  motherMaidenName: nullableText,
  idIssuedDate: businessDate.nullable(),
  idExpiredDate: nullableText,
  npwpNumber: nullableText,
  kkNumber: nullableText,
  mobileNumber: nullableText,
  phoneNumber: nullableText,
  email: nullableText,
  addresses: z.object({
    id: addressSchema.nullable(),
    residence: addressSchema.extend({ sameAsId: z.boolean() }).nullable(),
  }),
  consentAt: timestamp.nullable(),
});

const occupationSectionSchema = z.object({
  sourceOfIncome: nullableText,
  occupation: nullableText,
  industryOfProfession: nullableText,
  position: nullableText,
  tenureAtCurrentJob: nullableText,
  monthlyIncomeAllowance: money.nullable(),
  organization: nullableText,
  previousEmployer: nullableText,
  pensionInstance: nullableText,
  company: z.object({
    name: nullableText,
    address: nullableText,
    provinceCode: nullableText,
    cityCode: nullableText,
    districtCode: nullableText,
    subDistrictCode: nullableText,
    zipCode: nullableText,
    phoneNumber: nullableText,
  }),
});

const emergencyContactSectionSchema = z.object({
  contactName: nullableText,
  relationToApplicant: nullableText,
  mobileNumber: nullableText,
  homePhoneNumber: nullableText,
  altPhoneNumber: nullableText,
  address: addressSchema,
});

/** Isi section form yang tersimpan; dipakai form draft dan detail pengajuan (api-specs 12 §12.5, §12.9). */
export const applicationFormSectionsSchema = z.object({
  application: applicationSectionSchema,
  personal: personalSectionSchema,
  occupation: occupationSectionSchema.nullable(),
  "emergency-contact": emergencyContactSectionSchema.nullable(),
});

/**
 * Respons `GET /applications/{id}/form` (api-specs 12 §12.5). Section yang belum disimpan bernilai `null`.
 * `documentCompleteness` bernilai `null` selama checklist belum bisa dicocokkan dari pekerjaan dan status kawin.
 */
export const applicationFormResponseSchema = dataEnvelope(
  z.object({
    id,
    loanId: z.string(),
    status: applicationStatusSchema,
    currentSection: formSectionSchema,
    steps: z.array(formSectionSchema),
    sections: applicationFormSectionsSchema,
    documentCompleteness: documentCompletenessSchema.nullable(),
    returnNote: z.string().nullable(),
  }),
);
export type ApplicationFormResponse = z.infer<typeof applicationFormResponseSchema>;
export type ApplicationFormSections = z.infer<typeof applicationFormSectionsSchema>;
