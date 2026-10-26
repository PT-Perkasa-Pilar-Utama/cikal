import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { businessDate, money, percent } from "../common/scalars.js";
import { interestTypeSchema } from "../product/products.schema.js";

/** Pesan `404 NOT_FOUND` tab "Approval" sebelum pengajuan disetujui (api-specs 16 §16.7). */
export const FINANCING_MESSAGES = {
  notAvailable: "Financing is not available yet",
} as const;

/** `AUTO` untuk auto approval (AC-74.01), `MANUAL` setelah level final menyetujui (AC-72.01). */
export const approvalTypeSchema = z.enum(["AUTO", "MANUAL"]);
export type ApprovalType = z.infer<typeof approvalTypeSchema>;

export const financingInstallmentSchema = z.object({
  installmentNo: z.int(),
  dueDate: businessDate,
  principalAmount: money,
  interestAmount: money,
  outstandingAmount: money,
});
export type FinancingInstallment = z.infer<typeof financingInstallmentSchema>;

/**
 * Struktur kredit dan jadwal angsuran (api-specs 16 §16.7, RM-07, RM-08); sisa pokok baris terakhir 0 (RM-19).
 * `dbrRatio` dan `dsrRatio` dalam persen; kosong bila penghasilan atau angsuran berjalan tidak ada.
 */
export const financingSchema = z.object({
  loanAmount: money,
  tenor: z.int(),
  interestType: interestTypeSchema,
  interestRate: percent,
  monthlyInstallment: money,
  adminFee: money,
  provisionFee: money,
  insuranceValue: money,
  netDisbursement: money,
  dbrRatio: percent.nullable(),
  dsrRatio: percent.nullable(),
  firstInstallmentDate: businessDate,
  approvalType: approvalTypeSchema,
  sp3kNumber: z.string().nullable(),
  schedule: z.array(financingInstallmentSchema),
});
export type Financing = z.infer<typeof financingSchema>;

export const financingResponseSchema = dataEnvelope(financingSchema);
export type FinancingResponse = z.infer<typeof financingResponseSchema>;
