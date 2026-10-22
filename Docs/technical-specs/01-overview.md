# 1. Overview

Cikal adalah rebuild Loan Origination System (LOS) PT Perkasa Pilar Utama dari OutSystems 11 ke high-code. Sistem ini menangani pengajuan kredit dari input data sampai pencairan, dengan alur per produk yang diatur lewat konfigurasi rute modul, checker-maker untuk semua perubahan konfigurasi, dan modul yang dijual terpisah per client. Dokumen technical spec ini menjelaskan **bagaimana** Cikal dibangun; **apa** yang dibangun ada di `Docs/business/` (user story dan acceptance criteria) dan di dokumen BA (`Docs/cikal-tech-reference.md`, `Docs/ba/data-dictionary.md`).

> **Terminologi.** Istilah bisnis (Dedup, RAC, SLIK, IJK, SP3K, Recontest, dan lainnya) mengikuti `Docs/ba/glossary.md`. Nama entity dan atribut mengikuti `Docs/ba/data-dictionary.md`; spec ini menurunkan nama tabel dan kolom fisik darinya dalam `snake_case`.

> **Kebijakan bahasa.**
> - Label UI dan pesan sistem: bahasa Inggris, teks persis seperti di AC (Asumsi A-27, OT-04).
> - Email ke nasabah dan isi dokumen keluaran (akad, SP3K): bahasa Indonesia.
> - Kode, identifier, nama tabel, kolom, endpoint, dan kode error: bahasa Inggris.
> - Dokumen engineering (spec ini): bahasa Indonesia, istilah domain dipertahankan apa adanya.

## 1.1 Tujuan

| ID | Tujuan | Ukuran |
|---|---|---|
| G-01 | Semua fungsi bisnis LOS OS11 yang masih dipakai tersedia di Cikal | Seluruh AC di `Docs/business/` lulus uji |
| G-02 | Alur per produk diubah lewat konfigurasi, tanpa rilis | Rute, matrix, rumus, dan parameter diubah lewat layar dengan checker-maker |
| G-03 | Developer junior sampai middle, dibantu AI, bisa mengubah satu modul tanpa memahami seluruh sistem | Kriteria POC K-08: modul langkah baru ditambahkan dalam 2 hari kerja |
| G-04 | Satu codebase untuk banyak client, dibedakan oleh lisensi dan konfigurasi | Paket instalasi dirakit per lisensi (bagian 2.4) |
| G-05 | Dipasang on-premise di server bank lebih dulu | Paket Docker Compose terpasang di VM Linux bersih dalam 2 jam (K-01) |

## 1.2 Ruang lingkup per modul

Pembagian modul mengikuti `Docs/cikal-tech-reference.md` bagian 3 dan 4.1. Rincian antarmuka tiap modul ada di `05-module-definitions.md`.

### 1.2.1 CORE: Identity & Access
Login lokal dan SSO, reset dan ganti password, logout dan sesi, user, role, hak akses per role dan per user, menu. US-01 s.d. US-11.

### 1.2.2 CORE: Tenant & License
Company, lisensi modul, salin konfigurasi antar company. US-15, US-16, US-99, US-100.

### 1.2.3 CORE: Organization
Regional, Branch, Sub Branch, Currency, kurs. US-17, US-18, US-19 (US-18 dan US-19 Deferred: valas ditunda).

### 1.2.4 CORE: Master Data
General Parameter beserta impor dan ekspor, data wilayah, asuransi dan tarif, parameter sistem. US-21, US-22, US-23, US-29, US-30.

### 1.2.5 CORE: Product & Route
Produk dan SubProduct (harga), rute modul berversi, checklist dokumen. US-20, US-25, US-31, US-32, US-97.

### 1.2.6 CORE: Change Request
Checker-maker generik untuk semua data master. US-12, US-13.

### 1.2.7 CORE: Audit
Log audit tidak bisa diubah. US-14.

### 1.2.8 CORE: Notification
Email ke nasabah dan pengguna, log notifikasi. US-87.

### 1.2.9 CORE: Document
Penyimpanan file, template dokumen, generate PDF, penomoran dokumen. US-24, US-102, bagian generate dari US-72, US-77, US-78.

