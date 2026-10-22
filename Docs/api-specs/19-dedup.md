# 19. Dedup (M06)

Pengecekan duplikasi pemohon. Modul pemilik: M06 Dedup ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.18). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.11 M06. Semua rute di file ini mengembalikan `403 MODULE_NOT_LICENSED` bila M06 tidak berlisensi.

## 19.1 Perilaku langkah DEDUP (tanpa endpoint)

StepHandler `DEDUP` mencari kandidat lewat blind index NIK dan tanggal lahir, menghitung skor fuzzy per `DedupFieldSetting`, lalu mencari baris Dedup Matrix pertama yang cocok menurut prioritas.

| Hasil | StepResult | Rujukan |
|---|---|---|
| `MATCH` | `CONTINUE`; langkah DUKCAPIL dicatat `SKIPPED DEDUP_MATCH` | TRM_DDP_001 |
| `REVIEW`, `DUPLICATE_IN_FLIGHT` | `WAIT_HUMAN` antrean `PRESCREEN_DEDUP` (layar review: backlog US-60) | TRM_DDP_002, 004, 007 |
| `UNMATCH` | `CONTINUE` ke DUKCAPIL | TRM_DDP_003 |
| `SKIP` (NIK kosong) | `CONTINUE`, diperlakukan sebagai UnMatch | TRM_DDP_005 |
| Langkah dimatikan di rute | `SKIPPED NOT_IN_ROUTE` | TRM_DDP_006 |
| Gangguan teknis | `ERROR`, tampil di Process Monitoring dengan pesan modul | AC-59.02 |

## 19.2 GET /applications/{id}/dedup

**Purpose:** Tab "Dedup" di detail pengajuan dan klik langkah Dedup di timeline.  
**Access:** `APP-INQUIRY` VIEW; lingkup data.

**Input (query):** `processInstanceId` (opsional, default proses terbaru).

**Output 200**

```json
{
  "data": {
    "outcome": "REVIEW", "ranAt": "2026-10-20T07:30:02Z", "matchedApplication": { "id": "0192...", "loanId": "15092026KTA0000004" },
    "matrixRow": { "id": "0192...", "priority": 3, "nik": "MATCH", "fullNameId": "FUZZY", "dob": "MATCH", "pob": "MATCH", "motherMaidenName": "FUZZY" },
    "candidates": [ { "loanId": "15092026KTA0000004", "status": "DISBURSED", "nikResult": "MATCH", "dobResult": "MATCH", "pobResult": "MATCH", "nameScore": "0.8800", "motherNameScore": "0.8200" } ],
    "review": null
  }
}
```

Langkah belum berjalan atau dilewati: `200` dengan `data: null` dan `meta.stepStatus` (`SKIPPED`, `PENDING`).

**Errors:** `APPLICATION_NOT_FOUND` 404, `MODULE_NOT_LICENSED` 403.

**Traceability:** US-59; AC-59.01 (TRM_DDP_001 s.d. 007), AC-59.02.

## 19.3 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /dedup-matrix`, `PUT /dedup-matrix` | Baris matrix dengan prioritas dan `[ANY]` lewat checker-maker | `MST-DEDUP` | US-33 |
| `GET /dedup-field-settings`, `PUT /dedup-field-settings/{fieldCode}` | Algoritma dan ambang fuzzy 50 s.d. 100 | `MST-DEDUP` | US-33 |
| `POST /applications/{id}/dedup/review` | Verifikator memutuskan `MATCH`, `UNMATCH`, `DUPLICATE_FINISH`; menutup tugas `PRESCREEN_DEDUP` | `OPS-PRESCREEN` UPDATE | US-60 |
