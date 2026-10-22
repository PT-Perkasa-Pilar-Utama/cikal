# 13. Pola Adapter Integrasi

Cikal tidak membangun layanan pihak ketiga; Cikal menyediakan tempatnya. Setiap modul yang memakai pihak ketiga (CORE Identity, Notification, Master Data, M04, M07, M08, M10, M12 s.d. M16) punya port berisi kontrak kanonik dan satu atau lebih adapter. Integration Registry di CORE menyimpan konfigurasi penyedia per tenant, rujukan rahasia, dan log panggilan.

> **Dokumen ini satu-satunya sumber untuk pola adapter, Integration Registry, dan penanganan error integrasi.** Dokumen lain dan kartu task merujuk ke sini. Aturan bisnisnya adalah IN-01 s.d. IN-15 di `Docs/cikal-tech-reference.md` 10.3; dokumen ini menjelaskan implementasinya.

## 13.1 Matriks keputusan

| Hal | Keputusan | Alasan |
|---|---|---|
| Letak kode adapter | Di modul pemilik (`<modul>/adapters/`) | Ikut terpasang dan tercabut bersama modul (AP-02, PK-02) |
| Letak konfigurasi | Integration Registry (CORE) | Satu layar untuk semua integrasi (IN-05) |
| Port | Satu port per modul, berisi kontrak kanonik tech ref 10.4 | Domain tidak mengenal format penyedia (IN-01) |
| Adapter minimum | Satu adapter asli + satu adapter simulasi per port | AP-06, IN-03; dua adapter membenarkan port |
| Pemilihan adapter | Saat runtime per tenant dari IntegrationConfig ACTIVE | IN-02 |
| Simulasi di production | Ditolak kecuali tenant bertanda trial dan `ALLOW_SIMULATION_ADAPTERS` | IN-03 |
| Kredensial | Rujukan `secret_ref` ke `platform.secrets`, terenkripsi; satu kredensial satu tenant | IN-04 |
| Transport | Bebas per adapter (REST, SOAP, file, SFTP); detail tersembunyi di adapter | IN-01 |
| Timeout dan retry | Dari IntegrationConfig; retry hanya untuk kategori sementara | COM-04, IN-07 |
| Logging | Setiap panggilan ke IntegrationCallLog dengan PII disamarkan; respons mentah terenkripsi di hasil modul | IN-06 |
| Mode | `SYNC`, `ASYNC` (`WAIT_EXTERNAL`), `MANUAL` (tugas manusia) | IN-08 |
| Penyedia baru | Adapter baru (kode, rilis, uji kontrak); tanpa pemetaan lewat UI | IN-13 |

## 13.2 Antarmuka

```ts
// packages/contracts/src/integration/adapter.ts
export interface AdapterDescriptor<Req, Res> {
  providerCode: string;                    // "DUKCAPIL_ASIS", "SIMULATION_M07"
  moduleCode: string;                      // "M07"
  supportedModes: ReadonlyArray<"SYNC" | "ASYNC" | "MANUAL">;
  isSimulation: boolean;
  settingsSchema: ZodSchema;               // skema pengaturan khusus (IN-05)
  adapterVersion: string;
  call(req: Req, cfg: ResolvedConfig): Promise<AdapterOutcome<Res>>;
  testConnection(cfg: ResolvedConfig): Promise<void>;
  parseInbound?(raw: InboundRequest, cfg: ResolvedConfig): Promise<{ externalReference: string; payload: Res }>;
}

export type AdapterOutcome<Res> =
  | { ok: true; response: Res; raw: unknown }
  | { ok: false; category: "TIMEOUT" | "CONNECTION" | "PROVIDER_ERROR" | "AUTH" | "CONFIG" | "INVALID_RESPONSE"; message: string; raw?: unknown };

// Contoh port M07 (kontrak kanonik tech ref 10.4)
export interface DukcapilRequest {
  nik: string; kkNumber?: string; fullName: string; motherMaidenName: string;
  dateOfBirth: string; placeOfBirth: string;
}
export interface DukcapilResponse {
  recordFound: boolean; dobMatch: boolean; pobMatch: boolean;
  fullNameScore: number; motherNameScore: number; providerReference?: string;
}
```

Antarmuka Integration Registry (`modules/core/integration/index.ts`):

```ts
export interface IntegrationApi {
  invoke<Req, Res>(moduleCode: string, req: Req, ctx: CallContext, opts?: { providerCode?: string }): Promise<AdapterOutcome<Res>>;
  activeMode(tenantId: string, moduleCode: string): Promise<"SYNC" | "ASYNC" | "MANUAL" | "NONE">;
  testConnection(configId: string): Promise<{ result: "SUCCESS" | "FAILED"; message?: string }>;
  registerAdapter(descriptor: AdapterDescriptor<unknown, unknown>): void;  // dipanggil saat modul dimuat
}
```

Aturan `invoke`:

1. Konfigurasi ACTIVE diambil dari cache (invalidasi `NOTIFY`); bila tidak ada, `CONFIG` dengan pesan "Integration provider not configured" (IN-09).
2. Adapter simulasi ditolak di production kecuali tenant trial.
3. Hanya field kontrak kanonik yang diteruskan ke adapter (IN-11).
4. Panggilan dibatasi `timeoutSeconds`; kategori `TIMEOUT`, `CONNECTION`, `PROVIDER_ERROR` dikembalikan sebagai retryable ke orchestrator.
5. Setiap percobaan dicatat ke IntegrationCallLog (status, durasi, kategori, request dan response disamarkan).
6. `AUTH` dan `CONFIG` mengirim alert ke admin tenant (event `IntegrationConfigFailed`).

