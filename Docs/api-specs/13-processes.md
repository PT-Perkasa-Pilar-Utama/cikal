# 13. Processes

Riwayat proses, Process Monitoring, retry, finish, dan recontest. Modul pemilik: CORE Orchestrator ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.11). Kontrak langkah dan siklus `advance`: [../technical-specs/12-orchestrator-step-contract.md](../technical-specs/12-orchestrator-step-contract.md). Status: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.13 `StepExecution.status`.

## 13.1 Label status langkah

Server mengirim kode; klien menampilkan label berikut.

| status / skipReason | Label UI |
|---|---|
| `PENDING` | Pending |
| `RUNNING` | Running |
| `WAITING_HUMAN` | Waiting (nama antrean, contoh "Waiting Approval") |
| `WAITING_EXTERNAL` | Waiting for provider |
| `COMPLETED` | Completed (atau `outcomeCode`, contoh "Auto Approved") |
| `ERROR` | Error |
| `SKIPPED` + `NOT_IN_ROUTE` | Skipped - not in route (AC-85.02) |
| `SKIPPED` + `NOT_LICENSED` | Skipped - not licensed (AC-85.06) |
| `SKIPPED` + `CONDITION_NOT_MET` | Skipped - condition not met (AC-31.04) |
| `SKIPPED` + `DEDUP_MATCH` | Skipped - dedup match |

## 13.2 GET /applications/{id}/process

**Purpose:** Tab "Workflow": timeline langkah satu proses pengajuan, dengan pilihan proses awal atau recontest.  
**Access:** `APP-INQUIRY` VIEW; lingkup data seperti `12-applications.md` 12.9.

**Input (query):** `processInstanceId` (uuid, opsional; default proses terbaru). `processes[]` di respons mengisi dropdown "Process" (Initial, Recontest 1, ...); proses awal tetap bisa dipilih setelah recontest (AC-85.03).

**Behavior**

1. Pengajuan `DRAFT` yang belum pernah disubmit: `409 PROCESS_NOT_STARTED` (AC-85.05).
2. `orchestrator.timeline(applicationId)` untuk proses terpilih: semua langkah versi rute yang dikunci, termasuk yang `SKIPPED`, berurutan menurut tech ref 6.3.
3. `aging` = selisih tanggal kalender `endedAt` dan `startedAt` dalam satuan `AGING_UNIT` (default hari kalender, AC-85.04); langkah berjalan memakai hari ini.

**Output 200**

```json
{
  "data": {
    "applicationId": "0192...", "loanId": "20102026KTA0000013",
    "processes": [ { "id": "0192...", "recontestNumber": 0, "label": "Initial", "status": "CANCELLED" }, { "id": "0192...", "recontestNumber": 1, "label": "Recontest 1", "status": "WAITING" } ],
    "selectedProcessId": "0192...",
    "routeVersion": 2,
    "steps": [
      { "stepExecutionId": "0192...", "stepCode": "DATA_ENTRY", "status": "COMPLETED", "skipReason": null, "outcomeCode": null, "attempt": 1,
        "startedAt": "2026-10-18T02:00:00Z", "endedAt": "2026-10-20T07:30:00Z", "aging": "2", "actor": { "type": "USER", "username": "sales.jkt01" }, "summary": null, "errorMessage": null },
      { "stepExecutionId": "0192...", "stepCode": "SURVEY", "status": "SKIPPED", "skipReason": "NOT_IN_ROUTE", "outcomeCode": null, "attempt": 1,
        "startedAt": null, "endedAt": null, "aging": null, "actor": null, "summary": null, "errorMessage": null },
      { "stepExecutionId": "0192...", "stepCode": "DUKCAPIL", "status": "ERROR", "skipReason": null, "outcomeCode": null, "attempt": 3,
        "startedAt": "2026-10-20T07:30:05Z", "endedAt": null, "aging": "1", "actor": { "type": "SYSTEM" }, "summary": null, "errorMessage": "Dukcapil service timeout" }
    ]
  }
}
```

**Errors**

| code | status | condition |
|---|---|---|
| `PROCESS_NOT_STARTED` | 409 | "Process has not started. Submit the application to start the process" (AC-85.05) |
| `APPLICATION_NOT_FOUND` | 404 | "Application not found" |
| `NOT_FOUND` | 404 | `processInstanceId` bukan proses pengajuan ini |
| `VALIDATION_FAILED` | 400 | `processInstanceId` bukan uuid |

**Traceability:** US-85; AC-85.01 s.d. AC-85.06; AC-31.04; AC-59.02, AC-61.02, AC-67.04 (pesan error langkah).

## 13.3 GET /process-monitoring

