# 17. Reporting and Audit

Inquiry pengajuan, dashboard, ekspor, dan jejak audit. Modul pemilik: CORE Reporting ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.17) dan CORE Audit (5.7). View memakai `security_invoker = true` sehingga RLS tenant berlaku.

## 17.1 GET /applications

**Purpose:** Halaman "Application Inquiry": cari dan saring pengajuan.  
**Access:** `APP-INQUIRY` VIEW; lingkup data user (TN-02). Draft hanya terlihat oleh pembuatnya.

**Input (query)**

| field | type | required | notes |
|---|---|---|---|
| q | string | tidak | Loan ID atau nama pemohon, cocok sebagian, tanpa membedakan huruf besar dan kecil (`pg_trgm`) |
| state | enum | tidak | `stepCode` langkah saat ini (label UI "State"), contoh `APPROVAL` (AC-83.02) |
| status | enum | tidak | `Application.status` |
| productId, branchId | uuid | tidak | |
| submittedFrom, submittedTo | date | tidak | inklusif |
| page, pageSize | | tidak | default 20 |
| sort | string | tidak | `modifiedAt` (default `modifiedAt,desc`), `submittedAt`, `loanId`, `fullName`, `requestedLimit` |

**Output 200**

```json
{
  "data": [ { "id": "0192...", "loanId": "20102026KTA0000013", "fullName": "Rudi Hartono", "idCardNumberMasked": "3273********0001", "productCode": "KTA", "branchCode": "011",
              "requestedLimit": "20000000.00", "status": "ON_PROGRESS", "state": "APPROVAL", "submittedAt": "2026-10-20T07:30:00Z", "modifiedAt": "2026-10-21T03:00:00Z" } ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 41, "totalPages": 3 }
}
```

Data dibaca dari view `reporting.application_inquiry` (`security_invoker`, XM-07); NIK didekripsi lalu disamarkan 4 digit awal dan akhir. `submittedFrom` dan `submittedTo` adalah tanggal bisnis Asia/Jakarta. Klien menampilkan "41 items" dari `meta.totalItems` (AC-83.05) dan memanggil ulang setiap 30 detik agar perubahan langkah tampil (AC-83.06). Hasil kosong: `data: []`, klien menampilkan "No applications found" (AC-83.04).

**Errors:** `INVALID_DATE_RANGE` 422 "End date must be on or after start date" (AC-83.07).

**Traceability:** US-83; AC-83.01 s.d. AC-83.07.

## 17.2 GET /audit-logs

**Purpose:** Halaman "Audit Trail".  
**Access:** `RPT-AUDIT` VIEW. Tidak ada operasi ubah atau hapus jejak audit; role aplikasi hanya punya `INSERT` dan `SELECT` (AC-14.05, AD-03).

**Input (query)**

| field | type | required | notes |
|---|---|---|---|
| occurredFrom, occurredTo | date | ya | rentang maksimal 366 hari |
| module | string | tidak | contoh `Product` |
| eventType | enum | tidak | `MASTER_DATA`, `APPLICATION_ACTION`, `AUTHENTICATION`, `DATA_ACCESS` |
| userId | uuid | tidak | |
| recordId | string | tidak | |
| page, pageSize, sort | | tidak | `sort`: `occurredAt` (default desc) |

**Output 200**

```json
{ "data": [ { "id": "0192...", "occurredAt": "2026-10-21T03:05:00Z", "user": { "username": "checker.001" }, "role": "Checker", "module": "Product", "eventType": "MASTER_DATA",
              "action": "APPROVE", "recordId": "KTA", "description": "Approve change request", "ipAddress": "10.10.1.25" } ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 12, "totalPages": 1 } }
```

`eventType = AUTHENTICATION` mencakup `LOGIN`, `LOGIN_FAILED`, `LOGOUT` dengan alamat IP (AC-14.06). `eventType` tidak disimpan; nilainya diturunkan dari `action` dan `module`: `LOGIN`, `LOGIN_FAILED`, `LOGOUT` = `AUTHENTICATION`; `VIEW_APPLICATION`, `VIEW_DOCUMENT` = `DATA_ACCESS`; aksi lain modul `Application`, `Approval`, `Task Queue`, `Process Monitoring`, `Document` = `APPLICATION_ACTION`; selain itu `MASTER_DATA`. Tanggal periode adalah tanggal bisnis Asia/Jakarta, inklusif.

**Errors**

| code | status | condition |
|---|---|---|
| `INVALID_DATE_RANGE` | 422 | "End date must be on or after start date" (AC-14.03) |
| `DATE_RANGE_TOO_LONG` | 422 | "Search period must not exceed 366 days" (AC-14.04) |

**Traceability:** US-14; AC-14.01, AC-14.03 s.d. AC-14.06.

## 17.3 GET /audit-logs/{id}

**Purpose:** Detail perubahan: data sebelum dan sesudah berdampingan.  
**Access:** `RPT-AUDIT` VIEW.

**Output 200:** baris 17.2 ditambah `oldData`, `newData`, `changedFields`. `changedFields` berisi path bertitik field yang berbeda (array dibandingkan utuh), kosong bila tidak ada data sebelum. Data yang bukan objek dibungkus `{"value": ...}`. Nilai `SECRET` tidak pernah tercatat (PR-12).

**Errors:** `NOT_FOUND` 404.

**Traceability:** US-14; AC-14.02, AC-14.05.

## 17.4 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /dashboard/summary` | Ringkasan jumlah dan nominal per status, langkah, cabang, periode | `RPT-DASHBOARD` VIEW | US-81 |
| `POST /reports/applications/export` | Ekspor Excel maksimal 50.000 baris, NIK disamarkan, berjalan sebagai job | `RPT-DASHBOARD` VIEW | US-82; AC-82.03, AC-82.05 |
| `GET /reports/exports/{id}` | Status dan URL unduhan hasil ekspor | `RPT-DASHBOARD` VIEW | US-82 |
