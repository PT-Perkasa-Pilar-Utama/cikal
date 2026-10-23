import { z } from "zod";
import { dataEnvelope, pageEnvelope, pageQuerySchema } from "../common/envelope.js";
import { id, money, timestamp } from "../common/scalars.js";
import { productCategorySchema } from "../product/products.schema.js";
import { applicationStatusSchema } from "./application.schema.js";

/** Pesan draft pengajuan (api-specs 12 §12.2). */
export const APPLICATION_DRAFT_MESSAGES = {
  draftMinimumFields:
    "Fill in Application Type, Identity Type, Identity Number, Product Category, Product, Full Name, and Full Name ID to save a draft",
  productNotAvailable: "Selected product is not available",
  idCardNumber: "ID card number must be 16 digits",
} as const;

/** Pesan sukses "Save as Draft" (AC-49.01, AC-49.03). */
export const draftSavedMessage = (loanId: string): string => `Application saved as draft. Loan ID: ${loanId}`;

/** Section form pengajuan dalam urutan tampil (api-specs 12 §12.1). */
export const formSectionSchema = z.enum([
  "application",
  "personal",
  "spouse",
  "occupation",
  "business",
  "collateral",
  "documents",
  "emergency-contact",
]);
export type FormSection = z.infer<typeof formSectionSchema>;

const paramId = z.string().trim().max(50);
const name = z.string().trim().max(100);

/**
 * Field step Application dan Personal yang dikirim saat draft pertama. Semua opsional di skema: tujuh field
 * minimum yang kosong dijawab `422 DRAFT_MINIMUM_FIELDS` oleh API, bukan `400` (AC-49.02).
 */
export const draftApplicationInputSchema = z.object({
  applicationType: paramId.optional(),
  productCategory: productCategorySchema.optional(),
  productId: id.optional(),
  segment: paramId.optional(),
  purposeOfLoan: paramId.optional(),
  tenorProposed: z.number().int().positive().optional(),
  requestedLimit: money.optional(),
  insuranceId: id.optional(),
});

export const draftPersonalInputSchema = z.object({
  idType: z.enum(["KTP"]).optional(),
  idCardNumber: z
    .string()
    .trim()
    .regex(/^(\d{16})?$/, APPLICATION_DRAFT_MESSAGES.idCardNumber)
    .optional(),
  fullName: name.optional(),
  fullNameId: name.optional(),
});

/** Body `POST /applications` (api-specs 12 §12.2). */
export const applicationDraftCreateRequestSchema = z.object({
  application: draftApplicationInputSchema.default({}),
  personal: draftPersonalInputSchema.default({}),
  strict: z.boolean().default(false),
});
export type ApplicationDraftCreateRequest = z.infer<typeof applicationDraftCreateRequestSchema>;

/** Respons 201 `POST /applications`. */
export const applicationDraftResponseSchema = dataEnvelope(
  z.object({
    id,
    loanId: z.string(),
    status: applicationStatusSchema,
    currentSection: formSectionSchema,
    steps: z.array(formSectionSchema),
  }),
);
export type ApplicationDraftResponse = z.infer<typeof applicationDraftResponseSchema>;

/** Query `GET /applications/drafts` (api-specs 12 §12.4): `q` mencari Loan ID atau nama. */
export const applicationDraftListQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(["updatedAt,asc", "updatedAt,desc"]).default("updatedAt,desc"),
});
export type ApplicationDraftListQuery = z.infer<typeof applicationDraftListQuerySchema>;

export const applicationDraftListItemSchema = z.object({
  id,
  loanId: z.string(),
  fullName: z.string(),
  productCode: z.string(),
  requestedLimit: money.nullable(),
  currentSection: formSectionSchema,
  returnNote: z.string().nullable(),
  updatedAt: timestamp,
});

export const applicationDraftListResponseSchema = pageEnvelope(applicationDraftListItemSchema);
export type ApplicationDraftListResponse = z.infer<typeof applicationDraftListResponseSchema>;

const applicationSectionSchema = z.object({
  applicationType: z.string().nullable(),
  productCategory: productCategorySchema,
  productId: id,
  segment: z.string().nullable(),
  purposeOfLoan: z.string().nullable(),
  tenorProposed: z.number().int().nullable(),
  requestedLimit: money.nullable(),
  insuranceId: id.nullable(),
});

const personalSectionSchema = z.object({
  idType: z.enum(["KTP"]),
  idCardNumber: z.string(),
  fullName: z.string(),
  fullNameId: z.string(),
});

/**
 * Respons `GET /applications/{id}/form` (api-specs 12 §12.5). Section yang belum disimpan bernilai `null`; isi
 * section Occupation dan Emergency Contact ditambah kartu BE-S3-02. `documentCompleteness` bernilai `null` selama
 * checklist belum bisa dicocokkan dari pekerjaan dan status kawin; jumlahnya diisi kartu BE-S3-03.
 */
export const applicationFormResponseSchema = dataEnvelope(
  z.object({
    id,
    loanId: z.string(),
    status: applicationStatusSchema,
    currentSection: formSectionSchema,
    steps: z.array(formSectionSchema),
    sections: z.object({
      application: applicationSectionSchema,
      personal: personalSectionSchema,
      occupation: z.null(),
      "emergency-contact": z.null(),
    }),
    documentCompleteness: z
      .object({ uploadedMandatory: z.number().int().min(0), requiredMandatory: z.number().int().min(0) })
      .nullable(),
    returnNote: z.string().nullable(),
  }),
);
export type ApplicationFormResponse = z.infer<typeof applicationFormResponseSchema>;
