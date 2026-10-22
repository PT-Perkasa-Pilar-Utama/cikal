# 8. Products and Routes

Produk, harga per periode (SubProduct), rute modul berversi, dan checklist dokumen. Modul pemilik: CORE Product & Route ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.5). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.7. Aturan rute: RT-01 s.d. RT-08 (`Docs/cikal-tech-reference.md` 6.2).

## 8.1 GET /products

**Purpose:** Halaman "Product".  
**Access:** `MST-PRODUCT` VIEW.

**Input (query):** `q` (kode atau nama), `productCategory` (`COLLATERAL`, `NON_COLLATERAL`, `PENSION`, `SYARIAH`), `isActive` (boolean), `page`, `pageSize`, `sort` (`productCode`, `productName`).

**Output 200**

```json
{
  "data": [ { "id": "0192...", "productCode": "KTA", "productName": "Kredit Tanpa Agunan", "productCategory": "NON_COLLATERAL", "interestType": "EFFECTIVE",
              "minPlafond": "5000000.00", "maxPlafond": "300000000.00", "minTenor": 6, "maxTenor": 60, "isActive": true, "hasActiveRoute": true, "hasPendingChange": false } ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 4, "totalPages": 1 }
}
```

**Traceability:** US-20; AC-09.02 (TRM_ACC_001 s.d. 004).

## 8.2 GET /products/{id}

**Purpose:** Detail produk untuk form edit dan tab "Pricing".  
**Access:** `MST-PRODUCT` VIEW.

**Output 200:** semua field 8.3 ditambah `id`, `isActive`, `hasActiveRoute`, `hasPendingChange`, `updatedAt`.

**Errors:** `NOT_FOUND` 404.

**Traceability:** US-20.

## 8.3 POST /products

**Purpose:** Maker membuat produk baru (tombol "New Product").  
**Access:** `MST-PRODUCT` CREATE.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| productCode | string | ya | 1 s.d. 5 huruf atau angka; disimpan huruf besar |
| productName | string | ya | maks 100 |
| productCategory | enum | ya | `COLLATERAL`, `NON_COLLATERAL`, `PENSION`, `SYARIAH` |
| interestType | enum | ya | `FLAT`, `EFFECTIVE`, `FLOATING`, `HYBRID`, `CAPPED` |
| contractType | string | kondisional | wajib bila `SYARIAH` |
| minPlafond, maxPlafond | money | ya | |
| minTenor, maxTenor | int | ya | bulan |
| minAge, maxAge | int | ya | tahun |
| maxAgeAtMaturityMonth | int | tidak | RM-02 |
| dbrMax | percent | ya | |
| dsr, multipleSalaryDbr | percent | tidak | |
| adminFee | money | tidak | default `0.00` |
| provisionFee | percent | tidak | default `0.0000` |
| salesFee | money | tidak | |
| limitAutoApproval | money | tidak | default `0.00` = auto approval nonaktif |
| scoringApproval, isPaylater | boolean | tidak | disimpan tanpa perilaku (DD-03) |
| validFrom | date | ya | |
| validTo | date | tidak | |

**Behavior**

1. `productCode` tidak cocok `^[A-Za-z0-9]{1,5}$`: `422 INVALID_PRODUCT_CODE` (AC-20.04).
2. `maxPlafond <= minPlafond`: `422 INVALID_PLAFOND_RANGE` (AC-20.02).
3. `limitAutoApproval > maxPlafond`: `422 AUTO_APPROVAL_LIMIT_EXCEEDED` (AC-20.05).
4. `maxTenor > CORE_MAX_TENOR_MONTHS` (parameter sistem tenant): `422 TENOR_EXCEEDS_CORE_LIMIT` dengan angka parameter di pesan (AC-20.07).
5. Kode sudah dipakai produk aktif atau permintaan terbuka, tanpa membedakan huruf besar dan kecil: `409 PRODUCT_CODE_EXISTS` (AC-20.03).
6. Buat ChangeRequest `PRODUCT`/`CREATE`. Setelah disetujui, produk belum muncul di form pengajuan sampai punya rute ACTIVE (AC-20.06, RT-07).

**Output 202:** `{"data":{"changeRequestId":"...","entityType":"PRODUCT","entityId":null,"status":"WAITING_APPROVAL"},"message":"Data submitted for approval"}` (AC-20.01).

