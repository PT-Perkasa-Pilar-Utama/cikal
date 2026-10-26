import { APPROVAL_MESSAGES } from "@cikal/contracts";
import { Decimal } from "decimal.js";

/** Nilai parameter `APPROVAL_RANGE_BOUNDARY` (RM-06). */
export type RangeBoundary = "BOTH_INCLUSIVE" | "END_EXCLUSIVE";

/** Nilai snapshot yang dikenal routing; selain itu langkah ERROR `CONFIG`. */
export const isRangeBoundary = (value: string | undefined): value is RangeBoundary =>
  value === "BOTH_INCLUSIVE" || value === "END_EXCLUSIVE";

export interface RoutingLevel {
  jobLevel: number;
  description: string;
  amountBegin: string;
  amountEnd: string;
  isFinalApprover: boolean;
}

/** Baris Approval Hierarchy; `active` = baris aktif dan user approver berstatus ACTIVE (AC-27.03). */
export interface RoutingApprover {
  jobLevel: number;
  subLevel: number;
  upLevel: number | null;
  upSubLevel: number | null;
  approverUserId: string;
  active: boolean;
}

/** Setup approval satu cabang dan produk; kode dipakai pesan TRM_APV_005. */
export interface RoutingSetup {
  levels: readonly RoutingLevel[];
  /** Urutan baris = urutan pembuatan; approver aktif pertama satu sub level yang mendapat tugas. */
  approvers: readonly RoutingApprover[];
  branchCode: string;
  productCode: string;
}

export interface ChainNode {
  sequence: number;
  jobLevel: number;
  subLevel: number;
  description: string;
  approverUserId: string;
}

export type Routing = { ok: true; chain: ChainNode[] } | { ok: false; message: string };

type Position = Pick<RoutingApprover, "jobLevel" | "subLevel">;

const keyOf = (position: Position): string => `${position.jobLevel}:${position.subLevel}`;

/** RM-05: auto approval hanya bila limit produk lebih dari 0 (AC-74.05) dan plafon tidak melebihinya (AC-74.02). */
export function isAutoApproved(requestedLimit: Decimal, limitAutoApproval: Decimal): boolean {
  return limitAutoApproval.greaterThan(0) && requestedLimit.lessThanOrEqualTo(limitAutoApproval);
}

/** Plafon masuk rentang level; batas akhir eksklusif hanya bila `END_EXCLUSIVE` (RM-06). */
export function coversAmount(level: RoutingLevel, amount: Decimal, boundary: RangeBoundary): boolean {
  const end = new Decimal(level.amountEnd);
  const belowEnd = boundary === "END_EXCLUSIVE" ? amount.lessThan(end) : amount.lessThanOrEqualTo(end);
  return amount.greaterThanOrEqualTo(level.amountBegin) && belowEnd;
}

/**
 * Rantai approval RM-06 (grooming v1 A-37): mulai dari sub level terkecil level terendah (nomor level terbesar), naik
 * lewat `upLevel`/`upSubLevel` sampai level yang rentangnya mencakup plafon, atau sampai level `isFinalApprover`.
 * Setiap posisi rantai wajib punya approver aktif (AC-27.04).
 */
export function routeApproval(setup: RoutingSetup, amount: Decimal, boundary: RangeBoundary): Routing {
  const { levels, approvers } = setup;
  if (levels.length === 0 || approvers.length === 0) {
    return { ok: false, message: APPROVAL_MESSAGES.noSetup(setup.branchCode, setup.productCode) };
  }
  const covering = levels.find((level) => coversAmount(level, amount, boundary));
  if (!covering) return { ok: false, message: APPROVAL_MESSAGES.noLevelCoversAmount };
  const chain: ChainNode[] = [];
  const visited = new Set<string>();
  let position: Position | null = entryPosition(approvers);
  while (position && !visited.has(keyOf(position))) {
    visited.add(keyOf(position));
    const at: Position = position;
    const chosen = approvers.find((row) => keyOf(row) === keyOf(at) && row.active);
    if (!chosen) return { ok: false, message: APPROVAL_MESSAGES.noActiveApprover(at.jobLevel) };
    const level = levels.find((candidate) => candidate.jobLevel === at.jobLevel);
    chain.push({
      sequence: chain.length + 1,
      jobLevel: at.jobLevel,
      subLevel: at.subLevel,
      description: level?.description ?? "",
      approverUserId: chosen.approverUserId,
    });
    if (level?.isFinalApprover) break;
    position = nextPosition(chosen, covering.jobLevel);
  }
  return { ok: true, chain };
}

function entryPosition(approvers: readonly RoutingApprover[]): Position {
  const jobLevel = Math.max(...approvers.map((row) => row.jobLevel));
  const subLevel = Math.min(...approvers.filter((row) => row.jobLevel === jobLevel).map((row) => row.subLevel));
  return { jobLevel, subLevel };
}

/** Posisi atasan; level di atas level yang mencakup plafon tidak ikut rantai (TRM_APV_001). */
function nextPosition(row: RoutingApprover, coveringLevel: number): Position | null {
  if (row.upLevel === null || row.upSubLevel === null || row.upLevel < coveringLevel) return null;
  return { jobLevel: row.upLevel, subLevel: row.upSubLevel };
}
