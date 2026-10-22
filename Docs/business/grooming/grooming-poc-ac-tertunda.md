# Grooming: AC sprint POC tanpa kartu

**Version:** 1.0  
**Date:** 2026-10-22  
**Author:** Tech Lead  
**Status:** Selesai, diterapkan ke `Docs/business`  
**Phase:** POC  

**Mode:** interview (Product Owner menjawab langsung).  
**Ruang lingkup:** AC-01.09, AC-01.10, AC-76.03, AC-97.02, AC-97.03. Kelimanya ada di sprint POC 1 s.d. 6, tetapi tidak dipegang kartu mana pun di `Docs/TASK_BREAKDOWN.md` v0.2.  
**Sumber:** `Docs/business/acceptance-criteria-breakdown/acceptance-criteria-sprint-1.md` dan `-sprint-6.md`; `Docs/technical-specs/06-data-model.md` 6.7; `Docs/api-specs/02-authentication.md` 2.6, `08-products-routes.md` 8.6, `25-disbursement.md` 25.2.  

## I: Independent

### Q1. Apakah verifikasi dua langkah (AC-01.09, AC-01.10) harus ada di POC?

**Kenapa penting:** TOTP butuh enrol authenticator, secret terenkripsi per user (kolom baru di `iam.users`), dan halaman Verification Code; technical spec belum memuatnya. Cadangan POC tinggal 1 hari.  
**Rekomendasi:** pindah ke backlog pasca-POC, ditandai Deferred; kontrak TOTP di `api-specs/02-authentication.md` 2.6 tetap jadi acuan.  
**Keputusan PO:** Backlog, Deferred.

### Q2. Bagaimana AC-76.03 diuji bila M14 E-Polis tidak berlisensi di POC?

**Kenapa penting:** AC-76.03 membandingkan tanggal pencairan dengan tanggal e-polis; tanpa M14 tanggal itu tidak pernah ada, jadi AC tidak bisa diuji dan perilaku POC (aturan dilewati) tidak punya AC.  
**Rekomendasi:** AC-76.03 diberi syarat "M14 E-Polis berlisensi" dan ditandai Deferred; tambah AC-76.06 untuk perilaku tanpa M14.  
**Keputusan PO:** Sesuai rekomendasi.

## N: Negotiable

### Q3. Harga produk memakai rentang tenor atau periode berlaku?

**Kenapa penting:** AC-97.01 s.d. AC-97.03 masih memakai rentang tenor dari draft v1, sedangkan grooming v2 R-19, data model `SUB_PRODUCTS`, `api-specs` 8.6, dan kartu BE-S1-03 memakai suku bunga per periode berlaku. Dua model ini menghasilkan tabel, validasi, dan pesan error yang berbeda.  
**Rekomendasi:** per periode berlaku sesuai R-19. AC-97.02 menjadi periode tumpang tindih; AC-97.03 menjadi rentang suku bunga Approver yang tidak mencakup suku bunga; AC-97.01 dan AC-97.04 ikut disesuaikan.  
**Keputusan PO:** Per periode berlaku.

## V, E, S, T

Tidak ada pertanyaan tambahan. Ketiga keputusan tidak menambah entity di luar technical spec, tidak menambah kartu, dan setiap AC hasil revisi bisa diuji otomatis.

## Perubahan yang diterapkan

| Jenis | ID | Isi | Dasar |
|---|---|---|---|
| Edit | AC-01.09, AC-01.10 | Ditandai Deferred, backlog pasca-POC; isi Gherkin tetap | Q1 |
| Edit | AC-76.03 | Given ditambah "modul M14 E-Polis berlisensi"; ditandai Deferred | Q2 |
| Add | AC-76.06 | "Tanpa M14, tanggal e-polis tidak diperiksa": Valid dengan tanggal H+1 berhasil dan Disbursement Detail tidak menampilkan tanggal e-polis | Q2 |
| Edit | AC-97.01 | Baris pricing per periode berlaku (12% 01-10-2026 s.d. 31-12-2026, 14% mulai 01-01-2027) dengan Approver Rate Range per baris | Q3 |
| Edit | AC-97.02 | "Periode harga tumpang tindih", pesan "Pricing periods must not overlap" | Q3 |
| Edit | AC-97.03 | "Rentang suku bunga Approver tidak mencakup suku bunga", pesan "Approver rate range must include the interest rate" | Q3 |
| Edit | AC-97.04 | Suku bunga read-only diambil dari pricing yang berlaku hari ini, bukan dari tenor | Q3 |

File yang diubah: `acceptance-criteria-breakdown/acceptance-criteria-sprint-1.md`, `acceptance-criteria-breakdown/acceptance-criteria-sprint-6.md`, dan `acceptance-criteria.md` (dibangkitkan ulang). `user-story.md` dan `sprint-breakdown.md` tidak berubah: aksi US-97 sudah menyebut periode berlaku, dan tidak ada US yang pindah sprint. `Docs/ba` tidak diubah.

Ikutan di dokumen lain: `Docs/TASK_BREAKDOWN.md` (BE-S1-03, FE-S1-02, BE-S6-01, FE-S6-01 mengutip AC hasil revisi) dan `Docs/api-specs` 08 §8.6 dan 25 §25.2 (pesan error kini bersumber dari AC).

## Definition of Ready

| INVEST | Nilai | Catatan |
|---|---|---|
| I | PASS | AC-76.06 tidak bergantung pada M14; AC-01.09/01.10 keluar dari POC |
| N | PASS | Model harga mengikuti satu sumber (R-19) |
| V | PASS | |
| E | PASS | Tidak ada entity baru; estimasi kartu tidak berubah |
| S | PASS | |
| T | PASS | Semua AC POC hasil revisi punya hasil yang bisa diamati |

**Siap untuk estimasi.** Semua AC sprint POC 1 s.d. 6 yang tidak Deferred kini dipegang kartu.

**Celah AC yang tersisa (usulan, belum diterapkan):**

| Celah | Usulan AC |
|---|---|
| Produk tanpa pricing yang berlaku hari ini | Given produk "KTA" tanpa baris pricing yang berlaku hari ini, When Sales membuka dropdown "Product", Then "KTA" tidak ditampilkan |
| Pricing dengan tanggal akhir sebelum tanggal mulai | Then Sistem menampilkan pesan "Valid to must be on or after valid from" |
