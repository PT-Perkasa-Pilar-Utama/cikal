# Grooming Cikal: Pembaruan BA 2026-10-21 (v2)

**Versi:** 2  
**Tanggal:** 2026-10-21  
**Sumber:** commit `607f19e`, `072a8b6`, `b2cb951`: `Docs/cikal-to-be-concept.md`, `Docs/cikal-tech-reference.md`, `Docs/ba/data-dictionary.md`, `Docs/ba/glossary.md`, `Docs/ba/data-lineage.md`, `Docs/ba/us-ac.md`, `Docs/ba/Doc_BA_Cikal_Versi 1.xlsx`  
**BA:** Fahrudin  
**Mode:** Blast (daftar pertanyaan untuk sesi refinement)  
**Status:** Dijawab untuk POC 2026-10-21 (lihat "Keputusan POC"); jawaban untuk Rilis 1 masih terbuka  
**Diganti sebagian:** `grooming-cikal-ba-v3.md` (2026-10-21). Bila keputusan di dokumen ini berbeda dengan dokumen BA commit 15e4791, dokumen BA yang berlaku; lihat tabel "Keputusan v1 dan v2 yang diganti" di v3.  
**Dokumen sebelumnya:** `grooming-cikal-ba-v1.md` (dijawab 2026-10-21)  

## Jawaban stakeholder 2026-10-21

Jawaban atas pesan di `pertanyaan-stakeholder-v2.md`.

| Pesan | Jawaban | Dicatat sebagai | Dampak |
|---|---|---|---|
| 1. Product Owner / Sales | "On-Premise first" | N-02: deployment pertama on-premise. Nama client dan paket modul (I-01) belum dijawab. | Pekerjaan on-premise masuk Rilis 1: lisensi bertanda tangan, paket instalasi dan upgrade, integrasi milik client. Lihat N-01, N-02, N-03, S-02. |
| 2. BA | "Tidak perlu dulu" | Pertanyaan E-01 dan E-02 tidak dikirim sekarang. | Usulan default E-01 dan E-02 dipakai sebagai asumsi kerja dan wajib diverifikasi sebelum UAT. |
| 3. Tim core FAST | "Tidak perlu konek ke tim core FAST", diklarifikasi: Cikal tidak terhubung ke core FAST di Rilis 1 | File pencairan (US-79) dan respons core (US-80) keluar dari Rilis 1. | Pencairan dilakukan di luar Cikal. Validity Check dan Print Akad tetap. Cara pengajuan berakhir di Rilis 1: lihat N-05. |
| 4. Pemilik kontrak Oksara | "Saya ada credential Oksara" | I-02: credential Oksara tersedia. | Data wilayah dan OCR bisa diuji dengan layanan asli. Untuk on-premise, server client butuh akses keluar ke API Oksara. Credential disimpan di penyimpanan rahasia, tidak di dokumen atau chat. |
| 5. Tim KUR | Belum dikirim atau belum dijawab | E-04 tetap terbuka | Tidak memblokir; dibutuhkan sebelum Rilis 3. |


## Keputusan POC 2026-10-21

Product Owner memutuskan Cikal dimulai dengan POC, dan semua pertanyaan v2 yang masih terbuka dijawab dengan rekomendasi engineering (ditandai "POC: sesuai rekomendasi"). Keputusan ini berlaku untuk POC. Sebelum Rilis 1, butir di "Wajib dijawab sebelum Rilis 1" harus dijawab oleh pemiliknya.

### Tujuan

Membuktikan risiko terbesar Cikal dengan biaya kecil, sebelum Rilis 1 diestimasi:

1. Rute modul per produk bisa mengganti BPT tanpa workflow engine berat.
2. Aturan bisnis (rute, scoring) bisa diubah lewat layar dengan checker-maker, tanpa perubahan kode.
3. Satu codebase bisa dipaketkan per lisensi dan dipasang on-premise.
4. Developer junior sampai middle bisa menambah modul tanpa memahami seluruh sistem.

### Ruang lingkup

Satu company, web, produk KTA, IDR, satu instalasi on-premise di VM Linux milik PPU. Lisensi POC: CORE, M06 Dedup, M07 Dukcapil, M08 Fraud, M09 Scoring & RAC, M10 SLIK, M11 Decision Engine, M15 Pencairan. M14 E-Polis sengaja tidak dilisensikan agar langkah yang dilewati karena lisensi ikut terbukti.

| Area | Masuk POC | Story | Batasan POC |
|---|---|---|---|
| Login | Ya | US-01, US-06 | User, role, dan hak akses hasil seed. Tanpa reset password, ganti password, verifikasi dua langkah, dan SSO. |
| Hak akses | Ya | US-09 (efek di layar dan API) | Konfigurasi hasil seed; layar Role Access tidak dibuat. |
| Checker-maker generik | Ya | US-12 | Dipakai untuk produk, rute produk, dan model scoring. Revise (US-13) tidak dibuat. |
| Audit trail | Ya | US-14 | Mencatat keputusan checker-maker dan aksi pengajuan; layar cari sederhana. |
| Produk dan harga | Ya | US-20, US-97 | Satu produk KTA, satu periode suku bunga, biaya admin dan provisi. |
| Rute produk | Ya | US-31 | Versi rute, modul nyala/mati, modul wajib, tampilan daftar (tanpa diagram). |
| Lisensi | Ya | US-100 | Alat command line penerbit lisensi, pemeriksaan tanda tangan, menu dan langkah tak berlisensi disembunyikan atau dilewati. |
| Data wilayah | Ya | US-23 | Sinkronisasi asli dari Oksara. |
| Pengajuan web | Ya | US-39, US-40, US-44, US-47, US-48, US-49, US-50 | Hanya KTP; field wajib minimal sesuai data dictionary; dokumen disimpan tanpa konversi PDF. |
| Orchestrator dan antrean | Ya | US-58, US-85, US-86 | Assign to Me, timeline langkah, Error dan Retry. |
| Dedup, Dukcapil, Fraud, SLIK | Ya | US-59, US-61, US-65, US-68 | Dukcapil dan SLIK memakai adapter mock. Data uji disusun agar hasil Review tidak muncul; bila muncul, langkah berstatus Error "Manual review is not available in POC". |
| Verifikasi dokumen | Ya | US-64 | Match dan Not Match. |
| RAC, scoring, keputusan | Ya | US-36 (hanya hasil seed), US-37, US-67, US-69 | Satu model scoring dan satu model RAC; kriteria bisa diubah lewat layar. Decision Matrix hasil seed. NotGo berhenti di status RECONTEST tanpa layar Recontest. |
| Approval | Ya | US-72, US-73 (Reject saja), US-74 | Satu level approval hasil seed; auto approval aktif. |
| Pasca-approval | Ya | US-76, US-77, US-101 | Validity Check tanpa tanggal e-polis; Print Akad dari template hasil seed; Record Disbursement. |
| Perhitungan angsuran | Ya | Bagian dari US-72 | Flat dan Effective sebagai layanan; layar simulasi (US-51) tidak dibuat. |
| Inquiry dan detail | Ya | US-83, US-84 | Cari dan filter dasar; tab Detail, Personal, Occupation, Document, Approval, History. |

**Di luar POC:** SSO, reset dan ganti password, layar manajemen user, role, dan menu; multi-company; mata uang; layar general parameter, checklist, setup approval, asuransi, parameter sistem, template (semuanya hasil seed); impor dan ekspor; diagram rute; layar Dedup, Dukcapil, dan Fraud Matrix; Prescreen Dedup, Dukcapil, Fraud; Recontest; Return; E-Polis; notifikasi email (hanya NotificationLog); dashboard; mobile; API mitra; upload massal; OCR; survey dan appraisal; pensiun; KUR; menu simulasi (mock diatur lewat konfigurasi).

### Kriteria sukses

POC dinyatakan berhasil bila semua kriteria berikut terbukti di instalasi POC, didemokan ke Product Owner dan BA.

| ID | Kriteria |
|---|---|
| K-01 | Orang yang tidak ikut membangun memasang paket POC di VM Linux bersih mengikuti panduan dalam 2 jam atau kurang. |
| K-02 | Satu pengajuan KTA berjalan dari draft sampai status Disbursed melewati semua langkah rute, dengan timeline berisi waktu, pelaku, dan hasil setiap langkah. |
| K-03 | Maker mematikan modul Fraud di rute KTA dan Checker menyetujui: pengajuan baru melewati Fraud dengan status "Skipped - not in route", pengajuan yang sudah berjalan tetap memakai versi rute lama. |
| K-04 | Dengan lisensi tanpa M14, menu E-Polis tidak tampil dan langkah Epolis berstatus "Skipped - not licensed". File lisensi yang diubah ditolak. |
| K-05 | Mengubah satu kriteria scoring lewat layar (dengan checker-maker) mengubah hasil scoring pengajuan berikutnya tanpa perubahan kode. |
| K-06 | Adapter Dukcapil mock dibuat gagal: langkah berstatus Error di Process Monitoring; Retry setelah pulih melanjutkan proses tanpa langkah ganda. |
| K-07 | Data wilayah tersinkron dari Oksara dan dipakai dropdown alamat berjenjang. |
| K-08 | Developer yang tidak ikut membangun menambah satu modul langkah baru (contoh: langkah dummy) mengikuti panduan dalam 2 hari kerja atau kurang. |

