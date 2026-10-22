# 1. Conventions

Kontrak transport yang berlaku untuk setiap operasi. File resource merujuk ke sini dan tidak mengulangnya. Dasar aturan: konvensi API BA (API-01 s.d. API-07, `Docs/cikal-tech-reference.md` 12) dan [../technical-specs/04-tech-stack.md](../technical-specs/04-tech-stack.md) 4.2.

## 1.1 Alamat dan transport

| Hal | Aturan |
|---|---|
| Base URL | `https://<host>/api/v1` (API-01). Endpoint operasional di luar versi: `/api/health/*`, `/api/admin/reset-state` (`27-system.md`) |
| Content type | `application/json; charset=utf-8`. Unggahan file `multipart/form-data` |
| Ukuran body | JSON maksimal 1 MB; file maksimal `UPLOAD_MAX_MB` (default 2 MB) ([../technical-specs/07-security.md](../technical-specs/07-security.md) 7.5) |
| Penamaan | Field JSON `camelCase`, kode dan enum bahasa Inggris `SCREAMING_SNAKE_CASE` (API-07) |
| Field tak dikenal | Ditolak `400 VALIDATION_FAILED` (skema Zod strict) |
| Kontrak mesin-baca | OpenAPI 3.1 dibangkitkan dari skema Zod di `packages/contracts`, disajikan di `GET /api/v1/openapi.json` pada lingkungan selain production (API-02) |

## 1.2 Tipe data di wire

| Tipe | Format | Contoh |
|---|---|---|
| ID | UUID v7 string | `"0192b6a0-7c1e-7b3a-9f41-2d6c1e0a9b11"` |
| Uang | String desimal 2 angka di belakang titik, rupiah | `"20000000.00"` |
| Persen | String desimal 4 angka | `"12.0000"` (berarti 12% p.a.) |
| Skor | String desimal 0 s.d. 1, 4 angka | `"0.8750"` |
| Tanggal bisnis | `YYYY-MM-DD` | `"2026-10-21"` |
| Waktu | ISO 8601 UTC dengan `Z` | `"2026-10-21T08:15:00Z"` |
| Boolean, angka bulat | JSON native | `true`, `36` |

Uang dan persen dikirim sebagai string agar tidak melewati float (DM-06, [../technical-specs/04-tech-stack.md](../technical-specs/04-tech-stack.md) 4.8). Klien menampilkan format lokal (`20.000.000`, `12% p.a.`).

Field sensitif (NIK, NPWP, nomor KK, nama ibu kandung, nomor rekening) dikembalikan tersamar di daftar dan ekspor (`3273********0001`) dan utuh hanya di detail untuk role yang berhak ([../technical-specs/07-security.md](../technical-specs/07-security.md) 7.4).

## 1.3 Autentikasi per kanal

| Kanal | Kredensial di request | Rujukan |
|---|---|---|
| Web (SPA) | Cookie `cikal_sid` (HttpOnly) + header `X-CSRF-Token` berisi nilai cookie `cikal_csrf` untuk metode selain GET/HEAD | [../technical-specs/09-authentication-authorization.md](../technical-specs/09-authentication-authorization.md) 9.1 |
| Mobile (M01), API mitra (M02) | `Authorization: Bearer <JWT>` | 9.1 |
| Monitoring | `Authorization: Bearer <MONITORING_TOKEN>` | `27-system.md` |
| Callback penyedia | Sesuai adapter | `11-integrations.md` 11.6 |

Deviasi dari API-03: web memakai cookie sesi, bukan Bearer, agar sesi bisa dicabut seketika dan token tidak terbaca JavaScript (keputusan grill technical spec, `../technical-specs/07-security.md` 7.1). Aturan inti API-03 tetap: tenant selalu diambil dari sesi atau token, tidak pernah dari parameter request.

## 1.4 Envelope sukses

Objek tunggal:

