# 22. Scoring and RAC (M09)

Model scoring dan RAC, uji model, dan hasil per pengajuan. Modul pemilik: M09 Scoring & RAC ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.18). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.11 M09. Model berversi (DM-11): satu baris `scoring_models` per versi; `id` di rute adalah id versi. Rute mengembalikan `403 MODULE_NOT_LICENSED` bila M09 tidak berlisensi.

## 22.1 GET /scoring-models

**Purpose:** Halaman "Scoring Model".  
**Access:** `MST-SCORING` VIEW.

**Input (query):** `modelGroup` (`SCORING`, `RAC`), `productId`, `status` (default `ACTIVE,DRAFT,WAITING_APPROVAL`), paging, `sort` (`modelCode`).

**Output 200**

```json
{ "data": [ { "id": "0192...", "modelCode": "KTA-2026", "modelName": "Scoring KTA 2026", "modelGroup": "SCORING", "versionNumber": 2, "status": "DRAFT",
              "constant": "200.00", "cutOff": "430.00", "reviewLowerBound": null, "products": [ { "productCode": "KTA" } ], "criteriaCount": 8 } ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 3, "totalPages": 1 } }
```

**Traceability:** US-37.

## 22.2 GET /scoring-models/{id}

**Purpose:** Detail versi model dengan daftar kriteria.  
**Access:** `MST-SCORING` VIEW.

**Output 200**

```json
{
  "data": {
    "id": "0192...", "modelCode": "KTA-2026", "modelGroup": "SCORING", "versionNumber": 2, "status": "DRAFT", "constant": "200.00", "cutOff": "430.00", "reviewLowerBound": null,
    "productIds": ["0192..."],
    "criteria": [
      { "id": "0192...", "fieldCode": "OCCUPATION", "operator": "IN", "value": { "type": "LITERAL", "values": ["003", "004"] }, "weight": "50.00", "criterionType": "WEIGHTED",
        "displayText": "Occupation is one of ASN, Karyawan BUMN : +50" },
      { "id": "0192...", "fieldCode": "INSTALLMENT_TO_INCOME_RATIO", "operator": "LE", "value": { "type": "VARIABLE", "variableCode": "PRODUCT_DBR_MAX" }, "weight": null, "criterionType": "MANDATORY",
        "displayText": "Installment to Income Ratio <= Product DBR Max" }
    ]
  }
}
```

`displayText` dibangun server dari label variabel dan nilai parameter (AC-37.01, AC-37.02).

**Errors:** `NOT_FOUND` 404.

**Traceability:** US-37; AC-37.01, AC-37.02.

## 22.3 Penyusunan draft

Draft disusun bertahap sebelum diajukan. Semua operasi di bawah hanya untuk versi `DRAFT`; versi lain: `409 INVALID_STATE`. Model ACTIVE tetap dipakai sampai versi baru disetujui (AC-37.05).

| Operasi | Access | Body | Kontrak |
|---|---|---|---|
| `POST /scoring-models` | `MST-SCORING` CREATE | `modelCode`, `modelName`, `modelGroup`, `constant`, `cutOff`, `reviewLowerBound?`, `productIds[]` | Model baru versi 1 `DRAFT`. `201` |
| `POST /scoring-models/{id}/new-version` | `MST-SCORING` UPDATE | tanpa body | Salin versi ACTIVE menjadi `DRAFT` versi berikutnya; satu draft per `modelCode`. `201` |
| `PUT /scoring-models/{id}` | `MST-SCORING` UPDATE | field header seperti `POST` tanpa `modelCode` | `200` |
| `POST /scoring-models/{id}/criteria` | `MST-SCORING` UPDATE | kriteria (tabel di bawah) | `201`, kembalikan kriteria dengan `displayText` |
| `PUT /scoring-models/{id}/criteria/{criterionId}` | `MST-SCORING` UPDATE | kriteria | `200` |
| `DELETE /scoring-models/{id}/criteria/{criterionId}` | `MST-SCORING` UPDATE | | `204`; menghapus baris draft, bukan data aktif |

Body kriteria:

| field | type | required | notes |
|---|---|---|---|
| fieldCode | string | ya | `variableCode` dari `09-calculation.md` 9.2 |
| operator | enum | ya | `EQ`, `NE`, `GT`, `GE`, `LT`, `LE`, `BETWEEN`, `IN` |
| value.type | enum | ya | `LITERAL` atau `VARIABLE` |
| value.value / value.values / value.from, value.to | | kondisional | `LITERAL`: satu nilai, daftar untuk `IN`, rentang untuk `BETWEEN`; tipe sesuai `dataType` variabel |
| value.variableCode | string | kondisional | `VARIABLE`; tipe harus cocok |
| criterionType | enum | ya | `WEIGHTED`, `MANDATORY` |
| weight | decimal | kondisional | wajib bila `WEIGHTED`; -1.000 s.d. 1.000 |

