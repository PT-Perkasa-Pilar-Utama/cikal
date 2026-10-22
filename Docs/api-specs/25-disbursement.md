# 25. Disbursement (M15)

Validity Check, Print Akad, dan Record Disbursement. Modul pemilik: M15 Pencairan & Core ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.18). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.11 M15. Rute mengembalikan `403 MODULE_NOT_LICENSED` bila M15 tidak berlisensi.

Di Rilis 1, Cikal tidak terhubung ke core FAST. Langkah `DISBURSEMENT` berjalan dalam mode `MANUAL` dari `CoreBankingPort`: Admin Operasional mencatat hasil pencairan (US-101), dan `WAIT_CORE` dilewati (grooming v2 N-05, grooming v3). Grooming v2 menyebut langkah ini `RECORD_DISBURSEMENT`; tech spec memodelkannya sebagai `DISBURSEMENT` mode MANUAL dengan antrean `DISBURSEMENT`.

## 25.1 GET /applications/{id}/disbursement

**Purpose:** "Disbursement Detail" untuk Validity Check, Print Akad, dan Record Disbursement.  
**Access:** `OPS-VALIDITY`, `OPS-PRINT-AKAD`, atau `OPS-DISBURSEMENT` VIEW; atau `APP-INQUIRY` VIEW (baca saja).

**Output 200**

```json
{
  "data": {
    "applicationId": "0192...", "loanId": "20102026KPR0000041", "currentStep": "VALIDITY_CHECK",
    "disbursementAmount": "580000000.00", "bankAccountNumber": "1234567890", "disbursementDate": null, "firstInstallmentDate": "2026-11-21",
    "validityStatus": null, "notValidReason": null,
    "contractNumber": null, "contractDate": null, "akadPrints": [],
    "coreResponse": null
  }
}
```

`bankAccountNumber` utuh hanya untuk menu `OPS-*`; `APP-INQUIRY` menerima nilai tersamar. Field `epolisDate` tidak ada di respons bila M14 tidak berlisensi (AC-76.06).

**Errors:** `APPLICATION_NOT_FOUND` 404.

**Traceability:** US-76, US-77, US-101.

## 25.2 POST /applications/{id}/validity-check

**Purpose:** Admin Operasional menyatakan data pencairan Valid atau Not Valid.  
**Access:** `OPS-VALIDITY` UPDATE; pemilik tugas `VALIDITY_CHECK` (`14-tasks.md` 14.5).  
**Idempotency:** wajib.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| result | enum | ya | `VALID`, `NOT_VALID` |
| disbursementDate | date | kondisional | wajib bila `VALID` |
| firstInstallmentDate | date | tidak | bila diubah, jadwal angsuran dihitung ulang |
| reason | string | kondisional | wajib bila `NOT_VALID`, maks 500 |

**Behavior**

1. `VALID` dan `disbursementDate` < besok (zona Asia/Jakarta): `422 DISBURSEMENT_DATE_TOO_EARLY` (AC-76.02).
2. M14 berlisensi, ada tanggal e-polis, dan `disbursementDate` < tanggal e-polis: `422 DISBURSEMENT_BEFORE_EPOLIS` (AC-76.03, Deferred di POC). Tanpa M14, aturan dilewati dan `epolisDate` tidak dikirim (AC-76.06).
3. `VALID`: simpan tanggal; `firstInstallmentDate` baru menggeser semua jatuh tempo ke tanggal yang sama setiap bulan dan menghitung ulang jadwal (AC-76.05); tutup tugas; StepResult `CONTINUE` ke `PRINT_AKAD` (AC-76.01).
4. `NOT_VALID`: simpan alasan; tutup tugas; StepResult `BACK_TO_DRAFT` dengan `returnNote` = alasan (AC-76.04).

**Output 200**

| result | Body | message |
|---|---|---|
| `VALID` | `{"data":{"validityStatus":"VALID","disbursementDate":"2026-10-21","firstInstallmentDate":"2026-11-25","nextStep":"PRINT_AKAD"}}` | "Disbursement data validated" (AC-76.01, AC-76.05) |
| `NOT_VALID` | `{"data":{"validityStatus":"NOT_VALID","applicationStatus":"DRAFT"}}` | "Disbursement data marked as not valid" (AC-76.04) |

**Errors**

| code | status | condition |
|---|---|---|
| `DISBURSEMENT_DATE_TOO_EARLY` | 422 | "Disbursement date must be at least 1 day after today" (AC-76.02) |
| `DISBURSEMENT_BEFORE_EPOLIS` | 422 | "Disbursement date must not be earlier than the epolis date (25-10-2026)" (AC-76.03) |
| `VALIDATION_FAILED` | 400 | Tanggal atau alasan kosong |
| `TASK_NOT_ASSIGNED_TO_YOU` | 403 | |

**Traceability:** US-76; AC-76.01 s.d. AC-76.06 (AC-76.03 Deferred di POC).

## 25.3 POST /applications/{id}/akad/print

**Purpose:** Cetak "Surat Perjanjian Kredit" (tombol "Print").  
**Access:** `OPS-PRINT-AKAD` UPDATE; pemilik tugas `PRINT_AKAD`.  
**Idempotency:** wajib.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| paymentMethod | string | ya | `paramId` |
| bankAccountNumber | string | ya | rekening bank pencair |
| customerAccountNumber | string | ya | terenkripsi |
| riskManagerUserId | uuid | ya | user aktif dengan role Risk Manager |

