# 4. Tech Stack

Semua pilihan di dokumen ini diputuskan saat grill technical spec (2026-10-21). Kolom Versi berisi versi major; versi persis dikunci di `pnpm-lock.yaml` dan di tag image (4.10).

## 4.1 Runtime dan bahasa

| Komponen | Teknologi | Versi | Alasan |
|---|---|---|---|
| Runtime backend | Node.js | 22 LTS | LTS sampai April 2027; ekosistem NestJS matang; dikenal tim operasional bank. Rencana upgrade ke 24 LTS sebelum April 2027 |
| Bahasa | TypeScript, `strict: true`, `noUncheckedIndexedAccess: true` | 5 | Satu bahasa untuk backend, web, dan mobile kelak; tipe menangkap kesalahan kontrak lebih awal |
| Package manager | pnpm workspaces | 10 | Instalasi cepat, disk efisien, workspace monorepo |
| Orkestrasi build | Turborepo | 2 | Build dan test hanya untuk paket yang berubah, dengan cache |

## 4.2 Backend

| Komponen | Teknologi | Versi | Alasan |
|---|---|---|---|
| Framework | NestJS dengan adapter Fastify | NestJS 11, Fastify 5 | Modul NestJS memetakan langsung ke modul Cikal; DI menjadi tempat port dan adapter integrasi; Fastify lebih cepat dari Express |
| Gaya API | REST + JSON, versi di path `/api/v1` | | Ditetapkan BA (API-01) |
| Validasi dan kontrak | Zod + nestjs-zod | Zod 4, nestjs-zod 5 | Satu skema untuk backend, frontend, dan OpenAPI (API-02) |
| Dokumentasi API | OpenAPI dibangkitkan dari skema Zod | 3.1 | Spesifikasi mesin-baca disimpan bersama kode (API-02) |
| ORM dan query | Drizzle ORM | 0.4x | Skema TypeScript, query mendekati SQL, tanpa binary engine |
| Migrasi | drizzle-kit (generate) + migrator Drizzle (apply) | | Migrasi SQL berversi per modul, dijalankan runner bawaan (6.12) |
| Antrean dan job terjadwal | pg-boss | 10 | Antrean di PostgreSQL; enqueue transaksional; retry dengan jeda bertambah; cron |
| Mesin rumus | jsep + evaluator sendiri + decimal.js | jsep 1, decimal.js 10 | Daftar putih fungsi FM-02, presisi desimal, tanpa `eval` (`05-module-definitions.md` 5.16) |
| Generate dokumen | docxtemplater | 3 | Template Word milik bank dipakai apa adanya (US-24) |
| Konversi PDF | Gotenberg (LibreOffice di container terpisah) | 8 | Image API tetap distroless |
| Hash password | Argon2id (`argon2`) | | Rekomendasi OWASP untuk hash password |
| Logging | pino (bawaan Fastify), format JSON | | Log terstruktur dengan `tenantId`, `loanId`, `correlationId` |

## 4.3 Frontend

| Komponen | Teknologi | Versi | Alasan |
|---|---|---|---|
| Framework | React, SPA | 19 | Aplikasi internal di balik login; tidak butuh SSR atau SEO |
| Build | Vite | 7 | Build cepat; hasil berupa file statis yang dilayani Nginx |
| Routing | TanStack Router (file-based, bertipe) | 1 | Parameter rute dan search params bertipe |
| State server | TanStack Query | 5 | Cache, retry, polling 30 detik untuk inquiry (AC-83.06) |
| Form | React Hook Form + resolver Zod | RHF 7 | Validasi memakai skema yang sama dengan backend |
| Styling | Tailwind CSS dengan token dari `Docs/design-system.md` | 4 | Token desain Perkasa menjadi variabel tema |
| Komponen | shadcn/ui (Radix), disalin ke `apps/web/src/components/ui` | | Komponen dimiliki repo dan bisa disesuaikan dengan design system |
| Ikon | Lucide | | Sesuai `Menu.iconName` di data dictionary |
| Tabel | TanStack Table | 8 | Paging, sorting, filter server-side (API-05) |

## 4.4 Datastore

| Komponen | Teknologi | Versi | Alasan |
|---|---|---|---|
| Database utama | PostgreSQL | 17 | Tanpa lisensi; JSONB untuk data checker-maker dan respons mentah; Row-Level Security untuk isolasi tenant |
| Ekstensi | `pg_trgm`, `pgcrypto` | | Pencarian inquiry dan penyaringan kandidat Dedup; `gen_random_bytes` untuk token |
| Antrean | pg-boss di skema `pgboss` | | Tanpa server antrean tambahan |
| Cache | Cache di memori proses, dibuang lewat `LISTEN/NOTIFY` | | Lisensi, parameter sistem, rumus aktif, matrix; tanpa Redis |
| Object storage | API S3-compatible | | Storage milik bank di produksi; server S3 ringan di paket hanya sebagai cadangan setelah lisensinya dicek legal |
| Pencarian | `pg_trgm` | | Cukup untuk 10.000 pengajuan per bulan per tenant |