### Rekomendasi stack untuk POC

Keputusan akhir ditulis sebagai ADR di technical spec (referensi teknis TO-01); POC memakai pilihan berikut agar bisa mulai.

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Bahasa | TypeScript di backend dan frontend | Satu bahasa untuk web dan mobile kelak; populer dan efektif dengan AI coding assistant (alasan rebuild di konsep TO-BE). |
| Backend | NestJS, satu aplikasi dengan satu modul NestJS per modul Cikal (CORE, M06, dan seterusnya) | Sistem modul bawaan cocok untuk modular monolith (N-01); paket per lisensi dirakit dengan menyertakan modul berlisensi saja. |
| Frontend | React dengan Vite, komponen dari `design-system.md` | Ringan dan banyak dipakai. |
| Database | PostgreSQL | Tanpa biaya lisensi untuk on-premise; diganti bila bank mewajibkan database lain (E-11). |
| Paket instalasi | Docker Compose | Satu perintah instalasi di server client; dasar untuk paket Rilis 1. |
| Dokumen | Template .docx dengan placeholder, dikonversi ke PDF dengan LibreOffice tanpa layar | Sesuai DC-03; template akad AS-IS bisa dipakai ulang. |

Alternatif yang layak: Java dengan Spring Boot (Spring Modulith) bila bank client mewajibkan platform JVM. Lebih umum di perbankan, tetapi lebih berat untuk developer junior.

### Timebox

Enam minggu sebagai titik awal; disesuaikan setelah ukuran tim diketahui saat POC dipecah menjadi task.

### Wajib dijawab sebelum Rilis 1

Keputusan POC tidak menggantikan jawaban berikut.

| ID | Hal | Pemilik |
|---|---|---|
| E-11, E-12, E-13 | Infrastruktur, instalasi, dan akses integrasi client (pesan 6) | Tim IT client |
| I-01 | Nama client pertama dan paket modulnya | Product Owner / Sales |
| N-01, R-00 | Status AP-02 dan AP-03; kedudukan dokumen grooming terhadap xlsx | BA |
| E-01, E-02 | Rumus struktur kredit; penomoran dokumen dan token pencairan (pesan 2) | BA |
| R-05, R-19 | Model premi IJK dan model harga | BA |
| E-04, v1 E-21 | Aturan dan kewajiban SIKP (pesan 5) | Tim KUR |

## Cara memakai dokumen ini

Format sama dengan v1: setiap pertanyaan memuat Pertanyaan, Kenapa penting, Rekomendasi, dan Jawaban BA. Prioritas P0 memblokir estimasi, P1 mengubah ukuran pekerjaan secara signifikan, P2 bisa ditutup saat sprint planning. Rujukan "v1 X-NN" menunjuk pertanyaan di dokumen grooming v1.

Dokumen ini tidak mengulang pertanyaan v1. Isinya: (1) butir v1 yang tertutup oleh dokumen baru, (2) pertentangan antara dokumen baru dan keputusan v1, (3) pertanyaan baru dari isi dokumen baru.

## Apa yang berubah di repo

| Commit | Isi | Dampak ke grooming |
|---|---|---|
| `607f19e` | Catatan AI dihapus dari `us-ac.md` dan sheet Product Overview; komentar BA Approval diganti | Tidak ada perubahan isi US, AC, MRTM, maupun Asumsi. Keputusan v1 belum masuk Doc BA. |
| `072a8b6` | `cikal-to-be-concept.md` (konsep TO-BE, aturan rute R-01 s.d. R-09) dan `cikal-tech-reference.md` (katalog modul CORE dan M01 s.d. M15, lisensi, orchestrator, NFR) | Menutup referensi R-xx yang hilang di v1. Memperkenalkan model bisnis baru: modul dijual terpisah, SaaS dan on-premise. |
| `b2cb951` | `data-dictionary.md` (entity dan field per modul), `glossary.md`, `data-lineage.md` | Menutup sebagian besar permintaan Field Dictionary (v1 T-01). Mengulang beberapa aturan lama yang sudah diubah v1. |

Hal penting: `cikal-tech-reference.md` bagian 0 menetapkan urutan acuan **Doc BA xlsx (beserta jawaban kuesioner asumsi) > referensi teknis > dokumen OS11**. Keputusan v1 hanya tercatat di dokumen grooming, sehingga menurut urutan itu keputusan v1 belum berlaku. Lihat R-00.

## Ringkasan: 10 hal yang harus tertutup sebelum estimasi

| # | ID | Topik |
|---|---|---|
| 1 | R-00 | Kedudukan keputusan v1 terhadap dokumen BA baru |
| 2 | N-01 | Modul tambahan wajib bisa dipasang terpisah (AP-02, AP-03) tidak ditandai [Usulan] |
| 3 | I-01 | Modul apa yang dibeli client pertama (ruang lingkup Rilis 1) |
| 4 | N-02 | On-premise masuk Rilis 1 atau tidak |
| 5 | E-01 | Rumus struktur kredit dan nilai cair bersih (DD-01) |
| 6 | R-19 | Suku bunga per periode (SubProduct) atau per rentang tenor (v1 US-97) |
| 7 | R-05 | Rumus premi IJK: tabel usia x tenor (data dictionary) atau tarif per produk (v1) |
| 8 | S-01 | Layar baru tanpa desain Figma (editor rute, ChangeRequest generik, konsol lisensi) |
| 9 | E-11 | Infrastruktur client on-premise (ditambahkan setelah jawaban stakeholder) |
| 10 | N-05 | Pengajuan berakhir di mana tanpa koneksi core FAST. **Tertutup:** pencatatan hasil pencairan manual (US-101). |

---

## Bagian 1: Status tindak lanjut v1

| v1 | Tindakan | Status setelah pembaruan | Bukti |
|---|---|---|---|
| T-01 | Field Dictionary | **Sebagian tertutup.** Field per section ada untuk Personal, Occupation, Business, Collateral, LKN, Appraisal. Masih ada 23 penanda [Konfirmasi] (lihat E-10). | `data-dictionary.md` |
| E-11 | Cara skor Dukcapil dihitung | **Tertutup.** Layanan Dukcapil mengembalikan Status dan Score per field; Cikal menerapkan bobot dan ambang. Spike tidak lagi wajib sebelum estimasi. | Referensi teknis bagian 10 |
| E-20 | Penyedia SSO | **Sebagian tertutup.** AS-IS memakai Keycloak (OIDC), konfigurasi IdP per tenant. Aturan penautan berdasarkan domain (v1) belum tercermin. | Referensi teknis bagian 10, Company.ssoConfig |
| E-17, E-29 | Retensi audit | **Sebagian tertutup.** Usulan audit log 5 tahun. Retensi data pengajuan dan dokumen masih terbuka (DD-07). | Referensi teknis bagian 13 |
| E-01 | Hosting | **Sebagian tertutup.** SaaS dikelola PPU dan on-premise di server client. Lokasi data (data residency) masih terbuka. Lihat N-02. | Referensi teknis bagian 1, 14 |
| E-24 | Angka non-fungsional | **Bertentangan dengan default v1.** Lihat R-08. | Referensi teknis bagian 13 |
| E-27 | Sumber data wilayah | **Terjawab, bertentangan dengan keputusan v1.** Sumbernya API Oksara. Lihat R-06. | Data dictionary, referensi teknis bagian 10 |
| E-28 | Template dan placeholder | **Masih terbuka.** DC-05 menyebut katalog placeholder ada di data dictionary, tetapi data dictionary belum memuatnya. | DC-05 |
| I-02 | Status akses layanan eksternal | **Sebagian.** Kontrak AS-IS dirangkum; status perjanjian dan sandbox belum. Oksara (OCR dan wilayah) dan Keycloak menambah daftar. | Referensi teknis bagian 10 |
| E-10, E-13, E-21, V-04 | Contoh jadwal core, isi awal matrix, kewajiban SIKP, baseline metrik | Masih terbuka. | |
| Konsep O-01 s.d. O-06 | Hal belum diputuskan di `cikal-to-be-concept.md` | O-03 (migrasi), O-04 (integrasi mock), O-05 (mobile), O-06 (cara kirim core) sudah dijawab v1 tetapi dokumen konsep masih menulis "belum diputuskan". | Lihat R-15 |

---

## Bagian 2: Rekonsiliasi dokumen baru dengan keputusan v1

Setiap baris adalah pertanyaan: dokumen baru dan keputusan v1 berbeda, mana yang berlaku. Kolom Rekomendasi adalah usulan engineering.

