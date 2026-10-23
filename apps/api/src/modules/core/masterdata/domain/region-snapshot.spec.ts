import { describe, expect, it } from "vitest";
import {
  diffSnapshot,
  findInconsistency,
  pruneOrphans,
  type RegionEntry,
  type RegionSnapshot,
} from "./region-snapshot.js";

const province = (code: string, name: string): RegionEntry => ({ code, name, parentCode: null, zipCode: null });
const child = (code: string, name: string, parentCode: string, zipCode: string | null = null): RegionEntry => ({
  code,
  name,
  parentCode,
  zipCode,
});

const snapshot = (overrides: Partial<RegionSnapshot> = {}): RegionSnapshot => ({
  province: [province("31", "DKI JAKARTA")],
  city: [child("3171", "KOTA JAKARTA PUSAT", "31")],
  district: [child("317101", "GAMBIR", "3171")],
  subDistrict: [child("3171011001", "GAMBIR", "317101", "10110")],
  ...overrides,
});

describe("findInconsistency", () => {
  it("accepts a snapshot with unique codes and zip codes", () => {
    expect(findInconsistency(snapshot())).toBeNull();
  });

  it("rejects a duplicate code within one level (AC-23.02)", () => {
    const broken = snapshot({ province: [province("31", "DKI JAKARTA"), province("31", "DKI")] });
    expect(findInconsistency(broken)).toBe("Duplicate province code 31");
  });

  it("rejects a sub-district without a zip code", () => {
    const broken = snapshot({ subDistrict: [child("3171011001", "GAMBIR", "317101")] });
    expect(findInconsistency(broken)).toBe("Missing zip code for subDistrict 3171011001");
  });
});

describe("pruneOrphans", () => {
  it("keeps a snapshot whose every child has its parent", () => {
    expect(pruneOrphans(snapshot())).toEqual({ snapshot: snapshot(), skipped: 0 });
  });

  it("drops a district of a former regency together with its sub-districts", () => {
    const withOrphan = snapshot({
      district: [child("317101", "GAMBIR", "3171"), child("920901", "FEF", "9209")],
      subDistrict: [child("3171011001", "GAMBIR", "317101", "10110"), child("9209012001", "FEF", "920901", "98473")],
    });

    expect(pruneOrphans(withOrphan)).toEqual({ snapshot: snapshot(), skipped: 2 });
  });
});

describe("diffSnapshot", () => {
  const empty: RegionSnapshot = { province: [], city: [], district: [], subDistrict: [] };

  it("counts every row as added when no local data exists (AC-23.01)", () => {
    const diff = diffSnapshot(empty, snapshot());
    expect(diff.addedCount).toBe(4);
    expect(diff.changedCount).toBe(0);
  });

  it("counts renamed, moved, and rezoned rows as updated and ignores unchanged rows (AC-23.01)", () => {
    const local = snapshot({
      province: [province("31", "DKI")],
      district: [child("317101", "GAMBIR", "3172")],
      subDistrict: [child("3171011001", "GAMBIR", "317101", "10111")],
    });
    const diff = diffSnapshot(local, snapshot());
    expect(diff.addedCount).toBe(0);
    expect(diff.changedCount).toBe(3);
    expect(diff.changed.city).toEqual([]);
  });
});
