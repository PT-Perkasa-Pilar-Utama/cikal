import { z } from "zod";
import { businessDate, money } from "../common/scalars.js";
import { APPLICATION_DRAFT_MESSAGES } from "./drafts.schema.js";
import { addressInputSchema, mobileNumberField, phoneNumberField } from "./sections.schema.js";

const text = (max: number) => z.string().trim().max(max);
const paramId = text(50);
const regionCode = text(20);

/** Jenis agunan (data dictionary, ApplicationCollateral); KPR otomatis `CERTIFICATE` (AC-46.02). */
export const collateralTypeSchema = z.enum(["VEHICLE", "CERTIFICATE", "PENSION_DECREE"]);
export type CollateralType = z.infer<typeof collateralTypeSchema>;

/**
 * Body section Spouse, tampil bila marital pemohon termasuk parameter `MARRIED_MARITAL_STATUSES` (api-specs 12
 * §12.3, US-43). NIK pasangan disimpan terenkripsi.
 */
export const spouseSectionInputSchema = z.object({
  fullName: text(100).optional(),
  idNumber: z
    .string()
    .trim()
    .regex(/^\d{16}$/, APPLICATION_DRAFT_MESSAGES.idCardNumber)
    .optional(),
  dateOfBirth: businessDate.optional(),
  mobileNumber: mobileNumberField.optional(),
  prenuptialAgreement: paramId.optional(),
  idExpiredDate: z.union([z.literal("SEUMUR HIDUP"), businessDate]).optional(),
  idAddress: addressInputSchema.default({}),
  occupation: paramId.optional(),
  industryOfProfession: paramId.optional(),
  position: text(100).optional(),
  sourceOfFunds: paramId.optional(),
  monthlyIncome: money.optional(),
  monthlySpending: money.optional(),
  company: z
    .object({
      name: text(100).optional(),
      address: text(200).optional(),
      provinceCode: regionCode.optional(),
      cityCode: regionCode.optional(),
      phoneNumber: phoneNumberField.optional(),
    })
    .default({}),
});
export type SpouseSectionInput = z.infer<typeof spouseSectionInputSchema>;

/** Body section Business, tampil bila pekerjaan pemohon wiraswasta (api-specs 12 §12.3, US-45). */
export const businessSectionInputSchema = z.object({
  businessName: text(100).optional(),
  businessField: paramId.optional(),
  phoneNumber: phoneNumberField.optional(),
  email: z.email().max(100).optional(),
  annualSales: money.optional(),
  businessNumber: text(50).optional(),
  businessLaunchDate: businessDate.optional(),
  characteristicOfFinancing: paramId.optional(),
  typeOfFinancing: paramId.optional(),
  typeOfUsage: paramId.optional(),
  categoryOfFinancing: paramId.optional(),
  relationshipWithBank: paramId.optional(),
  address: addressInputSchema.default({}),
});
export type BusinessSectionInput = z.infer<typeof businessSectionInputSchema>;

/**
 * Body section Collateral, tampil untuk kategori `COLLATERAL` dan `PENSION` (api-specs 12 §12.3, US-46). Field
 * wajib mengikuti `collateralType`; nomor sertifikat disimpan terenkripsi.
 */
export const collateralSectionInputSchema = z.object({
  collateralType: collateralTypeSchema.optional(),
  vehicleType: paramId.optional(),
  vehicleBrand: text(50).optional(),
  vehicleModel: text(50).optional(),
  description: text(200).optional(),
  vehicleYear: z.number().int().min(1900).optional(),
  vehiclePrice: money.optional(),
  vehicleColor: text(30).optional(),
  machineNumber: text(50).optional(),
  frameNumber: text(50).optional(),
  bpkbNumber: text(50).optional(),
  bpkbOwnerOccupation: paramId.optional(),
  policeNumber: text(15).optional(),
  certificateType: paramId.optional(),
  certificateNumber: text(50).optional(),
  surfaceArea: z
    .string()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, "Surface area must be a number with at most two decimal digits")
    .optional(),
  decreeNumber: text(50).optional(),
  decreeDate: businessDate.optional(),
  address: addressInputSchema.default({}),
});
export type CollateralSectionInput = z.infer<typeof collateralSectionInputSchema>;