```json
{
  "data": { "id": "0192b6a0-7c1e-7b3a-9f41-2d6c1e0a9b11", "productCode": "KTA" },
  "message": "Data approved"
}
```

`message` hanya ada bila AC menetapkan teks yang ditampilkan; isinya persis teks AC dan dipakai klien apa adanya.

Koleksi:

```json
{
  "data": [ { "id": "...", "loanId": "20102026KTA0000013" } ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 41, "totalPages": 3 }
}
```

`204 No Content` dipakai untuk operasi tanpa body balasan (logout).

## 1.5 Envelope error

Format seragam API-04:

```json
{
  "code": "VALIDATION_FAILED",
  "message": "Please complete all required fields",
  "details": [
    { "field": "personal.idCardNumber", "code": "INVALID_FORMAT", "message": "ID card number must be 16 digits" }
  ],
  "correlationId": "c0a8012e-5f3a-4d8e-9b0f-1d2e3f4a5b6c"
}
```

| Field | Aturan |
|---|---|
| `code` | Bahasa Inggris, stabil, dipakai klien untuk logika |
| `message` | Teks persis AC, bahasa Inggris sesuai UI; bila AC tidak menetapkan, teks generik dari tabel 1.10 |
| `details[]` | Error per field: `field` berupa path JSON bertitik, `message` teks AC yang tampil di bawah field |
| `correlationId` | Sama dengan header respons `X-Correlation-Id` dan log server |

## 1.6 Paging, sorting, filter

| Parameter | Aturan | Rujukan |
|---|---|---|
| `page` | Mulai 1, default 1 | API-05 |
| `pageSize` | Default 20, maksimal 100 | API-05, AC-83.05 |
| `sort` | `field,asc` atau `field,desc`; satu kolom; field yang boleh diurutkan ditulis per operasi | API-05, AC-83.03 |
| Filter rentang tanggal | `<nama>From` dan `<nama>To`, inklusif; `To` sebelum `From` = `422 INVALID_DATE_RANGE` "End date must be on or after start date" | AC-14.03, AC-83.07 |
| Pencarian teks | `q`, tidak membedakan huruf besar dan kecil, cocok sebagian (`pg_trgm`) | AC-23.03, AC-83.01 |

Daftar kosong mengembalikan `200` dengan `data: []`; teks "No applications found" dan sejenisnya dirender klien (AC-83.04).

## 1.7 Idempotensi

Header `Idempotency-Key` (UUID, dibuat klien per aksi pengguna) mengikuti API-06.

| Hal | Aturan |
|---|---|
| Wajib | Operasi bertanda **Idempotency: wajib** di file resource: submit pengajuan, keputusan approval, verifikasi dokumen submit, validity check, print akad, record disbursement, retry dan finish proses, install lisensi |
| Opsional | Semua POST, PUT, PATCH lain menerima header bila dikirim |
| Cakupan kunci | Per user (atau per mitra) per kunci, disimpan 24 jam |
| Ulangan | Kunci sama dan body sama: server mengembalikan status dan body pertama dengan header `Idempotent-Replayed: true` |
| Konflik | Kunci sama, body beda: `409 IDEMPOTENCY_KEY_REUSED` |
| Tanpa header pada operasi wajib | `400 IDEMPOTENCY_KEY_REQUIRED` |

Klik ganda tetap dicegah aturan domain bila klien tidak mengirim kunci yang sama (AC-50.07, AC-72.07).

## 1.8 Pola checker-maker

