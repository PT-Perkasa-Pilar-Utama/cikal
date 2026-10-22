# Grooming Cikal: Pembaruan BA 15e4791 (v3)

**Versi:** 3  
**Tanggal:** 2026-10-21  
**Sumber:** commit `15e4791` (integration adapter architecture and configurable rules): `Docs/cikal-tech-reference.md`, `Docs/ba/data-dictionary.md`, `Docs/ba/glossary.md`, `Docs/ba/data-lineage.md`  
**BA:** Fahrudin  
**Status:** Diputuskan 2026-10-21  
**Dokumen sebelumnya:** `grooming-cikal-ba-v1.md`, `grooming-cikal-ba-v2.md`  

## Keputusan

Product Owner memutuskan (2026-10-21):

1. Bila dokumen BA di commit `15e4791` berbeda dengan keputusan grooming v1 atau v2, **dokumen BA yang berlaku**. Default sementara di tech reference bagian 16 dipakai sebagai keputusan.
2. **Format nomor SP3K bisa dikonfigurasi**, tidak di-hard code. Rinciannya di bagian "Penomoran dokumen".

Penerapan aturan 1:

- Keputusan v1 dan v2 yang tidak dibantah dokumen BA tetap berlaku. Contoh: Syariah keluar dari rilis pertama (v1 N-02), IDR saja (v1 N-03), bunga Flat dan Effective (v1 N-04), hasil Dedup Duplicate In-Flight (v1 N-06), level 1 sebagai level approval tertinggi (v1 E-09, sejalan dengan glossary BA).
- Tech reference bagian 0 mengizinkan engineer mengubah bagian bertanda [Usulan] dengan alasan tertulis. TO-02 (modul tambahan sebagai unit deploy terpisah) bertanda [Usulan]; POC tetap menguji modular monolith dengan paket per lisensi (v2 N-01), dan ADR memutuskan bentuk akhirnya.
- POC bukan rilis pertama. Ruang lingkup POC (v2 "Keputusan POC") tetap; yang berubah hanya perilaku yang diatur dokumen BA.

---

## Keputusan v1 dan v2 yang diganti

