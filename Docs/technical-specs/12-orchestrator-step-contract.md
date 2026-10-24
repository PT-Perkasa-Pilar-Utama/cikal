# 12. Orchestrator dan Kontrak Langkah

Orchestrator menggantikan BPT OutSystems: menjalankan langkah-langkah rute produk untuk satu pengajuan, mencatat riwayat, menunggu tugas manusia atau jawaban pihak ketiga, menangani error dan retry, dan memulai recontest. Kontrak ini dipakai setiap modul yang menjadi langkah rute (Survey, Dedup, Dukcapil, Name Screening, Verification, Fraud, RAC, Scoring, Credit Bureau, Decision, SIKP, Approval, Epolis, Validity Check, Print Akad, Disbursement, Wait Core).

> **Dokumen ini satu-satunya sumber untuk kontrak langkah dan perilaku orchestrator.** Dokumen lain dan kartu task merujuk ke sini, tidak mengulang isinya.

## 12.1 Matriks keputusan

| Hal | Keputusan | Alasan |
|---|---|---|
| Mesin | Orchestrator sendiri di modul CORE Orchestrator di atas pg-boss | AP-05; tanpa workflow engine (tech ref 6, P-01) |
| Urutan langkah | Tetap, dari tech ref 6.3; kode langkah disimpan, bukan nomor urut | RT-02; menyisipkan langkah baru tidak mengubah data lama |
| Unit kerja | Satu job pg-boss `orchestrator.advance` per pengajuan per langkah | Proses mati di tengah tidak menghilangkan pekerjaan (NF-24) |
| Konkurensi | Satu langkah berjalan per ProcessInstance; dijaga `SELECT ... FOR UPDATE` pada ProcessInstance | Mencegah dua worker menjalankan langkah yang sama |
| Idempotensi | `idempotencyKey` = `processInstanceId` + `stepCode` + `attempt`; StepHandler wajib aman dipanggil ulang dengan kunci sama | COM-03 |
| Hasil langkah | Tujuh hasil kontrak: `CONTINUE`, `WAIT_HUMAN`, `WAIT_EXTERNAL`, `BACK_TO_DRAFT`, `RECONTEST`, `FINISH`, `ERROR` | Tech ref 5.1 |
| Langkah dilewati | Dicatat `SKIPPED` dengan `skipReason`; tidak memanggil StepHandler | RT, COM-05, AC-85.02 |
| Langkah bersyarat | StepHandler menyediakan `isApplicable(ctx)`; false = `SKIPPED CONDITION_NOT_MET` | RT-08, AC-31.04 |
| Snapshot | Saat `start`: versi rute, versi rumus aktif, parameter `lockOnSubmit` disimpan di ProcessInstance | RT-06, FM-05, PR-06 |
| Error sementara | Retry otomatis sesuai `maxRetries` dengan jeda 30 detik, 2 menit, 8 menit; lalu `ERROR` | ER-03, IN-07 |
| Error permanen | `AUTH`, `CONFIG`, `INVALID_RESPONSE`, `FORMULA`, `CONSENT_MISSING` langsung `ERROR` | IN-07, FM-09, IN-12 |
| Retry manual | Admin Operasional: `attempt + 1`, job baru | ER-02, AC-86.01 |
| Recontest | ProcessInstance baru, `recontestNumber + 1`, snapshot baru, mulai dari langkah pertama setelah DATA_ENTRY; maksimal `RECONTEST_MAX` | ER-04, ER-05 |
| Dedup MATCH | Langkah DUKCAPIL dicatat `SKIPPED DEDUP_MATCH` | Tech ref 6.3 |
| Hasil untuk Decision | M11 membaca `outcomeCode` enam langkah lewat `orchestrator.outcomes(processId)`, bukan tabel modul lain | XM-02, DEP-02 |
| Aging | Dihitung saat langkah selesai, satuan `AGING_UNIT` | RM-04, AC-85.04 |

## 12.2 Antarmuka

