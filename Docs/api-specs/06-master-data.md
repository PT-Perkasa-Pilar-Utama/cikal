# 6. Master Data

General Parameter, data wilayah, asuransi, dan parameter sistem. Modul pemilik: CORE Master Data ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.4). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.6.

## 6.1 GET /parameters/{paramType}/options

**Purpose:** Nilai aktif General Parameter untuk dropdown form pengajuan dan master (Application Type, Segment, Gender, Religion, Education, Marital, Occupation, Source of Income, Industry of Profession, Relation with Applicant, Document).  
**Access:** Sesi aktif dengan View pada `APP-ENTRY`, `APP-INQUIRY`, atau menu `MST-*`.

**Input:** path `paramType` (contoh `Occupation`, peka huruf sesuai seed); query `includeInactive` (boolean, default `false`).

**Behavior:** Dibaca dari `masterdata.general_parameters` di tenant sesi, urut `paramId`; tanpa cache selama General Parameter hanya diisi seed (penulisan di 6.4 backlog). Nilai nonaktif tidak ditawarkan untuk input baru, tetapi tetap terbaca di data lama lewat `includeInactive=true` (AC-21.03).

**Output 200**

```json
{ "data": [ { "paramId": "001", "paramValue": "Karyawan Swasta", "isActive": true }, { "paramId": "005", "paramValue": "Wiraswasta", "isActive": true } ] }
```

Daftar pilihan tidak memakai paging.

**Errors:** `NOT_FOUND` 404 bila `paramType` tidak dikenal.

**Traceability:** US-21 (AC-21.03); dipakai US-39, US-40, US-44, US-48, US-25.

## 6.2 GET /insurances

**Purpose:** Perusahaan asuransi aktif untuk dropdown "Insurance" di step Application.  
**Access:** View pada `APP-ENTRY` atau `MST-PARAMETER`.

**Input (query):** `includeInactive` (boolean).

**Output 200:** `{"data":[{"id":"0192...","insuranceCode":"ASR01","insuranceName":"Asuransi Contoh","isActive":true}]}`

**Traceability:** US-39 (AC-39.01); US-29 (backlog).

## 6.3 Data wilayah

Data wilayah [instalasi] berlaku untuk semua company. Kode wilayah adalah kunci yang disimpan di alamat pengajuan.

### 6.3.1 GET /regions/provinces, /regions/cities, /regions/districts, /regions/sub-districts

**Purpose:** Dropdown alamat berjenjang Province, City, District, Sub District (AC-23.04, AC-40.01).  
**Access:** View pada `APP-ENTRY` atau `MST-REGION`.

**Input (query)**

| Rute | Parameter induk | Wajib |
|---|---|---|
| `/regions/provinces` | | |
| `/regions/cities` | `provinceCode` | ya |
| `/regions/districts` | `cityCode` | ya |
| `/regions/sub-districts` | `districtCode` | ya |

Semua menerima `q` untuk menyaring nama tanpa membedakan huruf besar dan kecil.

**Output 200**

```json
{ "data": [ { "code": "3171", "name": "Kota Jakarta Pusat", "parentCode": "31" } ] }
```

`/regions/sub-districts` menambahkan `zipCode` per baris.

**Errors:** `VALIDATION_FAILED` 400 bila parameter induk kosong.

**Traceability:** US-23 (AC-23.04); US-40 (AC-40.01, AC-40.07).

### 6.3.2 GET /regions/search

**Purpose:** Pencarian wilayah di halaman "Region Data".  
**Access:** `MST-REGION` VIEW.

**Input (query):** `q` (string, minimal 3 karakter, wajib), `page`, `pageSize`.

**Behavior:** Pencarian `pg_trgm` pada nama provinsi, kota, kecamatan, kelurahan, dan kode pos, tanpa membedakan huruf besar dan kecil (AC-23.03).

**Output 200**

