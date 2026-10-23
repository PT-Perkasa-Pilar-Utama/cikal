import type { ParamType } from "@cikal/contracts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { v7 as uuidv7 } from "uuid";
import { seedCompanyIds } from "../../tenancy/index.js";
import { generalParameters } from "../db/schema.js";

type SeedValues = ReadonlyArray<readonly [paramId: string, paramValue: string]>;

/**
 * Pilihan contoh company 001 untuk checklist dokumen (US-25) dan form pengajuan. Nama dokumen mengikuti AC-25.01
 * dan AC-47; `paramId` dokumen adalah `documentType` slot unggah (api-specs 12 §12.6).
 */
const SEED_PARAMETERS: ReadonlyArray<readonly [ParamType, SeedValues]> = [
  [
    "Occupation",
    [
      ["001", "Karyawan Swasta"],
      ["002", "Pegawai Negeri Sipil"],
      ["003", "TNI/Polri"],
      ["004", "Pensiunan"],
      ["005", "Wiraswasta"],
      ["006", "Pelajar"],
      ["099", "Pengemudi Daring"],
    ],
  ],
  [
    "Marital",
    [
      ["001", "Belum Kawin"],
      ["002", "Kawin"],
      ["003", "Cerai Hidup"],
      ["004", "Cerai Mati"],
    ],
  ],
  [
    "Document",
    [
      ["KTP", "KTP"],
      ["KK", "KK"],
      ["NPWP", "NPWP"],
      ["SLIP_GAJI", "Slip Gaji"],
      ["REKENING_KORAN", "Rekening Koran 3 Bulan"],
      ["SERTIFIKAT", "Sertifikat"],
      ["KTP_PASANGAN", "KTP Pasangan"],
      ["BPJS", "BPJS"],
      ["PBB", "PBB"],
      ["SURAT_KETERANGAN_KERJA", "Surat Keterangan Kerja"],
    ],
  ],
];

/** General Parameter seed `dev` dan `qa`. */
export async function seedGeneralParameters(db: NodePgDatabase): Promise<void> {
  const rows = SEED_PARAMETERS.flatMap(([paramType, values]) =>
    values.map(([paramId, paramValue]) => ({
      id: uuidv7(),
      tenantId: seedCompanyIds.company001,
      paramType,
      paramId,
      paramValue,
    })),
  );
  await db.insert(generalParameters).values(rows).onConflictDoNothing();
}
