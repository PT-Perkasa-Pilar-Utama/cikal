import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { paramTypeSchema } from "../masterdata/parameters.schema.js";

/** Tipe nilai variabel untuk validasi nilai kriteria (api-specs 09 §9.2, AC-37.03). */
export const variableDataTypeSchema = z.enum(["NUMBER", "MONEY", "PERCENT", "TEXT", "BOOLEAN", "DATE", "CHOICE"]);
export type VariableDataType = z.infer<typeof variableDataTypeSchema>;

/** Asal nilai variabel (data dictionary FormulaVariable `sourceType`). */
export const variableSourceSchema = z.enum(["APPLICATION", "PRODUCT", "SYSTEM_PARAMETER", "FORMULA"]);
export type VariableSource = z.infer<typeof variableSourceSchema>;

/** Query `GET /formula-variables` (api-specs 09 §9.2). */
export const formulaVariableQuerySchema = z.object({
  usage: z.enum(["SCORING", "FORMULA"]).optional(),
  q: z.string().trim().min(1).optional(),
});
export type FormulaVariableQuery = z.infer<typeof formulaVariableQuerySchema>;

export const formulaVariableSchema = z.object({
  variableCode: z.string(),
  label: z.string(),
  dataType: variableDataTypeSchema,
  paramType: paramTypeSchema.nullable(),
  source: variableSourceSchema,
});
export type FormulaVariable = z.infer<typeof formulaVariableSchema>;

export const formulaVariableListResponseSchema = dataEnvelope(z.array(formulaVariableSchema));
export type FormulaVariableListResponse = z.infer<typeof formulaVariableListResponseSchema>;
