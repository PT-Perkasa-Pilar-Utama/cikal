import type { FraudOutcome, IpCheckStatus, VelocityDimension, VelocityHit } from "@cikal/contracts";

const HOUR_MS = 3_600_000;
const HOURS_PER_DAY = 24;

export type NameCondition = "NORMAL" | "EXCEEDED" | "ANY";
export type IpCondition = IpCheckStatus | "ANY";

/** FraudVelocityRule aktif (technical-specs 06 §6.11 M08), contoh nama sama lebih dari 3 per hari. */
export interface VelocityRule {
  dimension: VelocityDimension;
  windowValue: number;
  windowUnit: "DAY" | "HOUR";
  maxCount: number;
  outcomeWhenExceeded: FraudOutcome;
}

export interface FraudMatrixRow {
  id: string;
  priority: number;
  nameCondition: NameCondition;
  ipCondition: IpCondition;
  fraudOutcome: FraudOutcome;
}

/** Jawaban kanonik IpReputationPort yang dinilai. */
export interface IpAnswer {
  isVpnOrProxy: boolean;
  province: string | null;
}

export interface FraudVerdict {
  outcome: FraudOutcome;
  matrixRow: FraudMatrixRow | null;
  /** Alasan masuk blacklist bila frekuensi terlampaui (TRM_FRD_002); kosong bila tidak ada entri baru. */
  blacklistReason: string | null;
}

/** Awal jendela hitung frekuensi yang berakhir saat `now`. */
export function windowStart(rule: Pick<VelocityRule, "windowValue" | "windowUnit">, now: Date): Date {
  const hours = rule.windowUnit === "DAY" ? rule.windowValue * HOURS_PER_DAY : rule.windowValue;
  return new Date(now.getTime() - hours * HOUR_MS);
}

export function velocityHit(rule: VelocityRule, actualCount: number): VelocityHit {
  const { dimension, windowValue, windowUnit, maxCount } = rule;
  return { dimension, windowValue, windowUnit, maxCount, actualCount, exceeded: actualCount > maxCount };
}

/** VPN/Proxy, atau provinsi IP berbeda dari provinsi alamat KTP, membuat pengajuan Suspicious (TRM_FRD_004, 005). */
export function ipStatusOf(answer: IpAnswer, idProvinceCode: string | null): IpCheckStatus {
  if (answer.isVpnOrProxy) return "VPN_PROXY";
  if (answer.province !== null && idProvinceCode !== null && answer.province !== idProvinceCode) {
    return "LOCATION_MISMATCH";
  }
  return "NORMAL";
}

const cellMatches = <T extends string>(condition: T | "ANY", value: T) => condition === "ANY" || condition === value;

/**
 * Keputusan langkah FRAUD (api-specs 21 §21.1). Blacklist langsung High Fraud Potential (TRM_FRD_001). Frekuensi
 * terlampaui memakai `outcomeWhenExceeded` aturannya dan memasukkan pemohon ke blacklist (TRM_FRD_002). Selain itu
 * baris Fraud Matrix pertama menurut prioritas; tanpa baris yang cocok pengajuan Suspicious agar diperiksa manusia.
 */
export function judgeFraud(input: {
  isBlacklisted: boolean;
  rules: readonly VelocityRule[];
  hits: readonly VelocityHit[];
  ipStatus: IpCheckStatus;
  matrix: readonly FraudMatrixRow[];
}): FraudVerdict {
  if (input.isBlacklisted) return { outcome: "HIGH_FRAUD_POTENTIAL", matrixRow: null, blacklistReason: null };
  const exceeded = input.hits.find((hit) => hit.exceeded);
  const rule = exceeded && input.rules.find((candidate) => candidate.dimension === exceeded.dimension);
  if (exceeded && rule) {
    const reason = `Velocity rule exceeded: ${exceeded.dimension} ${exceeded.actualCount} in ${exceeded.windowValue} ${exceeded.windowUnit}`;
    return { outcome: rule.outcomeWhenExceeded, matrixRow: null, blacklistReason: reason };
  }
  const ordered = [...input.matrix].sort((left, right) => left.priority - right.priority);
  const row = ordered.find(
    (candidate) => cellMatches(candidate.nameCondition, "NORMAL") && cellMatches(candidate.ipCondition, input.ipStatus),
  );
  return row
    ? { outcome: row.fraudOutcome, matrixRow: row, blacklistReason: null }
    : { outcome: "SUSPICIOUS", matrixRow: null, blacklistReason: null };
}