### R-00 (P0) Kedudukan keputusan v1
**Pertanyaan:** Keputusan v1 (58 jawaban) belum masuk xlsx, dan dokumen baru menulis ulang aturan lama untuk beberapa topik. Apakah keputusan v1 tetap berlaku, dan kapan BA memasukkannya ke xlsx serta tiga dokumen baru?  
**Kenapa penting:** Referensi teknis menyatakan xlsx adalah acuan tertinggi. Selama xlsx belum berubah, engineer yang membaca dokumen resmi akan membangun aturan lama (format Loan ID, fraud berdasarkan nama, SLIK tiga kelompok), sementara grooming sudah memutuskan lain.  
**Rekomendasi:** Keputusan v1 tetap berlaku, kecuali butir yang direvisi di tabel bawah. Tambahkan dokumen grooming v1 dan v2 ke urutan acuan di bagian 0 referensi teknis, di atas referensi teknis, sampai BA memasukkan isinya ke xlsx. Alternatifnya, keputusan v1 tidak punya dasar resmi dan bisa dibatalkan diam-diam.  
**Jawaban BA:** POC: sesuai rekomendasi.

### Tabel pertentangan

| ID | Topik | Keputusan v1 | Dokumen baru | Rekomendasi | Jawaban BA |
|---|---|---|---|---|---|
| R-01 (P0) | Format Loan ID | ddMMyyyy + kode company + kode produk + counter (v1 E-03) | ddMMyyyy + kode produk + counter (ref. teknis 11.1, glossary, lineage, LoanIdCounter tanpa company) | Pertahankan v1. Username di data dictionary "unik per instalasi" menegaskan instalasi berisi banyak company, jadi Loan ID juga harus unik per instalasi. | POC: sesuai rekomendasi |
| R-02 (P0) | Fraud check | Frekuensi per NIK, tanpa blacklist otomatis; cek IP Not applicable (v1 V-01, V-02) | Frekuensi per nama, IP VPN/lokasi, blacklist otomatis (ref. teknis 11.4, glossary, lineage, FraudMatrix.nameCondition/ipCondition, FraudSetting.maxApplicationsPerNamePerDay, Blacklist.ipAddress) | Pertahankan v1. Ganti `nameCondition` menjadi kondisi frekuensi NIK, `maxApplicationsPerNamePerDay` menjadi `maxApplicationsPerNikPerDay`; `ipCondition` dan `Blacklist.ipAddress` disimpan tetapi tidak dipakai sampai ada channel self-service. | POC: sesuai rekomendasi |
| R-03 (P1) | SLIK | Lima kelas OJK, kolektibilitas terburuk dari semua fasilitas (v1 E-08) | Good, Fair, Poor (ref. teknis 11.6, SlikResult.quality) | Pertahankan v1: `collectibility` 1 s.d. 5 disimpan dan dipakai Decision Matrix. Kolom `quality` dihapus atau diisi lima nilai OJK. | POC: sesuai rekomendasi |
| R-04 (P1) | Data identitas kosong di Dedup dan Dukcapil | Hasil Review (v1 T-02) | Hasil Skip (ref. teknis 11.2, 11.3, DukcapilResult.outcome) | Pertahankan v1. Skip hanya untuk modul yang dimatikan di rute atau tidak berlisensi. | POC: sesuai rekomendasi |
| R-05 (P0) | Rumus premi IJK | Dihitung otomatis = plafon x tarif premi produk, read-only (v1 E-18) | Tabel tarif per usia debitur x tahun tenor (InsuranceRate.age, tenorYear); lineage "usia x tenor x plafon"; DD-02 masih membuka opsi input petugas | **Revisi v1:** ikuti model tabel BA. IJK = plafon x tarif dari tabel (usia saat pengajuan, tahun tenor dibulatkan ke atas), dihitung sistem dan read-only. AC-29.01 diganti agar Maker mengisi tarif per usia dan tahun tenor; contoh draft AC-75.01 (0,85%) tetap sebagai hasil lookup. | POC: sesuai rekomendasi |
| R-06 (P1) | Data wilayah | Unggah file resmi; API ditunda (v1 E-27, karena saat itu sumber API tidak diketahui) | Sinkronisasi API Oksara, job terjadwal dan tombol manual | **Revisi v1:** pakai Oksara sesuai US-23 asli. Draft v1 untuk AC-23.01 dan AC-23.02 dibatalkan; AC asli dipakai. Syarat: kontrak dan API key Oksara masuk daftar I-02. | POC: sesuai rekomendasi |
| R-07 (P1) | Respons core masuk | Rilis 1 unggah manual (v1 I-03) | AS-IS: core memanggil endpoint `ResponseDisburse` dengan file biner (ref. teknis bagian 10) | **Revisi v1:** sediakan endpoint dengan kontrak sama seperti AS-IS, sehingga tim core cukup mengganti URL. Unggah manual tetap ada sebagai cadangan. Draft v1 AC-80.01 s.d. AC-80.05 dipertahankan untuk jalur unggah; tambah satu AC untuk jalur endpoint. | Ditunda: Cikal tidak terhubung ke core FAST di Rilis 1 |
| R-08 (P1) | Angka non-fungsional | 5 bank, 1.000 pengajuan per hari per bank, 300 user bersamaan, RPO 1 jam, RTO 4 jam (v1 A-44) | 50 user bersamaan dan 10.000 pengajuan per bulan per tenant, ketersediaan 99,5% per bulan, backup harian simpan 30 hari | Pakai angka referensi teknis untuk volume dan ketersediaan. Pertahankan RPO 1 jam dari v1: backup harian berarti data satu hari kerja bisa hilang, termasuk pengajuan yang sudah disetujui. Butuh backup berkelanjutan (point-in-time). | POC: sesuai rekomendasi |
| R-09 (P2) | Retensi audit | Menunggu tim kepatuhan (v1 E-17, E-29) | 5 tahun (usulan) | Pakai 5 tahun sebagai default sampai kepatuhan bank memberi angka. Retensi data pengajuan tetap terbuka (DD-07). | POC: sesuai rekomendasi |
| R-10 (P2) | Format penyamaran NIK | `327301********01` (draft v1 AC-82.05) | `3273********0001` (ref. teknis bagian 13) | Ikuti referensi teknis; perbaiki draft AC-82.05. | POC: sesuai rekomendasi |
| R-11 (P1) | Siapa boleh mengambil tugas | Berdasarkan hak akses menu, bukan nama role (v1 E-05, A-32) | `HumanTask.eligibleRoleId`, TQ-01 "role yang berhak" | Pertahankan v1. Ganti `eligibleRoleId` dengan kode menu antrean; user boleh mengambil tugas bila punya hak Update pada menu antrean itu dan unit kerjanya cocok. | POC: sesuai rekomendasi |
| R-12 (P1) | Batas tenor core | Per produk core, divalidasi saat produk disimpan (v1 E-19) | `CORE_MAX_TENOR_MONTHS` = 24 berlaku global | Tanyakan ke tim core apakah batas 24 bulan berlaku untuk semua produk. Bila global, produk KTA 60 bulan (AC-20.01, TRM_APP) tidak bisa dicairkan sama sekali; contoh produk harus diturunkan ke 24 atau batas core per produk. Rekomendasi tetap per produk core, divalidasi saat produk disimpan. | Ditunda: Cikal tidak terhubung ke core FAST di Rilis 1 |
| R-13 (P1) | Nilai tetap file core | Konfigurasi per company dan produk (v1 E-19, A-09) | `buss_unit` "LB2", `create_by` "LOS", `obj_code` "HONVAR011" tetap (ref. teknis 11.10, DisbursementFile) | Pertahankan v1. Nilai tetap hanya cocok untuk satu bank; SaaS banyak bank butuh konfigurasi. | Ditunda: Cikal tidak terhubung ke core FAST di Rilis 1 |
| R-14 (P2) | Batas SIKP | Berjalan bila limit > batas (A-19, AC-70.03) | Lineage: "KUR >= batas" | Pakai ">" (A-19 dan referensi teknis 11.8); perbaiki lineage. | POC: sesuai rekomendasi |
| R-15 (P2) | Status hal yang belum diputuskan | Migrasi, integrasi mock, mobile, dan cara kirim core sudah diputuskan (v1 I-01, I-02, A-01, I-03) | Konsep O-03 s.d. O-06 dan referensi teknis TO-05 masih "belum diputuskan"; non-goal konsep menulis migrasi belum diputuskan | Perbarui kedua dokumen sesuai v1. | POC: sesuai rekomendasi |
| R-16 (P2) | Email saat proses dihentikan | Email penolakan juga saat Admin Operasional menghentikan proses (v1 V-03) | Status baru `FINISHED_CANCELLED` dipisah dari `FINISHED_REJECTED` | **Revisi v1:** email penolakan hanya untuk `FINISHED_REJECTED`. `FINISHED_CANCELLED` (pembatalan operasional, misalnya pengajuan ganda) tidak mengirim email. | POC: sesuai rekomendasi |
| R-17 (P2) | Draft mobile | Disimpan sementara di perangkat (terenkripsi) sampai terkirim (v1 E-16) | Draft disimpan di server per section agar bisa dilanjutkan dari perangkat lain [Usulan] | **Revisi v1:** ikuti usulan BA. Setiap section yang selesai disimpan ke server; hanya section yang sedang diisi yang disimpan di perangkat. | POC: sesuai rekomendasi |
| R-18 (P1) | Audit akses data | Akses detail pengajuan dicatat dengan Event Type "Data Access" (v1 E-17, draft AC-84.06) | Daftar `AuditLog.action` tidak memuat aksi akses data | Pertahankan v1; tambah aksi `VIEW_APPLICATION` ke daftar. | POC: sesuai rekomendasi |
| R-19 (P0) | Struktur harga | US-97 baru: suku bunga per rentang tenor, rentang yang boleh diubah Approver (v1 E-07) | `SubProduct`: suku bunga per periode berlaku (validFrom, validTo); biaya `adminFee`, `provisionFee`, `salesFee` di Product; DD-08 meminta AC SubProduct | **Revisi v1:** ikuti model BA. Suku bunga per periode berlaku (SubProduct), biaya di Product. Rentang suku bunga yang boleh diubah Approver dipertahankan dari v1 sebagai atribut SubProduct. Suku bunga berbeda per tenor hanya bila bisnis menyatakan butuh. Draft AC-97.01 s.d. AC-97.03 ditulis ulang untuk periode, AC-97.04 s.d. AC-97.06 tetap. | POC: sesuai rekomendasi |
| R-20 (P1) | Routing approval | Rentang nominal menentukan level; berjalan dari level terendah naik (v1 E-09, A-37) | ApprovalHierarchy punya `upLevel`, `upSubLevel` (rantai atasan eksplisit), ApprovalLevel punya `isFinalApprover` dan aksi `isCancel` | Lihat E-05. | POC: sesuai rekomendasi |

