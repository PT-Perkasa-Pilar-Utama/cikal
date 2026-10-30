# Cikal LOS: Verifikasi Kriteria Sukses POC

**Version:** 0.1  
**Date:** 2026-10-30  
**Author:** Tech Lead PPU  
**Status:** Draft  
**Phase:** POC  

Dokumen ini mencatat bukti kriteria sukses POC K-01 s.d. K-08 ([business/grooming/grooming-cikal-ba-v2.md](business/grooming/grooming-cikal-ba-v2.md), bagian "Kriteria sukses"). Bukti otomatis dicatat di kartu TL-S6-03. Uji manusia K-01 dan K-08 serta demo ke Product Owner dan BA dicatat di kartu TL-S6-04 ([#170](https://github.com/PT-Perkasa-Pilar-Utama/cikal/issues/170)).

POC dinyatakan berhasil bila setiap baris di bagian 1 berstatus **Terbukti** dan sudah didemokan.

## Daftar Isi

1. [Ringkasan status](#1-ringkasan-status)
2. [Bukti otomatis](#2-bukti-otomatis)
3. [Menjalankan ulang bukti otomatis](#3-menjalankan-ulang-bukti-otomatis)
4. [Protokol K-01: instalasi oleh orang luar](#4-protokol-k-01-instalasi-oleh-orang-luar)
5. [Protokol K-08: modul langkah oleh developer luar](#5-protokol-k-08-modul-langkah-oleh-developer-luar)
6. [Naskah demo ke Product Owner dan BA](#6-naskah-demo-ke-product-owner-dan-ba)

---

## 1. Ringkasan status

| ID | Kriteria (ringkas) | Bukti otomatis (TL-S6-03) | Uji manusia dan demo (TL-S6-04) |
|---|---|---|---|
| K-01 | Orang luar memasang paket POC di VM Linux bersih dalam 2 jam | Sebagian: perakitan paket per manifest | Belum dijalankan |
| K-02 | KTA dari draft sampai Disbursed dengan timeline lengkap | Terbukti | Demo belum |
| K-03 | Modul dimatikan lewat checker-maker; pengajuan berjalan memakai versi rute lama | Terbukti (modul Dukcapil) | Demo dengan modul Fraud belum |
| K-04 | Tanpa M14: menu E-Polis tidak tampil, langkah Epolis "Skipped - not licensed"; lisensi diubah ditolak | Terbukti | Demo belum |
| K-05 | Perubahan scoring lewat layar mengubah skor pengajuan berikutnya | Terbukti | Demo belum |
| K-06 | Dukcapil mock gagal: Error di Process Monitoring; Retry melanjutkan tanpa langkah ganda | Terbukti (API) | Demo belum |
| K-07 | Data wilayah tersinkron dari Oksara dan dipakai dropdown berjenjang | Terbukti (adapter tiruan) | Demo dengan Oksara asli belum |
| K-08 | Developer luar menambah modul langkah dalam 2 hari kerja | Tidak bisa diotomatiskan | Belum dijalankan |

## 2. Bukti otomatis

Spec e2e berjalan terhadap stack dev dengan seed `qa` dan worker pg-boss. Spec integrasi berjalan terhadap PostgreSQL Testcontainers.

| ID | Bukti | Yang dibuktikan |
|---|---|---|
| K-01 | `apps/api/test/package-builder.spec.ts` (AC-100.03) | Image hanya memuat modul manifest client. Waktu pasang di VM bersih butuh uji manusia (bagian 4). |
| K-02 | `apps/web/e2e/fe-s6-04.spec.ts` "AC-76.01 AC-77.01 AC-101.01 AC-102.08 an approved application goes through to Disbursed" | Pengajuan KTA QA melewati semua langkah rute sampai Disbursed. |
| K-02 | `apps/api/test/process-timeline.int.spec.ts` (AC-85.01 s.d. AC-85.05) | Timeline berisi waktu mulai dan selesai, aging, pelaku, dan hasil setiap langkah. |
| K-03 | `apps/web/e2e/fe-s2-04.spec.ts` (AC-31.01, AC-31.03) | Maker mematikan modul rute, Checker menyetujui; pengajuan berjalan tetap di Route Version 1, pengajuan baru memakai Route Version 2. Spec memakai Dukcapil karena Fraud tidak menahan pengajuan di tengah rute. |
| K-03 | `apps/api/test/process-advance.int.spec.ts` "skips a step turned off in the route as not in route (AC-85.02)" | Langkah yang dimatikan berstatus "Skipped - not in route". |
| K-04 | `apps/web/e2e/tl-s6-03.spec.ts` "K-04 AC-85.06 ..." | Paket POC tanpa M14: timeline menampilkan langkah Epolis "Skipped - not licensed". |
| K-04 | `apps/web/e2e/tl-s6-03.spec.ts` "K-04 the Super User menu has no E-Polis" | Menu Super User tidak memuat E-Polis. |
| K-04 | `apps/web/e2e/tl-s6-03.spec.ts` "K-04 AC-100.02 ..." | File lisensi dev yang diubah ditolak `422 LICENSE_INVALID` "License file is invalid"; lisensi `PPU-LIC-DEV-0001` tetap `ACTIVE`. |
| K-04 | `apps/api/test/license.int.spec.ts` (AC-100.02), `apps/api/test/process-timeline.int.spec.ts` (AC-85.06) | Kasus lisensi lain yang ditolak; langkah SLIK "Skipped - not licensed" bila lisensi tanpa M10. |
| K-05 | `apps/web/e2e/fe-s5-05.spec.ts` "AC-37.05 the active model scores until the new version is approved, then it scores the next application" | Kriteria scoring diubah lewat layar dengan checker-maker; skor pengajuan berikutnya berubah tanpa perubahan kode. |
| K-06 | `apps/api/test/process-monitoring.int.spec.ts` (AC-86.01, AC-86.03, AC-86.04) | Langkah Dukcapil Error tampil di filter Error; Retry yang gagal menambah satu percobaan pada StepExecution yang sama; Retry setelah pulih menyelesaikan langkah itu. |
| K-07 | `apps/api/test/regions.int.spec.ts` (AC-23.01 s.d. AC-23.04) | Sinkronisasi menambah dan memperbarui wilayah; dropdown provinsi, kota, kecamatan, kelurahan berjenjang. Adapter Oksara diganti tiruan di uji; Oksara asli diuji saat demo. |

Catatan AC-100.02: halaman "License" belum ada (DEPLOYMENT_PLAN §8 F-10), jadi pesan "License file is invalid" dibuktikan di respons API, bukan di layar.

## 3. Menjalankan ulang bukti otomatis

Jalankan dari root repo dengan Node 22 dan Docker menyala.

1. Nyalakan stack dev dan migrasikan database (CLAUDE.md §14).
2. Jalankan `pnpm dev`.
3. Jalankan worker di terminal lain: `pnpm --filter @cikal/api start:worker`.
4. Jalankan spec e2e K-02 s.d. K-05:

   ```bash
   E2E_BASE_URL=http://localhost:5173 pnpm --filter @cikal/web exec playwright test fe-s6-04 fe-s2-04 fe-s5-05 tl-s6-03
   ```

5. Jalankan spec integrasi K-02 s.d. K-07:

   ```bash
   pnpm --filter @cikal/api exec vitest run test/package-builder.spec.ts test/process-timeline.int.spec.ts test/process-advance.int.spec.ts test/license.int.spec.ts test/process-monitoring.int.spec.ts test/regions.int.spec.ts
   ```

Global setup e2e mereset database ke seed `qa`. Jangan menjalankannya terhadap lingkungan yang datanya dipakai orang lain.

### Hasil jalan

| Tanggal | Commit | Perintah | Hasil |
|---|---|---|---|
| 2026-10-30 | `b6bbfdf` + cabang TL-S6-03 | langkah 4 | 8 dari 8 test lulus (1,8 menit) |
| 2026-10-30 | `b6bbfdf` + cabang TL-S6-03 | langkah 5, lewat `pnpm check` | lulus |

## 4. Protokol K-01: instalasi oleh orang luar

**Penguji:** orang yang tidak ikut membangun Cikal dan tidak membaca kode sumbernya.  
**Bahan:** tag rilis POC, [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md) bagian 3, file lisensi company 001 bertanda tangan kunci PPU.  
**Lingkungan:** VM Linux bersih sesuai DEPLOYMENT_PLAN §3.1, tanpa Docker terpasang.

1. Catat jam mulai saat penguji membuka DEPLOYMENT_PLAN §3.
2. Penguji mengikuti §3.1 s.d. §3.8 tanpa bantuan lisan. Tim hanya menjawab pertanyaan tertulis, dan setiap pertanyaan dicatat.
3. Catat jam selesai saat pemeriksaan §3.8 lulus dan Super User bisa login.
4. Catat setiap langkah yang membuat penguji berhenti lebih dari 10 menit.
5. Perbaiki panduan untuk setiap hambatan sebelum demo.

K-01 terbukti bila durasi 2 jam atau kurang dan §3.8 lulus.

| Penguji | Tanggal | VM (OS, CPU, RAM) | Mulai | Selesai | Durasi | Pertanyaan dan hambatan | Hasil |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## 5. Protokol K-08: modul langkah oleh developer luar

**Penguji:** developer yang tidak ikut membangun Cikal.  
**Bahan:** [STEP_MODULE_GUIDE.md](STEP_MODULE_GUIDE.md), skenario A (modul langkah dummy di slot `NAME_SCREENING`, M16), repo dari `main`.

1. Catat jam mulai saat penguji membuka panduan.
2. Penguji membangun modul langkah dummy sampai daftar periksa §6 panduan terpenuhi dan `pnpm check` lulus.
3. Tim hanya menjawab pertanyaan tertulis, dan setiap pertanyaan dicatat.
4. Catat jam kerja yang terpakai, bukan durasi kalender.
5. Perbaiki panduan untuk setiap hambatan.

K-08 terbukti bila jam kerja 2 hari kerja (16 jam) atau kurang, `pnpm check` lulus, dan timeline pengajuan baru menampilkan langkah dummy.

| Penguji | Tanggal mulai | Tanggal selesai | Jam kerja | Pertanyaan dan hambatan | PR | Hasil |
|---|---|---|---|---|---|---|
| | | | | | | |

## 6. Naskah demo ke Product Owner dan BA

Demo dijalankan di instalasi POC hasil K-01.

| ID | Langkah demo | Yang ditunjukkan |
|---|---|---|
| K-02 | Sales membuat dan submit pengajuan KTA; jalankan sampai Record Disbursement | Status Disbursed; timeline berisi waktu, pelaku, dan hasil setiap langkah |
| K-03 | Maker mematikan Fraud di rute KTA; Checker menyetujui; buka pengajuan lama dan baru | Pengajuan baru: Fraud "Skipped - not in route". Pengajuan lama: versi rute lama |
| K-04 | Buka menu; buka timeline pengajuan; pasang file lisensi yang diubah | Menu tanpa E-Polis; Epolis "Skipped - not licensed"; lisensi ditolak dan lisensi lama tetap berlaku |
| K-05 | Maker mengubah satu kriteria scoring; Checker menyetujui; submit pengajuan baru | Skor pengajuan baru berubah |
| K-06 | Buat adapter Dukcapil mock gagal; buka Process Monitoring; pulihkan mock; klik Retry | Langkah Error, lalu proses lanjut tanpa langkah ganda |
| K-07 | Jalankan sinkronisasi wilayah dari Oksara; isi alamat pengajuan | Dropdown provinsi, kota, kecamatan, kelurahan berjenjang |
| K-08 | Tunjukkan PR modul langkah dummy dari bagian 5 | Langkah dummy tampil di timeline |

| Tanggal | Hadir | Kriteria yang didemokan | Catatan | Diterima |
|---|---|---|---|---|
| | | | | |