```ts
// packages/contracts/src/orchestrator/step.ts
export type StepCode =
  | "DATA_ENTRY" | "SURVEY" | "DEDUP" | "DUKCAPIL" | "NAME_SCREENING" | "VERIFICATION"
  | "FRAUD" | "RAC" | "SCORING" | "CREDIT_BUREAU" | "DECISION" | "SIKP" | "APPROVAL"
  | "EPOLIS" | "VALIDITY_CHECK" | "PRINT_AKAD" | "DISBURSEMENT" | "WAIT_CORE";

export interface StepContext {
  tenantId: string;
  applicationId: string;
  loanId: string;
  processInstanceId: string;
  stepCode: StepCode;
  attempt: number;
  idempotencyKey: string;
  parameterSnapshot: Readonly<Record<string, string>>;
  formulaVersions: Readonly<Record<string, string>>;
  correlationId: string;
}

export type StepResult =
  | { type: "CONTINUE"; outcomeCode: string; summary: string }
  | { type: "WAIT_HUMAN"; queueCode: string; branchId: string; eligibleRoleId?: string; assigneeUserId?: string; summary: string }
  | { type: "WAIT_EXTERNAL"; externalReference: string; waitDeadline: Date; summary: string }
  | { type: "BACK_TO_DRAFT"; outcomeCode: string; returnNote: string }
  | { type: "RECONTEST"; outcomeCode: string; summary: string }
  | { type: "FINISH"; outcomeCode: string; applicationStatus: "DISBURSED" | "FINISHED_REJECTED" | "APPROVED"; summary: string }
  | { type: "ERROR"; errorCategory: ErrorCategory; errorMessage: string; retryable: boolean };

export type ErrorCategory =
  | "TIMEOUT" | "CONNECTION" | "PROVIDER_ERROR" | "AUTH" | "CONFIG"
  | "INVALID_RESPONSE" | "CONSENT_MISSING" | "FORMULA" | "BUSINESS_SETUP";
```

`StepHandler` memakai tipe `Tx` platform, jadi antarmukanya ada di modul Orchestrator (`apps/api/src/modules/core/orchestrator/application/step-handler.ts`, diekspor `index.ts`), bukan di `packages/contracts`. Modul langkah mendaftarkan handler lewat `StepHandlerRegistry.register(handler)` saat `onModuleInit`.

```ts
export interface StepHandler {
  readonly stepCode: StepCode;
  readonly moduleCode: string;                                   // untuk pemeriksaan lisensi; sama dengan tech ref 6.3
  isApplicable?(tx: Tx, ctx: StepContext): Promise<boolean>;     // langkah bersyarat
  execute(tx: Tx, ctx: StepContext): Promise<StepResult>;        // sekali per attempt
  onHumanTaskClosed?(tx: Tx, ctx: StepContext, resultCode: string, payload: unknown): Promise<StepResult>;
  onExternalResult?(tx: Tx, ctx: StepContext, payload: unknown): Promise<StepResult>;
}
```

Invariant untuk setiap StepHandler:

1. Semua penulisan data langkah dilakukan di transaksi yang diberikan orchestrator; orchestrator menyimpan `StepExecution` di transaksi yang sama.
2. `execute` tidak memanggil langkah lain dan tidak mengubah status Application secara langsung; perubahan status hanya lewat `StepResult`.
3. Panggilan pihak ketiga lewat Integration Registry (`13-integration-adapter-pattern.md`), tidak pernah langsung.
4. Penolakan bisnis bukan `ERROR`: contoh NIK tidak ditemukan dipetakan ke `outcomeCode` (IN-07).
5. `BUSINESS_SETUP` dipakai untuk konfigurasi yang belum ada (contoh "No approval level covers this amount", "No active scoring model for product ...").

## 12.3 Siklus `advance`

