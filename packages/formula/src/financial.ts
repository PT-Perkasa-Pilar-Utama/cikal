import { Decimal } from "decimal.js";

/*
 * Fungsi keuangan FM-02 dengan konvensi tanda Excel: pinjaman `pv` negatif menghasilkan angsuran positif.
 * Semua untuk pembayaran di akhir periode dan nilai akhir 0.
 */

const growth = (rate: Decimal, periods: number): Decimal => rate.plus(1).pow(periods);

/** `PMT(rate, nper, pv)`: angsuran tetap per periode. */
export function pmt(rate: Decimal, nper: number, pv: Decimal): Decimal {
  if (rate.isZero()) return pv.neg().div(nper);
  const factor = growth(rate, nper);
  return pv.neg().mul(rate).mul(factor).div(factor.minus(1));
}

/** Saldo setelah `period` pembayaran, bertanda sama dengan `pv`. */
function balance(rate: Decimal, period: number, pv: Decimal, payment: Decimal): Decimal {
  if (rate.isZero()) return pv.plus(payment.mul(period));
  const factor = growth(rate, period);
  return pv.mul(factor).plus(payment.mul(factor.minus(1)).div(rate));
}

/** `IPMT(rate, per, nper, pv)`: porsi bunga pada periode `per` (mulai 1). */
export function ipmt(rate: Decimal, per: number, nper: number, pv: Decimal): Decimal {
  return balance(rate, per - 1, pv, pmt(rate, nper, pv))
    .mul(rate)
    .neg();
}

/** `PPMT(rate, per, nper, pv)`: porsi pokok pada periode `per` (mulai 1). */
export function ppmt(rate: Decimal, per: number, nper: number, pv: Decimal): Decimal {
  return pmt(rate, nper, pv).minus(ipmt(rate, per, nper, pv));
}

/** `PV(rate, nper, pmt)`: nilai kini dari angsuran tetap. */
export function pv(rate: Decimal, nper: number, payment: Decimal): Decimal {
  if (rate.isZero()) return payment.neg().mul(nper);
  return payment
    .neg()
    .mul(new Decimal(1).minus(growth(rate, -nper)))
    .div(rate);
}
