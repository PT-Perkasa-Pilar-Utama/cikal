# 10. Documents

File, template dokumen, dokumen hasil generate, dan format penomoran dokumen. Modul pemilik: CORE Document ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.9). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.8. Penomoran: grooming v3 DN-01 s.d. DN-10.

Unggahan dokumen pengajuan memakai `12-applications.md` 12.7 karena aturan slot dan checklist milik pengajuan; modul Document menyimpan file dan metadata.

## 10.1 GET /files/{fileId}/download-url

**Purpose:** Pratinjau atau unduhan file (dokumen pengajuan, akad, laporan iDeb).  
**Access:** Sesi aktif; server memeriksa bahwa user berhak melihat pemilik file (pengajuan dalam lingkup datanya dengan `APP-INQUIRY` VIEW, atau tugas yang sedang ia kerjakan, contoh tugas `VERIFICATION` yang `ASSIGNED` kepadanya).

**Input (query):** `disposition` (`inline` default, atau `attachment`).

**Behavior**

1. Cari `document_files` di tenant sesi; cari pemiliknya (pengajuan, GeneratedDocument). Di luar lingkup: `404 NOT_FOUND`.
2. Buat URL bertanda tangan S3 berumur 5 menit ([../technical-specs/07-security.md](../technical-specs/07-security.md) 7.7). File tidak pernah disajikan dari origin aplikasi. URL menandatangani `response-content-type` `application/pdf` dan `response-content-disposition` dengan `disposition` dan `fileName`; `fileName` adalah nama unggahan dengan ekstensi `.pdf`.
3. Catat audit `VIEW_DOCUMENT` (Data Access).

**Output 200**

```json
{ "data": { "url": "https://s3.bankcontoh.co.id/cikal-uat/tenants/...?X-Amz-Signature=...", "expiresAt": "2026-10-21T08:20:00Z", "fileName": "ktp.pdf", "contentType": "application/pdf", "sizeBytes": 819200 } }
```

**Errors:** `NOT_FOUND` 404.

**Traceability:** US-84 (AC-84.02); US-64 (AC-64.05); US-47 (AC-47.05).

## 10.2 Token format nomor

| Token | Arti | Contoh |
|---|---|---|
| `{SEQ:n}` | Nomor urut dengan `n` digit (3 s.d. 9), diisi nol di depan; wajib tepat satu | `00001` |
| `{BRANCH_CODE}` | Kode cabang pengajuan | `011` |
| `{PRODUCT_CODE}` | Kode produk | `KPR` |
| `{COMPANY_CODE}` | Kode company | `001` |
| `{YYYY}`, `{YY}` | Tahun | `2026`, `26` |
| `{MM}` | Bulan dua digit | `10` |
| `{MM_ROMAN}` | Bulan angka Romawi | `X` |
| `{DD}` | Tanggal dua digit | `21` |

Teks lain di pola disalin apa adanya. Daftar ini mengikuti grooming v3; token baru ditambahkan lewat rilis.

## 10.3 GET /document-number-formats

**Purpose:** Halaman "Document Number Format": format ACTIVE per jenis dokumen.  
**Access:** `MST-NUMBERING` VIEW.

**Output 200**

```json
{
  "data": [
    { "id": "0192...", "documentType": "SP3K", "pattern": "{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}", "resetPeriod": "MONTHLY", "counterScope": "BRANCH",
      "versionNumber": 1, "status": "ACTIVE", "effectiveFrom": "2026-10-01T00:00:00Z", "hasPendingChange": false },
    { "id": "0192...", "documentType": "CONTRACT", "pattern": "{BRANCH_CODE}/PK/{YYYY}/{SEQ:6}", "resetPeriod": "YEARLY", "counterScope": "BRANCH",
      "versionNumber": 1, "status": "ACTIVE", "effectiveFrom": "2026-10-01T00:00:00Z", "hasPendingChange": false }
  ]
}
```

**Traceability:** US-102.

## 10.4 POST /document-number-formats/preview

**Purpose:** Pratinjau nomor saat Maker mengetik pola, sebelum Submit.  
**Access:** `MST-NUMBERING` VIEW.

**Input (body):** `documentType` (`SP3K`, `CONTRACT`), `pattern` (string, maks 100), `resetPeriod`, `counterScope`.

**Behavior:** Validasi pola seperti 10.5 langkah 1 dan 2; render dengan contoh cabang `011`, produk `KPR`, kode company tenant sesi, tanggal bisnis hari ini, dan nomor urut 1. Tidak menyentuh counter.

**Output 200:** `{"data":{"preview":"SP3K-011-202610-00001"}}` (AC-102.01).

**Errors:** `INVALID_SEQUENCE_TOKEN` 422, `UNKNOWN_TOKEN` 422 (10.5).