---

## Bagian 3: Pertanyaan baru

## I: Independent

### I-01 (P0) Modul yang dibeli client pertama
**Pertanyaan:** Siapa client pertama yang memakai Cikal, dan modul apa saja yang ia beli?  
**Kenapa penting:** Rilis 1 v1 (KTA end-to-end) memakai CORE, M06, M07, M08, M09, M10, M11, M14, dan M15. Bila client pertama tidak membeli sebagian modul itu, Rilis 1 menyusut; bila membeli modul lain (misalnya M01 Mobile), Rilis 1 membesar. Tanpa jawaban ini, ruang lingkup Rilis 1 adalah tebakan.  
**Rekomendasi:** Rilis 1 dibangun untuk satu client dengan paket CORE, M06 s.d. M11, M14, M15 seperti keputusan v1. Modul lain menyusul sesuai rilis v1. Alternatifnya, ruang lingkup Rilis 1 harus dihitung ulang setelah kontrak client ditandatangani.  
**Jawaban BA:** Belum dijawab untuk nama client dan paket modul. Deployment pertama on-premise (lihat N-02). POC: paket default dipakai.

### I-02 (P1) Penyedia Oksara dan Keycloak
**Pertanyaan:** Apakah PPU sudah punya kontrak dan API key Oksara (OCR dan data wilayah)? Untuk SaaS, apakah satu akun Oksara milik PPU dipakai semua tenant, atau tiap bank punya akun sendiri? Keycloak AS-IS milik siapa: PPU atau bank?  
**Kenapa penting:** Data wilayah dibutuhkan sejak Rilis 1 (alamat KTP wajib). Satu akun bersama berarti biaya dan kuota ditanggung PPU; akun per bank berarti kunci rahasia disimpan per tenant.  
**Rekomendasi:** SaaS: satu akun Oksara PPU untuk data wilayah (data publik, dipakai bersama), akun per tenant untuk OCR bila biaya per scan ditagihkan ke bank. Keycloak: IdP milik bank, didaftarkan per tenant (sesuai Company.ssoConfig). On-premise: akun milik client.  
**Jawaban BA:** Credential Oksara tersedia. Akun bersama atau per bank tidak relevan untuk Rilis 1 karena on-premise; credential dipasang di instalasi client lewat penyimpanan rahasia. Server client wajib punya akses keluar ke API Oksara.

---

## N: Negotiable

### N-01 (P0) Modul tambahan wajib bisa dipasang dan dicabut terpisah
**Pertanyaan:** AP-02 ("modul tambahan adalah unit deploy sendiri") dan AP-03 ("modul tidak membaca database modul lain, hanya lewat API atau event") tidak ditandai [Usulan], sehingga menurut bagian 0 hanya bisa diubah lewat Doc BA. Bolehkah keduanya ditandai [Usulan] agar tim engineer bisa memilih bentuk teknisnya?  
**Kenapa penting:** Lima belas modul yang masing-masing di-deploy terpisah dan hanya berbicara lewat API atau event berarti belasan layanan, kontrak event berversi, dan transaksi lintas layanan. Ini bertentangan dengan prinsip P-01 dan AP-05 ("sederhana lebih penting dari canggih") dan dengan kriteria sukses "developer junior sampai middle bisa memahami satu modul". Biaya ini terbayar hanya bila ada client on-premise yang tidak boleh menerima kode modul yang tidak dibelinya.  
**Rekomendasi:** Tandai AP-02 dan AP-03 sebagai [Usulan]. Rilis 1 dibangun sebagai satu aplikasi modular (modular monolith): batas modul dijaga di kode dan skema data, akses lintas modul hanya lewat antarmuka modul, hak pakai diperiksa di empat titik LC-04. Pemisahan menjadi unit deploy terpisah dilakukan per modul saat ada kebutuhan on-premise nyata. Alternatifnya, Rilis 1 menanggung biaya infrastruktur dan koordinasi layanan terdistribusi sebelum ada client yang membutuhkannya.  
**Rekomendasi setelah jawaban N-02 (on-premise lebih dulu):** LC-05 ("modul tidak berlisensi tidak dipasang sama sekali") kini berlaku sejak Rilis 1. Tetap satu codebase modular monolith, tetapi paket instalasi dirakit per client: hanya modul berlisensi yang ikut ke dalam paket, ditambah pemeriksaan lisensi bertanda tangan saat aplikasi berjalan. Ini memenuhi LC-05 tanpa memecah sistem menjadi layanan terpisah. AP-02 dan AP-03 tetap perlu ditandai [Usulan].  
**Jawaban BA:** POC: sesuai rekomendasi.

### N-02 (P0) On-premise di Rilis 1
**Pertanyaan:** Apakah ada client on-premise yang harus dilayani di Rilis 1?  
**Kenapa penting:** On-premise menambah lisensi bertanda tangan kriptografis (LC-03), paket instalasi dan upgrade (14.2), pemasangan hanya modul berlisensi (LC-05), dan integrasi milik client. Tidak ada satu pun di US/AC.  
**Rekomendasi:** Rilis 1 hanya SaaS. On-premise menjadi epic terpisah setelah ada kontrak on-premise. Alternatifnya, Rilis 1 bertambah satu epic infrastruktur penuh.  
**Jawaban BA:** On-premise lebih dulu (Product Owner / Sales, 2026-10-21). Rekomendasi "SaaS dulu" tidak dipakai.

### N-03 (P1) Konsol lisensi dan penegakan lisensi di Rilis 1
**Pertanyaan:** Referensi teknis TO-09 mencatat bahwa konsol lisensi internal PPU (terbitkan, ubah, cabut lisensi; validasi ketergantungan modul) belum punya US. Apakah konsol ini dibutuhkan di Rilis 1?  
**Kenapa penting:** Rilis 1 hanya satu company (v1 N-01). Konsol untuk satu tenant tidak memberi nilai, tetapi pemeriksaan hak pakai di menu, API, editor rute, dan orchestrator tetap perlu agar modul lain bisa dijual kemudian tanpa perubahan kode.  
**Rekomendasi:** Rilis 1: data lisensi dan ModuleEntitlement diisi lewat seed; pemeriksaan hak pakai di empat titik LC-04 dibangun. Konsol lisensi menjadi US-99 di Rilis 5 bersama onboarding multi-company (US-15, US-16). Alternatifnya, Rilis 1 bertambah satu layar admin beserta checker-maker-nya.  
**Rekomendasi setelah jawaban N-02 (on-premise lebih dulu):** Seed tidak cukup, karena lisensi on-premise harus berupa file bertanda tangan yang tidak bisa diubah client (LC-03). Rilis 1 memuat alat internal PPU (command line, tanpa layar) untuk menerbitkan file lisensi bertanda tangan, serta pemeriksaan tanda tangan, masa berlaku, dan daftar modul di aplikasi. Konsol lisensi berlayar (US-99) tetap di Rilis 5.  
**Jawaban BA:** POC: sesuai rekomendasi.

