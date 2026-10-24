import { Decimal } from "decimal.js";
import stringComparison from "string-comparison";
import type { DedupAlgorithm } from "./dedup-types.js";

const SCORE_DECIMALS = 4;

const normalized = (value: string): string => value.trim().toUpperCase().replace(/\s+/g, " ");

function levenshteinRatio(a: string, b: string): number {
  return stringComparison.levenshtein.similarity(a, b);
}

function jaroWinklerRatio(a: string, b: string): number {
  return stringComparison.jaroWinkler.similarity(a, b);
}

/** Token set ratio ala fuzzywuzzy: urutan kata dan kata tambahan tidak menurunkan skor kata yang sama. */
function tokenSetRatio(a: string, b: string): number {
  const tokensA = new Set(a.split(" "));
  const tokensB = new Set(b.split(" "));
  const common = [...tokensA].filter((token) => tokensB.has(token)).sort();
  const onlyA = [...tokensA].filter((token) => !tokensB.has(token)).sort();
  const onlyB = [...tokensB].filter((token) => !tokensA.has(token)).sort();
  const base = common.join(" ");
  const withA = [base, ...onlyA].filter(Boolean).join(" ");
  const withB = [base, ...onlyB].filter(Boolean).join(" ");
  const pairs: Array<[string, string]> = [[withA, withB]];
  if (base) pairs.push([base, withA], [base, withB]);
  return Math.max(...pairs.map(([left, right]) => levenshteinRatio(left, right)));
}

const ALGORITHMS: Record<DedupAlgorithm, (a: string, b: string) => number> = {
  LEVENSHTEIN_RATIO: levenshteinRatio,
  JARO_WINKLER: jaroWinklerRatio,
  TOKEN_SET_RATIO: tokenSetRatio,
};

/**
 * Skor 0 s.d. 1 sebagai string desimal 4 angka (api-specs 19 §19.2). Huruf besar dan spasi ganda diabaikan; nilai
 * kosong tidak mirip dengan apa pun.
 */
export function nameScore(algorithm: DedupAlgorithm, left: string | null, right: string | null): string {
  const a = normalized(left ?? "");
  const b = normalized(right ?? "");
  if (a === "" || b === "") return new Decimal(0).toFixed(SCORE_DECIMALS);
  return new Decimal(ALGORITHMS[algorithm](a, b)).toFixed(SCORE_DECIMALS, Decimal.ROUND_HALF_UP);
}
