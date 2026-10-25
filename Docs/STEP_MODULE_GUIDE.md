# Cikal LOS: Panduan Menambah Modul Langkah

**Version:** 0.1 (draf)  
**Date:** 2026-10-25  
**Author:** Tech Lead PPU  
**Status:** Draft  
**Phase:** POC  

Panduan ini menjelaskan cara menambah satu modul langkah rute dari awal sampai PR. Contohnya modul langkah dummy di slot `NAME_SCREENING` (M16). Kontrak langkah lengkap ada di [technical-specs/12-orchestrator-step-contract.md](technical-specs/12-orchestrator-step-contract.md). Panduan ini hanya merujuknya.

Target kriteria POC K-08: developer yang tidak ikut membangun menambah satu modul langkah dalam 2 hari kerja atau kurang ([business/grooming/grooming-cikal-ba-v2.md](business/grooming/grooming-cikal-ba-v2.md)).

## Daftar Isi

1. [Pilih skenario](#1-pilih-skenario)
2. [Kontrak langkah dalam satu halaman](#2-kontrak-langkah-dalam-satu-halaman)
3. [Skenario A: isi slot langkah yang sudah ada](#3-skenario-a-isi-slot-langkah-yang-sudah-ada)
4. [Skenario B: tambah kode langkah baru](#4-skenario-b-tambah-kode-langkah-baru)
5. [Pola lanjutan](#5-pola-lanjutan)
6. [Daftar periksa selesai](#6-daftar-periksa-selesai)

---

## 1. Pilih skenario

Urutan langkah rute tetap (tech ref 6.3, RT-02). Setiap langkah punya kode di `stepCodes` (`packages/contracts/src/orchestrator/step.ts`) dan modul pemilik di `stepModules`.

| Kondisi | Skenario | Perkiraan |
|---|---|---|
| Kode langkah sudah ada, modulnya belum dibangun. Contoh `NAME_SCREENING` (M16), `SURVEY` (M05), `SIKP` (M12), `EPOLIS` (M14) | A | 1 hari |
| Langkah belum punya kode | A, lalu B | 2 hari |

Skenario B mengubah urutan baku. Minta persetujuan TL sebelum mulai, karena urutan baku adalah keputusan produk (RT-02).

## 2. Kontrak langkah dalam satu halaman

Orchestrator memanggil `StepHandler` satu kali per attempt. Handler mengembalikan satu `StepResult`.

```ts
export interface StepHandler {
  readonly stepCode: StepCode;
  readonly moduleCode: string;
  isApplicable?(tx: Tx, ctx: StepContext): Promise<boolean>;
  execute(tx: Tx, ctx: StepContext): Promise<StepResult>;
  onHumanTaskClosed?(tx: Tx, ctx: StepContext, resultCode: string, payload: unknown): Promise<StepResult>;
  onExternalResult?(tx: Tx, ctx: StepContext, payload: unknown): Promise<StepResult>;
}
```

| `StepResult.type` | Akibat | Contoh |
|---|---|---|
| `CONTINUE` | Langkah `COMPLETED`; orchestrator lanjut ke langkah berikutnya | Decision Go |
| `WAIT_HUMAN` | Langkah `WAITING_HUMAN`; Task Queue membuat tugas | Verifikasi dokumen |
| `WAIT_EXTERNAL` | Langkah `WAITING_EXTERNAL`; orchestrator menunggu jawaban penyedia | SLIK asinkron |
| `BACK_TO_DRAFT` | Pengajuan kembali ke Draft dengan catatan | Return oleh approver |
| `RECONTEST` | Pengajuan ke Recontest | Decision NotGo |
| `FINISH` | Pengajuan selesai dengan status di hasil | Reject |
| `ERROR` | Langkah `ERROR`; retry otomatis bila `retryable` | Setup belum ada |

Aturan wajib (technical-specs 12 §12.2):

1. Tulis data langkah hanya lewat `tx` yang diberikan orchestrator.
2. Jangan ubah status pengajuan secara langsung. Kembalikan `StepResult`.
3. Panggil pihak ketiga hanya lewat Integration Registry ([technical-specs/13-integration-adapter-pattern.md](technical-specs/13-integration-adapter-pattern.md)).
4. Petakan penolakan bisnis ke `outcomeCode`, bukan ke `ERROR`.
5. Pakai `ERROR` `BUSINESS_SETUP` untuk konfigurasi yang belum ada.
6. Buat `execute` aman dipanggil ulang dengan `ctx.idempotencyKey` yang sama.

Orchestrator sudah menangani lisensi, rute, dan langkah bersyarat. Handler tidak memeriksanya lagi:

| Kondisi | Hasil yang dicatat orchestrator |
|---|---|
| Modul langkah tidak berlisensi | `SKIPPED` `NOT_LICENSED` |
| Langkah mati atau tidak ada di versi rute | `SKIPPED` `NOT_IN_ROUTE` |
| `isApplicable` menjawab `false` | `SKIPPED` `CONDITION_NOT_MET` |
| Tidak ada handler terdaftar | `ERROR` `CONFIG` "No step handler is installed for <step>" |

---

## 3. Skenario A: isi slot langkah yang sudah ada

Contoh: modul dummy M16 Name Screening. Langkahnya selalu lolos dengan `outcomeCode` `CLEAR`.

### 3.1 Siapkan branch

```bash
git fetch origin
```

```bash
git switch -c feat/<card-id>-name-screening origin/main
```

### 3.2 Buat folder modul

Modul tambahan ada di `apps/api/src/modules/addons/m<NN>-<nama>`. Skema PostgreSQL-nya `m<NN>_<nama>` (technical-specs 02 §2.7).

```text
apps/api/src/modules/addons/m16-name-screening/
├── index.ts
├── m16-name-screening.module.ts
├── m16-name-screening.data.ts
├── application/name-screening-step-handler.ts
└── db/migrations/.gitkeep
```

Buat folder migrasi kosong:

```bash
mkdir -p apps/api/src/modules/addons/m16-name-screening/db/migrations
```

```bash
touch apps/api/src/modules/addons/m16-name-screening/db/migrations/.gitkeep
```

Modul tanpa tabel tidak butuh migrasi. Runner melewati modul yang belum punya `meta/_journal.json`; folder ini baru terisi saat `db:generate` pertama ([DEVELOPMENT_SCENARIO_GUIDE.md](DEVELOPMENT_SCENARIO_GUIDE.md) §6).

### 3.3 Tulis StepHandler

`apps/api/src/modules/addons/m16-name-screening/application/name-screening-step-handler.ts`:

```ts
import type { StepContext, StepResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { StepHandler } from "../../../core/orchestrator/index.js";

/** StepHandler `NAME_SCREENING` M16 (technical-specs 12 §12.2): contoh yang selalu lolos tanpa memanggil penyedia. */
@Injectable()
export class NameScreeningStepHandler implements StepHandler {
  readonly stepCode = "NAME_SCREENING";
  readonly moduleCode = "M16";

  async execute(_tx: Tx, _ctx: StepContext): Promise<StepResult> {
    return { type: "CONTINUE", outcomeCode: "CLEAR", summary: "No name match" };
  }
}
```

`moduleCode` harus sama dengan `stepModules[stepCode]`. Bila tidak sama, `StepHandlerRegistry.register` melempar error saat aplikasi start.

### 3.4 Daftarkan handler di modul Nest

`apps/api/src/modules/addons/m16-name-screening/m16-name-screening.module.ts`:

```ts
import { Module, type OnModuleInit } from "@nestjs/common";
import { OrchestratorModule, StepHandlerRegistry } from "../../core/orchestrator/index.js";
import { NameScreeningStepHandler } from "./application/name-screening-step-handler.js";

/** M16 Name Screening: langkah `NAME_SCREENING` (technical-specs 05). */
@Module({
  imports: [OrchestratorModule],
  providers: [NameScreeningStepHandler],
})
export class M16NameScreeningModule implements OnModuleInit {
  constructor(
    private readonly steps: StepHandlerRegistry,
    private readonly handler: NameScreeningStepHandler,
  ) {}

  /** StepHandler `NAME_SCREENING` (technical-specs 12 §12.2). */
  onModuleInit(): void {
    this.steps.register(this.handler);
  }
}
```

Modul tambahan hanya boleh mengimpor modul CORE lewat `index.ts`. Modul tambahan tidak boleh mengimpor modul tambahan lain (XM-01, XM-05). `test/architecture.spec.ts` menolak impor yang melanggar.

### 3.5 Tulis kontrak migrasi dan `index.ts`

`m16-name-screening.data.ts`:

```ts
import { defineModuleData } from "../../../platform/migrate/module-data.js";

/** Kontrak migrasi dan seed modul (technical-specs 06 §6.12); skema `m16_name_screening` (technical-specs 02 §2.7). */
export const m16NameScreeningData = defineModuleData(import.meta.url, {
  code: "m16-name-screening",
  schema: "m16_name_screening",
});
```

`index.ts`:

```ts
export { m16NameScreeningData } from "./m16-name-screening.data.js";
export { M16NameScreeningModule } from "./m16-name-screening.module.js";
```

Generator paket mencari ekspor `<nama>Data` dari nama kelas modul: `M16NameScreeningModule` menjadi `m16NameScreeningData`. Ikuti pola nama itu.

### 3.6 Masukkan modul ke paket

1. Tambahkan kode modul ke `tools/package-builder/module-registry.json`:

   ```json
   "M16": [
     {
       "className": "M16NameScreeningModule",
       "importPath": "./modules/addons/m16-name-screening/index.js"
     }
   ]
   ```

2. Tambahkan `M16` ke `modules` manifest client yang memakai modul ini, contoh `deploy/manifests/poc.json`. Manifest menentukan modul yang dikemas (technical-specs 02 §2.4). Ubah manifest hanya bila client membeli modulnya.
3. Bangkitkan ulang daftar modul:

   ```bash
   pnpm --filter @cikal/api generate
   ```

   Perintah ini menulis `apps/api/src/licensed-modules.generated.ts`. File itu di-ignore git dan dibangkitkan ulang oleh `pnpm dev` dan `pnpm check`.

### 3.7 Lisensi

Langkah berjalan hanya bila modulnya ada di manifest dan di lisensi aktif company (`Licensing.state(tx)`). Selain itu orchestrator mencatat `SKIPPED` `NOT_LICENSED`.

| Tempat | Cara menambah modul |
|---|---|
| Uji integrasi | `installTestLicense(db.owner, issueTestLicense({ modules: [...POC_LICENSE_MODULES, "M16"] }))` sebelum `createApp` |
| Stack dev lokal | Terbitkan ulang lisensi dev dengan modul baru ([DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md) §3.11, "Menerbitkan ulang lisensi dev") |
| SIT, UAT, production | TL menerbitkan file lisensi baru; Super User memasangnya di halaman "License" |

Jangan menulis kode yang membaca `licensedModuleCodes` untuk memeriksa lisensi.

### 3.8 Nyalakan langkah di rute produk

Langkah yang tidak ada di versi rute aktif dicatat `NOT_IN_ROUTE`. Editor rute menampilkan langkah hanya bila modulnya berlisensi (RT-04).

| Tempat | Cara |
|---|---|
| Uji integrasi | `insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: { DATA_ENTRY: true, NAME_SCREENING: true, APPROVAL: true } }])` |
| Aplikasi | Maker mengaktifkan langkah di halaman Product Route; Checker menyetujui versi rute baru |

Pengajuan yang sudah berjalan memakai versi rute yang dikunci saat submit (RT-06). Langkah baru hanya berlaku untuk proses yang mulai setelah versi rute baru aktif.

### 3.9 Tulis uji

Uji lintas modul ada di `apps/api/test/<topik>.int.spec.ts` dan memakai PostgreSQL asli (CODING_STANDARD §9). Nama uji memuat ID AC bila kartu punya AC.

`apps/api/test/name-screening.int.spec.ts`:

```ts
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { Licensing } from "../src/modules/core/tenancy/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { installTestLicense, issueTestLicense, POC_LICENSE_MODULES } from "./support/license.js";
import {
  drainProcessJobs,
  insertApplication,
  insertRoute,
  latestSteps,
  registerStepHandlers,
  startProcess,
} from "./support/process.js";
import { insertProduct } from "./support/product.js";

/** Langkah `NAME_SCREENING` M16 dijalankan orchestrator (technical-specs 12 §12.3). */
describe("name screening step", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    db = await startDatabase("dev");
    await installTestLicense(db.owner, issueTestLicense({ modules: [...POC_LICENSE_MODULES, "M16"] }));
    app = await createApp(db.config);
    await app.init();
    // APPROVAL tiruan menutup proses dengan FINISH APPROVED, karena proses wajib berakhir di FINISH (12 §12.3).
    registerStepHandlers(app, ["APPROVAL"]);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  /** Proses baru dengan NAME_SCREENING dan APPROVAL di rute, dijalankan sampai antrean job kosong. */
  const run = async () => {
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [
      { versionNumber: 1, status: "ACTIVE", steps: { DATA_ENTRY: true, NAME_SCREENING: true, APPROVAL: true } },
    ]);
    const applicationId = await insertApplication(db.owner, { productId, submittedBy: null });
    const processId = await startProcess(app, applicationId);
    await drainProcessJobs(app, db.owner);
    return (await latestSteps(db.owner, processId)).get("NAME_SCREENING");
  };

  it("completes the step with CLEAR", async () => {
    expect(await run()).toMatchObject({ status: "COMPLETED", outcome_code: "CLEAR" });
  });

  it("skips the step when the license does not cover M16", async () => {
    await installTestLicense(db.owner, issueTestLicense({ modules: POC_LICENSE_MODULES }));
    app.get(Licensing).invalidate();

    expect(await run()).toMatchObject({ status: "SKIPPED", skip_reason: "NOT_LICENSED" });
  });
});
```

Jalankan uji modul lebih dulu:

```bash
pnpm --filter @cikal/api exec vitest run test/name-screening.int.spec.ts test/architecture.spec.ts
```

Proses harus berakhir dengan hasil `FINISH`. Tanpa langkah penutup, `drainProcessJobs` gagal dengan "Process ... is RUNNING but has no step left". Karena itu uji menyalakan `APPROVAL` dan memasang handler tiruannya dengan `registerStepHandlers` dari `test/support/process.ts`. Handler tiruan APPROVAL menjawab `FINISH APPROVED`; handler tiruan langkah lain menjawab `CONTINUE`. Langkah lain yang tidak ada di rute dicatat `NOT_IN_ROUTE` dan tidak butuh handler.

### 3.10 Gate dan PR

```bash
pnpm check
```

Ikuti [DEVELOPMENT_SCENARIO_GUIDE.md](DEVELOPMENT_SCENARIO_GUIDE.md) §3.8 dan §3.9 untuk commit dan PR. Tulis di PR:

- modul dan kode langkah yang ditambah;
- manifest yang diubah;
- perubahan lisensi dev, bila ada.

---

## 4. Skenario B: tambah kode langkah baru

Kerjakan skenario ini hanya setelah TL menyetujui posisi langkah di urutan baku. Lalu kerjakan Skenario A untuk modulnya.

Contoh: kode `DUMMY_CHECK` milik modul `M17` setelah `NAME_SCREENING`.

| Urutan | File | Perubahan |
|---|---|---|
| 1 | `packages/contracts/src/common/modules.ts` | Tambah kode modul baru bila belum ada |
| 2 | `packages/contracts/src/orchestrator/step.ts` | Sisipkan kode di `stepCodes` pada posisi urutan baku; isi `stepModules` dan `stepNames` |
| 3 | `apps/api/src/modules/core/orchestrator/db/schema.ts` | Tambah kode di `STEP_CODES` (CHECK `step_executions.step_code`) |
| 4 | `apps/api/src/modules/core/product/db/schema.ts` | Tambah kode di `STEP_CODES` (CHECK langkah rute) |
| 5 | `apps/api/src/modules/core/application/db/schema.ts` | Tambah kode di `STEP_CODES` (CHECK `current_step`) |
| 6 | Migrasi tiga modul di atas | Bangkitkan dengan `db:generate`, satu perintah per modul |
| 7 | `Docs/cikal-tech-reference.md` 6.3 dan `Docs/technical-specs/12-orchestrator-step-contract.md` §12.2 | Tambah kode di urutan baku dan di tipe `StepCode` |
| 8 | Uji yang menyebut semua kode langkah | Contoh `test/process-timeline.int.spec.ts`, `src/modules/core/orchestrator/domain/route-plan.spec.ts` |

Daftar kode di file schema ditulis ulang, tidak diimpor dari paket kontrak, karena drizzle-kit memuat schema sebagai CommonJS.

Bangkitkan migrasi untuk setiap modul yang schema-nya berubah:

```bash
pnpm --filter @cikal/api db:generate orchestrator dummy_check_step
```

```bash
pnpm --filter @cikal/api db:generate product dummy_check_step
```

```bash
pnpm --filter @cikal/api db:generate application dummy_check_step
```

Periksa isi setiap migrasi. Migrasi hanya boleh mengganti CHECK constraint. Migrasi baru menambah satu ke jumlah migrasi di `test/migrate.int.spec.ts`; perbarui angka dan nama migrasi terbaru di uji itu.

Layar web membaca `stepCodes` dan `stepNames` dari paket kontrak. Layar rute dan timeline menampilkan langkah baru tanpa perubahan kode web. Periksa layar Product Route dan Application Workflow di browser.

---

## 5. Pola lanjutan

| Kebutuhan | Pola | Contoh di repo |
|---|---|---|
| Tabel modul | [DEVELOPMENT_SCENARIO_GUIDE.md](DEVELOPMENT_SCENARIO_GUIDE.md) §6.1; foreign key hanya ke CORE (XM-05) | `addons/m11-decision/db/schema.ts` |
| Hasil yang tidak berubah saat attempt ulang | Simpan hasil sekali per `processInstanceId`; attempt berikutnya membaca hasil yang tersimpan | `addons/m11-decision/application/decision-step-handler.ts` |
| Data pengajuan | Baca lewat antarmuka publik modul Application, bukan tabelnya (XM-02) | `ApplicationFactsReader` di `core/application/index.ts` |
| Hasil langkah lain | `OrchestratorApi.outcomes(tx, processInstanceId)` | Decision M11 |
| Parameter produk | `ctx.parameterSnapshot`, dikunci saat submit (PR-06) | `PRODUCT_LIMIT_AUTO_APPROVAL` |
| Pihak ketiga | Port dan adapter lewat Integration Registry ([technical-specs/13-integration-adapter-pattern.md](technical-specs/13-integration-adapter-pattern.md)) | `addons/m07-dukcapil` |
| Tugas manusia | Kembalikan `WAIT_HUMAN` dengan `queueCode` dan `branchId`; terima hasil di `onHumanTaskClosed` | Antrean di `core/task-queue/domain/queue-catalog.ts` |
| Langkah bersyarat | `isApplicable(tx, ctx)` menjawab `false` | RT-08, AC-31.04 |
| Endpoint hasil langkah | `GET /applications/{id}/<resource>?processInstanceId=` memakai `OrchestratorApi.stepOf` | api-specs 19 s.d. 24 |

Error langkah memakai kategori `ErrorCategory` (technical-specs 12 §12.2). Orchestrator menjadwalkan retry otomatis hanya bila `retryable: true`. Isi `retryable: true` hanya untuk error sementara: `TIMEOUT`, `CONNECTION`, dan `PROVIDER_ERROR`. Isi `retryable: false` untuk kategori lain; Admin Operasional me-retry langkah itu dari Process Monitoring setelah penyebabnya diperbaiki.

## 6. Daftar periksa selesai

- [ ] `stepCode` dan `moduleCode` handler cocok dengan `stepModules`.
- [ ] Handler terdaftar di `onModuleInit`.
- [ ] Modul ada di `module-registry.json` dan di manifest client.
- [ ] Uji menyalakan langkah di rute dan memasang lisensi dengan modul baru.
- [ ] Uji membuktikan hasil langkah dan `NOT_LICENSED`.
- [ ] Tidak ada impor ke modul tambahan lain; `test/architecture.spec.ts` hijau.
- [ ] `pnpm check` hijau.