### N-04 (P1) Alur untuk client tanpa modul tertentu
**Pertanyaan:** DEP-03 (tanpa M11, langsung ke Approval), DEP-06 (tanpa M14, Epolis dilewati), dan DEP-07 (tanpa M15, proses berakhir di status APPROVED) mengubah alur, tetapi tidak ada AC untuk alur tersebut. Kapan AC-nya ditulis?  
**Kenapa penting:** Setiap kombinasi modul adalah alur yang harus diuji. Tanpa AC, alur itu tidak terbangun atau tidak teruji.  
**Rekomendasi:** Rilis 1 hanya menguji paket lengkap client pertama (I-01). AC untuk DEP-03, DEP-06, dan DEP-07 ditulis saat ada client dengan paket tersebut. Orchestrator tetap mencatat langkah tak berlisensi sebagai `SKIPPED - not licensed` (COM-05) sejak Rilis 1.  
**Jawaban BA:** POC: sesuai rekomendasi.

### N-05 (P0) Pengajuan berakhir di mana tanpa koneksi core FAST
**Pertanyaan:** Rilis 1 tidak terhubung ke core FAST (jawaban Product Owner, 2026-10-21). Setelah Print Akad, apa yang terjadi pada pengajuan? Apakah Admin Operasional mencatat hasil pencairan yang dilakukan di core secara manual, atau proses Cikal berhenti di status APPROVED seperti DEP-07?  
**Kenapa penting:** Tanpa langkah penutup, pengajuan tidak pernah mencapai status DISBURSED. Akibatnya grafik pencairan di dashboard (AC-81.01) kosong, email "telah dicairkan" (TRM_NTF_004) tidak terkirim, tab Disburse di mobile (US-90) kosong, dan pencairan yang gagal di core tidak bisa di-recontest (AC-71.05).  
**Rekomendasi:** Ganti langkah DISBURSEMENT dan WAIT_CORE di Rilis 1 dengan satu langkah manual "Record Disbursement" (usulan US-101). Admin Operasional mencatat hasil dari core: Disbursed (tanggal cair, nomor rekening pinjaman atau CIF dari core) atau Failed (alasan, lalu masuk Recontest). Status, dashboard, email, dan recontest tetap berjalan seperti AC yang ada. Alternatif berhenti di APPROVED lebih sederhana, tetapi dashboard pencairan, email pencairan, dan recontest pencairan gagal hilang dari Rilis 1.  
**Jawaban BA:** Sesuai rekomendasi (Product Owner, 2026-10-21): langkah "Record Disbursement" (US-101) menggantikan DISBURSEMENT dan WAIT_CORE di Rilis 1; Admin Operasional mencatat hasil pencairan secara manual.

---

## V: Valuable

### V-01 (P1) Bukti kebutuhan modularitas
**Pertanyaan:** Apakah sudah ada calon client kedua dengan paket modul berbeda dari client pertama?  
**Kenapa penting:** Model jual per modul adalah alasan utama arsitektur di referensi teknis. Bila semua client dalam 12 bulan pertama membeli paket yang sama, biaya pemisahan modul tidak menghasilkan pendapatan dalam periode itu.  
**Rekomendasi:** Bangun pemeriksaan hak pakai sejak Rilis 1 (murah), tunda pemisahan unit deploy (mahal) sampai ada client kedua dengan paket berbeda. Lihat N-01.  
**Jawaban BA:** POC: sesuai rekomendasi.

---

## E: Estimable

### E-01 (P0) Rumus struktur kredit
**Pertanyaan:** Bagaimana menghitung biaya provisi, nilai cair bersih (`initial_disburs` di file core), dan komponen apa saja yang dipotong dari plafon (biaya admin, provisi, premi IJK, biaya sales)? (DD-01)  
**Kenapa penting:** Struktur kredit dibentuk saat approval (Rilis 1), dikirim ke core, dan dicetak di akad. Rumus yang salah berarti nasabah menerima dana yang salah.  
**Rekomendasi:** Provisi = plafon x persen provisi, dibulatkan ke rupiah terdekat. Nilai cair bersih = plafon dikurangi biaya admin, provisi, dan premi IJK. Biaya sales tidak dipotong dari nasabah. BA mengonfirmasi dengan satu contoh struktur kredit nyata dari OS11 yang dipakai sebagai kasus uji.  
**Jawaban BA:** Pertanyaan ke BA ditunda. Usulan default dipakai sebagai asumsi kerja dan diverifikasi dengan contoh struktur kredit OS11 sebelum UAT.

### E-02 (P1) Penomoran dan token dokumen
**Pertanyaan:** Bagaimana format nomor SP3K (reset bulanan, OT-03), nomor kontrak (`Disbursement.contractNumber`), dan token validasi pencairan (`Disbursement.tokenNumber`, `tokenExpiredAt`)? Token itu diterbitkan siapa dan dipakai untuk apa?  
**Kenapa penting:** Ketiganya muncul di data dictionary tetapi tidak di AC. Token dengan masa berlaku menyiratkan alur verifikasi yang belum dijelaskan sama sekali.  
**Rekomendasi:** BA menyerahkan format nomor dari OS11 dan Cikal mengikutinya, dengan kode company di nomor agar unik antar tenant. Token: bila di AS-IS dipakai mencocokkan validasi dengan core, pertahankan; bila tidak ada pemakai, hapus. Tambah AC di US-72 (SP3K), US-76 (token), US-77 (nomor kontrak).  
**Jawaban BA:** Pertanyaan ke BA ditunda. Nomor dokumen memakai format sementara dengan kode company; token validasi pencairan tidak dibangun sampai ada penjelasan. Diverifikasi sebelum UAT.

### E-03 (P1) Respons core dengan hasil campuran
**Pertanyaan:** File respons core berisi beberapa jenis baris per pengajuan (LIMIT-INDUK, LIMIT-ANAK, LINK-JAMINAN, DETAIL-JAMINAN, PEMBIAYAAN), masing-masing SUKSES atau GAGAL. Bila sebagian SUKSES dan sebagian GAGAL, apa status pengajuan?  
**Kenapa penting:** AC-80.01 dan AC-80.02 hanya mengenal satu hasil per pengajuan. Pencairan yang sebagian tercatat di core lalu di-recontest bisa membuat limit ganda.  
**Rekomendasi:** Pengajuan DISBURSED hanya bila baris PEMBIAYAAN SUKSES. Bila PEMBIAYAAN GAGAL, pengajuan masuk Recontest dan baris lain yang SUKSES ditampilkan ke Admin Operasional sebagai peringatan "Partial core records exist; coordinate with core team". BA mengonfirmasi dengan tim core.  
**Jawaban BA:** Ditunda: Cikal tidak terhubung ke core FAST di Rilis 1 (Product Owner, 2026-10-21). Pertanyaan ini kembali saat integrasi core masuk rencana.

### E-04 (P1) Arti kode respons SIKP
**Pertanyaan:** SIKP mengembalikan kode 07 (Data Not Found), 12 (Data Found), dan 15 (Data Found on Another Institution) serta DaysRemaining. Bagaimana pemetaan kode dan DaysRemaining ke GO/NOTGO?  
**Kenapa penting:** AC-70.01 dan AC-70.02 hanya memakai DaysRemaining. Kode 12 (KUR di bank sendiri) tidak punya aturan.  
**Rekomendasi:** 07 = GO; 15 dengan DaysRemaining > 0 = NOTGO; 15 dengan DaysRemaining 0 = GO; 12 = NOTGO dengan pesan "Active KUR found in this bank". Masuk Rilis 3 bersama produk KUR.  
**Jawaban BA:** POC: sesuai rekomendasi.

### E-05 (P1) Routing approval: rentang nominal atau rantai atasan
**Pertanyaan:** Data dictionary memuat dua mekanisme routing: rentang nominal per level (ApprovalLevel) dan rantai atasan eksplisit (`upLevel`, `upSubLevel` di ApprovalHierarchy), ditambah penanda `isFinalApprover` dan aksi `isCancel`. Mekanisme mana yang menentukan urutan approver? Apa arti aksi Cancel?  
**Kenapa penting:** Dua mekanisme untuk satu keputusan bisa saling bertentangan, dan Cancel tidak muncul di AC mana pun.  
**Rekomendasi:** Urutan ditentukan rentang nominal dan nomor level (v1 A-37); `upLevel` dan `upSubLevel` tidak dibawa ke Cikal. `isFinalApprover` diturunkan sistem (level yang rentangnya mencakup nominal). Cancel tidak dibawa ke Rilis 1; bila dibutuhkan, artinya pengajuan berakhir `FINISHED_CANCELLED` tanpa email.  
**Jawaban BA:** POC: sesuai rekomendasi.

