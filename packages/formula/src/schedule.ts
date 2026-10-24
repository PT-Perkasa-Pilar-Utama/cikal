import type { Decimal } from "decimal.js";
import { type RoundingMode, roundDecimal } from "./rounding.js";
import { FormulaError } from "./values.js";

/** Jenis bunga yang dihitung di POC; Floating, Hybrid, dan Capped berstatus [Deferred] (MRTM US-51). */
export type InterestType = "FLAT" | "EFFECTIVE";

const MONTHS_PER_YEAR = 12;
const PERCENT = 100;

export interface ScheduleTerms {
  interestType: InterestType;
  principal: Decimal;
  /** Suku bunga % per tahun. */
  annualRate: Decimal;
  /** Angsuran per bulan hasil rumus `INSTALLMENT_FLAT` atau `INSTALLMENT_EFFECTIVE`, sudah dibulatkan. */
  installment: Decimal;
  /** Satu tanggal jatuh tempo per angsuran; jumlahnya adalah tenor. */
  dueDates: readonly Date[];
  rounding: { mode: RoundingMode; scale: number };
}

export interface ScheduleRow {
  installmentNo: number;
  dueDate: Date;
  principalAmount: Decimal;
  interestAmount: Decimal;
  installmentAmount: Decimal;
  outstandingAmount: Decimal;
}

/**
 * Jadwal angsuran Flat dan Effective (technical-specs 05 §5.16 `schedule`). Bunga Flat dihitung dari pokok awal,
 * bunga Effective dari sisa pinjaman. Pokok baris terakhir sama dengan sisa pinjaman, sehingga selisih pembulatan
 * pokok masuk ke angsuran terakhir dan sisa pinjaman baris terakhir 0 (RM-19, TRM_INS_001).
 */
export function buildSchedule(terms: ScheduleTerms): ScheduleRow[] {
  const { principal, installment, dueDates } = terms;
  const monthlyRate = terms.annualRate.div(PERCENT).div(MONTHS_PER_YEAR);
  const round = (value: Decimal) => roundDecimal(value, terms.rounding.scale, terms.rounding.mode);
  const rows: ScheduleRow[] = [];
  let outstanding = principal;
  dueDates.forEach((dueDate, index) => {
    const base = terms.interestType === "FLAT" ? principal : outstanding;
    const interestAmount = round(base.mul(monthlyRate));
    const last = index === dueDates.length - 1;
    const principalAmount = last ? outstanding : installment.minus(interestAmount);
    if (principalAmount.isNegative()) {
      throw new FormulaError(`Installment ${index + 1} is lower than its interest`);
    }
    outstanding = outstanding.minus(principalAmount);
    rows.push({
      installmentNo: index + 1,
      dueDate,
      principalAmount,
      interestAmount,
      installmentAmount: principalAmount.plus(interestAmount),
      outstandingAmount: outstanding,
    });
  });
  return rows;
}