## 13.3 Mode interaksi di dalam StepHandler

| Mode | Perilaku StepHandler |
|---|---|
| SYNC | `invoke` lalu domain menafsirkan respons; hasil `CONTINUE`, `WAIT_HUMAN`, `FINISH`, atau `RECONTEST` |
| ASYNC | `invoke` mengembalikan `externalReference`; hasil `WAIT_EXTERNAL` dengan batas `asyncWaitHours`; data masuk lewat `inbound` memanggil `onExternalResult` |
| MANUAL | Tidak memanggil adapter; hasil `WAIT_HUMAN` ke antrean tugas (contoh `CREDIT_REPORT_UPLOAD`, Record Disbursement US-101); `onHumanTaskClosed` membentuk hasil dari isian petugas |

## 13.4 Data masuk

| Hal | Implementasi |
|---|---|
| Rute | `POST /api/v1/integrations/inbound/{companyCode}/{providerCode}` |
| Autentikasi | Sesuai adapter: API key di header, token, atau mTLS yang diverifikasi Nginx |
| Idempotensi | Kunci = providerCode + rujukan penyedia; panggilan ulang mengembalikan hasil pertama |
| Pencocokan | `parseInbound` menghasilkan `externalReference`; orchestrator mencocokkan dengan StepExecution `WAITING_EXTERNAL` |
| Tidak cocok | Dicatat `IGNORED_NOT_WAITING`, `DUPLICATE`, atau `UNKNOWN_REFERENCE`; respons 200 agar penyedia tidak mengulang |

## 13.5 Target kinerja

| Ukuran | Target | Sumber |
|---|---|---|
| Timeout default | 30 detik | COM-04 |
| Retry | 3 kali dengan jeda 30 detik, 2 menit, 8 menit | ER-03, `12-orchestrator-step-contract.md` 12.1 |
| Overhead `invoke` (di luar penyedia) | < 20 ms | Turunan NF-12 |
| Retensi log panggilan | 1 tahun, tabel dipartisi bulanan | NF-31 |

## 13.6 Batasan keamanan

- Kredensial tidak pernah tampil di UI; hanya bisa diganti (PR-09).
- Log tidak menyimpan PII mentah; NIK, nama ibu, nomor rekening disamarkan.
- Endpoint penyedia wajib `https` (IN-05), kecuali adapter berbasis file atau SFTP.
- Adapter tidak boleh menulis ke database; hasil dikembalikan ke domain modul.

## 13.7 Komponen

```text
apps/api/src/modules/core/integration/
├── index.ts                    IntegrationApi
├── domain/registry.ts          katalog adapter dari modul yang dimuat
├── application/invoke.ts       resolve, guard simulasi, timeout, klasifikasi, log
├── application/inbound.ts      endpoint data masuk
├── http/                       layar konfigurasi integrasi (checker-maker), test connection
└── db/schema.ts                integration_providers, integration_configs, integration_call_logs

apps/api/src/modules/addons/m07-dukcapil/
├── ports/dukcapil.port.ts      DukcapilRequest, DukcapilResponse
└── adapters/
    ├── asis.adapter.ts         format AS-IS (NIK, NoKK, FullName, MotherName, DOB, POB)
    └── simulation.adapter.ts   respons dari data simulasi per NIK
```

Setiap adapter punya uji kontrak bersama (`adapter.contract.spec.ts`) yang dijalankan terhadap adapter asli (dengan rekaman respons) dan adapter simulasi.

## 13.8 Yang tidak dilakukan

| Bukan tanggung jawab | Alasan | Tempat sebenarnya |
|---|---|---|
| Menafsirkan hasil (skor, ambang, GO/NOTGO) | Tafsiran milik Cikal dan configurable | Lapisan domain modul (tech ref 10.2) |
| Pemetaan format penyedia lewat UI | Sulit diuji, berisiko keamanan | Adapter baru (IN-13) |
| Menentukan langkah berikutnya | Alur proses | Orchestrator |
| Menyimpan hasil bisnis | Data milik modul | Tabel hasil modul (contoh `dukcapil_results`) |
| API mitra M02 | Mitra adalah klien yang memanggil Cikal | Modul M02 |

## 13.9 Rujukan silang

| Hal | Sumber |
|---|---|
| Klasifikasi modul dan aturan IN | Tech ref 10.1 s.d. 10.3 |
| Kontrak kanonik per modul | Tech ref 10.4 |
| Adapter rilis pertama | Tech ref 10.5; `10-integration-points.md` 10.1 |
| Entity | Data dictionary bagian Integration Registry; `06-data-model.md` 6.10 |
| Kontrak langkah | `12-orchestrator-step-contract.md` |

## 13.10 Tindak lanjut terbuka

| Hal | Pemicu |
|---|---|
| Penyedia nyata untuk client pertama | Product Owner dan client menetapkan penyedia (TO-16) |
| Adapter Vault untuk kredensial | Bank mewajibkan HashiCorp Vault |
| SFTP untuk file core | Client meminta pengiriman file lewat SFTP (Asumsi A-09) |
| Circuit breaker per penyedia | Satu penyedia sering timeout dan memperlambat antrean |