Data master berubah lewat ChangeRequest (CM-01 s.d. CM-08, [../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.6).

| Langkah | Kontrak |
|---|---|
| Maker membuat atau mengubah | `POST /<resource>` atau `PUT /<resource>/{id}` dengan body bentuk resource. Validasi field dan aturan resource dijalankan saat itu juga. Sukses = `202 Accepted` |
| Body 202 | `{"data":{"changeRequestId":"...","entityType":"PRODUCT","entityId":null,"status":"WAITING_APPROVAL"},"message":"Data submitted for approval"}` |
| Data masih punya permintaan terbuka | `409 PENDING_CHANGE_REQUEST` "This data has a pending submission and cannot be edited" (AC-12.06) |
| Checker meninjau | Lewat `07-change-requests.md` (approve, reject, revise) |
| Data yang dibaca | `GET /<resource>` hanya mengembalikan data yang sudah ACTIVE; permintaan terbuka dibaca lewat `GET /change-requests?entityType=` |

Penghapusan data master tidak ada; data dinonaktifkan dengan `PUT` yang mengubah `isActive` lewat ChangeRequest (DM-05).

## 1.9 Kode status HTTP

| Status | Dipakai untuk |
|---|---|
| 200 OK | Baca, aksi sinkron yang berhasil |
| 201 Created | Data operasional baru (draft pengajuan pertama, file) |
| 202 Accepted | Data master diajukan ke checker-maker; aksi yang diteruskan ke antrean (sync wilayah) |
| 204 No Content | Logout |
| 400 Bad Request | Body atau parameter tidak lolos skema |
| 401 Unauthorized | Tanpa sesi, sesi habis, kredensial salah |
| 403 Forbidden | Tanpa hak menu atau aksi, lisensi, wajib ganti password |
| 404 Not Found | Resource tidak ada atau di luar tenant dan lingkup data user |
| 409 Conflict | Status data tidak mengizinkan aksi, sudah diproses pihak lain, kunci idempotensi bentrok |
| 413 Payload Too Large | File melebihi batas |
| 415 Unsupported Media Type | Ekstensi atau tanda tangan file tidak diizinkan |
| 422 Unprocessable Entity | Aturan bisnis gagal (pesan AC) |
| 423 Locked | Akun terkunci |
| 429 Too Many Requests | Rate limit (`Retry-After` dalam detik) |
| 500 Internal Server Error | Kesalahan tak terduga; `message` generik, detail di log dengan `correlationId` |
| 503 Service Unavailable | Dependensi kritis tidak tersedia |

Data di luar tenant atau lingkup data dijawab `404`, bukan `403`, agar keberadaannya tidak bocor (AC-84.04, TN-03).

## 1.10 Kode error standar

| code | HTTP | message bawaan | Kondisi |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | Please complete all required fields | Skema gagal; `details[]` berisi pesan per field (contoh "This field is required") |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Idempotency-Key header is required | Operasi wajib tanpa header |
| `UNAUTHENTICATED` | 401 | Your session has expired. Please log in again | Tanpa cookie atau token |
| `SESSION_EXPIRED` | 401 | Your session has expired. Please log in again | Idle atau batas absolut (AC-06.03) |
| `SESSION_REPLACED` | 401 | Your session was ended because you logged in from another browser | Login baru di channel sama (AC-06.05) |
| `CSRF_TOKEN_INVALID` | 403 | Your session has expired. Please log in again | Header CSRF tidak cocok |
| `ACCESS_DENIED` | 403 | You do not have access to this page | Tanpa hak View pada menu |
| `ACTION_DENIED` | 403 | You do not have permission to perform this action | Tanpa hak aksi (AC-09.04) |
| `PASSWORD_CHANGE_REQUIRED` | 403 | Please change your initial password before continuing | AC-05.04 |
| `MODULE_NOT_LICENSED` | 403 | You do not have access to this page | Rute modul tak berlisensi (AC-100.03) |
| `LICENSE_EXPIRED` | 403 | License has expired. The application is in read-only mode | Perubahan data saat lisensi kedaluwarsa (LC-06; teks usulan engineering) |
| `NOT_FOUND` | 404 | Data not found | Umum; operasi menimpa dengan teks AC (contoh "Application not found") |
| `PENDING_CHANGE_REQUEST` | 409 | This data has a pending submission and cannot be edited | AC-12.06 |
| `ALREADY_PROCESSED` | 409 | This submission has already been processed | Aksi bersamaan kalah (AC-12.05); operasi bisa menimpa teks |
| `INVALID_STATE` | 409 | This action is not allowed in the current status | Status data tidak mengizinkan aksi |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Idempotency-Key was used with a different request | 1.7 |
| `FILE_TOO_LARGE` | 413 | File must not exceed 2 MB | AC-47.04; angka mengikuti `UPLOAD_MAX_MB` |
| `UNSUPPORTED_FILE_TYPE` | 415 | Allowed file types: png, jpg, jpeg, pdf, docx | AC-47.02 |
| `INVALID_DATE_RANGE` | 422 | End date must be on or after start date | AC-14.03, AC-83.07 |
| `BUSINESS_RULE_VIOLATION` | 422 | (teks AC) | Aturan bisnis tanpa kode khusus |
| `ACCOUNT_LOCKED` | 423 | Your account is locked for 15 minutes due to too many failed attempts | AC-01.05 |
| `RATE_LIMITED` | 429 | Too many requests. Please try again later | Batas `../technical-specs/07-security.md` 7.5 |
| `INTERNAL_ERROR` | 500 | An unexpected error occurred. Please try again | |
| `SERVICE_UNAVAILABLE` | 503 | Service is temporarily unavailable | Database atau storage tidak tersedia |

Kode khusus operasi ditulis di tabel error setiap operasi. Kode autentikasi lengkap ada di [../technical-specs/09-authentication-authorization.md](../technical-specs/09-authentication-authorization.md) 9.6.

## 1.11 Referensi role dan kode menu

Otorisasi setiap operasi memakai `@Requires(menuCode, action)` ([../technical-specs/07-security.md](../technical-specs/07-security.md) 7.2). Aksi: `VIEW`, `CREATE`, `UPDATE`, `DELETE`, `APPROVE`. Role seed mengikuti matriks [../technical-specs/09-authentication-authorization.md](../technical-specs/09-authentication-authorization.md) 9.5; tenant bisa mengubahnya, jadi kontrak terikat ke menu dan aksi, bukan ke nama role.

Kode menu belum ada di data dictionary; tabel ini usulan engineering untuk seed `iam.menus` dan perlu dikonfirmasi BA.

| menuCode | Menu | Modul | Role seed (aksi) |
|---|---|---|---|
| `SYS-COMPANY` | Company, Copy Configuration | CORE | Super User (VCUD) |
| `SYS-MENU` | Menu | CORE | Super User (VCUD) |
| `SYS-LICENSE` | License | CORE | Super User (VCU) |
| `IAM-USER` | User | CORE | Admin Sistem (VCUD), Checker (VA), Auditor (V) |
| `IAM-ROLE` | Role | CORE | Admin Sistem (VCUD), Checker (VA), Auditor (V) |
| `IAM-ROLE-ACCESS` | Role Access | CORE | Admin Sistem (VCUD), Maker (VCU), Checker (VA), Auditor (V) |
| `IAM-USER-ACCESS` | User Access | CORE | Admin Sistem (VCUD), Checker (VA), Auditor (V) |
| `MST-ORG` | Regional, Branch, Sub Branch, Currency | CORE | Maker (VCUD), Checker (VA), Risk Manager (V), Auditor (V) |
| `MST-PARAMETER` | General Parameter, System Parameter | CORE | sama dengan `MST-ORG` |
| `MST-REGION` | Region Data | CORE | sama dengan `MST-ORG` |
| `MST-PRODUCT` | Product, Pricing | CORE | sama dengan `MST-ORG` |
| `MST-ROUTE` | Product Route | CORE | sama dengan `MST-ORG` |
| `MST-CHECKLIST` | Document Checklist | CORE | sama dengan `MST-ORG` |
| `MST-APPROVAL` | Approval Level, Approval Hierarchy | CORE | sama dengan `MST-ORG` |
| `MST-FORMULA` | Formula | CORE | sama dengan `MST-ORG` |
| `MST-INTEGRATION` | Integration Configuration | CORE | sama dengan `MST-ORG` |
| `MST-TEMPLATE` | Document Template | CORE | sama dengan `MST-ORG` |
| `MST-NUMBERING` | Document Number Format | CORE | sama dengan `MST-ORG` |
| `MST-DEDUP` | Dedup Matrix, Dedup Field Setting | M06 | sama dengan `MST-ORG` |
| `MST-DUKCAPIL` | Dukcapil Rule | M07 | sama dengan `MST-ORG` |
| `MST-FRAUD` | Fraud Matrix, Velocity Rule | M08 | sama dengan `MST-ORG` |
| `MST-SCORING` | Scoring Model, RAC Model | M09 | sama dengan `MST-ORG` |
| `MST-CREDIT-BUREAU` | Credit Bureau Outcome Mapping | M10 | sama dengan `MST-ORG` |
| `MST-DECISION` | Decision Matrix | M11 | sama dengan `MST-ORG` |
| `APP-ENTRY` | Application (Data Entry) | CORE | Sales (VCU) |
| `APP-INQUIRY` | Application Inquiry, Application Detail | CORE | semua role (V) |
| `APP-SIMULATION` | Installment Simulation | CORE | Sales (V) |
| `OPS-PRESCREEN` | Prescreen Dedup, Dukcapil L1, Fraud | M06, M07, M08 | Verifikator (VU) |
| `OPS-PRESCREEN-L2` | Prescreen Dukcapil L2, Release Task | M07, CORE | Supervisor (VU) |
| `OPS-VERIFICATION` | Verification | CORE | Verifikator (VU) |
| `OPS-CREDIT-REPORT` | Credit Report Upload | M10 | Verifikator (VU) |
| `OPS-RECONTEST` | Recontest | M11 | Risk Manager (VU) |
| `OPS-APPROVAL` | Approval | CORE | Approver, Kepala Cabang (VA) |
| `OPS-VALIDITY` | Validity Check | M15 | Admin Operasional (VU) |
| `OPS-PRINT-AKAD` | Print Akad, Reprint Akad | M15 | Admin Operasional (VU) |
| `OPS-DISBURSEMENT` | Record Disbursement | M15 | Admin Operasional (VU) |
| `OPS-MONITORING` | Process Monitoring | CORE | Admin Operasional (VU) |
| `RPT-DASHBOARD` | Dashboard, Export | CORE | Risk Manager, Kepala Cabang, Auditor (V) |
| `RPT-AUDIT` | Audit Trail | CORE | Auditor (V) |
| `QA-RESET` | Reset State | CORE | QA (VU), non-production saja |

Aturan tambahan di luar hak menu, ditegakkan server:

| Aturan | Rujukan |
|---|---|
| Pembuat ChangeRequest tidak bisa approve, reject, atau revise permintaannya sendiri | AC-12.04 |
| Penginput pengajuan tidak bisa memutuskan approval pengajuan itu | AC-72.05 |
| Tugas antrean hanya dikerjakan pemiliknya | AC-58.02 |
| Lingkup data: Sales melihat pengajuannya sendiri, unit cabang melihat cabang dan sub cabang di bawahnya, role pusat melihat seluruh company | TN-02, `../technical-specs/09-authentication-authorization.md` 9.4 |

## 1.12 Header standar

| Header | Arah | Keterangan |
|---|---|---|
| `X-CSRF-Token` | Request | Web, metode selain GET/HEAD |
| `Idempotency-Key` | Request | 1.7 |
| `X-Correlation-Id` | Request (opsional), respons | Dibuat server bila tidak dikirim |
| `Idempotent-Replayed` | Respons | `true` pada ulangan 1.7 |
| `Retry-After` | Respons | Pada 429 dan 503 |
| `Content-Disposition` | Respons | Unduhan file |
