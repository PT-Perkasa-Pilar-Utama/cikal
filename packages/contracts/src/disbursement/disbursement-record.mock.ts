import type { DisbursementRecordResponse } from "./disbursement-record.schema.js";

/** Pencairan berhasil dengan nomor pinjaman core (AC-101.01). */
export const disbursementRecordedResponseMock = {
  data: { applicationStatus: "DISBURSED", disbursementDate: "2026-10-21", coreLoanNumber: "LN-0012345" },
  message: "Disbursement recorded",
} satisfies DisbursementRecordResponse;

/** Pencairan gagal; pengajuan masuk antrean Recontest (AC-101.02). */
export const disbursementFailedResponseMock = {
  data: { applicationStatus: "RECONTEST" },
  message: "Disbursement failure recorded",
} satisfies DisbursementRecordResponse;
