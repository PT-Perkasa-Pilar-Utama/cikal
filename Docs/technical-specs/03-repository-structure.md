# 3. Repository Structure

Satu monorepo pnpm workspaces dengan Turborepo. Backend dan frontend berbagi skema kontrak lewat `packages/contracts`, sehingga perubahan API dan layar masuk dalam satu pull request.

## 3.1 Pohon direktori

```text
cikal/
├── apps/
│   ├── api/                              NestJS + Fastify; satu image untuk proses api dan worker
│   │   ├── src/
│   │   │   ├── main.ts                   Entrypoint HTTP (api)
│   │   │   ├── worker.ts                 Entrypoint konsumen pg-boss (worker)
│   │   │   ├── app.module.ts             Root module; meng-import licensed-modules.generated.ts
│   │   │   ├── licensed-modules.generated.ts   Dibangkitkan dari manifest client saat build (2.4)
│   │   │   ├── license-public-key.generated.ts Kunci publik lisensi yang dipercaya image, dipilih saat build (07 7.6)
│   │   │   ├── platform/                 Infrastruktur bersama, bukan modul bisnis
│   │   │   │   ├── db/                   Drizzle client, transaksi, SET LOCAL tenant, RLS helper
│   │   │   │   ├── migrate/              Runner migrasi dan seed (6.12)
│   │   │   │   ├── queue/                pg-boss, outbox dispatcher
│   │   │   │   ├── crypto/               Envelope encryption, blind index, Argon2id
│   │   │   │   ├── storage/              Port S3 dan adapternya
│   │   │   │   ├── http/                 Guard sesi, CSRF, tenant, lisensi, hak akses; format error
│   │   │   │   ├── ops/                  /health dan /admin/reset-state (5.0)
│   │   │   │   └── config/               Validasi env dengan Zod
│   │   │   └── modules/
│   │   │       ├── core/
│   │   │       │   ├── identity/         Satu folder per modul CORE (2.7)
│   │   │       │   ├── tenancy/
│   │   │       │   ├── organization/
│   │   │       │   ├── masterdata/
│   │   │       │   ├── product/
│   │   │       │   ├── change-request/
│   │   │       │   ├── audit/
│   │   │       │   ├── notification/
│   │   │       │   ├── document/
│   │   │       │   ├── application/
│   │   │       │   ├── orchestrator/
│   │   │       │   ├── task-queue/
│   │   │       │   ├── verification/
│   │   │       │   ├── approval/
│   │   │       │   ├── integration/
│   │   │       │   ├── calculation/
│   │   │       │   └── reporting/
│   │   │       └── addons/
│   │   │           ├── m01-mobile/       Satu folder per modul tambahan
│   │   │           ├── m02-partner/
│   │   │           ├── ...
│   │   │           └── m16-screening/
│   │   └── test/                         Uji integrasi lintas modul, uji kebocoran tenant, uji arsitektur
│   └── web/                              React 19 SPA (Vite)
│       ├── src/
│       │   ├── routes/                   TanStack Router file-based routes
│       │   ├── features/<modul>/         Layar per modul; mengikuti nama modul backend
│       │   ├── components/ui/            Komponen shadcn/ui yang disalin dan disesuaikan design system
│       │   ├── lib/api/                  Klien API bertipe dari packages/contracts
│       │   └── styles/                   Token Tailwind dari Docs/design-system.md
│       └── e2e/                          Playwright: satu spec per kartu wiring
├── packages/
│   ├── contracts/                        Skema Zod request/response, kode error, enum bersama
│   ├── formula/                          Mesin rumus (jsep + evaluator + decimal.js), tanpa dependensi NestJS
│   └── tsconfig/                         Konfigurasi TypeScript bersama (strict)
├── tools/
│   ├── license-cli/                      CLI penerbit dan pemeriksa file lisensi bertanda tangan (US-100)
│   └── package-builder/                  Membaca manifest client, membangkitkan daftar modul, build image per client
├── deploy/
│   ├── compose/                          docker-compose.yml dan .env.example per lingkungan
│   ├── nginx/                            Konfigurasi reverse proxy dan TLS
│   ├── license/                          Kunci publik lisensi per build (dev-license-public-key.pem); kunci privat tidak pernah di sini
│   └── manifests/                        Manifest modul per client (contoh poc.json)
├── Docs/                                 Dokumen BA, business, technical-specs, TASK_BREAKDOWN
├── biome.json
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## 3.2 Struktur di dalam satu modul backend

Contoh `apps/api/src/modules/addons/m07-dukcapil/`:

```text
m07-dukcapil/
├── index.ts                    Antarmuka publik: satu-satunya file yang boleh di-import modul lain
├── m07-dukcapil.module.ts      Registrasi NestJS: provider, controller, StepHandler, adapter
├── domain/                     Aturan bisnis murni (skor berbobot, ambang); tanpa I/O
├── application/                Use case: jalankan langkah, review tingkat 1 dan 2
├── ports/                      Port kontrak kanonik (DukcapilPort)
├── adapters/                   asis.adapter.ts, simulation.adapter.ts
├── http/                       Controller dan DTO (skema dari packages/contracts)
├── db/
│   ├── schema.ts               Tabel Drizzle di skema m07_dukcapil
│   └── migrations/             Migrasi SQL modul ini
├── seed/                       Seed dev dan qa modul ini
└── *.spec.ts                   Uji unit dan integrasi
```

## 3.3 Aturan repository

| ID | Aturan |
|---|---|
| RP-01 | Modul baru dibuat dari template generator yang sama (folder di 3.2) agar setiap modul berbentuk seragam |
| RP-02 | `index.ts` modul hanya mengekspor antarmuka publik (tipe, token provider, StepHandler); impor ke folder lain modul tersebut ditolak lint |
| RP-03 | `packages/formula` tidak boleh bergantung pada NestJS atau database, agar bisa diuji murni dan dipakai frontend untuk uji rumus |
| RP-04 | Skema Zod request dan response hanya ditulis di `packages/contracts`; controller dan frontend meng-import dari sana |
| RP-05 | File yang dibangkitkan build (`*.generated.ts`) tidak di-commit |
| RP-06 | Satu kartu task menyentuh satu modul sebisa mungkin; perubahan lintas modul lewat antarmuka publik |