**Errors**

| code | status | condition |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Field wajib kosong atau tipe salah |
| `INVALID_PRODUCT_CODE` | 422 | "Product code must be 1 to 5 letters or digits" (AC-20.04) |
| `INVALID_PLAFOND_RANGE` | 422 | "Maximal plafond must be greater than minimal plafond" (AC-20.02) |
| `AUTO_APPROVAL_LIMIT_EXCEEDED` | 422 | "Limit auto approval must not exceed maximal plafond" (AC-20.05) |
| `TENOR_EXCEEDS_CORE_LIMIT` | 422 | "Maximum tenor must not exceed core banking limit (24 months)" (AC-20.07) |
| `PRODUCT_CODE_EXISTS` | 409 | "Product code already exists" (AC-20.03) |

**Traceability:** US-20; AC-20.01 s.d. AC-20.07.

## 8.4 PUT /products/{id}

**Purpose:** Maker mengubah atau menonaktifkan produk.  
**Access:** `MST-PRODUCT` UPDATE.

**Input:** body seperti 8.3 ditambah `isActive` (boolean). `productCode` tidak bisa diubah; nilai berbeda ditolak `422 BUSINESS_RULE_VIOLATION` "Product code cannot be changed".

**Behavior:** Aturan 8.3 langkah 2 s.d. 4; `409 PENDING_CHANGE_REQUEST` bila ada permintaan terbuka (AC-12.06); `422 NO_CHANGES` "No changes to submit" bila sama dengan data aktif. Perubahan tidak memengaruhi pengajuan yang sudah disubmit karena nilai dikunci di snapshot ProcessInstance (AC-20.08, PR-06).

**Output 202:** sama dengan 8.3, `action = UPDATE`.

**Errors:** seperti 8.3 ditambah `PENDING_CHANGE_REQUEST` 409, `NO_CHANGES` 422, `NOT_FOUND` 404.

**Traceability:** US-20; AC-20.02, AC-20.05, AC-20.07, AC-20.08; AC-12.02, AC-12.06.

## 8.5 GET /products/{id}/pricing

**Purpose:** Tab "Pricing": suku bunga per periode berlaku, biaya, dan rentang suku bunga Approver.  
**Access:** `MST-PRODUCT` VIEW.

**Output 200**

```json
{
  "data": {
    "productId": "0192...", "interestType": "EFFECTIVE", "adminFee": "250000.00", "provisionFee": "1.0000", "salesFee": null,
    "subProducts": [
      { "id": "0192...", "interestRate": "14.0000", "floatingRate": null, "capRate": null, "tenorFixed": null,
        "approverRateMin": "11.0000", "approverRateMax": "15.0000", "validFrom": "2026-10-01", "validTo": null }
    ],
    "hasPendingChange": false
  }
}
```

**Traceability:** US-97; AC-97.01.

## 8.6 PUT /products/{id}/pricing

**Purpose:** Maker mengatur suku bunga per periode dan biaya produk.  
**Access:** `MST-PRODUCT` UPDATE.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| adminFee | money | ya | |
| provisionFee | percent | ya | |
| salesFee | money | tidak | |
| subProducts[] | array | ya | minimal 1 |
| subProducts[].interestRate | percent | ya | > 0 |
| subProducts[].floatingRate | percent | kondisional | wajib bila `interestType` `FLOATING` atau `HYBRID` |
| subProducts[].capRate | percent | kondisional | wajib bila `CAPPED` |
| subProducts[].tenorFixed | int | kondisional | wajib bila `HYBRID`; harus lebih kecil dari tenor produk |
| subProducts[].approverRateMin, approverRateMax | percent | tidak | bila diisi, `min <= interestRate <= max` |
| subProducts[].validFrom | date | ya | |
| subProducts[].validTo | date | tidak | kosong = berlaku terus |

**Behavior**

1. Periode `validFrom` s.d. `validTo` antar baris tidak boleh tumpang tindih: `422 PRICING_PERIOD_OVERLAP` (AC-97.02; constraint `daterange` di DB).
2. Rentang Approver tidak mencakup suku bunga: `422 INVALID_APPROVER_RATE_RANGE` (AC-97.03).
3. Buat ChangeRequest `PRODUCT_PRICING` yang tampil di "Pending Product" (AC-97.01).