| Topik | Keputusan lama | Keputusan v3 (dokumen BA) | Artefak yang disesuaikan |
|---|---|---|---|
| Format Loan ID | ddMMyyyy + kode company + kode produk + counter (v1 E-03, v2 R-01) | ddMMyyyy + kode produk + 7 digit, counter per produk per company (tech ref 11.1) | Semua contoh Loan ID dan MRTM TRM_LID kembali ke format Doc BA. Lihat "Risiko yang diterima". |
| Fraud check | Frekuensi per NIK, tanpa blacklist otomatis, cek IP Not applicable (v1 V-01, V-02, v2 R-02) | Tabel `FraudVelocityRule` yang bisa dikonfigurasi. Default aktif: nama sama lebih dari 3 per hari = High Fraud Potential + blacklist. Cek IP lewat adapter reputasi IP; tanpa penyedia, Not applicable (RM-14, 10.4) | AC-35.01, AC-35.03, AC-65.01, AC-65.02, AC-66.01, US-35, US-65, US-66, MRTM TRM_FRD kembali ke Doc BA |
| Credit Bureau (SLIK) | Lima kelas OJK (v1 E-08, v2 R-03) | Tabel `CreditBureauOutcomeMapping`, default sesuai MRTM TRM_SLK (Good, Fair, Poor); agregasi fasilitas terburuk (RM-16). Rilis pertama mode MANUAL (unggah iDeb) | AC-68.01, AC-68.02, MRTM TRM_SLK kembali ke Doc BA, ditambah baris agregasi terburuk |
| Data identitas kosong | Hasil Review (v1 T-02, v2 R-04) | Hasil Skip (tech ref 11.2, 11.3). NIK tidak ditemukan di Dukcapil memakai `notFoundOutcome`, default Review | MRTM TRM_DDP_005, TRM_DKC_008 kembali ke Doc BA |
| Perilaku per role | Terikat hak akses menu, bukan nama role (v1 E-05, v2 R-11) | Antrean memakai role yang berhak (HumanTask.eligibleRoleId, tabel persona-role di data dictionary) | AC-55.04, AC-57.02 kembali ke Doc BA |
| Persetujuan nasabah | Wajib dicentang sebelum lanjut (v1 E-17, AC-40.08) | Field persetujuan disediakan dan dicatat; penegakan nonaktif sampai keputusan legal (IN-12, TO-15) | AC-40.08 ditulis ulang: persetujuan dicatat, tidak wajib |
| Pemakaian ulang hasil eksternal | 30 hari (v1 E-15) | `resultReuseDays` per konfigurasi penyedia, default 0 (selalu memanggil ulang) (IN-10) | AC-71.06, AC-71.07 menyebut nilai `resultReuseDays` di GIVEN |
| SIKP kode 12 | NOTGO (v2 E-04) | Tabel `SikpOutcomeRule`, default 12 = GO (RM-17) | Tidak ada AC yang berubah |
| Routing approval | Hanya rentang nominal; `upLevel` dihapus (v2 E-05) | Rentang nominal dan rantai `upLevel`/`upSubLevel` sampai `isFinalApprover`; parameter `APPROVAL_RANGE_BOUNDARY` (RM-06) | Kartu TL-S5-01 |
| Migrasi OS11 | Master data dan data historis dimigrasi (v1 I-01) | Rilis pertama tanpa migrasi (TO-05) | US-98 tetap di backlog dengan catatan |
| Koneksi core FAST | Tidak ada di Rilis 1; pencairan dicatat manual (v2 N-05) | Adapter FAST JSON kirim dan respons file dibangun di rilis pertama (10.5). Respons masuk lewat endpoint (IN-15) | US-79, US-80, AC-71.05, AC-94.01 tidak lagi Deferred; US-80 dan AC-80.01 s.d. AC-80.04 kembali ke Doc BA; AC-80.05, AC-80.06 memakai endpoint. US-101 tetap sebagai mode MANUAL adapter core (IN-08), cadangan bila core tidak bisa dihubungi |
| Batas tenor core | Per produk core (v1 E-19, v2 R-12) | Parameter tenant `CORE_MAX_TENOR_MONTHS` (default 24) | AC-20.07 ditulis ulang dan tidak lagi Deferred |
| Konsol lisensi | CLI dulu, layar di Rilis 5 (v2 N-03) | Konsol minimal untuk tim PPU di rilis pertama (TO-09) | US-99 diberi catatan. POC tetap memakai CLI (US-100) |
| Nomor HP pemohon | Wajib saat submit (v2 E-10) | Tidak wajib (DD-06) | Tidak ada AC yang berubah |
| Kartu dashboard | Setiap pengajuan dihitung di satu kartu (draft v1 AC-81.01, v2 T-01) | Semua status selain DRAFT dihitung di kartu Submitted; GO dan NOT GO dari hasil Decision terakhir (data dictionary, pemetaan status ke label UI) | AC-81.01 ditulis ulang |

### Risiko yang diterima

Loan ID tanpa kode company bisa sama persis di dua company dalam satu instalasi. Untuk on-premise satu client (TN-04) risikonya kecil selama client hanya punya satu company atau kode produk antar company berbeda. Untuk SaaS banyak bank, risiko ini nyata (file core, URL detail, log). Catat ulang saat SaaS masuk rencana; mekanisme penomoran di bawah bisa dipakai untuk Loan ID bila BA mengizinkan.

---

## Butir yang ditutup dokumen BA