### 1.2.10 CORE: Application
Pengajuan dan seluruh section, Loan ID, draft, submit, detail. US-39 s.d. US-50, US-84.

### 1.2.11 CORE: Orchestrator
Menjalankan rute, riwayat langkah, retry, monitoring proses. US-85, US-86.

### 1.2.12 CORE: Task Queue
Antrean kerja manusia: ambil, lepas, tutup tugas. US-58.

### 1.2.13 CORE: Verification
Verifikasi dokumen pengajuan. US-64.

### 1.2.14 CORE: Approval
Level dan hierarki approval, keputusan approver, auto approval, struktur kredit dan jadwal angsuran. US-26, US-27, US-28, US-72, US-73, US-74.

### 1.2.15 CORE: Integration Registry
Konfigurasi penyedia per tenant, rujukan rahasia, uji koneksi, log panggilan, endpoint data masuk. US-94 (simulasi lewat adapter simulasi), tech ref TO-18.

### 1.2.16 CORE: Calculation
Mesin rumus configurable, perhitungan angsuran, kalender hari libur. US-51, tech ref TO-11.

### 1.2.17 CORE: Reporting
Dashboard, inquiry, ekspor. US-81, US-82, US-83.

### 1.2.18 Modul tambahan

| Kode | Modul | US |
|---|---|---|
| M01 | Mobile Sales | US-88 s.d. US-93 |
| M02 | API Mitra | US-54, US-96 |
| M03 | Bulk Upload | US-52, US-53 |
| M04 | OCR KTP | US-41 |
| M05 | Survey & Appraisal | US-55, US-56, US-57 |
| M06 | Dedup | US-33, US-59, US-60 |
| M07 | Dukcapil | US-34, US-61, US-62, US-63 |
| M08 | Fraud | US-35, US-65, US-66, US-95 |
| M09 | Scoring & RAC | US-37, US-38, US-67 |
| M10 | Credit Bureau | US-68 |
| M11 | Decision Engine | US-36, US-69, US-71 |
| M12 | SIKP | US-70 |
| M13 | Kredit Pensiun | US-42 |
| M14 | E-Polis | US-75 |
| M15 | Pencairan & Core | US-76 s.d. US-80, US-101 |
| M16 | Name Screening | Belum ada US (tech ref TO-14) |

### 1.2.19 Out of Scope

| Hal | Alasan | Rujukan |
|---|---|---|
| Pembiayaan syariah (akad, margin/ujrah) | Ditunda sampai ada US/AC syariah | Grooming v1 N-02 |
| Kredit valas (kurs, konversi) | Rilis pertama hanya IDR | Grooming v1 N-03 |
| Migrasi data LOS OS11 | Rilis pertama tanpa migrasi | Tech ref TO-05, grooming v3 |
| Aplikasi iOS dan mode offline penuh di mobile | Android saja, wajib online | Grooming v1 E-16 |
| Pelaporan ke PPATK | Di luar Cikal | Tech ref 10.4 (M16) |
| Pemetaan format penyedia lewat UI | Penyedia baru berarti adapter baru | Tech ref IN-13 |
| SaaS banyak bank | On-premise lebih dulu; arsitektur tetap mendukung banyak company per instalasi | Grooming v2 N-02 |

## 1.3 Pengguna

| Role (seed) | Jumlah per tenant (asumsi) | Kanal |
|---|---|---|
| Sales | Terbanyak; puluhan sampai ratusan | Web, mobile (M01) |
| Verifikator, Supervisor, Risk Manager | Puluhan | Web |
| Approver, Kepala Cabang | Satu sampai tiga per cabang | Web |
| Admin Operasional, Customer Service, Surveyor | Beberapa per cabang | Web, mobile (Surveyor) |
| Maker, Checker, Admin Sistem, Super User | Beberapa per tenant | Web |
| Auditor, Compliance Officer | Beberapa per tenant | Web |
| Tim IT mitra | Per mitra | API (M02) |
| Nasabah | Tidak login; menerima email | Email |

Beban rancangan: 50 pengguna bersamaan dan 10.000 pengajuan per bulan per tenant (`08-non-functional-requirements.md`).

## 1.4 Alur bisnis (pseudocode)