**Traceability:** US-102; AC-102.01, AC-102.04, AC-102.05.

## 10.5 PUT /document-number-formats/{documentType}

**Purpose:** Maker mengajukan format nomor baru untuk SP3K atau nomor kontrak.  
**Access:** `MST-NUMBERING` UPDATE.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| pattern | string | ya | maks 100 |
| resetPeriod | enum | ya | `NONE`, `YEARLY`, `MONTHLY`, `DAILY` |
| counterScope | enum | ya | `COMPANY`, `BRANCH`, `PRODUCT`, `BRANCH_PRODUCT` |
| effectiveFrom | timestamp | tidak | default saat disetujui |

**Behavior**

1. Pola tidak memuat tepat satu `{SEQ:n}` dengan `n` 3 s.d. 9: `422 INVALID_SEQUENCE_TOKEN` (AC-102.04).
2. Token di luar 10.2: `422 UNKNOWN_TOKEN`, pesan menyebut token pertama yang tidak dikenal (AC-102.05).
3. `409 PENDING_CHANGE_REQUEST` bila ada versi `WAITING_APPROVAL`.
4. Buat versi baru dan ChangeRequest `DOCUMENT_NUMBER_FORMAT`. Setelah ACTIVE, nomor berikutnya dibentuk dari format ini; counter baru per `(format, scopeKey, periodKey)` mulai dari 1 (AC-102.02, AC-102.03).

**Output 202**

```json
{ "data": { "changeRequestId": "0192...", "entityType": "DOCUMENT_NUMBER_FORMAT", "status": "WAITING_APPROVAL", "versionNumber": 2, "preview": "SP3K-011-202610-00001" },
  "message": "Data submitted for approval" }
```

**Errors**

| code | status | condition |
|---|---|---|
| `INVALID_SEQUENCE_TOKEN` | 422 | "Pattern must contain exactly one sequence token {SEQ:n} with n between 3 and 9" (AC-102.04) |
| `UNKNOWN_TOKEN` | 422 | "Unknown token: BRANCH_NAME" (AC-102.05) |
| `PENDING_CHANGE_REQUEST` | 409 | AC-12.06 |
| `NOT_FOUND` | 404 | `documentType` tidak dikenal |

**Traceability:** US-102; AC-102.01 s.d. AC-102.05.

## 10.6 Pembentukan nomor (internal)

Tidak ada endpoint publik. `document.nextNumber(documentType, scope, date)` dipanggil di transaksi pemanggil saat SP3K dibuat (`16-approvals.md` 16.6) dan saat akad dicetak (`25-disbursement.md` 25.3); nomor batal bersama operasinya. Pemanggil menyimpan nomor dan memakainya lagi untuk cetak ulang.

Format default DN-10 (SP3K `{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}` reset `MONTHLY`, kontrak `{BRANCH_CODE}/PK/{YYYY}/{SEQ:6}` reset `YEARLY`, keduanya cakupan `BRANCH`) dipasang sebagai versi 1 ACTIVE oleh `create-admin` untuk company baru dan oleh seed `dev` untuk company 001. Counter: `scope_key` = kode company, kode cabang, kode produk, atau `<cabang>-<produk>`; `period_key` = `ALL`, `YYYY`, `YYYYMM`, atau `YYYYMMDD`. Pengajuan tanpa cabang (dibuat role pusat) memakai kode cabang `000`.

| Aturan | Rujukan |
|---|---|
| Satu nomor per dokumen; cetak ulang memakai nomor yang sama | AC-102.08 |
| `UPDATE ... SET last_number = last_number + 1 RETURNING` pada baris counter; dua dokumen bersamaan mendapat nomor berbeda dan berurutan | AC-102.07 |
| Periode berganti membuat baris counter baru | AC-102.03 |
| Nomor melewati kapasitas `{SEQ:n}`: operasi pemanggil gagal `422 DOCUMENT_NUMBER_EXHAUSTED` "Document number sequence for SP3K has reached its limit. Please contact your administrator" | AC-102.06 |
| Jenis dokumen tanpa format ACTIVE: operasi pemanggil gagal `422 DOCUMENT_NUMBER_FORMAT_NOT_SET` "Document number format for SP3K is not set. Please contact your administrator" (teks usulan engineering) | Keputusan TL 2026-10-28 |

## 10.7 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /document-templates`, `POST /document-templates`, `PUT /document-templates/{id}` | Unggah template Word (maks 5 MB) per kode dokumen dan produk; placeholder di luar katalog ditolak | `MST-TEMPLATE` | US-24; AC-24.03 |
| `GET /document-templates/placeholders` | Katalog placeholder | `MST-TEMPLATE` VIEW | US-24 |

Di POC, template akad berasal dari seed (grooming v2 POC).