| Butir | Jawaban BA |
|---|---|
| v2 E-01 rumus struktur kredit | RM-07: provisi = plafon x persen provisi; nilai cair bersih = plafon dikurangi admin, provisi, dan IJK; rumus bisa dikonfigurasi per tenant |
| v2 R-05 sumber IJK | `IJK_SOURCE` = FORMULA; `IJK_AMOUNT` = plafon x tarif dari tabel usia dan tahun tenor (RM-18) |
| v2 R-19 harga produk | SubProduct (suku bunga per periode) dikelola di form Product dan ikut checker-maker Product (DD-08) |
| v2 T-01 status ke label UI | Tabel pemetaan di data dictionary entity Application |
| v2 E-07 usia saat lunas | Rumus `AGE_AT_MATURITY_MONTH` memakai `maxAgeAtMaturityMonth` (RM-02, DD-03) |
| v2 E-08 katalog field scoring | Semua atribut Application dan turunannya, Product, SubProduct, Financing, dan hasil rumus (DD-05) |
| v1 E-08 SLIK API atau iDeb | Rilis pertama mode MANUAL: unggah laporan iDeb dan isi kolektibilitas per fasilitas (10.5) |
| v1 E-17 retensi data pengajuan | 10 tahun sejak pengajuan selesai [Usulan BA] (DD-07) |
| v1 E-10 pembulatan | Per rumus, default rupiah penuh `HALF_UP`; sisa pokok baris terakhir 0 (FM-07, RM-19) |
| v1 E-28 katalog placeholder | Ada di data dictionary entity DocumentTemplate, termasuk `{{Document.documentNumber}}` dan pengubah format |

---

## Penomoran dokumen

### Keputusan

Nomor dokumen keluaran dibentuk dari **pola yang bisa dikonfigurasi per tenant**, bukan format tetap di kode. Berlaku untuk SP3K (keputusan PO). Engineering merekomendasikan mekanisme yang sama untuk nomor kontrak (`Disbursement.contractNumber`), karena BA juga belum menetapkan formatnya; konfirmasi BA dibutuhkan.

Ini sejalan dengan arah dokumen BA (bagian 9.7 dan 9.8): perilaku yang berbeda antar bank diatur lewat konfigurasi.

### Aturan

| ID | Aturan |
|---|---|
| DN-01 | Setiap jenis dokumen bernomor (contoh `SP3K`, `CONTRACT`) punya satu format aktif per tenant. Format berisi pola, periode reset, dan cakupan counter |
| DN-02 | Token pola: `{COMPANY_CODE}`, `{BRANCH_CODE}`, `{PRODUCT_CODE}`, `{DOC_CODE}`, `{YYYY}`, `{YY}`, `{MM}`, `{MM_ROMAN}`, `{DD}`, `{SEQ:n}` (nomor urut n digit, rata kiri nol). Teks lain di luar token disalin apa adanya |
| DN-03 | Pola wajib memuat tepat satu `{SEQ:n}` dengan n antara 3 dan 9. Token yang tidak dikenal ditolak saat disimpan |
| DN-04 | Periode reset: `NONE`, `YEARLY`, `MONTHLY`, `DAILY`. Cakupan counter: `COMPANY`, `BRANCH`, `PRODUCT`, atau `BRANCH_PRODUCT` |
| DN-05 | Perubahan format lewat checker-maker, berversi, dengan tanggal mulai berlaku. Nomor yang sudah terbentuk tidak berubah saat format diganti |
| DN-06 | Nomor dibentuk sekali saat dokumen pertama kali di-generate dan disimpan di GeneratedDocument; cetak ulang memakai nomor yang sama (US-78) |
| DN-07 | Pembentukan nomor aman terhadap permintaan bersamaan; dua dokumen tidak pernah mendapat nomor yang sama |
| DN-08 | Nomor urut yang habis (contoh `{SEQ:4}` melewati 9999 dalam satu periode) menghentikan pembentukan dokumen dengan pesan error, tidak berputar ke 0001 |
| DN-09 | Form format menampilkan pratinjau nomor berikutnya sebelum diajukan |
| DN-10 | Default saat aktivasi tenant [Usulan, menunggu contoh nomor dari OS11]: SP3K `{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}`, reset `MONTHLY`, cakupan `BRANCH` (sesuai counter bulanan AS-IS); nomor kontrak `{BRANCH_CODE}/PK/{YYYY}/{SEQ:6}`, reset `YEARLY`, cakupan `BRANCH` |

### Usulan perubahan data dictionary

Entity `Sp3kCounter` (period, lastNumber) diganti dua entity yang berlaku untuk semua jenis dokumen bernomor:

