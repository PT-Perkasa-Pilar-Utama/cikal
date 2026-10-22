# Cikal LOS: Coding Standard

**Version:** 1.0  
**Date:** 2026-10-22  
**Author:** Tech Lead PPU  
**Status:** Active  
**Phase:** POC  

Monorepo pnpm + Turborepo berbahasa TypeScript: `apps/api` (NestJS 11 + Fastify 5, Drizzle, PostgreSQL 17, pg-boss), `apps/web` (React 19 SPA, Vite, TanStack Router dan Query, Tailwind 4), `packages/contracts` (skema Zod bersama), `packages/formula` (mesin rumus murni), dan `tools/package-builder`. Arsitekturnya modular monolith: satu modul per area bisnis, satu skema PostgreSQL per modul, dan paket image dirakit dari manifest lisensi. Dokumen ini adalah sumber kebenaran untuk `/code-review`; checklist pendampingnya ada di [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md).

Aturan bertanda **(enforced)** sudah dipaksa Biome, `tsc`, uji arsitektur, hook git, atau CI. Reviewer tidak memeriksanya manual; cukup pastikan gate hijau. Aturan berlabel ID spec (contoh XM-01) bersumber dari [technical-specs/](technical-specs/_index.md) dan dikutip di sini, bukan ditulis ulang.

## Perintah verifikasi

| Tujuan | Perintah |
|---|---|
| Gate lengkap (sama dengan CI) | `pnpm check` (Biome, lalu typecheck, test, build semua paket) |
| Unit test saja (hook pre-push) | `pnpm test:unit` |
| Lint dan format otomatis | `pnpm exec biome check --write .` |
| Test satu paket | `pnpm --filter @cikal/api test` |
| End-to-end kartu wiring | `pnpm --filter @cikal/web e2e` |
| Migrasi baru satu modul | `pnpm --filter @cikal/api db:generate <modul> <nama>` |
| Migrasi dan seed dev | `pnpm --filter @cikal/api db:migrate`, lalu `db:seed --seed=dev` |

Node.js 22 (`.nvmrc`) dan pnpm 10 lewat corepack. `engines` menolak Node lain.

## Daftar Isi

