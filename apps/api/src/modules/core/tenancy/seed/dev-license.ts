/**
 * Lisensi company 001 untuk seed `dev` dan `qa`, ditandatangani kunci dev yang kunci publiknya ada di
 * `deploy/license/dev-license-public-key.pem`. Kunci privat dev tidak disimpan: untuk menerbitkan ulang, buat kunci
 * dev baru dengan `cikal-license keygen`, ganti kunci publik itu, terbitkan file dengan `cikal-license issue`, salin
 * isinya ke sini, lalu hapus kunci privatnya (DEPLOYMENT_PLAN §3.11). Image production memakai kunci PPU, jadi
 * lisensi ini tidak berlaku di sana.
 */
export const devLicenseFile = {
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
} as const;
