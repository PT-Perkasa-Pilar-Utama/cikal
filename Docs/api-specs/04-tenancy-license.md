# 4. Tenancy and License

Company, lisensi modul, dan salin konfigurasi. Modul pemilik: CORE Tenant & License ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.2). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.5. Kontrol lisensi: [../technical-specs/07-security.md](../technical-specs/07-security.md) 7.6.

## 4.1 GET /license

**Purpose:** Halaman "License": modul berlisensi dan masa berlaku.  
**Access:** `SYS-LICENSE` VIEW. Tetap bisa dipanggil tanpa lisensi terverifikasi atau saat lisensi kedaluwarsa (`@LicenseExempt`).

**Behavior:** Membaca lisensi `ACTIVE` company sesi dari cache memori (LC-04). Cache kosong saat proses mulai, jadi `raw_document` diverifikasi ulang dengan kunci publik sebelum dipakai pertama kali; baris yang diubah langsung di database dianggap tidak ada (LC-03). `modules` berisi modul sesuai isi lisensi, termasuk modul yang tidak ada di paket.

**Output 200**

```json
{
  "data": {
    "licenseNumber": "PPU-LIC-2026-0001",
    "companyCode": "001",
    "deploymentType": "ON_PREMISE",
    "validFrom": "2026-10-21",
    "validTo": "2027-12-31",
    "status": "ACTIVE",
    "maxUsers": null,
    "modules": [
      { "moduleCode": "CORE", "moduleName": "Core" },
      { "moduleCode": "M06", "moduleName": "Dedup" }
    ],
    "installedAt": "2026-10-21T03:00:00Z"
  }
}
```

`status = EXPIRED` dihitung saat dibaca bila tanggal bisnis sudah lewat `validTo`; aplikasi dalam mode baca saja (LC-06). `maxUsers` disimpan tanpa ditegakkan (TO-04).

**Errors:** `NOT_FOUND` 404 "No license is installed" bila belum ada lisensi atau lisensi tersimpan gagal verifikasi.

**Traceability:** US-100; AC-100.01.

## 4.2 POST /license

**Purpose:** Super User memasang file lisensi bertanda tangan di instalasi on-premise.  
**Access:** `SYS-LICENSE` UPDATE. Tetap bisa dipanggil saat lisensi kedaluwarsa atau belum ada (pengecualian dari `LICENSE_EXPIRED` dan `MODULE_NOT_LICENSED`, `@LicenseExempt`).  
**Idempotency:** wajib.

**Input:** `multipart/form-data`, field `file` (JSON lisensi, maksimal 64 KB). Format file: `{ "license": { ... }, "signature": "<base64>" }` dari `tools/license-cli` ([../technical-specs/07-security.md](../technical-specs/07-security.md) 7.6).

**Behavior**

1. Berkas bukan JSON (MIME `application/json` atau ekstensi `.json`): `415 UNSUPPORTED_FILE_TYPE`.
2. Parse JSON; ambil isi lisensi dan tanda tangan Ed25519. Field asing ditolak.
3. Verifikasi tanda tangan atas isi kanonik dengan kunci publik PPU yang tertanam di image. Gagal, JSON rusak, berkas lebih dari 64 KB, `companyCode` bukan company sesi, atau nomor lisensi pernah dipasang company ini (termasuk yang sudah `REVOKED`): `422 LICENSE_INVALID`; lisensi lama tetap berlaku (AC-100.02).
4. `validTo` sudah lewat: `422 LICENSE_INVALID`.
5. Dalam satu transaksi: lisensi lama `REVOKED`, lisensi baru `ACTIVE` beserta `module_entitlements`, `NOTIFY license_installed` di channel `cikal_ops`, dan audit `LICENSE_INSTALLED`.
6. Setelah commit, cache lisensi di semua proses dibuang; menu, rute, editor rute, dan langkah orchestrator memakai daftar modul baru (AC-100.01, AC-100.03). Modul yang tidak ada di image tetap tidak tersedia walau tercantum di lisensi (PK-02); respons menandainya di `modulesNotInPackage`.

**Output 200**

```json
{
  "data": { "licenseNumber": "PPU-LIC-2026-0001", "validTo": "2027-12-31", "modules": ["CORE", "M06", "M07", "M08", "M09", "M10", "M11", "M14", "M15"], "modulesNotInPackage": ["M14"] },
  "message": "License installed"
}
```

**Errors**

| code | status | condition |
|---|---|---|
| `LICENSE_INVALID` | 422 | "License file is invalid" (AC-100.02) |
| `UNSUPPORTED_FILE_TYPE` | 415 | "Allowed file types: json" (teks usulan engineering) |
| `VALIDATION_FAILED` | 400 | Field `file` tidak ada, lebih dari satu berkas, atau body multipart rusak |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Tanpa header |

**Traceability:** US-100; AC-100.01, AC-100.02, AC-100.03.

## 4.3 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /companies`, `POST /companies`, `PUT /companies/{id}` | Daftarkan company dengan dua akun awal (Admin, Checker); kode 3 digit | `SYS-COMPANY` | US-15; AC-15.04 |
| `POST /companies/{targetId}/copy-configuration` | Salin konfigurasi dari company lain tanpa menimpa; laporan jumlah ditambah dan dilewati | `SYS-COMPANY` CREATE | US-16; AC-16.01, AC-16.02 |
| `GET /licenses`, `POST /licenses/{id}/revoke` | Kelola lisensi SaaS per company | Tim PPU (`SYS-LICENSE`) | US-99 |
