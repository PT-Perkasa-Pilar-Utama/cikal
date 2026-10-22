# 4. Tenancy and License

Company, lisensi modul, dan salin konfigurasi. Modul pemilik: CORE Tenant & License ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.2). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.5. Kontrol lisensi: [../technical-specs/07-security.md](../technical-specs/07-security.md) 7.6.

## 4.1 GET /license

**Purpose:** Halaman "License": modul berlisensi dan masa berlaku.  
**Access:** `SYS-LICENSE` VIEW.

**Behavior:** Membaca lisensi `ACTIVE` company sesi dari cache memori (LC-04).

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

`status = EXPIRED` berarti aplikasi dalam mode baca saja (LC-06). `maxUsers` disimpan tanpa ditegakkan (TO-04).

**Errors:** `NOT_FOUND` 404 "No license is installed" bila belum ada lisensi.

**Traceability:** US-100; AC-100.01.

## 4.2 POST /license

**Purpose:** Super User memasang file lisensi bertanda tangan di instalasi on-premise.  
**Access:** `SYS-LICENSE` UPDATE. Tetap bisa dipanggil saat lisensi kedaluwarsa (pengecualian dari `LICENSE_EXPIRED`).  
**Idempotency:** wajib.

**Input:** `multipart/form-data`, field `file` (JSON lisensi, maksimal 64 KB).

**Behavior**

1. Parse JSON; ambil isi kanonik dan tanda tangan Ed25519.
2. Verifikasi tanda tangan dengan kunci publik PPU yang tertanam di image. Gagal, JSON rusak, atau `companyCode` bukan company sesi: `422 LICENSE_INVALID`; lisensi lama tetap berlaku (AC-100.02).
3. `validTo` sudah lewat: `422 LICENSE_INVALID`.
4. Dalam satu transaksi: lisensi lama `REVOKED`, lisensi baru `ACTIVE` beserta `module_entitlements`.
5. `NOTIFY` membuang cache lisensi di semua proses; menu, rute, editor rute, dan langkah orchestrator memakai daftar modul baru (AC-100.01, AC-100.03). Modul yang tidak ada di image tetap tidak tersedia walau tercantum di lisensi (PK-02); respons menandainya.
6. Catat audit `LICENSE_INSTALLED`.

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
| `UNSUPPORTED_FILE_TYPE` | 415 | Bukan JSON |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Tanpa header |

**Traceability:** US-100; AC-100.01, AC-100.02, AC-100.03.

## 4.3 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /companies`, `POST /companies`, `PUT /companies/{id}` | Daftarkan company dengan dua akun awal (Admin, Checker); kode 3 digit | `SYS-COMPANY` | US-15; AC-15.04 |
| `POST /companies/{targetId}/copy-configuration` | Salin konfigurasi dari company lain tanpa menimpa; laporan jumlah ditambah dan dilewati | `SYS-COMPANY` CREATE | US-16; AC-16.01, AC-16.02 |
| `GET /licenses`, `POST /licenses/{id}/revoke` | Kelola lisensi SaaS per company | Tim PPU (`SYS-LICENSE`) | US-99 |
