# 23. Credit Bureau (M10)

Kolektibilitas SLIK. Modul pemilik: M10 Credit Bureau ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.18). Port `CreditBureauPort` dengan mode `MANUAL` dan adapter simulasi. Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.11 M10. Rute mengembalikan `403 MODULE_NOT_LICENSED` bila M10 tidak berlisensi. UI memakai label "SLIK".

## 23.1 Perilaku langkah CREDIT_BUREAU (tanpa endpoint)

| Mode IntegrationConfig | Perilaku | Rujukan |
|---|---|---|
| `SYNC` (simulasi di POC) | Adapter mengembalikan fasilitas; hasil dihitung langsung | IN-08 |
| `MANUAL` | `WAIT_HUMAN` antrean `CREDIT_REPORT_UPLOAD`; Verifikator mengisi lewat 23.2 | IN-08 |

Hitungan hasil:

1. Hanya fasilitas `ACTIVE` diagregasi; kolektibilitas terburuk dipakai (`CREDIT_BUREAU_AGGREGATION`, TRM_SLK_007).
2. Nilai di luar 1 s.d. 5: `ERROR INVALID_RESPONSE` "Invalid collectibility value: 6" (TRM_SLK_006).
3. Tanpa riwayat: `hasHistory = false`, label "No credit history" (TRM_SLK_005).
4. `CreditBureauOutcomeMapping` (seed MRTM TRM_SLK) memetakan kolektibilitas ke `quality` dan `outcome` untuk Decision Matrix. Tanpa fasilitas `ACTIVE` dipakai baris tanpa kolektibilitas (`NO_HISTORY`, "No credit history"). Kolektibilitas tanpa baris pemetaan: `ERROR BUSINESS_SETUP`.
5. Di POC hanya mode `SYNC`; mode `MANUAL` dan `ASYNC` menjadi `ERROR BUSINESS_SETUP` "Credit bureau mode <mode> is not available in POC". Timeout, koneksi, dan gangguan penyedia diretry otomatis orchestrator. Satu hasil disimpan per ProcessInstance beserta respons mentah terenkripsi; retry manual memanggil penyedia lagi dan mengganti hasil lama. Hasil langkah `CONTINUE` dengan `outcomeCode` hasil pemetaan dan ringkasan label.

## 23.2 POST /applications/{id}/credit-report

**Rilis:** Backlog. Di POC, M10 memakai adapter simulasi mode `SYNC`.  
**Purpose:** Verifikator mengisi hasil iDeb secara manual dan menutup tugas `CREDIT_REPORT_UPLOAD`.  
**Access:** `OPS-CREDIT-REPORT` UPDATE; pemilik tugas (`14-tasks.md` 14.5).  
**Idempotency:** wajib.

**Input:** `multipart/form-data`: `file` (PDF iDeb, wajib) dan `payload` (JSON):

| field | type | required | notes |
|---|---|---|---|
| reportReference | string | ya | |
| reportDate | date | ya | tidak di masa depan |
| hasHistory | boolean | ya | |
| facilities[] | array | kondisional | wajib minimal 1 bila `hasHistory` |
| facilities[].lenderName, facilityType | string | ya | |
| facilities[].plafond, outstanding | money | ya | |
| facilities[].collectibility | int | ya | 1 s.d. 5 |
| facilities[].daysPastDue | int | ya | >= 0 |
| facilities[].condition | enum | ya | `ACTIVE`, `CLOSED` |
| facilities[].lastUpdated | date | ya | |

**Behavior:** Validasi; simpan file dan hasil (`mode = MANUAL`, `enteredBy`, `enteredAt`); hitung 23.1; tutup tugas; StepResult `CONTINUE` dengan `outcomeCode` hasil mapping.

**Output 200:** `{"data":{"aggregatedCollectibility":3,"quality":"Poor","outcome":"COLLECT_3","label":"Collectibility 3 - Poor"},"message":"Credit report saved"}` (teks usulan engineering).

**Errors**

| code | status | condition |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Field wajib kosong, kolektibilitas di luar 1 s.d. 5 |
| `UNSUPPORTED_FILE_TYPE` | 415 | Bukan PDF |
| `TASK_NOT_ASSIGNED_TO_YOU` | 403 | 14.5 |

**Traceability:** US-68 (AC-68.02); IN-08. AC khusus layar unggah belum ada; kontrak mengikuti data dictionary CreditBureauResult.

## 23.3 GET /applications/{id}/credit-bureau

**Purpose:** Klik langkah "SLIK" di timeline.  
**Access:** `APP-INQUIRY` VIEW; lingkup data.

**Input (query):** `processInstanceId` (opsional).

**Output 200**

```json
{
  "data": {
    "mode": "SYNC", "providerCode": "SIMULATION_M10", "reportReference": "SIM-SLIK-0001", "reportDate": "2026-10-20", "hasHistory": true,
    "aggregatedCollectibility": 1, "quality": "Good", "outcome": "COLLECT_1", "label": "Collectibility 1 - Good", "reportFileId": null,
    "facilities": [ { "lenderName": "Bank Lain", "facilityType": "KTA", "plafond": "50000000.00", "outstanding": "12000000.00", "collectibility": 1, "daysPastDue": 0, "condition": "ACTIVE", "lastUpdated": "2026-09-30" } ]
  }
}
```

`label` mengikuti MRTM: "Collectibility 1 - Good", "Collectibility 2 - Fair", "Collectibility 3 - Poor" s.d. 5, "No credit history" (AC-68.01, TRM_SLK_001 s.d. 005, 007). Langkah belum berjalan, dilewati, atau `ERROR` tanpa hasil: `data: null` dengan `meta.stepStatus`; pengajuan tanpa proses `PENDING`. `facilities[].lastUpdated` kosong bila penyedia tidak memberinya.

**Errors:** `APPLICATION_NOT_FOUND` 404, `NOT_FOUND` 404 (`processInstanceId` bukan milik pengajuan), `MODULE_NOT_LICENSED` 403 (lisensi tenant tanpa M10, diperiksa use case karena menu `APP-INQUIRY` milik CORE).

**Traceability:** US-68; AC-68.01, AC-68.02.

## 23.4 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /credit-bureau-mappings`, `PUT /credit-bureau-mappings` | Peta kolektibilitas ke quality dan outcome lewat checker-maker | `MST-CREDIT-BUREAU` | RM-16 |
