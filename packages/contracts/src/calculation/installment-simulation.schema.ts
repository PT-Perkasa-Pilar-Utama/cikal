import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { businessDate, id, money, percent } from "../common/scalars.js";
import { interestTypeSchema } from "../product/products.schema.js";

/** Pesan validasi simulasi angsuran; "Tenor is required" dari AC-51.03. */
export const INSTALLMENT_SIMULATION_MESSAGES = {
  required: "This field is required",
  tenorRequired: "Tenor is required",
  tenorInvalid: "Tenor must be a whole number of at least 1 month",
  principalInvalid: "Principal must be greater than 0",
} as const;

const required = { error: INSTALLMENT_SIMULATION_MESSAGES.required };
const isPositive = (value: string): boolean => !value.startsWith("-") && !/^0+\.00$/.test(value);

/**
 * Body `POST /calculations/installment-simulation` (api-specs 09 §9.1). `FLOATING`, `HYBRID`, dan `CAPPED` diterima
 * tetapi baris MRTM-nya [Deferred] (AC-51.02).
 */
export const installmentSimulationRequestSchema = z.strictObject({
  interestType: z.enum(interestTypeSchema.options, required),
  principal: z.string(required).pipe(money).refine(isPositive, INSTALLMENT_SIMULATION_MESSAGES.principalInvalid),
  tenor: z
    .int({
      error: (issue) =>
        issue.input === undefined
          ? INSTALLMENT_SIMULATION_MESSAGES.tenorRequired
          : INSTALLMENT_SIMULATION_MESSAGES.tenorInvalid,
    })
    .min(1, INSTALLMENT_SIMULATION_MESSAGES.tenorInvalid),
  interestRate: z.string(required).pipe(percent),
  spreadRate: percent.optional(),
  floatingRate: percent.optional(),
  tenorFixed: z.int().min(1).optional(),
  capRate: percent.optional(),
  firstInstallmentDate: businessDate.optional(),
  productId: id.optional(),
});
export type InstallmentSimulationRequest = z.infer<typeof installmentSimulationRequestSchema>;

export const installmentRowSchema = z.object({
  installmentNo: z.int(),
  dueDate: businessDate,
  principalAmount: money,
  interestAmount: money,
  installmentAmount: money,
  outstandingAmount: money,
});
export type InstallmentRow = z.infer<typeof installmentRowSchema>;

export const installmentSimulationSchema = z.object({
  interestType: interestTypeSchema,
  principal: money,
  tenor: z.int(),
  appliedRate: percent,
  /** Angsuran baris pertama. */
  monthlyInstallment: money,
  totalInterest: money,
  totalPayment: money,
  schedule: z.array(installmentRowSchema),
  /** Kode rumus ke id versi, atau `DEFAULT` untuk rumus bawaan (FM-04). */
  formulaVersions: z.record(z.string(), z.string()),
});
export type InstallmentSimulation = z.infer<typeof installmentSimulationSchema>;

export const installmentSimulationResponseSchema = dataEnvelope(installmentSimulationSchema);
export type InstallmentSimulationResponse = z.infer<typeof installmentSimulationResponseSchema>;
