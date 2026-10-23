import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";

/** Daftar ParamType General Parameter (data dictionary, entity GeneralParameter); peka huruf besar dan kecil. */
export const paramTypes = [
  "Application Type",
  "Segment",
  "Product Category",
  "Customer Type",
  "Insurance",
  "Tenor Proposed",
  "Purpose of Loan",
  "Channel",
  "ID Type",
  "Gender",
  "Religion",
  "Nationality",
  "Education",
  "Marital",
  "Status Of Residency",
  "Duration Of Residence",
  "Correspondence Duration",
  "Occupation",
  "Industry Of Profession",
  "Position",
  "Source of Fund",
  "Monthly Income",
  "Monthly Spending",
  "Prenuptial Agreement",
  "Source of Income",
  "Industry of Profession",
  "Pension Instance",
  "Tenure at Current Job",
  "Business Field",
  "Characteristic of Financing",
  "Type of Financing",
  "Category of Financing",
  "Relation of Bank",
  "Type of Usage",
  "Collateral Type",
  "Object Type",
  "BPKB Occupation",
  "Certificate Type",
  "Relation with Applicant",
  "Status Permohonan",
  "Hubungan",
  "Lokasi Usaha",
  "Status Tempat Usaha",
  "Jenis Tempat Usaha",
  "Aspek Pemasaran",
  "Jenis Usaha",
  "Property Type",
  "Appraisal Method",
  "Legal Status",
  "Document",
  "Job Level",
  "Payment Method",
  "Jenis Akad",
] as const;
export const paramTypeSchema = z.enum(paramTypes);
export type ParamType = z.infer<typeof paramTypeSchema>;

/** Query `GET /parameters/{paramType}/options` (api-specs 06 §6.1). */
export const parameterOptionsQuerySchema = z.object({
  includeInactive: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});
export type ParameterOptionsQuery = z.infer<typeof parameterOptionsQuerySchema>;

export const parameterOptionSchema = z.object({
  paramId: z.string(),
  paramValue: z.string(),
  isActive: z.boolean(),
});
export type ParameterOption = z.infer<typeof parameterOptionSchema>;

/** Pilihan dropdown tanpa paging. */
export const parameterOptionsResponseSchema = dataEnvelope(z.array(parameterOptionSchema));
export type ParameterOptionsResponse = z.infer<typeof parameterOptionsResponseSchema>;
