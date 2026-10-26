import { z } from "zod";
import { dataEnvelope, pageEnvelope } from "../common/envelope.js";
import { id, timestamp } from "../common/scalars.js";

/** Pesan editor model (api-specs 22 §22.3, §22.4); selain AC-37.03 dan AC-37.04 teksnya usulan engineering. */
export const SCORING_MODEL_MESSAGES = {
  valueMustBeNumber: "Value must be a number",
  valueMustBeOption: (label: string) => `Value must be one of the ${label} options`,
  valueRequired: "Value is required",
  operatorNotAllowed: (operator: string, label: string) => `Operator ${operator} cannot be used for ${label}`,
  variableTypeMismatch: (label: string) => `The compared field must have the same type as ${label}`,
  weightOutOfRange: "Weight must be between -1000 and 1000",
  weightRequired: "Weight is required for a weighted criterion",
  unknownVariable: (code: string) => `Unknown field: ${code}`,
  modelCodeExists: "This model code already exists",
  modelWithoutCriteria: "Add at least one criterion",
  cutOffRequired: "Cut Off is required for a scoring model",
} as const;

export const modelGroupSchema = z.enum(["SCORING", "RAC"]);
export type ModelGroup = z.infer<typeof modelGroupSchema>;

/** Status versi model (technical-specs 06 §6.13 data berversi). */
export const scoringModelStatusSchema = z.enum(["DRAFT", "WAITING_APPROVAL", "ACTIVE", "SUPERSEDED"]);
export type ScoringModelStatus = z.infer<typeof scoringModelStatusSchema>;

export const criterionOperatorSchema = z.enum(["EQ", "NE", "GT", "GE", "LT", "LE", "BETWEEN", "IN"]);
export type CriterionOperator = z.infer<typeof criterionOperatorSchema>;

export const criterionTypeSchema = z.enum(["WEIGHTED", "MANDATORY"]);
export type CriterionTypeCode = z.infer<typeof criterionTypeSchema>;

/** Angka skor dan bobot sebagai string desimal; batas dan tipe diperiksa aturan model (AC-37.04). */
const decimal = z
  .string()
  .trim()
  .regex(/^-?\d{1,10}(\.\d{1,2})?$/, "Invalid number format");
/** Angka skor tersimpan, dua desimal. */
const score = z.string().regex(/^-?\d{1,10}\.\d{2}$/);

/**
 * Nilai kriteria (api-specs 22 §22.3): satu nilai, daftar untuk `IN`, rentang untuk `BETWEEN`, atau variabel lain.
 * Nilai literal tetap teks agar tipe yang salah dijawab `INVALID_CRITERION_VALUE` (AC-37.03).
 */
export const criterionValueSchema = z.union([
  z.object({ type: z.literal("LITERAL"), value: z.string() }),
  z.object({ type: z.literal("LITERAL"), values: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("LITERAL"), from: z.string(), to: z.string() }),
  z.object({ type: z.literal("VARIABLE"), variableCode: z.string() }),
]);
export type CriterionValueInput = z.infer<typeof criterionValueSchema>;

/** Body `POST` dan `PUT /scoring-models/{id}/criteria` (api-specs 22 §22.3). */
export const criterionInputSchema = z.object({
  fieldCode: z.string().trim().min(1),
  operator: criterionOperatorSchema,
  value: criterionValueSchema,
  criterionType: criterionTypeSchema,
  weight: decimal.nullable().optional(),
});
export type CriterionInput = z.infer<typeof criterionInputSchema>;

export const criterionSchema = z.object({
  id,
  fieldCode: z.string(),
  operator: criterionOperatorSchema,
  value: criterionValueSchema,
  weight: score.nullable(),
  criterionType: criterionTypeSchema,
  /** Teks server, contoh "Occupation is one of ASN, Karyawan BUMN : +50" (AC-37.01). */
  displayText: z.string(),
});
export type ScoringCriterion = z.infer<typeof criterionSchema>;