```text
SALES (web atau mobile)
  buat pengajuan -> isi Application, Personal, [Spouse], Occupation, [Business], [Collateral], Document, Emergency Contact
  Save as Draft -> Loan ID terbentuk (ddMMyyyy + kode produk + 7 digit)
  Submit -> versi rute, rumus, dan parameter berkunci dikunci di ProcessInstance

ORCHESTRATOR, untuk setiap langkah aktif di versi rute (urutan tetap, tech ref 6.3):
  SURVEY            -> tugas Surveyor (KPR: CS bayar appraisal dulu)
  DEDUP             -> MATCH: lewati DUKCAPIL; REVIEW: tugas Verifikator
  DUKCAPIL          -> REVIEW: Verifikator, lalu Supervisor bila diteruskan; FAILED: selesai ditolak
  NAME_SCREENING    -> hit: tugas Compliance Officer; dikonfirmasi: selesai ditolak
  VERIFICATION      -> Verifikator; ada Not Match: kembali ke Draft
  FRAUD             -> SUSPICIOUS: tugas Verifikator; HIGH: selesai ditolak + blacklist
  RAC, SCORING      -> otomatis dari model aktif
  CREDIT_BUREAU     -> API, atau tugas unggah iDeb (mode MANUAL)
  DECISION          -> NOTGO: status RECONTEST (antrean Risk Manager)
  SIKP              -> hanya bila limit > SIKP_MIN_LIMIT; NOTGO: RECONTEST
  APPROVAL          -> auto approve bila limit <= limitAutoApproval; selain itu berjenjang per level
                       struktur kredit dan jadwal angsuran dibentuk; SP3K untuk KPR
  EPOLIS            -> IJK dari rumus; polis diterbitkan
  VALIDITY_CHECK    -> tanggal cair >= H+1 dan >= tanggal e-polis
  PRINT_AKAD        -> PDF akad dengan nomor kontrak
  DISBURSEMENT      -> data pencairan dikirim lewat adapter core
  WAIT_CORE         -> SUKSES: DISBURSED; GAGAL: RECONTEST
  langkah otomatis gagal teknis -> ERROR, Admin Operasional Retry atau Finish

RISK MANAGER: RECONTEST -> proses baru (maks RECONTEST_MAX) atau Finish (ditolak, email ke nasabah)
NASABAH: email saat diterima, ditolak, dan dicairkan
```

## 1.5 Asumsi dan batasan

1. Dokumen BA terbaru (commit `15e4791`) berlaku bila berbeda dengan grooming v1/v2 (grooming v3).
2. Deployment pertama on-premise di server satu client; satu instalasi bisa berisi beberapa company milik client yang sama (TN-04).
3. Infrastruktur client belum diketahui (grooming v2 E-11). Spec ini mengasumsikan VM Linux dengan Docker dan PostgreSQL 17; bila bank mewajibkan database atau OS lain, `04-tech-stack.md` dibuka kembali.
4. Arsitektur adalah satu modular monolith, menyimpang dari default BA TO-02 (bertanda [Usulan]); alasan tertulis ada di `02-system-architecture.md` bagian 2.2.
5. Setiap integrasi pihak ketiga punya adapter asli dan adapter simulasi; penyedia nyata untuk client pertama belum ditetapkan (TO-16).
6. Rumus perhitungan yang tidak tertulis di dokumen OS11 tidak di-hard code (tech ref 9.7); rumus default dari tech ref 11.12 dipakai sampai ditinjau bisnis kredit (TO-12).
7. Format nomor dokumen (SP3K, kontrak) bisa dikonfigurasi (grooming v3 DN-01 s.d. DN-10). Token validasi pencairan belum dijelaskan BA dan tidak dibangun sampai ada jawaban.
8. Loan ID tanpa kode company bisa sama di dua company dalam satu instalasi; risiko diterima untuk on-premise satu client (grooming v3).
9. Persetujuan nasabah dicatat tetapi tidak ditegakkan sampai keputusan legal (`REQUIRE_CONSENT_FOR_EXTERNAL_CHECK` = Tidak, TO-15).
10. Menu editor rumus, konfigurasi integrasi, dan M16 belum punya US/AC; dibangun mengikuti aturan BA (TO-11, TO-14, TO-18) dan AC ditambahkan saat BA menulisnya.
