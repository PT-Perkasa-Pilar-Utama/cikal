# Cikal LOS

Cikal adalah Loan Origination System (LOS) modular untuk bank dan lembaga keuangan: pengajuan kredit dari draft sampai pencairan, dengan rute proses per produk, pemeriksaan otomatis (Dedup, Dukcapil, Fraud, Scoring, Credit Bureau, Decision), approval berjenjang, dan checker-maker untuk semua master data. Cikal menggantikan aplikasi LOS lama berbasis OutSystems (OS11) dan dirancang untuk dua model pemasangan dari satu codebase: SaaS yang dikelola PPU dan on-premise di server bank. Modul tambahan (M01 s.d. M16) dijual terpisah; image hanya berisi modul yang dilisensikan.

Status: **POC**, 6 sprint mulai 2026-10-26. Lingkup dan kartu kerja ada di [Docs/TASK_BREAKDOWN.md](Docs/TASK_BREAKDOWN.md) dan board [Cikal POC delivery](https://github.com/orgs/PT-Perkasa-Pilar-Utama/projects/24).

## Stack

| Bagian | Teknologi |
|---|---|
| Bahasa dan runtime | TypeScript strict, Node.js 22 |
| Backend | NestJS 11 + Fastify 5, Drizzle ORM, Zod 4, pg-boss |
| Frontend | React 19 SPA, Vite 7, TanStack Router dan Query, Tailwind 4 |
| Data | PostgreSQL 17 (satu skema per modul, Row-Level Security), object storage S3-compatible |
| Tooling | pnpm 10 workspace, Turborepo, Biome, Vitest, Testcontainers, Playwright, Husky |
| Deploy | Docker Compose, Nginx, Gotenberg |

Alasan setiap pilihan: [Docs/technical-specs/04-tech-stack.md](Docs/technical-specs/04-tech-stack.md).

## Quickstart

Prasyarat: Node.js 22 aktif (`node -v` menampilkan `v22`), Docker Desktop yang sedang berjalan, dan Git. Cara memasang per sistem operasi ada di [Docs/ONBOARDING_GUIDE.md](Docs/ONBOARDING_GUIDE.md) §2.

```bash
corepack enable
```

```bash
pnpm install
```

Buat secret dev (diabaikan git), lalu nyalakan PostgreSQL, SeaweedFS (S3), Gotenberg, dan Mailpit:

```bash
pnpm dev:secrets
```

```bash
docker compose -f deploy/compose/docker-compose.dev.yml up -d
```

Siapkan env api, migrasikan database, dan isi seed `dev`:

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
pnpm --filter @cikal/api db:migrate
```

```bash
pnpm --filter @cikal/api db:seed --seed=dev
```

Jalankan api (port 3000) dan web (port 5173):

```bash
pnpm dev
```

Buka `http://localhost:5173`. Cek kesiapan api lewat proxy web:

```bash
curl http://localhost:5173/api/health/ready
```

Status `"ok"` berarti database, storage, dan Gotenberg terjangkau. Gate lengkap yang sama dengan CI (butuh Docker untuk uji integrasi):

```bash
pnpm check
```

## Struktur repo

```text
cikal/
├── apps/
│   ├── api/               NestJS: modul bisnis di src/modules/{core,addons}, infrastruktur di src/platform
│   └── web/               React SPA: routes/, features/, components/, lib/api
├── packages/
│   ├── contracts/         Skema Zod request/response dan mock, dipakai api dan web
│   ├── formula/           Mesin rumus murni (decimal.js), tanpa NestJS atau database
│   └── tsconfig/          Konfigurasi TypeScript bersama
├── tools/
│   └── package-builder/   Membangkitkan daftar modul berlisensi dari manifest
├── deploy/
│   ├── compose/           Compose dev, skrip initdb role database
│   └── manifests/         Manifest modul per client (poc.json)
├── scripts/               dev-secrets.mjs
├── Docs/                  Dokumen BA, bisnis, spec, standar, runbook
└── .github/               CI, template issue dan PR, Dependabot
```

Struktur lengkap dan aturan per folder: [Docs/technical-specs/03-repository-structure.md](Docs/technical-specs/03-repository-structure.md).

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [Docs/ONBOARDING_GUIDE.md](Docs/ONBOARDING_GUIDE.md) | Setup lokal, tur kode, urutan baca untuk kontributor baru |
| [Docs/DEVELOPMENT_SCENARIO_GUIDE.md](Docs/DEVELOPMENT_SCENARIO_GUIDE.md) | Cara mengerjakan kartu backend, frontend, wiring, review, dan rilis |
| [Docs/GLOSSARY.md](Docs/GLOSSARY.md) | Istilah engineering; istilah bisnis di [Docs/ba/glossary.md](Docs/ba/glossary.md) |
| [Docs/CODING_STANDARD.md](Docs/CODING_STANDARD.md) | Aturan kode dan perintah verifikasi |
| [Docs/CODE_REVIEW_CHECKLIST.md](Docs/CODE_REVIEW_CHECKLIST.md) | Checklist setiap PR |
| [Docs/TASK_BREAKDOWN.md](Docs/TASK_BREAKDOWN.md) | Kartu per sprint, pemilik, estimasi |
| [Docs/DEPLOYMENT_PLAN.md](Docs/DEPLOYMENT_PLAN.md) | Instalasi, rilis, rollback, reset data, debugging database |
| [Docs/technical-specs/](Docs/technical-specs/_index.md) | Arsitektur, modul, data model, keamanan, NFR, konfigurasi |
| [Docs/api-specs/](Docs/api-specs/_index.md) | Kontrak endpoint dan Operation Status Tracker |
| [Docs/business/](Docs/business/user-story.md) | User story, acceptance criteria per sprint, hasil grooming |

## Kontribusi

Satu PR per kartu ke `main`, mengikuti format commit dan checklist di [Docs/CODING_STANDARD.md](Docs/CODING_STANDARD.md) §12. Pertanyaan lewat issue GitHub; eskalasi ke Tech Lead (@maspandd).

Repositori privat milik PT Perkasa Pilar Utama.
