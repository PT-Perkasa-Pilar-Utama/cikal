# Cikal LOS: Development Scenario Guide

**Version:** 1.0  
**Date:** 2026-10-22  
**Author:** Tech Lead PPU  
**Status:** Active  
**Phase:** POC  

Cara mengerjakan pekerjaan rutin di Cikal dari awal sampai selesai. Setiap skenario berupa langkah berurutan dengan perintah yang bisa langsung dijalankan dari root repo. Aturan kode ada di [CODING_STANDARD.md](CODING_STANDARD.md); dokumen ini hanya merujuknya.

## Daftar Isi

1. [Hari pertama](#1-hari-pertama)
2. [Model kerja](#2-model-kerja)
3. [Mengerjakan kartu backend](#3-mengerjakan-kartu-backend)
4. [Mengerjakan kartu frontend](#4-mengerjakan-kartu-frontend)
5. [Mengerjakan kartu wiring](#5-mengerjakan-kartu-wiring)
6. [Menambah tabel atau seed modul](#6-menambah-tabel-atau-seed-modul)
7. [Mereview PR](#7-mereview-pr)
8. [Reset data untuk QA](#8-reset-data-untuk-qa)
9. [Rilis](#9-rilis)

---

## 1. Hari pertama

Ikuti [ONBOARDING_GUIDE.md](ONBOARDING_GUIDE.md) §3 sampai `pnpm check` hijau dan `http://localhost:5173` terbuka. Setelah itu baca urutan di §4 dokumen yang sama.

## 2. Model kerja

| Hal | Aturan |
|---|---|
| Sprint | 6 sprint x 2 minggu, mulai 2026-10-26. Tujuan per sprint di [business/sprint-breakdown.md](business/sprint-breakdown.md) |
| Kartu | Satu kartu di [TASK_BREAKDOWN.md](TASK_BREAKDOWN.md) = satu issue GitHub = satu branch = satu PR |
| Peran | FS1 memegang kartu backend dan frontend; TL memegang kartu scaffold dan teknis, serta mereview semua PR |
| Board | [Cikal POC delivery](https://github.com/orgs/PT-Perkasa-Pilar-Utama/projects/24): Backlog, Ready, In Progress, In Review, Done |
| Urutan | Kontrak backend dan stub sudah ada sebelum layar; kartu wiring dikerjakan setelah kartu backend dan frontend pasangannya selesai |
| Branch | Trunk: semua PR ke `main`; rilis lewat tag `vX.Y.Z` |

Alur status kartu:

1. TL memindahkan kartu sprint berjalan dari Backlog ke Ready saat sprint planning.
2. Pemilik memindahkan kartu ke In Progress saat mulai, ke In Review saat PR dibuka.
3. Kartu menjadi Done setelah PR di-merge dan Definition of Done di [TASK_BREAKDOWN.md](TASK_BREAKDOWN.md) terpenuhi.

---

## 3. Mengerjakan kartu backend

Contoh: BE-S1-03 "Bangun API produk dan harga lewat checker-maker" di modul `product`.

### 3.1 Siapkan branch

```bash
git fetch origin
```

```bash
git switch -c feat/be-s1-03-product-pricing origin/main
```

Pindahkan issue ke In Progress di board.

### 3.2 Baca kartu

1. AC kartu di `Docs/business/acceptance-criteria-breakdown/acceptance-criteria-sprint-N.md`.
2. Kontrak endpoint di `Docs/api-specs/` sesuai kolom Docs kartu (contoh `api 08 §8.1`).
3. Data model dan aturan modul di `Docs/technical-specs/05-module-definitions.md` dan `06-data-model.md`.

### 3.3 Periksa kontrak

Skema request dan response sudah ada di `packages/contracts/src/<resource>/` sejak scaffold. Bila kartu mengubah kontrak, ubah skema dan mock di sana, lalu jalankan:

```bash
pnpm --filter @cikal/contracts test
```

Perubahan kontrak yang menyimpang dari api-specs ikut mengubah file api-specs di PR yang sama ([CODING_STANDARD.md](CODING_STANDARD.md) §7.2).

### 3.4 Tabel dan migrasi

Tulis tabel di `apps/api/src/modules/core/product/db/schema.ts` dengan `pgSchema("product")`, lalu bangkitkan migrasi:

```bash
pnpm --filter @cikal/api db:generate product products
```

Review SQL hasilnya di `db/migrations/`, lalu terapkan ke database dev:

```bash
pnpm --filter @cikal/api db:migrate
```

Aturan migrasi: [CODING_STANDARD.md](CODING_STANDARD.md) §6.3 dan §6.4.

### 3.5 Test lebih dulu

Tulis test yang menyebut ID AC sebelum implementasi:

- Aturan murni di `domain/` diuji dengan `<file>.spec.ts` di sebelahnya.
- Repository dan use case diuji terhadap PostgreSQL asli di `apps/api/test/<modul>/<topik>.int.spec.ts` (Testcontainers; Docker harus menyala).
- Endpoint diuji lewat `createApp(testConfig(...))` dan `app.inject`, termasuk setiap kode error.

Jalankan test modul saja:

```bash
pnpm --filter @cikal/api exec vitest run src/modules/core/product test/product
```

### 3.6 Implementasi

1. `db/<entitas>.repository.ts`: query Drizzle.
2. `application/`: use case yang memanggil domain dan repository dalam transaksi.
3. `http/<resource>.controller.ts`: ganti mock stub dengan pemanggilan use case. Dekorator `@Requires` dan DTO kontrak tetap.

Lapisan dan larangannya: [CODING_STANDARD.md](CODING_STANDARD.md) §3.5 dan §3.6.

### 3.7 Seed

Tambahkan data seed modul (6.2 di bawah) bila layar atau kartu wiring membutuhkannya, lalu:

```bash
pnpm --filter @cikal/api db:seed --seed=dev
```

### 3.8 Tracker, gate, commit

1. Ubah status operasi kartu di [api-specs/_index.md](api-specs/_index.md) dari `TODO` atau `SCAFFOLD` menjadi `OK`.
2. Jalankan gate lengkap:

```bash
pnpm check
```

3. Commit dengan format `<type>(<scope>): <imperatif> (<ID-kartu>)`:

```bash
git add -A
```

```bash
git commit -m "feat(product): add product and pricing API via checker-maker (BE-S1-03)"
```

Hook pre-commit menjalankan Biome dan typecheck; hook pre-push menjalankan unit test. Jangan lewati dengan `--no-verify`.

### 3.9 PR

```bash
git push -u origin feat/be-s1-03-product-pricing
```

```bash
gh pr create --base main --fill
```

Lengkapi template PR (kartu, AC, cara menguji, self-review), tulis `Closes #<nomor issue>`, dan pindahkan issue ke In Review.

---

## 4. Mengerjakan kartu frontend

Contoh: FE-S1-02 "Bangun layar produk dan Pending Product".

1. Branch `feat/fe-s1-02-product-screens` dari `origin/main` (3.1).
2. Baca AC dan desain token di [design-system.md](design-system.md).
3. Hook data di `apps/web/src/features/<fitur>/api.ts` memakai `apiRequest(<skema kontrak>, path)` dan TanStack Query. Selama kartu backend belum selesai, endpoint stub sudah mengembalikan mock kontrak.
4. Rute di `apps/web/src/routes/` (file-based); komponen fitur di `features/<fitur>/`, komponen bersama di `components/`.
5. Teks UI dan pesan error disalin persis dari AC; pesan error API ditampilkan dari `message` envelope.
6. Test komponen dengan Testing Library di `<Komponen>.spec.tsx`:

```bash
pnpm --filter @cikal/web test
```

7. Lihat hasilnya dengan `pnpm dev` di `http://localhost:5173`.
8. Gate, commit, dan PR sama dengan 3.8 dan 3.9 (scope `web`).

Lapisan frontend: [CODING_STANDARD.md](CODING_STANDARD.md) §3.10.

---

## 5. Mengerjakan kartu wiring

Contoh: FE-S1-03 "Sambungkan alur produk dan checker-maker end-to-end". Kartu ini dimulai setelah BE-S1-03 dan FE-S1-02 di-merge.

1. Branch `feat/fe-s1-03-product-wiring` dari `origin/main`.
2. Pasang browser Playwright sekali per mesin:

```bash
pnpm --filter @cikal/web exec playwright install chromium
```

3. Reset database lokal ke seed `qa` agar data uji sama dengan CI, SIT, dan UAT:

```bash
pnpm --filter @cikal/api db:reset --seed=qa
```

4. Tulis spec di `apps/web/e2e/<id-kartu>.spec.ts`, satu spec per kartu, dengan nama test berisi ID AC.
5. Perbaiki ketidaksesuaian kontrak, error, empty state, dan loading yang muncul di kedua sisi.
6. Jalankan (Playwright menyalakan `pnpm dev` bila belum berjalan):

```bash
pnpm --filter @cikal/web e2e
```

   Spec yang memeriksa langkah otomatis setelah submit atau email (contoh FE-S3-03) juga butuh worker pg-boss yang menyala, karena `pnpm dev` tidak menjalankannya:

```bash
pnpm --filter @cikal/api build
pnpm --filter @cikal/api start:worker
```

7. Gate, commit, dan PR sama dengan 3.8 dan 3.9. Spec yang lulus adalah exit criterion kartu.

---

## 6. Menambah tabel atau seed modul

Ke-24 modul sudah punya `<modul>.data.ts`. Modul tanpa migrasi dilewati runner sampai `db:generate` pertama.

### 6.1 Tabel baru

1. Tambah tabel di `db/schema.ts` modul.
2. `pnpm --filter @cikal/api db:generate <modul> <nama-migrasi>`.
3. `pnpm --filter @cikal/api db:migrate`.

Runner memberi hak tabel baru ke role aplikasi secara otomatis. Foreign key ke modul lain mengikuti XM-05 ([CODING_STANDARD.md](CODING_STANDARD.md) §3.4).

### 6.2 Seed baru

1. Tulis fungsi seed di `seed/<entitas>.ts` dengan `onConflictDoNothing()` dan ID tetap.
2. Ekspor per lapisan di `seed/index.ts` (`base`, `dev`, atau `qa`).
3. Daftarkan di `<modul>.data.ts`: `defineModuleData(import.meta.url, { code, schema, seeds: { dev } })`.
4. ID yang dirujuk modul lain diekspor lewat `index.ts` modul (contoh `seedCompanyIds` di tenancy).
5. Jalankan seed dua kali untuk membuktikan idempoten:

```bash
pnpm --filter @cikal/api db:seed --seed=qa
```

Contoh lengkap: modul `apps/api/src/modules/core/tenancy`.

### 6.3 Modul langkah baru

Ikuti [STEP_MODULE_GUIDE.md](STEP_MODULE_GUIDE.md): StepHandler, registrasi, paket, lisensi, rute, dan uji.

---

## 7. Mereview PR

1. Pastikan check CI `Lint, type-check, test, build` hijau. Butir yang sudah dijamin CI tidak diperiksa manual.
2. Jalankan skill `/code-review` dengan nomor PR, atau telusuri [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md) butir demi butir.
3. Periksa setiap AC kartu punya test yang menyebut ID-nya, dan kartu wiring punya spec Playwright.
4. Setujui atau minta perubahan:

```bash
gh pr review <nomor> --approve
```

```bash
gh pr review <nomor> --request-changes --body "<temuan dengan rujukan §CODING_STANDARD>"
```

5. Merge setelah disetujui dan CI hijau. Kartu TL direview FS1; kartu FS1 direview TL.

---

## 8. Reset data untuk QA

Lokal:

```bash
pnpm --filter @cikal/api db:reset --seed=qa
```

Atau lewat API saat `pnpm dev` berjalan:

```bash
curl -X POST -H "X-Reset-Token: $(cat deploy/compose/.secrets/reset_token)" -H "Content-Type: application/json" -d '{"seed":"qa"}' http://localhost:5173/api/admin/reset-state
```

Setelah kartu TL-S1-03 memasang pemeriksaan sesi, rute ini juga butuh login akun QA dan header CSRF; urutannya di [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md) §6.3. SIT dan UAT: ikuti [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md) §6. Reset tidak ada di production.

---

## 9. Rilis

1. Pastikan semua PR sprint sudah di-merge dan `main` hijau.
2. TL membuat tag dan release notes:

```bash
git fetch origin && git switch main && git pull --ff-only
```

```bash
git tag v0.1.0 && git push origin v0.1.0
```

```bash
gh release create v0.1.0 --generate-notes
```

3. Pemasangan ke SIT, UAT, lalu production mengikuti [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md) §4. Rollback di §5.
