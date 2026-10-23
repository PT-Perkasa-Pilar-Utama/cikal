# 27. System

Endpoint operasional: health dan reset state. Pemilik: Platform ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.0.2). Kebijakan: [../technical-specs/07-security.md](../technical-specs/07-security.md) 7.8. Variabel: [../technical-specs/11-environment-configuration.md](../technical-specs/11-environment-configuration.md) 11.2, 11.3.

Endpoint di file ini berada di luar versi API (`/api/...`, bukan `/api/v1/...`) agar alamat healthcheck tidak berubah saat versi API naik.

## 27.1 GET /api/health/live

**Purpose:** Liveness proses untuk healthcheck Docker dan load balancer.  
**Access:** Publik. Tanpa sesi, tanpa rate limit.

**Behavior:** Tidak menyentuh dependensi apa pun; menjawab selama event loop proses berjalan.

**Output 200:** `{"status":"ok"}`. Tanpa versi atau informasi dependensi.

**Errors:** tidak ada; proses yang mati tidak menjawab.

## 27.2 GET /api/health/ready

**Purpose:** Kesiapan dan status setiap dependensi, untuk monitoring dan deteksi keadaan setengah rusak (contoh aplikasi hidup tetapi database terhapus atau tidak terjangkau).  
**Access:** Jaringan internal (Nginx membatasi ke subnet monitoring) atau header `Authorization: Bearer <MONITORING_TOKEN>`. Dari luar tanpa token: `401 UNAUTHENTICATED`.

**Behavior**

| Dependensi | Pemeriksaan | Kritis |
|---|---|---|
| `database` | `SELECT 1` dengan timeout 2 detik; migrasi terakhir dari ledger | ya |
| `objectStorage` | `HeadBucket` dengan timeout 2 detik | ya |
| `queue` | Jumlah job pending dan gagal satu jam terakhir di skema `pgboss` | tidak |
| `pdfConverter` | `GET /health` Gotenberg | tidak |
| `integrations` | Hasil uji koneksi terakhir per modul berlisensi (tidak memanggil penyedia saat request) | tidak |

Status keseluruhan: `down` bila dependensi kritis gagal; `degraded` bila hanya non-kritis; selain itu `ok`. Hasil di-cache 5 detik agar polling tidak membebani database.

**Output**

| Status keseluruhan | HTTP |
|---|---|
| `ok`, `degraded` | 200 |
| `down` | 503 |

```json
{
  "status": "degraded",
  "version": "1.0.0",
  "checkedAt": "2026-10-21T08:00:00Z",
  "dependencies": {
    "database": { "status": "ok", "latencyMs": 3, "migration": "0042_m07_dukcapil" },
    "objectStorage": { "status": "ok", "latencyMs": 12 },
    "queue": { "status": "ok", "pending": 4, "failedLastHour": 0 },
    "pdfConverter": { "status": "ok", "latencyMs": 40 },
    "integrations": { "M07": { "status": "degraded", "provider": "DUKCAPIL_ASIS", "lastTestAt": "2026-10-21T07:55:00Z", "lastError": "TIMEOUT" } }
  }
}
```

Body ini tidak memakai envelope `data` karena dibaca alat monitoring.

**Errors:** `UNAUTHENTICATED` 401 (token salah dari luar jaringan internal).

**Traceability:** Operasional ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.0.2); NFR ketersediaan.

## 27.3 GET /api/metrics

**Purpose:** Metrik Prometheus (request, latensi, antrean, panggilan integrasi).  
**Access:** sama dengan 27.2.  
**Output 200:** `text/plain; version=0.0.4`.  
**Traceability:** [../technical-specs/08-non-functional-requirements.md](../technical-specs/08-non-functional-requirements.md) (observability).

## 27.4 POST /api/admin/reset-state

**Purpose:** QA mengembalikan database ke keadaan awal yang diketahui (seed `dev` atau `qa`) tanpa sesi host manual.

**Ketersediaan:** Rute **hanya didaftarkan** bila `APP_ENV` salah satu `dev`, `test`, `sit`, `uat` **dan** `ENABLE_RESET_API=true`. `OpsModule` memasang controller ini secara kondisional saat bootstrap; di production controller tidak dimuat sehingga rute tidak ada dan permintaan mendapat `404` dari router, bukan penolakan otorisasi. Konfigurasi production menolak start bila `ENABLE_RESET_API=true`.

**Access (di lingkungan yang memasangnya):** sesi web dengan `QA-RESET` UPDATE, header `X-CSRF-Token`, dan header `X-Reset-Token` yang cocok dengan isi `RESET_API_TOKEN_FILE`. Lisensi tidak diperiksa (`@LicenseExempt`), karena reset memasang ulang lisensi seed walau lisensi tersimpan hilang atau kedaluwarsa.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| seed | enum | tidak | `dev` atau `qa`; default `DEFAULT_RESET_SEED` |

**Behavior** (sinkron)

1. Kunci advisory PostgreSQL; reset lain sedang berjalan: `409 RESET_IN_PROGRESS`.
2. Hentikan konsumen worker pg-boss.
3. `DROP SCHEMA ... CASCADE` untuk semua skema aplikasi dan `pgboss` memakai `DATABASE_MIGRATION_URL`.
4. Jalankan migrasi per modul berlisensi (runner `platform/migrate`, [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.12).
5. Jalankan seed terpilih (idempoten, per modul).
6. Kosongkan bucket lingkungan.
7. Nyalakan kembali konsumen worker; buang semua cache memori lewat `NOTIFY`.
8. Semua sesi ikut terhapus; klien harus login ulang dengan akun seed.

**Output 200**

```json
{ "seed": "qa", "durationMs": 8420, "migrationsApplied": 42, "tenantsSeeded": ["001"], "bucketObjectsDeleted": 17 }
```

**Errors**

| code | status | condition |
|---|---|---|
| (rute tidak ada) | 404 | Production, atau `ENABLE_RESET_API` tidak `true` |
| `UNAUTHENTICATED` | 401 | Tanpa sesi |
| `ACTION_DENIED` | 403 | Tanpa `QA-RESET` UPDATE |
| `RESET_TOKEN_INVALID` | 403 | `X-Reset-Token` kosong atau salah |
| `VALIDATION_FAILED` | 400 | `seed` bukan `dev` atau `qa` |
| `RESET_IN_PROGRESS` | 409 | Reset lain sedang berjalan |
| `RESET_FAILED` | 500 | Migrasi atau seed gagal; `details` berisi langkah yang gagal; worker tetap dimatikan sampai reset berikutnya berhasil |

**Traceability:** Operasional ([../technical-specs/07-security.md](../technical-specs/07-security.md) 7.8, [../technical-specs/11-environment-configuration.md](../technical-specs/11-environment-configuration.md) 11.3).