**Output 202:** `entityType = PRODUCT_PRICING`, `message` "Data submitted for approval" (AC-97.01).

**Errors**

| code | status | condition |
|---|---|---|
| `PRICING_PERIOD_OVERLAP` | 422 | "Pricing periods must not overlap" (AC-97.02) |
| `INVALID_APPROVER_RATE_RANGE` | 422 | "Approver rate range must include the interest rate" (AC-97.03) |
| `PENDING_CHANGE_REQUEST` | 409 | AC-12.06 |

**Traceability:** US-97; AC-97.01, AC-97.02, AC-97.03 (ditulis ulang per periode berlaku, `grooming-poc-ac-tertunda.md`).

## 8.7 GET /products/available

**Purpose:** Dropdown "Product" di step Application: hanya produk aktif dengan rute ACTIVE.  
**Access:** `APP-ENTRY` VIEW.

**Input (query):** `productCategory` (wajib).

**Behavior:** Produk `isActive`, `validFrom <= hari ini <= validTo`, dan punya versi rute `ACTIVE` (RT-07). Produk yang belum disetujui atau tanpa rute tidak dikembalikan (AC-20.06, AC-39.05).

**Output 200**

```json
{ "data": [ { "id": "0192...", "productCode": "KTA", "productName": "Kredit Tanpa Agunan", "interestType": "EFFECTIVE",
  "minPlafond": "5000000.00", "maxPlafond": "300000000.00", "minTenor": 6, "maxTenor": 60, "minAge": 21, "maxAge": 55,
  "currentInterestRate": "14.0000" } ] }
```

`currentInterestRate` dari SubProduct yang berlaku hari ini; ditampilkan read-only di form (AC-97.04).

**Traceability:** US-39 (AC-39.03, AC-39.05); US-20 (AC-20.06); US-97 (AC-97.04).

## 8.8 Langkah rute

Katalog langkah dan modulnya mengikuti urutan baku tech ref 6.3 dan `StepCode` di [../technical-specs/12-orchestrator-step-contract.md](../technical-specs/12-orchestrator-step-contract.md) 12.2. Langkah wajib (RT-03): `DATA_ENTRY`, `APPROVAL`, dan bila M15 berlisensi `VALIDITY_CHECK`, `PRINT_AKAD`, `DISBURSEMENT`.

## 8.9 PUT /products/{id}/route

**Purpose:** Maker mengajukan versi rute baru (tombol "Edit Route" lalu "Submit for Approval").  
**Access:** `MST-ROUTE` UPDATE.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| steps[] | array | ya | satu baris per langkah yang tampil di editor |
| steps[].stepCode | enum | ya | `StepCode` |
| steps[].isEnabled | boolean | ya | |
| effectiveFrom | timestamp | tidak | default saat disetujui |

**Behavior**

1. Langkah wajib dikirim `isEnabled = false`: `422 MANDATORY_STEP` (AC-31.02).
2. Langkah modul tak berlisensi dikirim: `422 MODULE_NOT_LICENSED_STEP`; editor tidak menampilkannya (AC-31.08, AC-100.03, RT-04).
3. Langkah modul integrasi dinyalakan tanpa IntegrationConfig `ACTIVE` dan tanpa mode `MANUAL`: `422 INTEGRATION_NOT_CONFIGURED` (IN-09).
4. Sama dengan versi ACTIVE: `422 NO_CHANGES` (AC-31.05).
5. Versi rute produk ini masih `WAITING_APPROVAL`: `409 PENDING_CHANGE_REQUEST`.
6. Buat versi `DRAFT` dengan nomor berikutnya, lalu ChangeRequest `ROUTE` (status versi `WAITING_APPROVAL`). Langkah bersyarat (contoh SIKP) tetap mengikuti kondisinya saat berjalan (AC-31.04, RT-08).

**Output 202**

```json
{ "data": { "changeRequestId": "0192...", "entityType": "ROUTE", "entityId": "0192...", "status": "WAITING_APPROVAL", "versionNumber": 3 },
  "message": "Route version 3 submitted for approval" }
```

**Errors**