1. [Bahasa dan tipe](#1-bahasa-dan-tipe)
2. [Penamaan](#2-penamaan)
3. [Struktur dan lapisan](#3-struktur-dan-lapisan)
4. [Ukuran file](#4-ukuran-file)
5. [Penanganan error](#5-penanganan-error)
6. [Data, transaksi, dan migrasi](#6-data-transaksi-dan-migrasi)
7. [API dan kontrak](#7-api-dan-kontrak)
8. [Konfigurasi dan secret](#8-konfigurasi-dan-secret)
9. [Test](#9-test)
10. [Kebersihan kode](#10-kebersihan-kode)
11. [Dependensi](#11-dependensi)
12. [Commit, branch, dan PR](#12-commit-branch-dan-pr)
13. [Format](#13-format)

---

## 1. Bahasa dan tipe

### 1.1 TypeScript strict

`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, dan `noFallthroughCasesInSwitch` aktif di `packages/tsconfig/base.json`. **(enforced)**

Alasan: akses indeks yang mungkin `undefined` adalah sumber bug paling umum pada data dari database dan API.

### 1.2 Tanpa escape hatch tipe di kode produksi

Kode produksi tidak memakai `any`, non-null assertion (`!`), atau `as`, kecuali `as const`. `any` **(enforced)** Biome; `!` dan `as` diperiksa reviewer. File `*.spec.ts` dan `*.spec.tsx` boleh memakai `as`.

Alasan: setiap cast adalah titik di mana compiler berhenti melindungi.

```diff
- const issues = (exception.getZodError() as ZodError).issues;
+ const zodError = exception.getZodError();
+ const issues = zodError instanceof ZodError ? zodError.issues : [];
```

Generic baris pada query `pg` mentah (`db.query<{ found: string | null }>`) hanya boleh di `platform/`, karena modul memakai Drizzle yang bertipe (3.6).

### 1.3 Data dari luar dipersempit sebelum dipakai

Env, body request, payload NOTIFY, file JSON, argumen CLI, dan respons API dipersempit dengan skema Zod atau type guard.

Alasan: tipe TypeScript tidak berlaku saat runtime untuk data yang masuk dari luar proses.

```ts
// Benar: payload NOTIFY berasal dari luar proses
export function isOpsSignal(value: string): value is OpsSignal {
  return OPS_SIGNALS.some((signal) => signal === value);
}
```

### 1.4 Tipe diturunkan dari skema

Tipe data yang punya skema Zod diturunkan dengan `z.infer`, tidak dideklarasikan ulang.

Alasan: satu sumber kebenaran untuk validasi dan tipe.

```diff
- interface JournalEntry { tag: string; when: number }
+ const journalSchema = z.object({ entries: z.array(z.object({ tag: z.string(), when: z.number() })) });
+ type JournalEntry = z.infer<typeof journalSchema>["entries"][number];
```

### 1.5 Tipe return eksplisit pada fungsi yang diekspor

Fungsi dan method yang diekspor dari `apps/api` dan `packages/*` menulis tipe return. Komponen React dan hook TanStack Query di `apps/web` boleh memakai inferensi.

Alasan: antarmuka publik tidak berubah diam-diam saat implementasinya berubah.

```ts
export async function listTenants(db: Queryable): Promise<string[]> {
```

### 1.6 Union literal, bukan `enum`

Pilihan tetap ditulis sebagai `z.enum([...])` atau union literal (`"dev" | "qa"`), tidak memakai `enum` TypeScript.

Alasan: union literal cocok dengan skema Zod dan nilai `text` + `CHECK` di database (DM-07).

### 1.7 Uang tidak pernah `number`

Uang dan persen dibawa sebagai string desimal di kontrak (`"5000000.00"`), dihitung dengan `decimal.js`, dan disimpan `numeric` (DM-06).

Alasan: float kehilangan presisi pada nominal rupiah.

```diff
- const total = plafond * rate / 100;
+ const total = new Decimal(plafond).mul(rate).div(100);
```

### 1.8 Impor ESM bersufiks `.js` di backend

`apps/api`, `packages/contracts`, dan `packages/formula` memakai `NodeNext`; impor relatif menulis sufiks `.js`. **(enforced)**

---

## 2. Penamaan

### 2.1 Bahasa

| Hal | Bahasa | Contoh |
|---|---|---|
| Identifier, nama file, kode error | Inggris | `ResetInProgressError`, `RESET_IN_PROGRESS` |
| Teks UI dan pesan error ke pengguna | Persis teks AC | `"Product code must be 1 to 5 letters or digits"` |
| Komentar dan JSDoc | Indonesia | `/** Kode company hasil seed, untuk respons reset. */` |
| Istilah domain | Sesuai glosarium | `Loan ID`, `checker-maker`, `Recontest` |

### 2.2 Pola nama

| Elemen | Pola | Contoh |
|---|---|---|
| Folder modul | kebab-case, modul tambahan berawalan kode | `change-request`, `m07-dukcapil` |
| File backend | kebab-case + sufiks peran | `products.controller.ts`, `tenancy.module.ts`, `tenancy.data.ts`, `companies.repository.ts` |
| File kontrak | `<resource>.schema.ts`, `<resource>.mock.ts` | `products.schema.ts` |
| Komponen React | PascalCase `.tsx` | `PendingList.tsx` |
| Hook React | `use-<nama>.ts` | `use-session.ts` |
| Test unit | `<file>.spec.ts` di sebelah source | `rounding.spec.ts` |
| Test integrasi | `<topik>.int.spec.ts` | `migrate.int.spec.ts` |
| Kelas, tipe, interface | PascalCase | `ModuleData`, `HealthService` |
| Fungsi, variabel | camelCase | `seedModules` |
| Konstanta primitif, token DI | UPPER_SNAKE | `PROBE_TIMEOUT_MS`, `APP_CONFIG` |
| Skema Zod | camelCase + `Schema` | `productCreateRequestSchema` |
| Kontrak data modul | camelCase + `Data` | `tenancyData` |
| Skema DB, tabel, kolom | snake_case, tabel jamak (DM-01) | `tenancy.companies.company_code` |
| Constraint | `<tabel>_<kolom>_<jenis>` | `companies_platform_code_check` |

---

## 3. Struktur dan lapisan

### 3.1 Tata letak monorepo

Folder dan tanggung jawabnya mengikuti [technical-specs/03-repository-structure.md](technical-specs/03-repository-structure.md). Kode baru masuk folder yang sudah ada; folder tingkat atas baru butuh persetujuan TL.

### 3.2 Bentuk satu modul backend

Setiap modul di `apps/api/src/modules/{core,addons}/<modul>/` berbentuk sama (RP-01):

```text
<modul>/
├── index.ts               antarmuka publik; satu-satunya file yang boleh di-import modul lain
├── <modul>.module.ts      registrasi NestJS
├── <modul>.data.ts        kontrak migrasi dan seed (defineModuleData)
├── domain/                aturan bisnis murni, tanpa I/O
├── application/           use case; memanggil domain dan repository
├── http/                  controller; DTO dari packages/contracts
├── db/
│   ├── schema.ts          tabel Drizzle di skema modul
│   ├── <entitas>.repository.ts
│   └── migrations/        hasil db:generate
├── seed/                  seed base, dev, qa
├── ports/, adapters/      hanya untuk pihak ketiga (13-integration-adapter-pattern)
└── **/*.spec.ts           unit test di sebelah file yang diuji
```

### 3.3 Modul lain hanya lewat `index.ts`

Modul mengimpor modul lain hanya dari `modules/<grup>/<modul>/index.ts` (XM-01, RP-02). **(enforced: `apps/api/test/architecture.spec.ts`)**

```diff
- import { companies } from "../../core/tenancy/db/schema.js";
+ import { seedCompanyIds } from "../../core/tenancy/index.js";
```

### 3.4 Tabel modul lain tidak disentuh

Modul tidak membaca atau menulis tabel di skema modul lain (XM-02). Foreign key mengikuti XM-05: ke CORE boleh, dari CORE ke modul tambahan dan antar modul tambahan dilarang.

Alasan: modul tetap bisa dicabut dari paket tanpa merusak modul lain (LC-05).

### 3.5 Controller tipis

Controller hanya memvalidasi input lewat DTO dari kontrak, memanggil satu use case di `application/`, dan mengembalikan hasilnya. Tidak ada aturan bisnis, query, atau perhitungan di `http/`.

```diff
  @Post()
  @Requires("MST-PRODUCT", "CREATE")
  create(@Body() body: ProductCreateDto): Promise<ChangeRequestAccepted> {
-   if (body.maxPlafond < body.minPlafond) throw ...;
-   return this.db.insert(products).values(body);
+   return this.products.requestCreate(body);
  }
```

### 3.6 Query Drizzle hanya di repository

Query database modul hanya ditulis di `db/<entitas>.repository.ts`. `application/` memanggil repository; `domain/` tidak melakukan I/O. Query `pg` mentah hanya di `platform/` (runner migrasi, probe health, LISTEN).

Alasan: satu tempat untuk memeriksa RLS, XM-02, dan performa query.

### 3.7 Kontrak hanya di `packages/contracts`

Skema request dan response serta mock kontrak hanya ditulis di `packages/contracts` (RP-04). Controller memakai `createZodDto(<skema>)`; frontend memakai skema yang sama di `apiRequest`.

```diff
- class ProductCreateDto { @IsString() productCode!: string }
+ class ProductCreateDto extends createZodDto(productCreateRequestSchema) {}
```

### 3.8 Efek samping lintas modul lewat outbox

Notifikasi, audit lintas modul, dan reporting dipicu event outbox yang ditulis di transaksi yang sama, bukan panggilan langsung (XM-04).

### 3.9 `packages/formula` tetap murni

`packages/formula` tidak bergantung pada NestJS, database, atau I/O (RP-03).

### 3.10 Lapisan frontend

| Folder | Isi | Larangan |
|---|---|---|
| `routes/` | File rute TanStack; menyusun komponen fitur | Tidak memanggil API langsung |
| `features/<fitur>/` | `api.ts` (hook TanStack Query), komponen khusus fitur | Tidak mengimpor fitur lain |
| `components/` | Komponen bersama (`layout/`, `ui/`) | Tidak memanggil API |
| `lib/api/client.ts` | Satu-satunya pemanggil `fetch` | |

Setiap respons API divalidasi skema kontrak lewat `apiRequest(schema, path)`.

```diff
- const res = await fetch("/api/v1/products").then((r) => r.json());
+ return apiRequest(productListResponseSchema, `/v1/products?page=${page}`);
```

---

## 4. Ukuran file

### 4.1 Batas 300 baris

File sumber paling banyak 300 baris; mulai dipecah saat mendekati 250. File hasil generator dan migrasi dikecualikan.

Alasan: file kecil bisa direview dan diuji utuh.

### 4.2 Cara memecah

Pecah menurut tanggung jawab ke file saudara di folder yang sama (contoh `products.repository.ts` dan `sub-products.repository.ts`), atau satu use case per file di `application/`. Jangan memindahkan potongan ke `utils` bersama.

---

## 5. Penanganan error

### 5.1 `DomainError` dengan kode spec

Kesalahan yang diketahui dilempar sebagai `DomainError(code, message, status, details)` dengan kode dari api-specs 01 §1.10 atau file resource terkait. Kode standar memakai `DomainError.standard(code)`.

```diff
- throw new Error("product code taken");
+ throw new DomainError("PRODUCT_CODE_EXISTS", "Product code already exists", 409);
```

### 5.2 Pesan persis teks AC

Pesan yang tampil ke pengguna disalin persis dari AC, termasuk huruf besar dan tanda baca. Frontend menampilkan `message` dari envelope apa adanya.

### 5.3 Envelope dibentuk satu kali

Hanya `ErrorEnvelopeFilter` yang membentuk respons error dan mencatat error tak terduga. Kode lain tidak menyusun envelope sendiri dan tidak mencatat error yang ia lempar ulang.

### 5.4 Error tidak ditelan

`catch` hanya dipakai untuk menerjemahkan error ke `DomainError`, menambah konteks, atau membersihkan resource, lalu melempar ulang. `catch` kosong atau yang hanya mencatat log dilarang, kecuali proses best effort yang terdokumentasi (contoh `listenOpsSignals` yang mencoba ulang).

```diff
- try { await this.repo.save(row); } catch (e) { logger.error(e); }
+ try {
+   await this.repo.save(row);
+ } catch (error) {
+   if (isUniqueViolation(error)) throw new DomainError("PRODUCT_CODE_EXISTS", "Product code already exists", 409);
+   throw error;
+ }
```

---

## 6. Data, transaksi, dan migrasi

### 6.1 Data bisnis lewat `withTenantTx`

Setiap akses tabel ber-`tenant_id` berjalan di `withTenantTx(ctx, fn)`, yang menjalankan `SET LOCAL app.tenant_id` dari sesi (5.0.1, DM-09). Tenant tidak pernah diambil dari parameter request. Berlaku sejak TL-S1-03.

### 6.2 Penulisan multi langkah atomik

Penulisan yang harus utuh berjalan dalam satu transaksi. Outbox, enqueue pg-boss, audit, dan change request ikut transaksi yang sama.

### 6.3 Migrasi dibangkitkan, bukan ditulis tangan

Migrasi dibuat dengan `db:generate` dari `db/schema.ts`, lalu direview sebagai SQL (MS-01). Migrasi yang sudah di-merge tidak boleh diedit; perbaikan lewat migrasi baru.

### 6.4 Migrasi hanya maju (expand/contract)

Kolom baru nullable atau punya default. Kolom atau tabel dihapus satu rilis setelah kode berhenti memakainya. Migrasi destruktif ditandai di deskripsi PR ([DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md) §4.1).

Alasan: image lama tetap jalan di skema baru, sehingga rollback cukup mengganti image.

### 6.5 Seed idempoten dan berlapis

Seed per modul di `seed/` didaftarkan di `<modul>.data.ts` pada lapisan `base`, `dev`, atau `qa`, ditulis `INSERT ... ON CONFLICT DO NOTHING`, dan memakai ID tetap yang diekspor lewat `index.ts` bila dirujuk modul lain (MS-07).

```ts
await db.insert(companies).values({ id: seedCompanyIds.company001, companyCode: "001" /* ... */ }).onConflictDoNothing();
```

---

## 7. API dan kontrak

### 7.1 Setiap rute punya aturan akses

Setiap handler punya `@Public()`, `@Authenticated()`, atau `@Requires(menuCode, action)`. **(enforced: uji arsitektur; guard menolak rute tanpa aturan)**

### 7.2 Konvensi api-specs 01

Alamat `/api/v1`, envelope sukses dan error, paging, checker-maker (`202` + ChangeRequest), dan `Idempotency-Key` pada operasi wajib mengikuti [api-specs/01-conventions.md](api-specs/01-conventions.md). Penyimpangan butuh perubahan spec di PR yang sama.

### 7.3 Stub mengembalikan mock kontrak

Selama endpoint masih stub, controller mengembalikan mock dari `packages/contracts`, dan mock itu diuji terhadap skemanya (`mocks.spec.ts`).

---

## 8. Konfigurasi dan secret

### 8.1 Env hanya lewat `platform/config`

`process.env` hanya dibaca `loadConfig()` di `platform/config`. Pengecualian: pemuatan `.env` di entrypoint (`main.ts`, `worker.ts`, `run.ts`) dan `DATABASE_MIGRATION_URL`/`DATABASE_URL` di runner migrasi (MS-03).

```diff
- const timeout = Number(process.env.DUKCAPIL_TIMEOUT_MS ?? 5000);
+ constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}
```

### 8.2 Secret dari file

Secret dibaca dari file lewat variabel `*_FILE`. Secret tidak pernah ada di repo, log, pesan error, atau URL. `.env` dan `deploy/compose/.secrets/` tidak di-commit. **(enforced: `.gitignore`)**

### 8.3 Variabel baru diperbarui di semua tempat

Variabel env baru ditambahkan di PR yang sama ke skema `config.ts`, `apps/api/.env.example`, [technical-specs/11-environment-configuration.md](technical-specs/11-environment-configuration.md), dan [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md) §3.5.

---

## 9. Test

### 9.1 Lokasi

Unit test berada di sebelah file yang diuji (`<file>.spec.ts`). `apps/api/test/` hanya berisi uji lintas modul: arsitektur, stub kontrak, dan `*.int.spec.ts` yang menyalakan aplikasi atau database.

### 9.2 Setiap AC kartu terbukti

Setiap AC yang dicantumkan kartu punya minimal satu test yang menyebut ID AC di nama test. Tidak ada target coverage persen.

```ts
it("rejects a product code longer than 5 characters (AC-20.04)", async () => {
```

### 9.3 Setiap kode error terbukti

Setiap kode error yang bisa dikembalikan endpoint punya test yang memeriksa status, `code`, dan pesannya.

### 9.4 Kartu wiring punya Playwright

Kartu wiring punya satu spec Playwright di `apps/web/e2e/` yang membuktikan AC-nya terhadap stack dengan seed `qa` (tech 04 §4.6).

### 9.5 Database asli, adapter palsu

Repository dan use case diuji terhadap PostgreSQL asli lewat Testcontainers, termasuk RLS. Database tidak di-mock. Yang diganti hanya pihak ketiga, lewat adapter simulasi atau memori di port (13-integration-adapter-pattern).

### 9.6 Satu perilaku per test

Setiap test memakai pola Arrange, Act, Assert dan menguji satu perilaku. Nama test menyatakan perilaku itu dalam bahasa Inggris.

---

## 10. Kebersihan kode

### 10.1 Tanpa angka dan string ajaib

Nilai bermakna diberi nama konstanta di atas file atau di modul konfigurasinya.

```diff
- const timer = setTimeout(() => controller.abort(), 2000);
+ const PROBE_TIMEOUT_MS = 2_000;
+ const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
```

### 10.2 Tanpa kode mati

Kode yang tidak dipakai dan kode yang dikomentari dihapus; riwayat git menyimpannya.

### 10.3 Tanpa `TODO` dan `FIXME`

Kode yang di-merge tidak berisi `TODO` atau `FIXME`. Pekerjaan yang ditunda hanya ditandai komentar yang menyebut ID kartu penyelesainya, kartu itu ada di [TASK_BREAKDOWN.md](TASK_BREAKDOWN.md), dan PR mencantumkannya. Kartu penyelesai menghapus komentar itu.

```diff
- // TODO: check session
+ // Pemeriksaan sesi, CSRF, dan hak menu dipasang di kartu TL-S1-03.
```

### 10.4 Komentar menjelaskan alasan

Komentar menjelaskan alasan, batasan, atau rujukan spec, bukan mengulang kode. Kelas, fungsi yang diekspor, dan controller membuka dengan JSDoc satu baris yang menyebut sumbernya (`(api-specs 27 §27.4)`).

---

## 11. Dependensi

### 11.1 pnpm dan versi persis

Hanya pnpm. Dependensi ditulis versi persis tanpa `^` atau `~`, dan `pnpm-lock.yaml` di-commit (VP-01). **(enforced: `.npmrc` `save-exact`, `engine-strict`; CI `--frozen-lockfile`)**

### 11.2 Satu versi untuk paket framework

Paket yang juga menjadi dependensi framework memakai versi yang sama dengan yang dikunci framework itu (contoh `fastify` mengikuti `@nestjs/platform-fastify`), sehingga hanya ada satu salinan.

### 11.3 Daftar yang dilarang

Prisma, class-validator, Redis, broker pesan, library ekspresi berbasis `eval`, dan float untuk uang tidak dipakai ([technical-specs/04-tech-stack.md](technical-specs/04-tech-stack.md) §4.8). Dependensi baru disebut dan diberi alasan di deskripsi PR.

---

## 12. Commit, branch, dan PR

### 12.1 Pesan commit

Format `<type>(<scope>): <kalimat imperatif> (<ID-kartu>)`, mengikuti Conventional Commits. `type`: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`. `scope`: nama modul atau app (`product`, `identity`, `platform`, `web`, `contracts`). Subjek berbahasa Inggris.

```text
feat(product): add pricing periods with overlap check (BE-S1-03)
```

Commit yang ditulis atau dibantu agen AI diakhiri trailer `Co-Authored-By` milik agen itu. Commit yang ditulis manusia tanpa trailer.

```text
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

### 12.2 Nama branch

`<type>/<id-kartu>-<ringkas>`, huruf kecil, contoh `feat/be-s1-03-product-pricing`. Pekerjaan tanpa kartu memakai `docs/` atau `chore/` dengan ringkasan.

### 12.3 Satu PR per kartu

Satu PR menyelesaikan satu kartu dan masuk ke `main` lewat review. Deskripsi PR mencantumkan AC yang dibuktikan, komentar penundaan (10.3), migrasi destruktif (6.4), variabel env baru (8.3), dan dependensi baru (11.3).

### 12.4 Hook tidak dilewati

Hook `pre-commit` (Biome pada file staged, typecheck paket terdampak) dan `pre-push` (unit test paket terdampak) tidak dilewati dengan `--no-verify`. **(enforced: Husky)**

---

## 13. Format

Format dan urutan impor diatur Biome (spasi 2, lebar 120, kutip ganda, titik koma, trailing comma). Jalankan `pnpm exec biome check --write .`; jangan memformat manual. **(enforced)**