### E-06 (P1) Jenis identitas selain KTP
**Pertanyaan:** `ApplicationPersonal.idType` mengizinkan KTP, SIM, Paspor, dan KITAS. Untuk SIM, Paspor, atau KITAS, NIK 16 digit tidak ada, sehingga Dedup dan Dukcapil tidak bisa berjalan. Apakah identitas selain KTP diterima di Rilis 1?  
**Kenapa penting:** AC-40.02 mewajibkan 16 digit tanpa melihat jenis identitas. Pemohon WNA dengan KITAS butuh alur verifikasi lain.  
**Rekomendasi:** Rilis 1 hanya KTP (KTA untuk WNI). Jenis lain ditunda dan pilihan ID Type hanya berisi KTP sampai alur verifikasinya dirancang.  
**Jawaban BA:** POC: sesuai rekomendasi.

### E-07 (P1) Flag produk AS-IS
**Pertanyaan:** Apakah `maxAgeAtMaturityMonth` (usia maksimal saat lunas), `scoringApproval`, dan `isPaylater` dibawa ke Cikal? (DD-03)  
**Kenapa penting:** Usia saat lunas adalah aturan kelayakan yang lazim; bila dipakai, AC-40.03 (usia saat pengajuan) tidak cukup.  
**Rekomendasi:** Bawa `maxAgeAtMaturityMonth`: usia pemohon ditambah tenor tidak boleh melebihi batas, divalidasi di step Application dan Personal; tambah AC. Hapus `scoringApproval` dan `isPaylater` kecuali BA menemukan pemakaiannya di OS11.  
**Jawaban BA:** POC: sesuai rekomendasi.

### E-08 (P1) Katalog field scoring
**Pertanyaan:** DD-05 menyebut katalog field scoring disusun bersama tim engineer. Siapa yang memulai dan kapan harus selesai?  
**Kenapa penting:** Model scoring dan RAC hasil seed dibutuhkan di Rilis 1 (increment 1b); pembuat model (US-37) di Rilis 2. Keduanya bergantung pada katalog.  
**Rekomendasi:** Engineering mengusulkan katalog dari entity Application dan turunannya (field bertipe Angka, Uang, Pilihan, Tanggal, plus field turunan Installment to Income Ratio dan usia saat lunas) sebelum increment 1b; BA dan tim risiko menyetujui.  
**Jawaban BA:** POC: sesuai rekomendasi.

### E-09 (P2) Zona waktu
**Pertanyaan:** OT-05 menyimpan waktu dalam UTC dan menampilkan WIB. Apakah semua tenant memakai WIB, termasuk bank di wilayah WITA dan WIT?  
**Kenapa penting:** Batas hari menentukan tanggal di Loan ID, batas frekuensi fraud per hari, aturan H+1 pencairan, dan aging.  
**Rekomendasi:** Zona waktu per tenant, default WIB. Rilis 1 cukup WIB karena satu company.  
**Jawaban BA:** POC: sesuai rekomendasi.

### E-10 (P2) Penanda [Konfirmasi] di data dictionary
**Pertanyaan:** Data dictionary memuat 23 penanda [Konfirmasi]. Setujukah BA bahwa engineering memakai default berikut sampai BA mengoreksi?  
**Kenapa penting:** Setiap penanda adalah field yang tidak pasti wajib atau tidak, atau artinya belum jelas.  
**Rekomendasi:**
- Field yang ditandai [Konfirmasi] tanpa keterangan wajib dibangun sebagai opsional.
- `ApplicationPersonal.mobileNumber` wajib saat submit, karena dipakai file core (`collec_mobphone`) dan AC-48.03 (DD-06).
- `ApplicationEmergencyContact.contactName` wajib saat submit (DD-06).
- `Appraisal.marketValue` dan `liquidationValue` wajib (AC-57.01).
- `ApplicationBusiness.lengthDurationYear/Month` dihitung sistem dari `businessLaunchDate`.
- `DocumentTemplate.productId` dan `InsuranceRate.productId` opsional (kosong = semua produk).
- `CurrencyRate.rate` tidak dibawa (valas ditunda, v1 N-03).
- Rumus LKN turunan (DD-04) ditunda ke Rilis 3.

**Jawaban BA:** POC: sesuai rekomendasi.

### E-11 (P0) Infrastruktur client on-premise
**Pertanyaan (untuk tim IT client):** Di infrastruktur seperti apa Cikal akan dipasang?
1. Sistem operasi server, dan apakah container (Docker atau sejenisnya) diizinkan?
2. Database apa yang diwajibkan atau sudah dilisensi bank (PostgreSQL, Oracle, SQL Server, lainnya)?
3. Apakah server punya akses keluar ke internet untuk Oksara, Dukcapil, SLIK, dan SIKP, atau harus lewat proxy atau jaringan khusus?
4. Siapa yang menjalankan backup, pemantauan, dan ketersediaan tinggi: tim IT client atau PPU?

**Kenapa penting:** Untuk on-premise, pilihan tech stack (referensi teknis TO-01) dibatasi oleh apa yang boleh dipasang di server bank. Database yang diwajibkan bank menentukan pilihan database, dan jaringan tertutup menentukan apakah integrasi asli bisa dipakai.  
**Rekomendasi:** Server Linux dengan container, PostgreSQL, akses keluar lewat proxy bank ke daftar alamat integrasi yang disepakati. Tim IT client menjalankan backup dan pemantauan berdasarkan panduan operasional dari PPU, dengan target pemulihan data maksimal 1 jam (R-08). Alternatifnya, bila bank mewajibkan database atau OS tertentu, keputusan stack mengikuti dan estimasi disesuaikan.  
**Jawaban BA:** POC: sesuai rekomendasi, dipasang di VM Linux milik PPU yang meniru server client (container, PostgreSQL). Wajib dikonfirmasi ke tim IT client sebelum Rilis 1.

### E-12 (P1) Instalasi, upgrade, dan dukungan on-premise
**Pertanyaan (untuk Product Owner dan tim IT client):** Siapa yang memasang dan meng-upgrade Cikal di server client? Apakah PPU mendapat akses jarak jauh? Seberapa sering upgrade boleh dilakukan?  
**Kenapa penting:** Model ini menentukan bentuk paket instalasi, skrip migrasi skema otomatis (14.2), dan cara tim PPU menangani insiden produksi tanpa akses langsung.  
**Rekomendasi:** PPU menyerahkan paket instalasi berversi beserta panduan; tim IT client menjalankan instalasi dan upgrade di jendela perubahan yang disepakati, dengan pendampingan PPU lewat akses jarak jauh sementara. Upgrade terjadwal paling sering sebulan sekali, ditambah perbaikan darurat.  
**Jawaban BA:** POC: sesuai rekomendasi. Instalasi dijalankan tim PPU dari paket berversi mengikuti panduan, untuk membuktikan panduannya bisa dipakai tim IT client.

### E-13 (P1) Integrasi asli di lingkungan client
**Pertanyaan:** Untuk on-premise, integrasi memakai sistem milik client (referensi teknis 14.2). Kapan sandbox atau akses uji Dukcapil, SLIK, asuransi, dan sistem lain milik client tersedia untuk tim PPU?  
**Kenapa penting:** Adapter mock-first (v1 I-02) membuat pengembangan tidak terhambat, tetapi UAT di lingkungan client butuh koneksi asli. Bila akses baru tersedia menjelang UAT, risiko gagal UAT tinggi.  
**Rekomendasi:** Akses uji tiap integrasi diminta sejak kontrak ditandatangani dan menjadi syarat masuk UAT. Oksara memakai credential yang sudah tersedia (I-02).  
**Jawaban BA:** POC: semua integrasi memakai mock kecuali data wilayah Oksara (credential tersedia). Akses integrasi milik client diminta sebelum Rilis 1.

---

## S: Small

### S-01 (P0) Pekerjaan baru yang tersembunyi
**Pertanyaan:** Setujukah BA bahwa pekerjaan berikut masuk backlog sebagai story teknis dan menggunakan kapasitas sprint: pemeriksaan hak pakai modul di empat titik (LC-04), uji otomatis kebocoran data antar tenant (TN-03), retry otomatis langkah eksternal (ER-03), dan desain layar baru yang belum ada di Figma (editor rute, ChangeRequest generik, konsol lisensi)? Siapa yang mendesain layar baru?  
**Kenapa penting:** Referensi teknis menyatakan Figma adalah desain AS-IS. Layar baru Rilis 1 (ChangeRequest generik di increment 1a, editor rute di 1a) tidak punya desain, sehingga front-end akan mendesain sendiri atau menunggu.  
**Rekomendasi:** Ya, sebagai story teknis. Desainer menyelesaikan layar ChangeRequest dan editor rute sebelum increment 1a; bila tidak ada desainer, engineering merakit dari komponen `design-system.md` dan BA menyetujui lewat demo.  
**Jawaban BA:** POC: sesuai rekomendasi.

### S-02 (P1) Penyesuaian rencana rilis
**Pertanyaan:** Setujukah BA dengan perubahan rencana rilis v1 berikut?  
- US-99 Konsol Lisensi masuk Rilis 5 (N-03).
- On-premise menjadi epic terpisah setelah ada kontrak (N-02).
- Pemeriksaan hak pakai dan uji isolasi tenant masuk increment 1a (S-01).
- Endpoint respons core masuk increment 1b bersama unggah manual (R-07).