**Purpose:** Halaman "Process Monitoring": pengajuan berjalan beserta langkah saat ini.  
**Access:** `OPS-MONITORING` VIEW.

**Input (query)**

| field | type | required | notes |
|---|---|---|---|
| status | enum | tidak | status langkah saat ini: `ERROR`, `WAITING_HUMAN`, `WAITING_EXTERNAL`, `RUNNING` |
| stepCode | enum | tidak | |
| branchId | uuid | tidak | |
| q | string | tidak | Loan ID atau nama |
| page, pageSize, sort | | tidak | `sort`: `stepStartedAt`, `loanId` |

**Output 200**

```json
{ "data": [ { "applicationId": "0192...", "loanId": "20102026KTA0000013", "fullName": "Rudi Hartono", "branchCode": "011", "processInstanceId": "0192...",
              "currentStep": { "stepExecutionId": "0192...", "stepCode": "DUKCAPIL", "status": "ERROR", "attempt": 3, "errorCategory": "TIMEOUT",
                               "errorMessage": "Dukcapil service timeout", "startedAt": "2026-10-20T07:30:05Z" } } ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 } }
```

Filter `status=ERROR` hanya mengembalikan pengajuan yang langkah saat ininya `ERROR` beserta pesan error (AC-86.04).

**Traceability:** US-86; AC-86.04.

## 13.4 POST /processes/{processInstanceId}/steps/{stepExecutionId}/retry

**Purpose:** Admin Operasional menjalankan ulang langkah yang `ERROR` (tombol "Retry").  
**Access:** `OPS-MONITORING` UPDATE.  
**Idempotency:** wajib.

**Input:** tanpa body.

**Behavior**

1. Kunci ProcessInstance. Langkah bukan langkah saat ini atau statusnya bukan `ERROR`: `409 INVALID_STATE`.
2. `orchestrator.retry(stepExecutionId, by)`: `attempt + 1`, lalu langkah dijalankan **sinkron di dalam request** dengan batas waktu `timeoutSeconds` adapter + 5 detik (ER-02).
3. Hasil bukan `ERROR`: langkah berikutnya di-enqueue seperti biasa; tugas `PROCESS_ERROR` terkait ditutup; pengajuan hilang dari filter Error (AC-86.01).
4. Hasil `ERROR` lagi: status tetap `ERROR` dengan `attempt` baru (AC-86.03); retry otomatis tidak dijadwalkan.
5. Catat audit `STEP_RETRIED`.

**Output 200** (berhasil)

```json
{ "data": { "stepExecutionId": "0192...", "stepCode": "DUKCAPIL", "status": "COMPLETED", "attempt": 4, "outcomeCode": "PASSED" }, "message": "Step retried" }
```

**Errors**

| code | status | condition |
|---|---|---|
| `STEP_FAILED_AGAIN` | 422 | "Step failed again: Dukcapil service timeout" (AC-86.03); `details` memuat `attempt` dan `errorCategory`; pesan memakai `errorMessage` langkah |
| `INVALID_STATE` | 409 | Langkah tidak berstatus `ERROR` |
| `NOT_FOUND` | 404 | |

**Traceability:** US-86; AC-86.01, AC-86.03.

## 13.5 POST /processes/{processInstanceId}/finish

**Purpose:** Admin Operasional menghentikan proses (tombol "Finish").  
**Access:** `OPS-MONITORING` UPDATE.  
**Idempotency:** wajib.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| reason | string | ya | maks 500 |

**Behavior:** Proses berstatus `COMPLETED` atau `CANCELLED`: `409 INVALID_STATE`. `orchestrator.finish`: ProcessInstance `CANCELLED`, Application `FINISHED_CANCELLED` dengan alasan, tugas terbuka pengajuan ditutup, audit `PROCESS_FINISHED` (AC-86.02).

**Output 200:** `{"data":{"processInstanceId":"0192...","applicationStatus":"FINISHED_CANCELLED"},"message":"Process finished"}`.

**Errors:** `VALIDATION_FAILED` 400 (alasan kosong, detail "This field is required"), `INVALID_STATE` 409.

**Traceability:** US-86; AC-86.02.

## 13.6 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `POST /applications/{id}/recontest` | Risk Manager memproses ulang pengajuan berstatus `RECONTEST` dengan alasan dan perubahan field; ProcessInstance baru, maksimal `RECONTEST_MAX` | `OPS-RECONTEST` UPDATE | US-71; ER-04, ER-05 |
| `POST /applications/{id}/recontest/finish` | Risk Manager menutup pengajuan Recontest menjadi `FINISHED_REJECTED` | `OPS-RECONTEST` UPDATE | US-71 |
