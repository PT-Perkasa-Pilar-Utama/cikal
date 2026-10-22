# Cikal LOS: Glosarium Engineering

**Version:** 1.0  
**Date:** 2026-10-22  
**Author:** Tech Lead PPU  
**Status:** Active  
**Phase:** POC  

Istilah proyek dan kode yang dipakai di repo, spec, dan board. Definisi saja; detail implementasi ada di dokumen yang dirujuk. Istilah bisnis (Dedup, RAC, SLIK, Recontest, Akad, Agunan, dan lainnya) didefinisikan di [ba/glossary.md](ba/glossary.md) dan tidak diulang di sini.

## Daftar Isi

1. [Arsitektur dan paket](#1-arsitektur-dan-paket)
2. [Tenant, akses, dan lisensi](#2-tenant-akses-dan-lisensi)
3. [Data dan migrasi](#3-data-dan-migrasi)
4. [API](#4-api)
5. [Proses dan integrasi](#5-proses-dan-integrasi)
6. [Kerja tim](#6-kerja-tim)
7. [Lingkungan dan operasi](#7-lingkungan-dan-operasi)

---

## 1. Arsitektur dan paket

| Istilah | Definisi |
|---|---|
| Modul | Satu area bisnis dengan folder sendiri di `apps/api/src/modules`, satu skema PostgreSQL, dan satu antarmuka publik (`index.ts`). |
| CORE | Kumpulan modul inti yang selalu terpasang (Identity, Tenancy, Product, Application, Orchestrator, dan lainnya). Bukan satu modul tunggal. |
| Modul tambahan | Modul yang dijual terpisah, berkode `M01` s.d. `M16` (contoh `M07` Dukcapil, `M15` Pencairan & Core). Foldernya di `modules/addons/`, misalnya `m07-dukcapil`. |
| Platform | Infrastruktur bersama di `apps/api/src/platform` (konfigurasi, database, storage, guard HTTP, runner migrasi, endpoint operasional). Bukan modul bisnis dan tidak dilisensi. |
| Antarmuka publik | File `index.ts` modul; satu-satunya file yang boleh diimpor modul lain. |
| Kontrak | Skema Zod request dan response di `packages/contracts`, dipakai bersama api dan web. |
| Manifest | Daftar kode modul yang dibeli satu client, contoh `deploy/manifests/poc.json`. |
| Paket | Image `cikal-api` yang dirakit dari manifest; modul di luar manifest tidak ikut ke dalamnya. |
| `licensed-modules.generated.ts` | File hasil generator paket yang mendaftarkan modul berlisensi beserta kontrak data-nya. Tidak di-commit. |
| Kontrak data modul | Objek `<modul>Data` di `<modul>.data.ts`: nama skema, folder migrasi, dan seed modul. Dibaca runner migrasi. |
| Repository | File `db/<entitas>.repository.ts`; satu-satunya tempat query Drizzle sebuah modul. |
| Use case | Fungsi di `application/` yang menjalankan satu operasi bisnis dan dipanggil controller. |

## 2. Tenant, akses, dan lisensi

| Istilah | Definisi |
|---|---|
| Tenant | Satu company (bank) di dalam instalasi. Data bisnis selalu terikat `tenant_id`. Lihat juga Company di glosarium BA. |
| Company 001 | Tenant hasil seed `dev` dan `qa`, ID tetap `seedCompanyIds.company001`. |
| RLS | Row-Level Security PostgreSQL; membatasi baris ke tenant aktif lewat `app.tenant_id`. |
| `withTenantTx` | Pembungkus transaksi yang memasang tenant dan user dari sesi sebelum akses data bisnis. |
| Menu code | Kode hak akses per layar, contoh `MST-PRODUCT`, `IAM-ROLE-ACCESS`. Daftarnya di api-specs 01 §1.11. |
| Aksi | Hak per menu: `VIEW`, `CREATE`, `UPDATE`, `DELETE`, `APPROVE`. |
| `@Requires` | Dekorator rute yang mewajibkan menu code dan aksi tertentu. Pasangannya `@Public` dan `@Authenticated`. |
| Role seed | Role bawaan hasil seed (Super User, Admin Sistem, Maker, Checker, Auditor, dan lainnya); tenant bisa mengubah haknya. |
| Lisensi | File JSON bertanda tangan Ed25519 yang menyebut company, modul, dan masa berlaku. Diperiksa di menu, guard API, editor rute, dan orchestrator. |

## 3. Data dan migrasi

| Istilah | Definisi |
|---|---|
| Skema modul | Skema PostgreSQL milik satu modul, contoh `tenancy`, `iam`, `m07_dukcapil`. |
| Ledger migrasi | Tabel `__migrations` di setiap skema modul yang mencatat migrasi yang sudah diterapkan. |
| Runner migrasi | `platform/migrate/run.js` dengan perintah `migrate`, `seed`, dan `reset`. Di repo dijalankan lewat `pnpm --filter @cikal/api db:migrate`, `db:seed`, `db:reset`. |
| `cikal_owner` | Role database pemilik skema; dipakai runner migrasi dan reset lewat `DATABASE_MIGRATION_URL`. |
| `cikal_app` | Role database aplikasi tanpa `BYPASSRLS`; dipakai api dan worker lewat `DATABASE_URL`. |
| Seed `base` | Data acuan tanpa user dan nasabah (menu, role standar, parameter default). Dipakai production. |
| Seed `dev` | `base` ditambah company 001, user per role, dan data contoh untuk pengembangan. |
| Seed `qa` | `dev` ditambah data uji kartu wiring dan skenario MRTM. Dipakai CI, SIT, dan UAT. |
| Keadaan awal | Skema pada migrasi terakhir, seed terpilih sudah diterapkan, bucket kosong, tanpa sesi dan job. |
| Reset state | Pengembalian database ke keadaan awal lewat `POST /api/admin/reset-state` atau `db:reset`. Tidak ada di production. |
| Expand/contract | Pola migrasi yang hanya menambah; penghapusan kolom menunggu satu rilis setelah kode berhenti memakainya. |

## 4. API

| Istilah | Definisi |
|---|---|
| Envelope | Bentuk baku respons: sukses `{data, message?}`, daftar `{data[], meta}`, error `{code, message, details[], correlationId}`. |
| Kode error | Nilai `code` di envelope error, contoh `VALIDATION_FAILED`, `PRODUCT_CODE_EXISTS`. Kode standar di api-specs 01 §1.10. |
| `DomainError` | Kelas error backend yang membawa kode, pesan, status, dan detail; diubah menjadi envelope oleh filter global. |
| Correlation ID | ID unik per request di header `x-correlation-id` dan envelope error; dipakai mencari log. |
| Checker-maker | Pola penulisan master data: maker mengajukan perubahan (`202` + ChangeRequest), checker lain menyetujui atau menolak lewat `/change-requests`. |
| Idempotency-Key | Header UUID dari klien pada operasi kritis agar request ulang tidak diproses dua kali. |
| Stub | Endpoint yang sudah terdaftar dan tervalidasi tetapi mengembalikan mock kontrak sampai kartu backend-nya selesai. |
| Mock kontrak | Data contoh di `packages/contracts/*.mock.ts` yang lolos skema; dipakai stub dan test. |
| Operation Status Tracker | Tabel status setiap operasi API (`TODO`, `SCAFFOLD`, `WIP`, `OK`) di `api-specs/_index.md`. |

## 5. Proses dan integrasi

| Istilah | Definisi |
|---|---|
| Rute produk | Urutan langkah proses per produk yang bisa diubah lewat layar dan berversi. Pengganti workflow BPT di OS11. |
| Langkah (step) | Satu tahap rute, contoh `DEDUP`, `DUKCAPIL`, `APPROVAL`. Bisa otomatis, menunggu manusia, atau menunggu pihak luar. |
| Orchestrator | Modul CORE yang menjalankan rute langkah demi langkah di atas antrean pg-boss. |
| `StepHandler` | Antarmuka yang diimplementasikan modul untuk setiap langkah yang dimilikinya. |
| Outbox | Tabel event yang ditulis di transaksi yang sama dengan perubahan data, lalu dikirim worker setelah commit. |
| pg-boss | Antrean job di PostgreSQL yang dipakai worker. |
| Worker | Proses kedua dari image yang sama (`PROCESS_ROLE=worker`) yang mengonsumsi antrean. |
| Port | Antarmuka kanonik ke pihak ketiga di folder `ports/` modul, contoh `DukcapilPort`. |
| Adapter | Implementasi port untuk satu penyedia di folder `adapters/`. |
| Adapter simulasi | Adapter yang meniru penyedia untuk dev, test, SIT, dan UAT; ditolak di production kecuali tenant trial. |

## 6. Kerja tim

| Istilah | Definisi |
|---|---|
| Kartu | Satu potongan kerja di `TASK_BREAKDOWN.md` dengan ID `<BE\|FE\|TL>-S<sprint>-<NN>`, satu pemilik, dan estimasi hari-developer. Satu kartu menjadi satu issue GitHub. |
| FS1 | Peran fullstack (backend dan frontend) yang memegang sebagian besar kartu. |
| TL | Tech Lead: scaffold, kartu teknis, dan review. |
| Kartu wiring | Kartu yang menyambungkan frontend asli ke backend asli dan membuktikan AC dengan uji Playwright. |
| AC | Acceptance criteria berformat Gherkin, ID `AC-<US>.<NN>`, di `business/acceptance-criteria-breakdown/`. |
| MRTM | Matriks uji dari Doc BA (`ba/mrtm-acc.tsv`) yang menjadi data uji seed `qa`. |
| Deferred | Status AC yang ada di sprint POC tetapi sengaja tidak dikerjakan; daftarnya di `TASK_BREAKDOWN.md`. |
| Definition of Done | Syarat selesai setiap kartu di `TASK_BREAKDOWN.md`. |
| Sprint | Iterasi 2 minggu; milestone dan field Iteration di board mengikuti nomor sprint. |

## 7. Lingkungan dan operasi

| Istilah | Definisi |
|---|---|
| `dev`, `test`, `sit`, `uat`, `production` | Nilai `APP_ENV`. `test` adalah CI; SIT untuk QA PPU; UAT untuk client. |
| Health live | `GET /api/health/live`: proses hidup. |
| Health ready | `GET /api/health/ready`: status database, storage, dan dependensi lain; `503` bila yang kritis gagal. |
| Monitoring token | Bearer token untuk `health/ready` dan `/api/metrics` dari luar jaringan internal. |
| Reset token | Isi header `X-Reset-Token` untuk reset state; hanya ada di non-production. |
| `cikal_ops` | Channel PostgreSQL LISTEN/NOTIFY untuk sinyal operasional (`reset_started`, `reset_finished`) ke api dan worker. |
| Tag rilis | Tag git `vX.Y.Z` di `main` yang memicu build image; image yang sama dipromosikan SIT, UAT, lalu production. |
