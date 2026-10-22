# Cikal LOS: Onboarding Guide

**Version:** 1.0  
**Date:** 2026-10-22  
**Author:** Tech Lead PPU  
**Status:** Active  
**Phase:** POC  

Jalur kontributor baru dari clone sampai perubahan pertama. Ikuti berurutan; di akhir §3 build lokal hijau dan aplikasi terbuka di browser.

## Daftar Isi

1. [Konteks proyek](#1-konteks-proyek)
2. [Prasyarat](#2-prasyarat)
3. [Setup lokal](#3-setup-lokal)
4. [Tur kode dan urutan baca](#4-tur-kode-dan-urutan-baca)
5. [Alur kerja singkat](#5-alur-kerja-singkat)
6. [Konsep kunci](#6-konsep-kunci)
7. [Bantuan](#7-bantuan)

---

## 1. Konteks proyek

Cikal adalah Loan Origination System untuk bank: Sales membuat pengajuan kredit, sistem menjalankan pemeriksaan otomatis (Dedup, Dukcapil, Fraud, Scoring, Credit Bureau, Decision) sesuai rute produk, petugas memverifikasi dan menyetujui berjenjang, lalu pengajuan dicairkan lewat core banking. Semua perubahan master data melewati checker-maker. Cikal menggantikan LOS lama di OutSystems (OS11) dengan satu codebase untuk SaaS dan on-premise; modul tambahan M01 s.d. M16 dijual terpisah dan hanya modul berlisensi yang masuk image.

Fase sekarang adalah POC: 6 sprint mulai 2026-10-26, satu developer fullstack (FS1) dan satu Tech Lead (TL). Lingkup POC ada di [TASK_BREAKDOWN.md](TASK_BREAKDOWN.md); kebutuhan bisnis di [business/user-story.md](business/user-story.md).

## 2. Prasyarat

| Alat | Versi | Catatan |
|---|---|---|
| Node.js | 22 (`.nvmrc`) | `engines` menolak versi lain, termasuk di hook git |
| pnpm | 10.34.7 | Lewat corepack; versi dikunci `packageManager` di `package.json` |
| Docker Desktop | terbaru | Untuk stack dev dan uji integrasi Testcontainers |
| Git | 2.40+ | |
| GitHub CLI (`gh`) | 2.x | Untuk PR dan review; login dengan `gh auth login` |

### 2.1 Node.js 22

macOS dan Linux dengan [nvm](https://github.com/nvm-sh/nvm), dari root repo:

```bash
nvm install
```

```bash
nvm use
```

Windows dengan [nvm-windows](https://github.com/coreybutler/nvm-windows), di PowerShell:

```bash
nvm install 22.23.4
```

```bash
nvm use 22.23.4
```

Pastikan terminal yang menjalankan `git commit` dan `git push` juga memakai Node 22. Hook pre-push gagal dengan `Unsupported engine` bila Node lain aktif.

### 2.2 pnpm

```bash
corepack enable
```

```bash
pnpm -v
```

Hasilnya harus `10.34.7`.

### 2.3 Akses repo

Minta TL menambahkan akun GitHub Anda ke organisasi `PT-Perkasa-Pilar-Utama`, lalu:

```bash
gh auth login
```

```bash
gh repo clone PT-Perkasa-Pilar-Utama/cikal
```

## 3. Setup lokal

### 3.1 Jalur cepat

Jalankan blok Quickstart di [README.md](../README.md#quickstart) dari root repo. Hasil yang diharapkan:

- `http://localhost:5173` menampilkan aplikasi.
- `curl http://localhost:5173/api/health/ready` menjawab `"status":"ok"` dengan `"migration":"tenancy/0000_init"` atau migrasi yang lebih baru.
- `pnpm check` selesai dengan semua task hijau.

### 3.2 Apa yang dilakukan setiap langkah

| Langkah | Efek |
|---|---|
| `pnpm install` | Memasang dependensi workspace dan hook Husky |
| `pnpm dev:secrets` | Membuat secret acak di `deploy/compose/.secrets/` (diabaikan git); file yang sudah ada tidak ditimpa |
| `docker compose -f deploy/compose/docker-compose.dev.yml up -d` | Menyalakan project `cikal-dev`: PostgreSQL 17, SeaweedFS (S3), Gotenberg, Mailpit. Saat volume database baru, skrip `initdb` membuat role `cikal_owner` dan `cikal_app` |
| `cp apps/api/.env.example apps/api/.env` | Konfigurasi api lokal; `.env` diabaikan git |
| `db:migrate` | Membangun api lalu menjalankan migrasi semua modul berlisensi |
| `db:seed --seed=dev` | Mengisi seed `base` dan `dev` (company 001 dan data contoh) |
| `pnpm dev` | Menyalakan api (`nest start --watch`, port 3000) dan web (Vite, port 5173, proxy `/api` ke 3000) |

### 3.3 Port lokal

| Port | Layanan |
|---|---|
| 5173 | Web (Vite) |
| 3000 | API |
| 55432 | PostgreSQL (dipilih agar tidak bentrok dengan PostgreSQL bawaan di 5432) |
| 9000 | SeaweedFS S3 |
| 3001 | Gotenberg |
| 8025 | UI Mailpit (penampung email dev; SMTP di port 1025) |

Sesi `psql` ke database dev:

```bash
docker compose -f deploy/compose/docker-compose.dev.yml exec db psql -U postgres -d cikal
```

### 3.4 Masalah setup yang umum

| Gejala | Penyebab | Penanganan |
|---|---|---|
| `db:migrate` gagal `password authentication failed for user "cikal_owner"` | Volume database dibuat sebelum role dipisah (sebelum PR #4) | Hapus volume dev lalu ulangi dari `docker compose ... up -d`. Perintah di bawah menghapus semua data dev |
| `ready` menunjukkan `objectStorage` `down` | Bucket belum dibuat | `docker compose -f deploy/compose/docker-compose.dev.yml logs storage-init`; container harus berhenti dengan `created bucket cikal-dev` |
| Test integrasi gagal `Could not find a working container runtime strategy` | Docker Desktop mati | Nyalakan Docker Desktop lalu ulangi `pnpm check` |
| Hook git gagal `Unsupported engine` | Node selain 22 aktif | §2.1 |

Menghapus volume dev (data dev hilang):

```bash
docker compose -f deploy/compose/docker-compose.dev.yml down -v
```

### 3.5 Keadaan aplikasi saat ini

Login dan sesi asli dibangun di kartu BE-S1-01. Sampai kartu itu selesai, web memakai sesi mock dari `packages/contracts`, dan endpoint Sprint 1 yang belum dibangun mengembalikan mock kontrak (stub). Sejak TL-S1-03, guard memeriksa sesi, CSRF, dan hak menu di setiap rute selain `@Public`, jadi stub hanya menjawab request yang membawa cookie sesi yang valid. Status per endpoint ada di Operation Status Tracker [api-specs/_index.md](api-specs/_index.md).

## 4. Tur kode dan urutan baca

### 4.1 Peta kode

| Lokasi | Isi | Mulai dari |
|---|---|---|
| `apps/api/src/main.ts`, `worker.ts` | Entrypoint proses api dan worker | `app.factory.ts`, `app.module.ts` |
| `apps/api/src/platform/` | Konfigurasi, database, storage, guard akses, filter error, runner migrasi, endpoint operasional | `http/access.ts`, `http/error.filter.ts`, `migrate/runner.ts` |
| `apps/api/src/modules/core/` | Modul CORE, satu folder per modul | `tenancy/` (contoh lengkap: tabel, migrasi, seed), `product/http/` (stub) |
| `apps/api/src/modules/addons/` | Modul tambahan M06 s.d. M15 untuk POC | |
| `apps/api/test/` | Uji lintas modul: arsitektur, stub kontrak, integrasi | `architecture.spec.ts` |
| `apps/web/src/` | SPA: `routes/`, `features/`, `components/`, `lib/api/client.ts` | `lib/api/client.ts`, `features/product/api.ts` |
| `packages/contracts/src/` | Skema dan mock kontrak per resource | `common/envelope.ts`, `product/` |
| `packages/formula/` | Mesin rumus murni | `src/rounding.ts` |
| `tools/package-builder/` | Generator daftar modul dari manifest | `module-registry.json` |

### 4.2 Urutan baca

1. [technical-specs/01-overview.md](technical-specs/01-overview.md): tujuan, lingkup, alur bisnis.
2. [technical-specs/02-system-architecture.md](technical-specs/02-system-architecture.md): bentuk modular monolith, siklus request, aturan lintas modul.
3. [technical-specs/03-repository-structure.md](technical-specs/03-repository-structure.md): bentuk satu modul.
4. [CODING_STANDARD.md](CODING_STANDARD.md): aturan yang ditegakkan di review.
5. [api-specs/01-conventions.md](api-specs/01-conventions.md): envelope, error, checker-maker, menu code.
6. Kode modul `tenancy` lalu `product` (4.1).
7. Kartu sprint berjalan di [TASK_BREAKDOWN.md](TASK_BREAKDOWN.md) dan AC-nya di `business/acceptance-criteria-breakdown/`.

## 5. Alur kerja singkat

1. Ambil issue berstatus Ready di board [Cikal POC delivery](https://github.com/orgs/PT-Perkasa-Pilar-Utama/projects/24).
2. Branch `<type>/<id-kartu>-<ringkas>` dari `origin/main`.
3. Test yang menyebut ID AC lebih dulu, lalu implementasi.
4. `pnpm check` hijau, commit `<type>(<scope>): <imperatif> (<ID-kartu>)`.
5. PR ke `main` dengan template; TL mereview memakai [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md).

Langkah lengkap per jenis kartu: [DEVELOPMENT_SCENARIO_GUIDE.md](DEVELOPMENT_SCENARIO_GUIDE.md).

## 6. Konsep kunci

Pahami istilah ini sebelum menulis kode; definisinya di [GLOSSARY.md](GLOSSARY.md):

- Modul, CORE, modul tambahan, dan antarmuka publik `index.ts`.
- Tenant, RLS, dan `withTenantTx`.
- Menu code, aksi, dan `@Requires`.
- Checker-maker dan ChangeRequest.
- Envelope, kode error, dan `DomainError`.
- Seed `base`, `dev`, `qa`, dan reset state.
- Kartu, kartu wiring, dan AC.

Istilah bisnis (Dedup, RAC, SLIK, Recontest, Akad) ada di [ba/glossary.md](ba/glossary.md).

## 7. Bantuan

| Kebutuhan | Saluran |
|---|---|
| Pertanyaan teknis atau kartu yang tidak jelas | Komentar di issue kartu, atau issue baru di repo |
| Pertanyaan tentang PR | Komentar di PR |
| Eskalasi, akses, keputusan arsitektur | Tech Lead, @maspandd |
| Pertanyaan kebutuhan bisnis | Lewat TL ke BA; jawaban dicatat di `business/grooming/` |