| Entity | Atribut | Definisi |
|---|---|---|
| DocumentNumberFormat | documentType, pattern, resetPeriod, counterScope, versionNumber, effectiveFrom, status | Format aktif per jenis dokumen per tenant (DN-01 s.d. DN-05) |
| DocumentNumberCounter | formatId, scopeKey (contoh kode cabang), periodKey (contoh 202610), lastNumber | Counter per cakupan dan periode (DN-04, DN-07) |

Job "reset counter SP3K bulanan" (OT-03) tidak diperlukan: periode baru otomatis memakai `periodKey` baru.

### US-102 (baru)

| US-ID | Judul | Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|---|---|
| US-102 | Mengatur Format Penomoran Dokumen | Maker | mengatur pola nomor, periode reset, dan cakupan counter untuk dokumen keluaran seperti SP3K dan surat perjanjian kredit | format nomor dokumen mengikuti kebijakan tiap bank tanpa perubahan program |

| AC-ID | Skenario | GIVEN | WHEN | THEN | Catatan |
|---|---|---|---|---|---|
| AC-102.01 | Mengubah format nomor SP3K | Saya seorang Maker<br>AND saya berada di halaman "Document Numbering"<br>AND format SP3K aktif "{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}" dengan reset Monthly | Saya mengklik ikon edit pada baris "SP3K"<br>AND saya mengisi "Pattern" dengan "SP3K-{BRANCH_CODE}-{YYYY}{MM}-{SEQ:5}"<br>AND saya memilih "Monthly" di "Reset Period" dan "Branch" di "Counter Scope"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pratinjau "SP3K-011-202610-00001" dan pesan "Data submitted for approval"<br>AND format lama tetap dipakai sampai Checker menyetujui | Grooming v3 DN-05, DN-09 |
| AC-102.02 | Nomor SP3K dibentuk dari format aktif | Saya seorang Approver level 1 (final)<br>AND saya berada di halaman "Approval Detail"<br>AND pengajuan KPR cabang 011<br>AND format SP3K aktif "{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}"<br>AND nomor urut SP3K cabang 011 bulan Oktober 2026 terakhir 0012 | Saya mengisi "Approval Comments"<br>AND saya mengklik tombol "Approve"<br>AND saya mengklik tombol "Yes" | Sistem membentuk SP3K bernomor "0013/SP3K/011/X/2026" | Grooming v3 DN-02 |
| AC-102.03 | Nomor urut direset saat periode berganti | Saya seorang Approver level 1 (final)<br>AND saya berada di halaman "Approval Detail"<br>AND format SP3K direset Monthly<br>AND SP3K terakhir cabang 011 bernomor "0013/SP3K/011/X/2026"<br>AND hari ini 01-11-2026 | Saya menyetujui pengajuan KPR cabang 011 | Sistem membentuk SP3K bernomor "0001/SP3K/011/XI/2026" | Grooming v3 DN-04 |
| AC-102.04 | Pola tanpa nomor urut ditolak | Saya seorang Maker<br>AND saya berada di halaman "Edit Document Numbering" | Saya mengisi "Pattern" dengan "SP3K/{BRANCH_CODE}/{YYYY}"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Pattern must contain exactly one sequence token {SEQ:n} with n between 3 and 9" | Grooming v3 DN-03 |
| AC-102.05 | Token tidak dikenal ditolak | Saya seorang Maker<br>AND saya berada di halaman "Edit Document Numbering" | Saya mengisi "Pattern" dengan "{SEQ:4}/SP3K/{BRANCH_NAME}"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Unknown token: BRANCH_NAME" | Grooming v3 DN-03 |
| AC-102.06 | Nomor urut habis | Saya seorang Approver level 1 (final)<br>AND saya berada di halaman "Approval Detail"<br>AND format SP3K memakai "{SEQ:4}" dan nomor urut periode berjalan sudah 9999 | Saya menyetujui pengajuan KPR | Sistem menampilkan pesan "Document number sequence for SP3K has reached its limit. Please contact your administrator"<br>AND SP3K tidak dibentuk | Grooming v3 DN-08 |
| AC-102.07 | Dua dokumen dibentuk bersamaan | Saya seorang Admin Operasional<br>AND saya berada di halaman "Print Akad Form"<br>AND Admin Operasional lain mencetak akad cabang yang sama pada detik yang sama<br>AND nomor kontrak terakhir 000041 | Saya mengklik tombol "Print" | Kedua akad mendapat nomor kontrak berbeda: "011/PK/2026/000042" dan "011/PK/2026/000043" | Grooming v3 DN-07 |
| AC-102.08 | Nomor kontrak tercetak di akad | Saya seorang Admin Operasional<br>AND saya berada di halaman "Print Akad Form"<br>AND format CONTRACT aktif "{BRANCH_CODE}/PK/{YYYY}/{SEQ:6}" dengan reset Yearly<br>AND belum ada kontrak cabang 011 di tahun 2026 | Saya mengisi semua field<br>AND saya mengklik tombol "Print" | Sistem mengunduh PDF "Surat Perjanjian Kredit" dengan nomor kontrak "011/PK/2026/000001"<br>AND cetak ulang akad yang sama menampilkan nomor yang sama | Grooming v3 DN-06, DN-10 |