| code | status | condition |
|---|---|---|
| `INVALID_CRITERION_VALUE` | 422 | "Value must be a number" (AC-37.03); pesan mengikuti tipe variabel |
| `WEIGHT_OUT_OF_RANGE` | 422 | "Weight must be between -1000 and 1000" (AC-37.04) |
| `UNKNOWN_VARIABLE` | 422 | "Unknown field: <kode>" (teks usulan engineering) |
| `MODEL_CODE_EXISTS` | 409 | `POST /scoring-models` dengan kode yang sudah ada |

**Traceability:** US-37; AC-37.01 s.d. AC-37.04.

## 22.4 POST /scoring-models/{id}/submit

**Purpose:** Ajukan versi draft untuk disetujui (tombol "Submit for Approval").  
**Access:** `MST-SCORING` UPDATE.

**Input (body):** `effectiveFrom` (timestamp, opsional).

**Behavior:** Draft tanpa kriteria: `422 MODEL_WITHOUT_CRITERIA`. Model `SCORING` tanpa `cutOff`: `400 VALIDATION_FAILED`. Status `WAITING_APPROVAL`, ChangeRequest `SCORING_MODEL`. Setelah disetujui, versi ini `ACTIVE` untuk produknya dan versi lama `SUPERSEDED`; pengajuan yang sudah disubmit tetap memakai versi yang dikunci (FM-05).

**Output 202:** `message` "Data submitted for approval" (AC-37.05).

**Errors:** `MODEL_WITHOUT_CRITERIA` 422 "Add at least one criterion" (teks usulan engineering), `INVALID_STATE` 409, `PENDING_CHANGE_REQUEST` 409.

**Traceability:** US-37; AC-37.05.

## 22.5 POST /scoring-models/{id}/test

**Purpose:** Uji versi model (draft atau aktif) dengan pengajuan contoh (tombol "Run Test").  
**Access:** `MST-SCORING` VIEW.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| sampleLoanId | string | ya | Loan ID pengajuan contoh di company sesi |

**Behavior**

1. Loan ID tidak ditemukan di tenant: `404 APPLICATION_NOT_FOUND` (AC-38.04).
2. Evaluasi kriteria terhadap data pengajuan contoh dengan rumus versi ACTIVE saat ini; tidak menulis hasil ke pengajuan, tidak mengubah prosesnya.
3. `totalScore = constant + jumlah bobot kriteria terpenuhi`. `SCORING`: `PASS` bila `totalScore >= cutOff` (sama dengan Cut Off = Pass), `REVIEW` bila ada `reviewLowerBound` dan skor di antaranya, selain itu `FAIL` (AC-38.02, AC-38.03). `RAC`: `FAIL` bila satu kriteria `MANDATORY` gagal.

**Output 200**

```json
{
  "data": {
    "sampleLoanId": "15122025KTA0000013", "modelGroup": "SCORING", "constant": "200.00", "cutOff": "430.00", "totalScore": "470.00", "result": "PASS",
    "criteria": [ { "criterionId": "0192...", "displayText": "Occupation is one of ASN, Karyawan BUMN : +50", "actualValue": "ASN", "isMet": true, "appliedWeight": "50.00" } ]
  }
}
```

**Errors:** `APPLICATION_NOT_FOUND` 404 "Application not found" (AC-38.04), `FORMULA_ERROR` 422.

**Traceability:** US-38; AC-38.01 s.d. AC-38.04.

## 22.6 GET /applications/{id}/scoring

**Purpose:** Klik langkah "RAC" dan "Scoring" di timeline pengajuan.  
**Access:** `APP-INQUIRY` VIEW; lingkup data.

**Input (query):** `processInstanceId` (opsional).

**Output 200**

```json
{
  "data": {
    "rac": { "modelCode": "KTA-RAC", "versionNumber": 1, "result": "FAIL", "failedReasons": ["Installment to Income Ratio 332% exceeds DBR max 40%"],
             "criteria": [ { "displayText": "Installment to Income Ratio <= Product DBR Max", "actualValue": "332.14", "isMet": false } ] },
    "scoring": { "modelCode": "KTA-2026", "versionNumber": 1, "constant": "200.00", "cutOff": "430.00", "totalScore": "470.00", "result": "PASS",
                 "criteria": [ { "displayText": "Occupation is one of ASN, Karyawan BUMN : +50", "actualValue": "ASN", "isMet": true, "appliedWeight": "50.00" } ] }
  }
}
```

Kriteria wajib RAC yang gagal mengisi `failedReasons` dengan nilai aktual dan batasnya (AC-67.02); rasio tepat sama dengan DBR max dinilai `isMet: true` karena operator `LE` inklusif (AC-67.03). Langkah yang belum berjalan atau dilewati bernilai `null`. Tanpa model aktif, langkah `ERROR` `BUSINESS_SETUP` "No active scoring model for product KPR Subsidi" dan tampil di timeline (AC-67.04). Nilai yang dipakai adalah snapshot produk saat submit (AC-20.08).

**Errors:** `APPLICATION_NOT_FOUND` 404, `MODULE_NOT_LICENSED` 403.

**Traceability:** US-67; AC-67.01 s.d. AC-67.04; AC-20.08.
