import type { RegionEntry, RegionSnapshot } from "../domain/region-snapshot.js";
import { type RegionDataPort, RegionSourceError } from "../ports/region-data.port.js";

const province = (code: string, name: string): RegionEntry => ({ code, name, parentCode: null, zipCode: null });
const child = (code: string, name: string, parentCode: string, zipCode: string | null = null): RegionEntry => ({
  code,
  name,
  parentCode,
  zipCode,
});

/** 15 baris kode Kemendagri asli: dua provinsi agar filter berjenjang teruji (AC-23.04). */
export const SIMULATION_REGIONS: RegionSnapshot = {
  province: [province("31", "DKI JAKARTA"), province("32", "JAWA BARAT")],
  city: [
    child("3171", "KOTA JAKARTA PUSAT", "31"),
    child("3172", "KOTA JAKARTA UTARA", "31"),
    child("3273", "KOTA BANDUNG", "32"),
  ],
  district: [
    child("317101", "GAMBIR", "3171"),
    child("317102", "SAWAH BESAR", "3171"),
    child("317201", "PENJARINGAN", "3172"),
    child("327301", "SUKASARI", "3273"),
  ],
  subDistrict: [
    child("3171011001", "GAMBIR", "317101", "10110"),
    child("3171011002", "CIDENG", "317101", "10150"),
    child("3171021001", "PASAR BARU", "317102", "10710"),
    child("3172011001", "PENJARINGAN", "317201", "14440"),
    child("3273011001", "SARIJADI", "327301", "40151"),
    child("3273011002", "GEGERKALONG", "327301", "40153"),
  ],
};

/**
 * Adapter simulasi untuk dev dan test; dipakai bila `REGION_API_KEY_FILE` tidak diisi. Tanpa
 * `ALLOW_SIMULATION_ADAPTERS` panggilannya ditolak sebagai `CONFIG` (IN-03), sama dengan Integration Registry.
 */
export class SimulationRegionAdapter implements RegionDataPort {
  constructor(private readonly allowed: boolean) {}

  async fetchAll(): Promise<RegionSnapshot> {
    if (!this.allowed) throw new RegionSourceError("CONFIG", "Simulation adapters are not allowed");
    return SIMULATION_REGIONS;
  }
}
