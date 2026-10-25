import type { CreditBureauOutcome } from "@cikal/contracts";

const MIN_COLLECTIBILITY = 1;
const MAX_COLLECTIBILITY = 5;
const NO_HISTORY_LABEL = "No credit history";

/** Baris CreditBureauOutcomeMapping (technical-specs 06 §6.11 M10); `collectibility` kosong = tanpa riwayat. */
export interface OutcomeMapping {
  collectibility: number | null;
  quality: string;
  outcome: CreditBureauOutcome;
}

export interface FacilityStanding {
  collectibility: number;
  condition: "ACTIVE" | "CLOSED";
}

export type Aggregation = { ok: true; collectibility: number | null } | { ok: false; message: string };

/**
 * Kolektibilitas terburuk fasilitas `ACTIVE` (CREDIT_BUREAU_AGGREGATION, TRM_SLK_007); tanpa fasilitas aktif
 * kosong. Nilai di luar 1 s.d. 5 di fasilitas mana pun berarti jawaban penyedia tidak bisa dipakai (TRM_SLK_006).
 */
export function aggregateCollectibility(facilities: readonly FacilityStanding[]): Aggregation {
  const invalid = facilities.find(
    (facility) => facility.collectibility < MIN_COLLECTIBILITY || facility.collectibility > MAX_COLLECTIBILITY,
  );
  if (invalid) return { ok: false, message: `Invalid collectibility value: ${invalid.collectibility}` };
  const active = facilities.filter((facility) => facility.condition === "ACTIVE");
  if (active.length === 0) return { ok: true, collectibility: null };
  return { ok: true, collectibility: Math.max(...active.map((facility) => facility.collectibility)) };
}

/** Label MRTM US-68: "Collectibility 3 - Poor", atau "No credit history" (AC-68.01, TRM_SLK_001 s.d. 005). */
export function collectibilityLabel(mapping: OutcomeMapping): string {
  return mapping.collectibility === null
    ? NO_HISTORY_LABEL
    : `Collectibility ${mapping.collectibility} - ${mapping.quality}`;
}