| code | status | condition |
|---|---|---|
| `MANDATORY_STEP` | 422 | "Approval is a mandatory module and cannot be turned off" (AC-31.02; nama langkah mengikuti langkah yang dikirim) |
| `MODULE_NOT_LICENSED_STEP` | 422 | "Module SIKP is not licensed" (teks usulan engineering) |
| `INTEGRATION_NOT_CONFIGURED` | 422 | "Integration provider not configured" (IN-09) |
| `NO_CHANGES` | 422 | "No changes to submit" (AC-31.05) |
| `PENDING_CHANGE_REQUEST` | 409 | Versi lain masih menunggu persetujuan |

**Traceability:** US-31; AC-31.01, AC-31.02, AC-31.04, AC-31.05, AC-31.08; US-100 (AC-100.03).

## 8.10 GET /products/{id}/route

**Purpose:** Diagram rute produk dan isi editor rute.  
**Access:** `MST-ROUTE` VIEW. Tanpa UPDATE, klien tidak menampilkan "Edit Route" (AC-31.06).

**Input (query):** `version` (int, opsional; default versi ACTIVE).

**Output 200**

```json
{
  "data": {
    "productId": "0192...", "versionNumber": 2, "status": "ACTIVE", "effectiveFrom": "2026-10-15T00:00:00Z",
    "pendingVersionNumber": null,
    "steps": [
      { "stepCode": "DATA_ENTRY", "moduleCode": "CORE", "order": 1, "isEnabled": true, "isMandatory": true, "isConditional": false },
      { "stepCode": "SURVEY", "moduleCode": "M05", "order": 2, "isEnabled": false, "isMandatory": false, "isConditional": false },
      { "stepCode": "APPROVAL", "moduleCode": "CORE", "order": 13, "isEnabled": true, "isMandatory": true, "isConditional": false }
    ]
  }
}
```

Langkah modul tak berlisensi tidak ada di `steps` (AC-31.08). `SIKP` bertanda `isConditional: true`.

**Errors:** `NOT_FOUND` 404 "Route not found" bila produk belum punya rute.

**Traceability:** US-31 (AC-31.06, AC-31.08); US-32 (backlog).

## 8.11 POST /document-checklists

**Purpose:** Maker membuat daftar dokumen wajib per kombinasi produk, pekerjaan, dan status kawin.  
**Access:** `MST-CHECKLIST` CREATE.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| productId | uuid | ya | |
| occupation | string | ya | `paramId` Occupation |
| marital | string | ya | `paramId` Marital |
| items[] | array | ya | minimal 1 |
| items[].documentType | string | ya | `paramId` Document |
| items[].isMandatory | boolean | ya | |

**Behavior**

1. `items` kosong: `422 NO_DOCUMENT_SELECTED` (AC-25.02).
2. Kombinasi sudah ada aktif atau diajukan: `409 CHECKLIST_EXISTS` (AC-25.03).
3. Buat ChangeRequest `DOCUMENT_CHECKLIST`.

**Output 202:** `message` "Data submitted for approval" (AC-25.01).

**Errors**

| code | status | condition |
|---|---|---|
| `NO_DOCUMENT_SELECTED` | 422 | "Select at least one document" (AC-25.02) |
| `CHECKLIST_EXISTS` | 409 | "Document checklist already exists for this combination" (AC-25.03) |

**Traceability:** US-25; AC-25.01, AC-25.02, AC-25.03.

## 8.12 GET /document-checklists, PUT /document-checklists/{id}

**Purpose:** Daftar checklist dan perubahan isinya.  
**Access:** `MST-CHECKLIST` VIEW / UPDATE.  
**Input:** daftar menerima `productId`, `occupation`, `marital`, paging. `PUT` menerima `items[]` seperti 8.11 dan `isActive`.  
**Behavior:** `PUT` mengikuti aturan 8.11 dan `01-conventions.md` 1.8.  
**Output:** daftar `{ id, product, occupation, marital, items[], isActive, hasPendingChange }`; `PUT` = 202.  
**Traceability:** US-25. Checklist yang cocok untuk pengajuan dibaca lewat `12-applications.md` 12.6 (AC-25.04, AC-25.05).

## 8.13 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /products/{id}/route/versions` | Riwayat versi rute dan diagram per versi | `MST-ROUTE` VIEW | US-32 |
