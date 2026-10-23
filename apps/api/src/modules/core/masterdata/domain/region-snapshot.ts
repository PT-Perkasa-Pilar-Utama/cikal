/** Tingkat wilayah dari atas ke bawah: provinsi, kota, kecamatan, kelurahan (technical-specs 06 §6.6). */
export const REGION_LEVELS = ["province", "city", "district", "subDistrict"] as const;
export type RegionLevel = (typeof REGION_LEVELS)[number];

export interface RegionEntry {
  code: string;
  name: string;
  /** `null` hanya untuk provinsi. */
  parentCode: string | null;
  /** Kode pos; terisi hanya untuk kelurahan. */
  zipCode: string | null;
}

/** Seluruh data wilayah dari penyedia, atau seluruh data lokal. */
export type RegionSnapshot = Record<RegionLevel, readonly RegionEntry[]>;

export interface RegionDiff {
  added: Record<RegionLevel, RegionEntry[]>;
  changed: Record<RegionLevel, RegionEntry[]>;
  addedCount: number;
  changedCount: number;
}

const PARENT_LEVEL: Record<RegionLevel, RegionLevel | null> = {
  province: null,
  city: "province",
  district: "city",
  subDistrict: "district",
};

/**
 * Alasan snapshot penyedia tidak boleh dipakai, atau `null` bila layak: kode unik per tingkat dan kelurahan punya
 * kode pos. Snapshot rusak tidak boleh mengubah data lama (AC-23.02).
 */
export function findInconsistency(snapshot: RegionSnapshot): string | null {
  for (const level of REGION_LEVELS) {
    const seen = new Set<string>();
    for (const entry of snapshot[level]) {
      if (seen.has(entry.code)) return `Duplicate ${level} code ${entry.code}`;
      seen.add(entry.code);
      if (level === "subDistrict" && !entry.zipCode) return `Missing zip code for subDistrict ${entry.code}`;
    }
  }
  return null;
}

/**
 * Snapshot tanpa cabang yang induknya tidak ada, beserta jumlah baris yang dibuang. Oksara masih memuat kecamatan
 * kabupaten lama setelah pemekaran provinsi (contoh 9209 dan 9210 yang pindah ke provinsi 96); cabang itu tidak
 * bisa dipilih berjenjang, jadi tidak disimpan.
 */
export function pruneOrphans(snapshot: RegionSnapshot): { snapshot: RegionSnapshot; skipped: number } {
  const pruned: Record<RegionLevel, readonly RegionEntry[]> = { ...snapshot };
  let skipped = 0;
  for (const level of REGION_LEVELS) {
    const parentLevel = PARENT_LEVEL[level];
    if (!parentLevel) continue;
    const parentCodes = new Set(pruned[parentLevel].map((entry) => entry.code));
    const kept = snapshot[level].filter((entry) => entry.parentCode !== null && parentCodes.has(entry.parentCode));
    skipped += snapshot[level].length - kept.length;
    pruned[level] = kept;
  }
  return { snapshot: pruned, skipped };
}

/** Kode induk entri anak yang sudah lolos `pruneOrphans`; kosong berarti bug pemanggil. */
export function parentOf(entry: RegionEntry): string {
  if (entry.parentCode === null) throw new Error(`Region ${entry.code} has no parent`);
  return entry.parentCode;
}

/** Kode pos kelurahan yang sudah lolos `findInconsistency`; kosong berarti bug pemanggil. */
export function zipOf(entry: RegionEntry): string {
  if (entry.zipCode === null) throw new Error(`Region ${entry.code} has no zip code`);
  return entry.zipCode;
}

const sameEntry = (a: RegionEntry, b: RegionEntry): boolean =>
  a.name === b.name && a.parentCode === b.parentCode && a.zipCode === b.zipCode;

/** Baris baru dan baris yang berubah per tingkat; jumlahnya tampil di pesan AC-23.01. */
export function diffSnapshot(existing: RegionSnapshot, incoming: RegionSnapshot): RegionDiff {
  const diff: RegionDiff = {
    added: { province: [], city: [], district: [], subDistrict: [] },
    changed: { province: [], city: [], district: [], subDistrict: [] },
    addedCount: 0,
    changedCount: 0,
  };
  for (const level of REGION_LEVELS) {
    const current = new Map(existing[level].map((entry) => [entry.code, entry]));
    for (const entry of incoming[level]) {
      const before = current.get(entry.code);
      if (!before) diff.added[level].push(entry);
      else if (!sameEntry(before, entry)) diff.changed[level].push(entry);
    }
    diff.addedCount += diff.added[level].length;
    diff.changedCount += diff.changed[level].length;
  }
  return diff;
}
