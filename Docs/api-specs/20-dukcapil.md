# 20. Dukcapil (M07)

Verifikasi data kependudukan. Modul pemilik: M07 Dukcapil ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.18). Port `DukcapilPort` dengan adapter format AS-IS dan simulasi ([../technical-specs/13-integration-adapter-pattern.md](../technical-specs/13-integration-adapter-pattern.md)). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.11 M07. Rute mengembalikan `403 MODULE_NOT_LICENSED` bila M07 tidak berlisensi.

## 20.1 Perilaku langkah DUKCAPIL (tanpa endpoint)

Contoh aturan seed: bobot nama 60%, nama ibu 40%, ambang Passed 0,90, Review 0,75 (AC-61.01).

| Kondisi | Hasil | StepResult | Rujukan |
|---|---|---|---|
| Tanggal lahir kosong | `SKIP` | `CONTINUE` | TRM_DKC_008 |
| Tanggal lahir atau tempat lahir beda | `FAILED` tanpa skor | `FINISH FINISHED_REJECTED` + email penolakan | TRM_DKC_006, 007 |
| Skor akhir >= ambang Passed (inklusif) | `PASSED` | `CONTINUE` | TRM_DKC_001, 002 |
| Ambang Review <= skor < Passed | `REVIEW` | `WAIT_HUMAN` antrean `PRESCREEN_DUKCAPIL_L1` (backlog US-62) | TRM_DKC_003, 004 |
| Skor < ambang Review | `FAILED` | `FINISH FINISHED_REJECTED` | TRM_DKC_005 |
| NIK tidak ditemukan | `notFoundOutcome` aturan (default `REVIEW`) | | IN-07 |
| Timeout 30 detik pada 3 percobaan | `ERROR` "Dukcapil service timeout" | | AC-61.02 |
| Dedup `MATCH` | `SKIPPED DEDUP_MATCH` | | 19.1 |

## 20.2 GET /applications/{id}/dukcapil

**Purpose:** Tab "Dukcapil" dan klik langkah Dukcapil di timeline.  
**Access:** `APP-INQUIRY` VIEW; lingkup data.

**Input (query):** `processInstanceId` (opsional).

**Output 200**

```json
{
  "data": {
    "outcome": "REVIEW", "recordFound": true, "providerCode": "SIMULATION_M07", "providerReference": "SIM-0001",
    "dobStatus": "MATCH", "pobStatus": "MATCH", "fullNameScore": "0.9000", "motherNameScore": "0.8500", "finalScore": "0.8800",
    "rule": { "nameWeight": "60.0000", "motherNameWeight": "40.0000", "passedThreshold": "0.9000", "reviewThreshold": "0.7500" },
    "reviews": []
  }
}
```

Respons mentah penyedia tidak dikembalikan. Langkah belum berjalan atau dilewati: `data: null` dengan `meta.stepStatus`.

**Errors:** `APPLICATION_NOT_FOUND` 404, `MODULE_NOT_LICENSED` 403.

**Traceability:** US-61; AC-61.01 (TRM_DKC_001 s.d. 008), AC-61.02.

## 20.3 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /dukcapil-rules`, `PUT /dukcapil-rules` | Bobot (jumlah 100), ambang, hasil NIK tidak ditemukan | `MST-DUKCAPIL` | US-34 |
| `POST /applications/{id}/dukcapil/review` | Verifikator L1: `PASS`, `FAIL`, atau teruskan `REVIEW` ke Supervisor; catatan maks 500 | `OPS-PRESCREEN` UPDATE | US-62 |
| `POST /applications/{id}/dukcapil/review-l2` | Supervisor memutuskan; bukan user yang meneruskan | `OPS-PRESCREEN-L2` UPDATE | US-63; AC-63.05 |