```text
advance(processId):
  lock ProcessInstance FOR UPDATE
  if ProcessInstance bukan RUNNING: return (job ganda atau terlambat tidak mengubah apa pun)
  step = langkah pertama urutan baku yang attempt terakhirnya belum COMPLETED atau SKIPPED
  if step tidak ada: gagal (FINISH seharusnya sudah dicatat langkah terakhir); job berakhir di dead-letter
  if step ERROR:                                   retry otomatis jatuh tempo; attempt + 1, jalankan
  if step dimatikan di rute:                       catat SKIPPED NOT_IN_ROUTE; enqueue advance; return
  if modul step tidak berlisensi:                  catat SKIPPED NOT_LICENSED; enqueue advance; return
  if step tidak ada di versi rute:                 catat SKIPPED NOT_IN_ROUTE; enqueue advance; return
  if handler.isApplicable == false:                catat SKIPPED CONDITION_NOT_MET; enqueue advance; return
  catat RUNNING; result = handler ? handler.execute(tx, ctx) : ERROR CONFIG "No step handler is installed for <step>"
  switch result.type:
    CONTINUE      -> COMPLETED; enqueue advance
    WAIT_HUMAN    -> WAITING_HUMAN; ProcessInstance WAITING; taskQueue.create(...)
    WAIT_EXTERNAL -> WAITING_EXTERNAL; ProcessInstance WAITING; jadwalkan job batas tunggu
    BACK_TO_DRAFT -> COMPLETED; application.returnToDraft(note); ProcessInstance CANCELLED
    RECONTEST     -> COMPLETED; Application RECONTEST; ProcessInstance CANCELLED; tugas antrean RECONTEST
    FINISH        -> COMPLETED; Application status sesuai result; ProcessInstance COMPLETED
    ERROR         -> retryable dan attempt <= 3 ? ERROR, jadwalkan advance dengan jeda : ERROR, ProcessInstance WAITING + tugas PROCESS_ERROR
  publish StepCompleted / StepFailed / StepSkipped (outbox)
```

Event langkah ditulis ke outbox platform di transaksi langkah dengan `aggregate_id` = id pengajuan dan payload `{ processInstanceId, applicationId, stepCode, attempt, outcomeCode, skipReason }`; status menunggu (WAITING_HUMAN, WAITING_EXTERNAL) tidak menghasilkan event.

Langkah yang tidak ada di versi rute biasanya modul tak berlisensi, karena editor rute tidak menampilkannya (RT-04); karena itu pemeriksaan lisensi mendahului pemeriksaan "tidak ada di versi rute" (AC-85.06, slot NAME_SCREENING). Langkah yang dimatikan eksplisit tetap NOT_IN_ROUTE walau modulnya tak berlisensi (AC-85.02).

Keluar dari status menunggu memakai pencatatan hasil yang sama: `completeHumanStep` (WAITING_HUMAN -> COMPLETED), `receiveExternal` (WAITING_EXTERNAL -> COMPLETED atau ERROR), dan job batas tunggu (WAITING_EXTERNAL -> ERROR `TIMEOUT` tanpa retry otomatis). Hasil yang tidak diizinkan state machine 06 §6.13 ditolak.

## 12.4 Target kinerja

| Ukuran | Target | Sumber |
|---|---|---|
| Overhead orchestrator per langkah (di luar StepHandler) | < 50 ms | Turunan NF-12 |
| Langkah otomatis internal | < 2 detik | NF-12 |
| Jeda antar langkah otomatis (antrean) | < 1 detik p95 | Turunan NF-11 |
| Submit sampai DECISION untuk KTA tanpa langkah manual, adapter simulasi | < 30 detik | Kriteria POC K-02 |

## 12.5 Batasan keamanan dan operasional

- Worker menjalankan setiap job dengan konteks tenant dari payload job; tanpa tenant, job gagal permanen.
- Payload job hanya berisi id; data sensitif dibaca dari database dalam transaksi.
- Job gagal permanen masuk antrean `dead-letter` pg-boss dan memunculkan tugas `PROCESS_ERROR`.

## 12.6 Komponen

