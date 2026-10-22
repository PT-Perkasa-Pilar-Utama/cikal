import { parseMoneyInput, parsePercentInput } from "../../lib/format";

/**
 * Pembaca input form produk dan pricing menjadi nilai body request. Input kosong menjadi `undefined`; input yang
 * formatnya salah dibiarkan apa adanya supaya skema kontrak menolaknya.
 */

const INTEGER_INPUT = /^\d+$/;

const optional =
  (parse: (input: string) => string | undefined) =>
  (input: string): string | undefined => {
    const text = input.trim();
    return text ? (parse(text) ?? text) : undefined;
  };

export const optionalText = optional((text) => text);
export const optionalMoney = optional(parseMoneyInput);
export const optionalPercent = optional(parsePercentInput);

export function optionalInteger(input: string): number | undefined {
  const text = input.trim();
  if (!text) return undefined;
  return INTEGER_INPUT.test(text) ? Number(text) : Number.NaN;
}
