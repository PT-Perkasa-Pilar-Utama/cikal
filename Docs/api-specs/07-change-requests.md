# 7. Change Requests

Satu mekanisme checker-maker untuk semua data master. Maker mengajukan lewat resource masing-masing (`01-conventions.md` 1.8); file ini memuat sisi Checker. Modul pemilik: CORE Change Request ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.6). Tabel dan state machine: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.8, 6.13.

## 7.1 Jenis entity dan menu

Hak atas ChangeRequest mengikuti menu entity-nya. Melihat butuh VIEW; approve, reject, dan revise butuh APPROVE.

| entityType | Menu | Diajukan lewat | Berversi | Rilis |
|---|---|---|---|---|
| `ROLE_ACCESS` | `IAM-ROLE-ACCESS` | `03-access-control.md` 3.4, 3.5 | tidak | POC |
| `PRODUCT` | `MST-PRODUCT` | `08-products-routes.md` 8.3, 8.4 | tidak | POC |
| `PRODUCT_PRICING` | `MST-PRODUCT` | `08-products-routes.md` 8.6 | tidak | POC |
| `ROUTE` | `MST-ROUTE` | `08-products-routes.md` 8.9 | ya | POC |
| `DOCUMENT_CHECKLIST` | `MST-CHECKLIST` | `08-products-routes.md` 8.11 | tidak | POC |
| `APPROVAL_HIERARCHY` | `MST-APPROVAL` | `16-approvals.md` 16.2 | tidak | POC |
| `SCORING_MODEL` | `MST-SCORING` | `22-scoring.md` 22.4 | ya | POC |
| `DECISION_MATRIX` | `MST-DECISION` | `24-decision.md` 24.2 | tidak | POC |
| `DOCUMENT_NUMBER_FORMAT` | `MST-NUMBERING` | `10-documents.md` 10.5 | ya | POC |
| `INTEGRATION_CONFIG` | `MST-INTEGRATION` | `11-integrations.md` 11.3 | ya | POC (seed), layar backlog |
| `USER`, `ROLE`, `USER_ACCESS`, `MENU`, `REGIONAL`, `BRANCH`, `SUB_BRANCH`, `CURRENCY`, `CURRENCY_RATE`, `GENERAL_PARAMETER`, `INSURANCE`, `SYSTEM_PARAMETER`, `APPROVAL_LEVEL`, `FORMULA`, `DOCUMENT_TEMPLATE`, `DEDUP_MATRIX`, `DEDUP_FIELD_SETTING`, `DUKCAPIL_RULE`, `FRAUD_MATRIX`, `FRAUD_VELOCITY_RULE`, `CREDIT_BUREAU_MAPPING`, `BLACKLIST`, `PARTNER_CLIENT` | sesuai modul | file masing-masing | sebagian | Backlog |

## 7.2 GET /change-requests

**Purpose:** Halaman "Pending <Data>" per jenis data, contoh "Pending Product", "Pending Role Access".  
**Access:** VIEW pada menu `entityType` yang diminta (7.1).

**Input (query)**

| field | type | required | notes |
|---|---|---|---|
| entityType | enum | ya | satu nilai 7.1; boleh beberapa dipisah koma bila menunya sama (`PRODUCT,PRODUCT_PRICING`) |
| status | enum | tidak | default `WAITING_APPROVAL,REVISE` |
| submittedBy | uuid | tidak | |
| page, pageSize, sort | | tidak | `sort`: `submittedAt` (default `submittedAt,desc`) |

**Output 200**

```json
{
  "data": [
    { "id": "0192...", "entityType": "PRODUCT", "entityId": null, "action": "CREATE", "displayName": "KPR Subsidi", "packageSize": 1,
      "status": "WAITING_APPROVAL", "submittedBy": { "id": "...", "username": "maker.01" }, "submittedAt": "2026-10-21T03:10:00Z", "canReview": true }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 2, "totalPages": 1 }
}
```

`displayName` diambil dari `newData` oleh handler entity (`registerEntity`). `canReview = false` bila user sesi adalah pembuatnya atau tanpa APPROVE.

**Traceability:** US-12; AC-12.01, AC-12.03, AC-20.01, AC-09.01.

## 7.3 GET /change-requests/{id}

**Purpose:** Detail permintaan dengan perbandingan "Current Data" dan "Proposed Data".  
**Access:** VIEW pada menu entity.

**Output 200**