export const criterionResponseSchema = dataEnvelope(criterionSchema);
export type CriterionResponse = z.infer<typeof criterionResponseSchema>;

const header = {
  modelName: z.string().trim().min(1).max(100),
  modelGroup: modelGroupSchema,
  constant: decimal.nullable().optional(),
  cutOff: decimal.nullable().optional(),
  reviewLowerBound: decimal.nullable().optional(),
  productIds: z.array(id).default([]),
};

/** Body `POST /scoring-models`: model baru versi 1 `DRAFT` (api-specs 22 §22.3). */
export const scoringModelCreateSchema = z.object({
  modelCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{1,20}$/, "Model code must be 1 to 20 letters, digits, or hyphens"),
  ...header,
});
export type ScoringModelCreate = z.infer<typeof scoringModelCreateSchema>;

/** Body `PUT /scoring-models/{id}`: header draft tanpa `modelCode`. */
export const scoringModelUpdateSchema = z.object(header);
export type ScoringModelUpdate = z.infer<typeof scoringModelUpdateSchema>;

/** Body `POST /scoring-models/{id}/submit` (api-specs 22 §22.4). */
export const scoringModelSubmitSchema = z.object({ effectiveFrom: timestamp.optional() });
export type ScoringModelSubmit = z.infer<typeof scoringModelSubmitSchema>;

const statusList = z
  .string()
  .transform((value) => value.split(",").map((part) => part.trim()))
  .pipe(z.array(scoringModelStatusSchema).min(1));

/** Query `GET /scoring-models` (api-specs 22 §22.1). */
export const scoringModelListQuerySchema = z.object({
  modelGroup: modelGroupSchema.optional(),
  productId: id.optional(),
  status: statusList.default(["ACTIVE", "DRAFT", "WAITING_APPROVAL"]),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["modelCode,asc", "modelCode,desc"]).default("modelCode,asc"),
});
export type ScoringModelListQuery = z.infer<typeof scoringModelListQuerySchema>;

const modelFields = {
  id,
  modelCode: z.string(),
  modelName: z.string(),
  modelGroup: modelGroupSchema,
  versionNumber: z.int().min(1),
  status: scoringModelStatusSchema,
  constant: score.nullable(),
  cutOff: score.nullable(),
  reviewLowerBound: score.nullable(),
};

export const scoringModelListItemSchema = z.object({
  ...modelFields,
  products: z.array(z.object({ id, productCode: z.string() })),
  criteriaCount: z.int().min(0),
});
export type ScoringModelListItem = z.infer<typeof scoringModelListItemSchema>;

export const scoringModelListResponseSchema = pageEnvelope(scoringModelListItemSchema);
export type ScoringModelListResponse = z.infer<typeof scoringModelListResponseSchema>;

export const scoringModelDetailSchema = z.object({
  ...modelFields,
  effectiveFrom: timestamp.nullable(),
  productIds: z.array(id),
  criteria: z.array(criterionSchema),
});
export type ScoringModelDetail = z.infer<typeof scoringModelDetailSchema>;

export const scoringModelDetailResponseSchema = dataEnvelope(scoringModelDetailSchema);
export type ScoringModelDetailResponse = z.infer<typeof scoringModelDetailResponseSchema>;

/** `newData` ChangeRequest `SCORING_MODEL`: versi yang diajukan beserta kriterianya untuk halaman Pending. */
export const scoringModelChangeDataSchema = z.object({
  modelId: id,
  modelCode: z.string(),
  modelName: z.string(),
  modelGroup: modelGroupSchema,
  versionNumber: z.int().min(1),
  effectiveFrom: timestamp.nullable(),
  constant: score.nullable(),
  cutOff: score.nullable(),
  reviewLowerBound: score.nullable(),
  productIds: z.array(id),
  criteria: z.array(z.string()),
});
export type ScoringModelChangeData = z.infer<typeof scoringModelChangeDataSchema>;
