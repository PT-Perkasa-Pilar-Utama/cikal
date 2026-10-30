import type { ParamType } from "@cikal/contracts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { v7 as uuidv7 } from "uuid";
import { seedCompanyIds } from "../../tenancy/index.js";
import { generalParameters } from "../db/schema.js";

type SeedValues = ReadonlyArray<readonly [paramId: string, paramValue: string]>;

/**
 * Pilihan contoh company 001 untuk checklist dokumen (US-25) dan form pengajuan (nilai contoh AC-39.01, AC-40.01,
 * AC-43.01, AC-44.01, AC-45.01, AC-46.01, AC-48.01). Nama dokumen mengikuti AC-25.01 dan AC-47; `paramId` dokumen
 * adalah `documentType` slot unggah (api-specs 12 §12.6).
 */
const SEED_PARAMETERS: ReadonlyArray<readonly [ParamType, SeedValues]> = [
  [
    "Payment Method",
    [
      ["AUTO_DEBET", "Auto Debet"],
      ["TRANSFER", "Transfer"],
    ],
  ],
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
    "Application Type",
    [
      ["NTB", "NTB"],
      ["RO", "Repeat Order"],
    ],
  ],
  [
    "Segment",
    [
      ["MIKRO", "Mikro"],
      ["KECIL", "Kecil"],
      ["KONSUMER", "Konsumer"],
    ],
  ],
  [
    "Gender",
    [
      ["L", "Laki-laki"],
      ["P", "Perempuan"],
    ],
  ],
  [
    "Religion",
    [
      ["ISLAM", "Islam"],
      ["KRISTEN", "Kristen"],
      ["KATOLIK", "Katolik"],
      ["HINDU", "Hindu"],
      ["BUDDHA", "Buddha"],
      ["KONGHUCU", "Konghucu"],
    ],
  ],
  [
    "Nationality",
    [
      ["WNI", "WNI"],
      ["WNA", "WNA"],
    ],
  ],
  [
    "Education",
    [
      ["SMA", "SMA"],
      ["D3", "D3"],
      ["S1", "S1"],
      ["S2", "S2"],
    ],
  ],
  [
    "Source of Income",
    [
      ["001", "Bekerja"],
      ["002", "Usaha"],
      ["003", "Pensiun"],
    ],
  ],
  [
    "Industry of Profession",
    [
      ["001", "Perdagangan"],
      ["002", "Jasa Keuangan"],
      ["003", "Industri Pengolahan"],
    ],
  ],
  [
    "Relation with Applicant",
    [
      ["001", "Orang Tua"],
      ["002", "Saudara Kandung"],
      ["003", "Anak"],
    ],
  ],
  [
    "Prenuptial Agreement",
    [
      ["Y", "Yes"],
      ["N", "No"],
    ],
  ],
  [
    "Source of Fund",
    [
      ["001", "Gaji"],
      ["002", "Hasil Usaha"],
    ],
  ],
  [
    "Business Field",
    [
      ["001", "Perdagangan Eceran"],
      ["002", "Industri Pengolahan"],
      ["003", "Jasa"],
    ],
  ],
  [
    "Object Type",
    [
      ["MOBIL", "Mobil"],
      ["MOTOR", "Motor"],
    ],
  ],
  [
    "Certificate Type",
    [
      ["SHM", "SHM"],
      ["SHGB", "SHGB"],
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