**Kenapa penting:** Menjaga Rilis 1 tetap satu client, SaaS, KTA end-to-end.  
**Rekomendasi:** Setujui.  
**Rekomendasi setelah jawaban N-02 (on-premise lebih dulu):** Butir kedua diganti; on-premise masuk Rilis 1:
- US-99 Konsol Lisensi tetap di Rilis 5.
- Increment 1a: paket instalasi dirakit per lisensi (hanya modul berlisensi), alat penerbit lisensi bertanda tangan, pemeriksaan lisensi di empat titik LC-04, skrip migrasi skema otomatis, panduan instalasi dan operasional.
- Uji isolasi antar company turun ke P2 untuk Rilis 1, karena satu instalasi on-premise hanya berisi company milik satu client (TN-04).
- Endpoint respons core dan file pencairan: keluar dari Rilis 1 (tanpa koneksi core FAST). Diganti pencatatan hasil pencairan manual (N-05).
- UAT di server client mensyaratkan akses integrasi asli (E-13).

**Jawaban BA:** POC: sesuai rekomendasi.

---

## T: Testable

### T-01 (P1) Pemetaan status ke label UI
**Pertanyaan:** Referensi teknis 6.4 menyebut pemetaan status (`DRAFT`, `ON_PROGRESS`, `RECONTEST`, `APPROVED`, `DISBURSED`, `FINISHED_REJECTED`, `FINISHED_CANCELLED`) ke label UI ditetapkan di data dictionary, tetapi data dictionary tidak memuatnya. Bagaimana pemetaannya untuk kartu dashboard (Save as Draft, Submitted, GO, NOT GO) dan tab mobile (Draft, On Progress, Disburse)?  
**Kenapa penting:** GO dan NOT GO adalah hasil keputusan, bukan status pengajuan. Tanpa pemetaan, AC-81.01 dan AC-90.01 tidak bisa diuji.  
**Rekomendasi:**

| Label | Status dan kondisi |
|---|---|
| Save as Draft | `DRAFT` |
| Submitted | `ON_PROGRESS` sebelum langkah Decision selesai |
| GO | `ON_PROGRESS` setelah Decision GO, `APPROVED`, `DISBURSED` |
| NOT GO | `RECONTEST`, `FINISHED_REJECTED` |
| Tab mobile Draft | `DRAFT` |
| Tab mobile On Progress | `ON_PROGRESS`, `RECONTEST`, `APPROVED` |
| Tab mobile Disburse | `DISBURSED` |

`FINISHED_CANCELLED` tidak dihitung di kartu dashboard.  
**Jawaban BA:** POC: sesuai rekomendasi.

### T-02 (P1) Dokumen opsional di checklist
**Pertanyaan:** `DocumentChecklistItem.isMandatory` memungkinkan dokumen opsional. Apakah dokumen opsional ikut dihitung di "1 of 7 documents" (AC-47.01) dan di syarat submit (AC-50.02)?  
**Kenapa penting:** AC yang ada mengasumsikan semua dokumen di checklist wajib.  
**Rekomendasi:** Penghitung dan syarat submit hanya menghitung dokumen wajib; dokumen opsional tampil dengan label "Optional". Tambah AC-47.06 dan ubah AC-50.02 menjadi "Please upload all required documents (5 of 7 required)".  
**Jawaban BA:** POC: sesuai rekomendasi.

### T-03 (P2) Retry otomatis sebelum status Error
**Pertanyaan:** ER-03 mengusulkan retry otomatis 3 kali dengan jeda bertambah sebelum langkah menjadi `ERROR`. AC-61.02 menampilkan Error setelah satu kali timeout 30 detik. Mana yang berlaku?  
**Kenapa penting:** Hasil uji AC-61.02 dan AC-86.03 berbeda tergantung jawaban ini.  
**Rekomendasi:** Ikuti ER-03. Ubah AC-61.02: "layanan Dukcapil tidak merespons dalam 30 detik pada 3 percobaan berturut-turut", THEN tetap. AC-86.03 menambah jumlah percobaan dari 3 menjadi 4 setelah Retry manual.  
**Jawaban BA:** POC: sesuai rekomendasi.

### T-04 (P2) LKN KPR tanpa Assign to Me
**Pertanyaan:** TQ-06 menyatakan antrean LKN KPR tidak memakai Assign to Me karena Customer Service dan Appraiser mengisi bagian berbeda. Bagaimana mencegah dua orang menimpa data yang sama?  
**Kenapa penting:** Tanpa penguncian, penyimpanan terakhir menimpa penyimpanan sebelumnya tanpa pemberitahuan.  
**Rekomendasi:** Penguncian per bagian: bagian Appraisal Payment hanya bisa diubah Customer Service, bagian LKN dan Appraisal hanya oleh Surveyor; simpan memakai pengecekan versi dan menolak dengan pesan "This data was changed by another user. Please reload". Masuk Rilis 3.  
**Jawaban BA:** POC: sesuai rekomendasi.

---

## Verdict

### INVEST scorecard (Rilis 1)

Diperbarui setelah jawaban stakeholder 2026-10-21 (on-premise lebih dulu).

| Huruf | Hasil | Celah terbesar |
|---|---|---|
| I: Independent | FAIL | Rilis 1 kini bergantung pada infrastruktur dan akses integrasi milik client on-premise yang belum diketahui (E-11, E-13), serta paket modul client (I-01). |
| N: Negotiable | FAIL | Pemisahan unit deploy per modul (AP-02, AP-03) masih dikunci sebagai aturan bisnis (N-01). Dengan on-premise lebih dulu, perakitan paket per lisensi menjadi jalan tengah yang perlu disetujui. |
| V: Valuable | WARN | Baseline metrik v1 masih terbuka; nilai jual per modul belum dibuktikan client kedua (V-01). |
| E: Estimable | FAIL | Tech stack tidak bisa dipilih sebelum batasan infrastruktur client diketahui (E-11). Rumus struktur kredit (E-01) dipakai sebagai asumsi kerja. |
| S: Small | WARN | Pekerjaan on-premise (paket per lisensi, lisensi bertanda tangan, migrasi skema, panduan instalasi) masuk increment 1a (S-02). |
| T: Testable | WARN | Pemetaan status ke label UI belum ada (T-01); dokumen BA resmi masih memuat aturan lama (R-00). |

### Siap estimasi?

**Untuk POC: siap dipecah menjadi task.** Semua pertanyaan terbuka dijawab dengan rekomendasi, ruang lingkup dan kriteria sukses POC tertulis di bagian "Keputusan POC". Asumsi terbesar POC: infrastruktur client sama dengan VM Linux PPU (E-11).

**Untuk Rilis 1: belum siap.** Blocker pertama: **E-11, infrastruktur client on-premise**. Database, sistem operasi, dan jaringan milik client menentukan tech stack, dan tanpa stack estimasi tidak bisa dibuat. Setelah itu tutup N-01 (bentuk paket per lisensi) dan I-01 (paket modul). N-05 sudah tertutup: pencatatan hasil pencairan manual (US-101).

### Usulan slicing

Rencana rilis v1 tetap, dengan penyesuaian S-02 setelah jawaban on-premise:

- **Increment 1a**: paket instalasi per lisensi (hanya modul berlisensi), alat penerbit lisensi bertanda tangan (command line), pemeriksaan lisensi di menu, API, editor rute, orchestrator; skrip migrasi skema otomatis; panduan instalasi dan operasional.
- **Increment 1b dan 1c**: sesuai v1, tanpa file pencairan dan respons core. Setelah Print Akad, Admin Operasional mencatat hasil pencairan secara manual (N-05, usulan US-101).
- **UAT di server client**: setelah akses integrasi asli tersedia (E-13).
- **Rilis 5**: US-99 konsol lisensi berlayar, mode lisensi kedaluwarsa (LC-06), pencabutan modul saat proses berjalan (LC-07), SaaS multi-bank.

### Celah acceptance criteria