---

## Celah baru dari dokumen BA

Dokumen BA meminta engineer membangun beberapa fitur yang belum punya US/AC. Default BA dipakai untuk membangun; AC tetap dibutuhkan agar fitur bisa diuji.

| Butir BA | Isi | Butuh dari BA |
|---|---|---|
| TO-11 | Editor rumus dan tabel aturan: katalog variabel, uji rumus, checker-maker, riwayat eksekusi (FM-01 s.d. FM-12) | US dan AC |
| TO-18 | Layar konfigurasi integrasi per tenant (IN-05), mode MANUAL Credit Bureau | US dan AC |
| TO-14 | M16 Name Screening (DTTOT, DPPSPM) dan review Compliance Officer | US dan AC; keputusan apakah bank sudah screening di sistem lain |
| TO-13 | AC-30.03 memakai "Dukcapil Review Threshold" yang menurut PR-07 milik Dukcapil Rule; US-16 belum mencakup salin parameter, rumus, dan tabel aturan | Revisi AC-30.03; AC baru untuk US-16 |
| TO-17 | Desain layar baru yang belum ada di Figma | Desainer |

## Pertanyaan yang masih terbuka

| ID | Pertanyaan | Pemilik |
|---|---|---|
| v2 E-02 | Token validasi pencairan (`Disbursement.tokenNumber`, `tokenExpiredAt`): siapa yang menerbitkan, untuk apa, berapa lama berlaku. Bila tidak dipakai, boleh dihapus? | BA |
| DN-10 | Contoh nomor SP3K dan nomor kontrak dari OS11, untuk menetapkan default format | BA |
| TO-12 | Tinjauan rumus default bagian 11.12 oleh bisnis kredit | Bisnis kredit |

---

## Dampak ke artefak

| Artefak | Perubahan |
|---|---|
| `Docs/business/user-story.md`, `sprint-breakdown.md`, `acceptance-criteria-breakdown/`, `acceptance-criteria.md` | Dibentuk ulang: perubahan v1/v2 yang diganti dikembalikan ke Doc BA sesuai tabel di atas; US-102 dan AC-102.01 s.d. AC-102.08 ditambahkan di Sprint 6 (dipakai kartu POC). |
| `Docs/TASK_BREAKDOWN.md` | Kartu disesuaikan: orchestrator (`WAIT_EXTERNAL`, slot NAME_SCREENING), Loan ID, layanan perhitungan sebagai registri kode rumus, Fraud (`FraudVelocityRule`, adapter IP simulasi), Credit Bureau (tabel pemetaan), routing approval (`upLevel`), layanan penomoran dokumen untuk nomor kontrak, Record Disbursement sebagai mode MANUAL adapter core. |
| `grooming-cikal-ba-v1.md`, `grooming-cikal-ba-v2.md` | Diberi penanda bahwa sebagian keputusan diganti v3. Isi lama tidak dihapus. |
| `Docs/ba/` | Tidak diubah. |
