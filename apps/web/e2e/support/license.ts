import type { LicenseFile } from "@cikal/contracts";

/**
 * Salinan lisensi seed `dev` dan `qa` (apps/api tenancy `seed/dev-license.ts`), ditandatangani kunci dev. Kunci
 * privatnya tidak disimpan, jadi spec hanya bisa memakai file ini apa adanya atau mengubahnya agar ditolak.
 */
export const DEV_LICENSE: LicenseFile = {
  license: {
    licenseNumber: "PPU-LIC-DEV-0001",
    companyCode: "001",
    deploymentType: "ON_PREMISE",
    modules: ["CORE", "M06", "M07", "M08", "M09", "M10", "M11", "M14", "M15"],
    validFrom: "2026-10-21",
    validTo: "2027-12-31",
    maxUsers: null,
  },
  signature: "17W4jcrcV8ZwvaySM6F6BAQ5hAan6lxcXnXmLCFMryuBA22tSFhMb9bWvkV5sn1mmcNzbg+H/VxKdy9b6fLaDA==",
};

/**
 * File lisensi dev yang diubah setelah diterbitkan (AC-100.02). Nomornya baru agar penolakan hanya karena tanda
 * tangan, bukan karena nomor itu pernah dipasang.
 */
export const CHANGED_DEV_LICENSE: LicenseFile = {
  ...DEV_LICENSE,
  license: { ...DEV_LICENSE.license, licenseNumber: "PPU-LIC-DEV-0002", validTo: "2036-12-31" },
};