```json
{
  "data": [ { "provinceCode": "31", "provinceName": "DKI Jakarta", "cityCode": "3171", "cityName": "Kota Jakarta Pusat", "districtCode": "317101", "districtName": "Gambir", "subDistrictCode": "3171011001", "subDistrictName": "Gambir", "zipCode": "10110" } ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 6, "totalPages": 1, "lastSyncAt": "2026-10-21T02:00:00Z" }
}
```

**Traceability:** US-23; AC-23.03.

### 6.3.3 POST /regions/sync

**Purpose:** Maker menjalankan sinkronisasi wilayah dari Oksara (tombol "Sync Region Data").  
**Access:** `MST-REGION` UPDATE. Data wilayah tidak lewat checker-maker karena sumbernya penyedia resmi.

**Input:** tanpa body.

**Behavior**

1. Satu sinkronisasi berjalan per instalasi; permintaan saat masih berjalan: `409 SYNC_IN_PROGRESS`.
2. Enqueue job `masterdata.region-sync` (pg-boss) lewat `RegionDataPort` (adapter Oksara, simulasi di dev/test).
3. Job mengambil seluruh data Oksara ke memori lebih dulu, lalu membandingkan dan menulisnya dalam satu transaksi. Gagal, timeout, kode ganda, atau kelurahan tanpa kode pos: data lama tidak berubah (AC-23.02).
4. Cabang yang induknya tidak ada di Oksara (contoh kecamatan kabupaten 9209 dan 9210 setelah pemekaran Papua Barat Daya) tidak disimpan dan dicatat di log worker. Baris lokal yang hilang di Oksara tidak dihapus, karena kodenya mungkin dipakai alamat pengajuan.
5. Hasil disimpan di baris `masterdata.region_syncs`: jumlah ditambah, diubah, waktu selesai. Sinkronisasi RUNNING lebih dari 30 menit dianggap gagal (`TIMEOUT`) saat sinkronisasi berikutnya diminta.

**Output 202**

```json
{ "data": { "syncId": "0192...", "status": "RUNNING", "startedAt": "2026-10-21T08:00:00Z" } }
```

**Errors:** `SYNC_IN_PROGRESS` 409 "Region sync is already running" (teks usulan engineering).

**Traceability:** US-23; AC-23.01, AC-23.02.

### 6.3.4 GET /regions/sync/{syncId}

**Purpose:** Klien memantau hasil sinkronisasi (polling 2 detik) lalu menampilkan pesan.  
**Access:** `MST-REGION` VIEW.

**Output 200**

| status | Body `data` | `message` |
|---|---|---|
| `RUNNING` | `{ "status": "RUNNING" }` | |
| `COMPLETED` | `{ "status": "COMPLETED", "added": 12, "updated": 3, "finishedAt": "...", "lastSyncAt": "..." }` | "Region sync completed: 12 added, 3 updated" (AC-23.01) |
| `FAILED` | `{ "status": "FAILED", "errorCategory": "TIMEOUT" }`; `errorCategory` IN-07 atau `null` bila kegagalan bukan dari penyedia | "Region sync failed. Existing data is unchanged" (AC-23.02) |

**Errors:** `NOT_FOUND` 404.

**Traceability:** US-23; AC-23.01, AC-23.02.

## 6.4 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /parameters`, `POST /parameters`, `PUT /parameters/{id}` | Kelola General Parameter lewat checker-maker; nilai unik per tipe | `MST-PARAMETER` | US-21 |
| `POST /parameters/import`, `GET /parameters/export` | Impor Excel sebagai satu paket ChangeRequest; ekspor | `MST-PARAMETER` | US-22; AC-12.07 |
| `POST /insurances`, `PUT /insurances/{id}`, `PUT /insurances/{id}/rates` | Asuransi dan tabel tarif | `MST-PARAMETER` | US-29 |
| `GET /system-parameters`, `PUT /system-parameters/{key}` | Parameter sistem berversi dengan cakupan tenant atau produk; nilai SECRET hanya bisa diganti | `MST-PARAMETER` | US-30; PR-03, PR-09 |