## 4.5 Keamanan

| Komponen | Teknologi | Alasan |
|---|---|---|
| Sesi web | Tabel sesi PostgreSQL + cookie HttpOnly, Secure, SameSite=Strict | Bisa dicabut seketika |
| CSRF | Token double-submit di header `X-CSRF-Token` | Melindungi request yang mengubah data dari cookie |
| Token mitra dan mobile | JWT bertanda tangan Ed25519, umur pendek | AU-07 |
| SSO | OpenID Connect authorization code + PKCE (`openid-client`) | AU-01; diuji dengan Keycloak |
| Enkripsi field | AES-256-GCM, envelope encryption, kunci utama dari file secret | NFR tech ref 13, IN-04 |
| Blind index | HMAC-SHA256 untuk NIK | Dedup exact dan pencarian NIK tanpa dekripsi |
| Tanda tangan lisensi | Ed25519 | LC-03 |
| Rate limit | `@fastify/rate-limit` dengan penyimpanan di memori per instance | Login, reset password, API mitra |

## 4.6 Kualitas dan pengujian

| Komponen | Teknologi | Versi | Alasan |
|---|---|---|---|
| Lint dan format | Biome | 2 | Satu alat, cepat; aturan larangan impor internal modul (XM-01) |
| Type-check | `tsc --noEmit` per paket | | Wajib lulus di CI |
| Unit dan integrasi | Vitest | 3 | Cepat dan mendukung ESM/TypeScript |
| Database uji | Testcontainers PostgreSQL 17 | | Uji integrasi memakai PostgreSQL asli, termasuk RLS |
| End-to-end | Playwright | 1 | Satu spec per kartu wiring; dijalankan terhadap stack Docker dengan seed QA |
| CI | GitHub Actions | | Repo di GitHub; job lint, type-check, test, build image per manifest |

## 4.7 Deployment

| Komponen | Teknologi | Alasan |
|---|---|---|
| Container API dan worker | Image `node:22` distroless (gcr.io/distroless/nodejs22) | Kecil, tanpa shell, permukaan serangan minimal |
| Reverse proxy | Nginx | TLS, file statis SPA, proxy `/api` |
| Orkestrasi | Docker Compose | Satu file per instalasi; satu perintah pasang dan upgrade |
| Konversi PDF | Gotenberg | LibreOffice terisolasi |

## 4.8 Yang sengaja tidak dipakai

| Teknologi | Alasan |
|---|---|
| Workflow engine (Camunda, Temporal) | Bertentangan dengan AP-05; orchestrator rute cukup di atas pg-boss |
| Redis | Satu server lagi di instalasi bank; cache di memori dan pg-boss mencukupi |
| RabbitMQ atau Kafka | Komunikasi antar modul in-process; event lewat outbox + pg-boss |
| Microservices per modul | Lihat `02-system-architecture.md` 2.2 |
| Prisma | Schema tunggal sulit dipecah per modul berlisensi; query engine terpisah |
| class-validator | Skema tidak bisa dipakai ulang di frontend |
| Next.js | Menambah server Node kedua; SPA cukup |
| Kubernetes (rilis pertama) | Belum dibutuhkan; Helm chart bisa dibuat dari image yang sama |
| Library ekspresi dengan `eval` (expr-eval, `Function`) | Risiko keamanan; FM-02 melarang skrip bebas |
| Float untuk uang | Presisi; semua uang `numeric` di DB dan decimal.js di aplikasi |

## 4.9 Ketergantungan eksternal per lingkungan

| Ketergantungan | dev | test (CI) | sit/uat | production |
|---|---|---|---|---|
| PostgreSQL | Container lokal | Testcontainers | Server uji bank | Server bank |
| S3 | Server S3 cadangan di compose | Adapter memori | Storage uji bank atau cadangan | Storage bank |
| Penyedia integrasi | Adapter simulasi | Adapter simulasi | Simulasi atau sandbox penyedia | Adapter asli |
| SMTP | Mailpit (penampung email lokal) | Adapter memori | SMTP uji bank | SMTP bank |

## 4.10 Kebijakan versi

| ID | Aturan |
|---|---|
| VP-01 | `package.json` memakai versi persis (tanpa `^` atau `~`); `pnpm-lock.yaml` di-commit |
| VP-02 | Image Docker dirujuk dengan digest, bukan tag `latest` |
| VP-03 | Pembaruan dependensi lewat Dependabot mingguan; major version lewat ADR |
| VP-04 | Node.js mengikuti jalur LTS; upgrade major dijadwalkan sebelum akhir masa LTS |
