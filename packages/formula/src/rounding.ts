import { Decimal } from "decimal.js";

export type RoundingMode = "HALF_UP" | "UP" | "DOWN";

const modes: Record<RoundingMode, Decimal.Rounding> = {
  HALF_UP: Decimal.ROUND_HALF_UP,
  UP: Decimal.ROUND_UP,
  DOWN: Decimal.ROUND_DOWN,
};

/** Membulatkan angka desimal tanpa melewati float (FM-07). Nilai masuk dan keluar berupa string. */
export function round(value: string, scale: number, mode: RoundingMode = "HALF_UP"): string {
  return new Decimal(value).toDecimalPlaces(scale, modes[mode]).toFixed(scale);
}