**Behavior**

1. Field kosong: `400 VALIDATION_FAILED`, detail "This field is required" (AC-77.02).
2. Template `AKAD-<productCode>` ACTIVE tidak ada: `422 TEMPLATE_NOT_AVAILABLE` (AC-77.03).
3. Nomor kontrak dari `document.nextNumber('CONTRACT', ...)` (`10-documents.md` 10.6): satu kali per pengajuan, aman bersamaan (AC-102.07, AC-102.08). Habis: `422 DOCUMENT_NUMBER_EXHAUSTED`.
4. Generate PDF (docxtemplater + Gotenberg), simpan GeneratedDocument dan AkadPrint; tutup tugas; StepResult `CONTINUE` ke `DISBURSEMENT`; pengajuan tampil di "Reprint Akad" (AC-77.01).

**Output 200**

```json
{ "data": { "contractNumber": "011/PK/2026/000001", "contractDate": "2026-10-20", "generatedDocumentId": "0192...", "fileId": "0192...",
            "downloadUrl": "https://s3.bankcontoh.co.id/...", "expiresAt": "2026-10-20T08:05:00Z", "nextStep": "DISBURSEMENT" } }
```

Klien mengunduh PDF dari `downloadUrl` (berumur 5 menit).

**Errors**

| code | status | condition |
|---|---|---|
| `VALIDATION_FAILED` | 400 | "This field is required" di bawah field kosong (AC-77.02) |
| `TEMPLATE_NOT_AVAILABLE` | 422 | "Document template AKAD-KPR is not available" (AC-77.03) |
| `DOCUMENT_NUMBER_EXHAUSTED` | 422 | "Document number sequence for CONTRACT has reached its limit. Please contact your administrator" (AC-102.06) |
| `SERVICE_UNAVAILABLE` | 503 | Konverter PDF tidak tersedia |

**Traceability:** US-77 (AC-77.01 s.d. AC-77.03); US-102 (AC-102.07, AC-102.08).

## 25.4 POST /applications/{id}/disbursement/record

**Purpose:** Admin Operasional mencatat hasil pencairan dari core secara manual (halaman "Record Disbursement").  
**Access:** `OPS-DISBURSEMENT` UPDATE; pemilik tugas `DISBURSEMENT`.  
**Idempotency:** wajib.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| result | enum | ya | `DISBURSED`, `FAILED` |
| disbursementDate | date | kondisional | wajib bila `DISBURSED`; >= tanggal hasil Validity Check |
| coreLoanNumber | string | kondisional | wajib bila `DISBURSED`, maks 50 |
| cif | string | tidak | |
| reason | string | kondisional | wajib bila `FAILED`, maks 500 |

**Behavior**

1. `DISBURSED` tanpa tanggal atau nomor pinjaman core: `400 VALIDATION_FAILED`, detail "This field is required" per field (AC-101.03).
2. `disbursementDate` < tanggal Validity Check: `422 DISBURSEMENT_BEFORE_VALIDATED_DATE` (AC-101.04).
3. `FAILED` tanpa alasan: `400 VALIDATION_FAILED`, detail "Reason is required" (AC-101.05).
4. Simpan `core_responses` dengan `channel = MANUAL`, `enteredBy`; tutup tugas.
5. `DISBURSED`: StepResult `FINISH` dengan `DISBURSED`; publish `DisbursementCompleted`; email "Kredit <Loan ID> telah dicairkan" ke pemohon (AC-101.01).
6. `FAILED`: StepResult `RECONTEST`; pengajuan masuk antrean "Recontest" (AC-101.02).

**Output 200**

| result | Body | message |
|---|---|---|
| `DISBURSED` | `{"data":{"applicationStatus":"DISBURSED","disbursementDate":"2026-10-21","coreLoanNumber":"LN-0012345"}}` | "Disbursement recorded" (AC-101.01) |
| `FAILED` | `{"data":{"applicationStatus":"RECONTEST"}}` | "Disbursement failure recorded" (AC-101.02) |

**Errors**

| code | status | condition |
|---|---|---|
| `VALIDATION_FAILED` | 400 | AC-101.03, AC-101.05 |
| `DISBURSEMENT_BEFORE_VALIDATED_DATE` | 422 | "Disbursement date must not be earlier than the validated date (21-10-2026)" (AC-101.04) |
| `TASK_NOT_ASSIGNED_TO_YOU` | 403 | |
| `ALREADY_PROCESSED` | 409 | Hasil sudah dicatat |

**Traceability:** US-101; AC-101.01 s.d. AC-101.05.

## 25.5 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /akad-reprints`, `POST /applications/{id}/akad/reprint` | Cetak ulang akad dengan nomor kontrak yang sama; `printCount + 1` | `OPS-PRINT-AKAD` UPDATE | US-78; AC-102.08 |
| `POST /applications/{id}/disbursement/send` | Bentuk file `<loanId>.json` dan kirim lewat adapter core FAST | `OPS-DISBURSEMENT` UPDATE | US-79 |
| Data masuk respons core | Lewat `11-integrations.md` 11.6 (`CALLBACK`, `FILE`, `POLLING`) | penyedia | US-80 |