```text
apps/api/src/modules/core/orchestrator/
├── index.ts                          export: OrchestratorApi, StepHandler, StepHandlerRegistry, stepExecutions (FK)
├── orchestrator.data.ts              migrasi dan antrean pg-boss modul
├── domain/route-plan.ts              alasan lewati, langkah saat ini, urutan baku tech ref 6.3
├── domain/step-transitions.ts        state machine StepExecution dan ProcessInstance
├── domain/retry-policy.ts, aging.ts  jeda retry ER-03, aging hari kalender
├── application/start-process.ts      snapshot rute, rumus, parameter
├── application/step-runner.ts        siklus advance (12.3)
├── application/step-results.ts       pencatatan tujuh hasil
├── application/waiting-steps.ts      completeHumanStep, receiveExternal, batas tunggu
├── application/recontest.ts          (backlog, US-71)
├── application/monitoring.ts         retry, finish (US-86, kartu BE-S2-03)
├── jobs/advance.job.ts               konsumen pg-boss orchestrator.advance
├── jobs/wait-deadline.job.ts         konsumen pg-boss orchestrator.wait-deadline
└── db/schema.ts                      process_instances, step_executions
```

```ts
export interface OrchestratorApi {
  start(applicationId: string): Promise<{ processInstanceId: string }>;
  completeHumanStep(stepExecutionId: string, resultCode: string, payload: unknown): Promise<void>;
  receiveExternal(externalReference: string, payload: unknown): Promise<"MATCHED" | "IGNORED_NOT_WAITING" | "DUPLICATE">;
  retry(stepExecutionId: string, by: string): Promise<void>;
  finish(processInstanceId: string, reason: string, by: string): Promise<void>;
  recontest(applicationId: string, reason: string, changedFields: unknown, by: string): Promise<{ processInstanceId: string }>;
  outcomes(processInstanceId: string): Promise<Partial<Record<StepCode, string>>>;  // COMPLETED: outcomeCode, SKIPPED: "SKIP"
  nextStep(processInstanceId: string, after: StepCode): Promise<StepCode | null>;    // dipakai GET /applications/{id}/decision
  stepOf(applicationId: string, stepCode: StepCode, processInstanceId?: string): Promise<{ processInstanceId: string; status: StepStatus } | null>;  // endpoint hasil langkah modul (api 19 s.d. 23)
  timeline(applicationId: string): Promise<TimelineEntry[]>;
}
```

## 12.7 Yang tidak dilakukan orchestrator

| Bukan tanggung jawab | Alasan | Tempat sebenarnya |
|---|---|---|
| Aturan bisnis langkah (skor, matrix, ambang) | Orchestrator tidak mengenal isi langkah | Modul langkah |
| Siapa boleh mengambil tugas | Aturan antrean | Task Queue, `09-authentication-authorization.md` 9.4 |
| Format dan transport pihak ketiga | Detail penyedia | Adapter (`13-integration-adapter-pattern.md`) |
| Mengubah urutan atau menggambar cabang rute | Dilarang R-02, RT-02 | Tidak ada |
| Notifikasi nasabah | Efek samping lewat event | Notification |

## 12.8 Rujukan silang

| Hal | Sumber |
|---|---|
| Urutan langkah baku | `Docs/cikal-tech-reference.md` 6.3 |
| Status pengajuan dan langkah | `06-data-model.md` 6.13 |
| Aturan rute | Tech ref 6.2; `05-module-definitions.md` 5.5 |
| Error dan retry | Tech ref 6.5, IN-07 |
| Antrean | Tech ref 7; data dictionary HumanTask |
| AC | AC-31.03, AC-31.04, AC-58.01 s.d. AC-58.06, AC-71.01 s.d. AC-71.07, AC-85.01 s.d. AC-85.06, AC-86.01 s.d. AC-86.04 |

## 12.9 Tindak lanjut terbuka

| Hal | Pemicu untuk ditinjau ulang |
|---|---|
| Satu job per langkah bisa menjadi bottleneck bila volume naik jauh | Lebih dari 50.000 pengajuan per bulan per tenant |
| SLA dan eskalasi per langkah belum diminta | BA menulis AC SLA (grooming v1 E-07) |
| Pemisahan worker per modul | Satu modul memakai CPU jauh di atas yang lain |
