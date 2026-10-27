import type { ApplicationTab } from "@cikal/contracts";

/** Nama tab "Application Detail" (US-84); "Workflow" adalah riwayat proses (History). */
export const TAB_LABELS: Record<ApplicationTab, string> = {
  detail: "Detail",
  personal: "Personal",
  spouse: "Spouse",
  occupation: "Occupation",
  business: "Business",
  lkn: "LKN",
  collateral: "Collateral",
  documents: "Document",
  "emergency-contact": "Emergency Contact",
  workflow: "Workflow",
  dedup: "Dedup",
  dukcapil: "Dukcapil",
  fraud: "Fraud",
  scoring: "Scoring",
  "credit-bureau": "SLIK",
  decision: "Decision",
  approval: "Approval",
};

export const DASH = "-";

/** Nilai kosong section ditampilkan sebagai `-`. */
export const orDash = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === "" ? DASH : String(value);