```json
{
  "data": {
    "id": "0192...", "entityType": "PRODUCT", "entityId": "0192...", "action": "UPDATE", "status": "WAITING_APPROVAL",
    "submittedBy": { "id": "...", "username": "maker.01" }, "submittedAt": "2026-10-21T03:10:00Z",
    "currentData": { "productCode": "KTA", "limitAutoApproval": "10000000.00" },
    "proposedData": { "productCode": "KTA", "limitAutoApproval": "15000000.00" },
    "changedFields": ["limitAutoApproval"],
    "packageSize": 1,
    "reviseReason": null,
    "canReview": false,
    "reviewBlockedReason": "You cannot review your own submission"
  }
}
```

| Field | Aturan |
|---|---|
| `currentData` | `oldData` saat submit; `null` untuk `CREATE` |
| `changedFields` | Path field yang berbeda, dari `diff` handler entity (AC-12.02) |
| Paket impor | `proposedData.items[]` berisi semua baris; `packageSize` = jumlah baris (AC-12.07) |
| Nilai `SECRET` | Ditampilkan `"********"` (PR-12) |
| `reviewBlockedReason` | Teks yang ditampilkan menggantikan tombol Approve, Reject, Revise (AC-12.04) |

**Errors:** `NOT_FOUND` 404.

**Traceability:** US-12; AC-12.02, AC-12.04, AC-12.07.

## 7.4 POST /change-requests/{id}/approve

**Purpose:** Checker menyetujui permintaan (tombol "Approve" lalu "Yes").  
**Access:** APPROVE pada menu entity.  
**Idempotency:** opsional.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| comment | string | tidak | maks 500; disimpan di audit (AC-102.02) |

**Behavior**

1. Kunci baris ChangeRequest (`SELECT ... FOR UPDATE`). Status bukan `WAITING_APPROVAL`: `409 ALREADY_PROCESSED` (AC-12.05).
2. Peninjau sama dengan pembuat: `403 SELF_REVIEW_NOT_ALLOWED`, juga ditegakkan `CHECK` di database (AC-12.04).
3. Jalankan `validate` handler entity terhadap data terkini (aturan bisa berubah sejak diajukan, contoh kode produk sudah dipakai).
4. Jalankan `apply` handler dalam transaksi yang sama: data biasa langsung berlaku; data berversi menjadi `ACTIVE` pada `effectiveFrom` (default sekarang) dan versi lama `SUPERSEDED`. Paket impor diterapkan seluruhnya atau tidak sama sekali (AC-12.07).
5. Isi `reviewedBy`, `reviewedAt`, status `APPROVED`; publish event `MasterDataChanged` (cache dibuang lewat `NOTIFY`); catat audit dengan data lama dan baru.
6. Pengajuan yang sudah disubmit tidak terpengaruh karena memakai snapshot (AC-20.08, AC-31.03).

**Output 200**

```json
{ "data": { "id": "0192...", "status": "APPROVED", "entityId": "0192...", "versionNumber": 3 }, "message": "Data approved" }
```

`versionNumber` hanya untuk entity berversi.

**Errors**

| code | status | condition |
|---|---|---|
| `ALREADY_PROCESSED` | 409 | "This submission has already been processed" (AC-12.05) |
| `SELF_REVIEW_NOT_ALLOWED` | 403 | "You cannot review your own submission" (AC-12.04) |
| `BUSINESS_RULE_VIOLATION` | 422 | Validasi ulang gagal; `message` dari aturan entity |
| `NOT_FOUND` | 404 | |

**Traceability:** US-12; AC-12.01, AC-12.04, AC-12.05, AC-12.07; AC-31.03; AC-102.02.

## 7.5 POST /change-requests/{id}/reject

**Purpose:** Checker menolak permintaan.  
**Access:** APPROVE pada menu entity.

**Input (body):** `comment` (string, opsional, maks 500).

**Behavior:** Langkah 1 dan 2 dari 7.4; status `REJECTED`; data aktif tidak berubah; versi berversi kembali ke `DRAFT` (6.13). Catat audit.

**Output 200:** `{"data":{"id":"0192...","status":"REJECTED"},"message":"Data rejected"}` (AC-12.03).

**Errors:** sama dengan 7.4 tanpa `BUSINESS_RULE_VIOLATION`.

**Traceability:** US-12; AC-12.03, AC-12.04, AC-12.05.

## 7.6 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `POST /change-requests/{id}/revise` | Checker meminta revisi; `reason` wajib, maks 500 | APPROVE | US-13; AC-13.02, AC-13.04 |
| `POST /change-requests/{id}/resubmit` | Pembuat mengajukan ulang dengan data baru | CREATE/UPDATE, hanya pembuat | US-13; AC-13.05 |