| AC | Masalah | Usulan |
|---|---|---|
| Tidak ada | Validasi usia saat lunas (E-07) | Tambah AC-40.09: GIVEN "produk KTA dengan usia maksimal saat lunas 55 tahun AND pemohon lahir 20-10-1975 (51 tahun) AND Tenor Proposed 60 bulan (56 tahun saat lunas) AND hari ini 20-10-2026", WHEN "Saya mengklik tombol Next", THEN "Sistem menampilkan pesan "Applicant age at maturity must not exceed 55 years"". |
| AC-40.02 | Berlaku untuk semua jenis identitas (E-06) | GIVEN tambah "AND ID Type "KTP""; tambah AC-40.10: pilihan "ID Type" hanya berisi KTP di Rilis 1. |
| AC-47.01, AC-50.02 | Dokumen opsional belum dibedakan (T-02) | Lihat T-02. |
| AC-61.02 | Retry otomatis belum tercermin (T-03) | Lihat T-03. |
| AC-80.01, AC-80.02 | Hasil campuran per jenis baris (E-03) | Tambah AC-80.06: GIVEN "file respons berisi PEMBIAYAAN GAGAL dan LIMIT-INDUK SUKSES untuk pengajuan yang sama", THEN "pengajuan masuk antrean Recontest AND Core Disbursement menampilkan peringatan "Partial core records exist; coordinate with core team"". |
| Tidak ada | Respons core lewat endpoint (R-07) | Tambah AC-80.07: GIVEN "pengajuan berada di langkah Waiting Core Response", WHEN "core mengirim file respons SUKSES ke endpoint respons core", THEN "status pengajuan "Disbursed" dan respons tampil di Core Disbursement dengan sumber "Core endpoint"". |
| Tidak ada | Langkah tak berlisensi (COM-05) | Tambah AC-85.06: GIVEN "company tidak berlisensi M10 SLIK", WHEN "Saya melihat timeline", THEN "langkah SLIK berstatus "Skipped - not licensed"". |
| Tidak ada | Editor rute hanya menampilkan modul berlisensi (RT-04) | Tambah AC-31.08: GIVEN "company tidak berlisensi M12 SIKP", WHEN "Saya membuka mode edit rute", THEN "toggle modul SIKP tidak tampil". |
| AC-82.05 (draft v1) | Format penyamaran NIK (R-10) | THEN "kolom NIK berisi "3273********0001"". |
| AC-29.01 | Tarif premi per produk, bukan per usia dan tahun tenor (R-05) | WHEN: Maker memilih Insurance, lalu mengisi tabel tarif dengan baris Usia, Tahun Tenor, Premium Rate (%). THEN: "Data submitted for approval AND tabel tarif tampil di "Pending Insurance"". Tambah AC untuk baris tarif yang belum ada: "No premium rate for age 47 and tenor year 3". |

### Usulan perubahan US

| Jenis | ID | Isi | Dasar |
|---|---|---|---|
| Add | US-99 | Mengelola Lisensi Modul. Persona: tim internal PPU. Aksi: menerbitkan, mengubah masa berlaku, dan mencabut lisensi modul per company dengan validasi ketergantungan modul. Nilai: client hanya memakai modul yang dibelinya tanpa versi kode khusus. Rilis 5. | N-03, TO-09 |
| Edit | US-97 (draft v1) | Aksi menjadi "menetapkan suku bunga per periode berlaku (SubProduct), biaya admin, provisi, dan sales, serta rentang suku bunga yang boleh diubah Approver". | R-19 |
| Edit | US-29 | Aksi menjadi "mencatat perusahaan asuransi rekanan beserta tabel tarif premi per usia debitur dan tahun tenor". | R-05 |
| Batal | Draft v1 AC-23.01, AC-23.02 | Kembali ke AC asli (sinkronisasi Oksara). | R-06 |
| Add | US-100 | Menerbitkan File Lisensi On-Premise. Persona: tim internal PPU. Aksi: menerbitkan file lisensi bertanda tangan berisi company, daftar modul, dan masa berlaku untuk satu instalasi client. Nilai: client on-premise hanya bisa memakai modul yang dibelinya dan lisensi tidak bisa diubah sepihak. Rilis 1 (increment 1a). | N-02, N-03, LC-03 |

AC usulan untuk US-100:

| AC-ID | Skenario | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC-100.01 | Aplikasi menerima lisensi yang sah | Saya seorang Super User di instalasi on-premise<br>AND file lisensi berisi company "001", modul CORE, M06 s.d. M11, M14, M15, berlaku s.d. 31-12-2027 | Saya memasang file lisensi lalu login | Sistem menampilkan menu modul berlisensi saja<br>AND halaman "License" menampilkan daftar modul dan masa berlaku |
| AC-100.02 | Lisensi yang diubah ditolak | Saya seorang Super User di instalasi on-premise<br>AND isi file lisensi diubah setelah diterbitkan | Saya memasang file lisensi tersebut | Sistem menampilkan pesan "License file is invalid"<br>AND lisensi sebelumnya tetap berlaku |
| AC-100.03 | Modul tidak berlisensi tidak bisa dipakai | Saya seorang Maker<br>AND lisensi tidak memuat M12 SIKP | Saya membuka mode edit rute produk | Sistem tidak menampilkan toggle modul SIKP |

### US-101 (disetujui, N-05)

| Jenis | ID | Isi | Dasar |
|---|---|---|---|
| Add | US-101 | Mencatat Hasil Pencairan Manual. Persona: Admin Operasional. Aksi: mencatat hasil pencairan yang dilakukan di core banking (berhasil atau gagal) untuk pengajuan yang akadnya sudah dicetak. Nilai: status pengajuan, dashboard, dan notifikasi nasabah sesuai kondisi pencairan walau Cikal belum terhubung ke core. Rilis 1 (increment 1b). | N-05 |

| AC-ID | Skenario | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| AC-101.01 | Mencatat pencairan berhasil | Saya seorang Admin Operasional<br>AND saya berada di halaman "Record Disbursement"<br>AND saya sudah mengambil tugas "20102026001KTA0000013" yang akadnya sudah dicetak | Saya memilih "Disbursed" di "Result"<br>AND saya mengisi "Disbursement Date" dengan "21-10-2026" dan "Core Loan Number" dengan "LN-0012345"<br>AND saya mengklik tombol "Submit"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Disbursement recorded"<br>AND status pengajuan menjadi "Disbursed" dan langkah "Finish"<br>AND email "Kredit 20102026001KTA0000013 telah dicairkan" terkirim ke pemohon |
| AC-101.02 | Mencatat pencairan gagal | Saya seorang Admin Operasional<br>AND saya berada di halaman "Record Disbursement" | Saya memilih "Failed" di "Result"<br>AND saya mengisi "Reason" dengan "Rekening nasabah tidak aktif"<br>AND saya mengklik tombol "Submit"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Disbursement failure recorded"<br>AND pengajuan masuk antrean "Recontest" |
| AC-101.03 | Field wajib kosong | Saya seorang Admin Operasional<br>AND saya berada di halaman "Record Disbursement" | Saya memilih "Disbursed" tanpa mengisi "Disbursement Date" dan "Core Loan Number"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong |
| AC-101.04 | Tanggal cair sebelum tanggal yang divalidasi | Saya seorang Admin Operasional<br>AND saya berada di halaman "Record Disbursement"<br>AND Disbursement Date hasil Validity Check 21-10-2026 | Saya mengisi "Disbursement Date" dengan "20-10-2026"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Disbursement date must not be earlier than the validated date (21-10-2026)" |
| AC-101.05 | Gagal tanpa alasan | Saya seorang Admin Operasional<br>AND saya berada di halaman "Record Disbursement" | Saya memilih "Failed" tanpa mengisi "Reason"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Reason is required" |

Urutan langkah baku (referensi teknis 6.3) untuk Rilis 1: langkah 16 DISBURSEMENT dan 17 WAIT_CORE diganti satu langkah manual `RECORD_DISBURSEMENT` (modul M15, antrean Admin Operasional, memakai Assign to Me). Hasil Disbursed menghasilkan `FINISH` dengan status `DISBURSED`; hasil Failed menghasilkan `RECONTEST`. Saat integrasi core dibangun, langkah ini tetap ada sebagai cadangan bila core tidak bisa dihubungi.

### Ditunda dari Rilis 1 karena tanpa koneksi core FAST

Masuk register rilis berikutnya (v1) sebagai satu butir: integrasi core banking.

| Item | Asal | Syarat mulai |
|---|---|---|
| US-79 file pencairan, termasuk AC-79.01 s.d. AC-79.04 | Doc BA | Keputusan integrasi core dan kontrak dengan tim core |
| US-80 respons core, termasuk draft v1 AC-80.01 s.d. AC-80.05 dan usulan AC-80.06, AC-80.07 | Doc BA, v1 I-03, v2 R-07, E-03 | Sama |
| AC-71.05 recontest setelah respons core GAGAL | Doc BA | Diganti AC-101.02 di Rilis 1 |
| AC-94.01 simulasi respons core | Doc BA | Ikut US-80 |
| Draft v1 AC-20.07 dan pertanyaan R-12 (batas tenor core), R-13 (nilai tetap file core) | v1 E-19, v2 | Ikut US-79 |
| Pertanyaan pesan 3 untuk tim core FAST | `pertanyaan-stakeholder-v2.md` | Dikirim saat integrasi core masuk rencana |

### Langkah berikutnya

1. Pecah ruang lingkup POC menjadi task per sprint, lengkap dengan ukuran tim (skill `task-breakdown`).
2. Tulis ADR stack dan desain modul POC (skill `technical-spec`), memakai rekomendasi stack di bagian "Keputusan POC".
3. Kirim pesan 6 ke tim IT client selagi POC berjalan, agar jawaban E-11 tersedia sebelum Rilis 1 diestimasi.
4. Bawa daftar "Wajib dijawab sebelum Rilis 1" ke BA dan Product Owner setelah demo POC.
