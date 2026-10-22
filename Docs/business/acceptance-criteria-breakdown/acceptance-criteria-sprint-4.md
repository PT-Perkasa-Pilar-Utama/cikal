# Acceptance Criteria — Sprint 4

## User Stories in Scope

- **US-36** Mengatur Decision Matrix — Maker
- **US-51** Menghitung Simulasi Angsuran — Sales
- **US-59** Mendapatkan Hasil Pengecekan Duplikasi Otomatis — Risk Manager
- **US-61** Mendapatkan Hasil Verifikasi Dukcapil Otomatis — Risk Manager
- **US-65** Mendapatkan Hasil Fraud Check Otomatis — Risk Manager
- **US-67** Mendapatkan Hasil RAC dan Scoring Otomatis — Risk Manager
- **US-68** Mendapatkan Hasil Kolektibilitas SLIK — Risk Manager
- **US-69** Mendapatkan Keputusan Awal Go atau NotGo — Risk Manager

---

## US-36 — Mengatur Decision Matrix (Maker)

### AC-36.01 — Mengubah keputusan kombinasi

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Decision Matrix"
  And kombinasi SLIK Collect 2 dan Scoring Pass ber-decision NotGo
When Saya mengklik ikon edit pada kombinasi tersebut
  And saya memilih "Go" di dropdown "Decision Outcome"
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Data submitted for approval"
  And perubahan tampil di "Pending Decision Matrix"
```

### AC-36.02 — Menyimulasikan keputusan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Decision Matrix"
When Saya mengklik tombol "Simulate"
  And saya memilih Dedup "UnMatch", Dukcapil "Passed", Fraud "Clean", RAC "Pass", Scoring "Pass", SLIK "Collect 1"
  And saya mengklik tombol "Run"
Then Sistem menampilkan hasil "Go" beserta baris matrix yang dipakai
```

### AC-36.03 — Kombinasi tanpa baris matrix

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Decision Matrix Simulation"
When Saya memilih kombinasi yang tidak punya baris matrix
  And saya mengklik tombol "Run"
Then Sistem menampilkan hasil "NotGo" dengan keterangan "No matching rule, default decision applied"
```

### AC-36.04 — Simulasi tanpa memilih semua hasil modul

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Decision Matrix Simulation"
When Saya memilih Dedup, Dukcapil, dan Fraud tanpa memilih RAC, Scoring, dan SLIK
  And saya mengklik tombol "Run"
Then Sistem menampilkan pesan "Select an outcome for every module"
```

### AC-36.05 — Baris matrix dengan [ANY] dipakai sesuai prioritas

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Decision Matrix Simulation"
  And baris prioritas 1 berisi SLIK "Collect 5" dan modul lain "[ANY]" dengan keputusan NotGo
  And baris prioritas 2 berisi Scoring "Pass" dan modul lain "[ANY]" dengan keputusan Go
When Saya memilih Scoring "Pass", SLIK "Collect 5", dan hasil lain apa pun
  And saya mengklik tombol "Run"
Then Sistem menampilkan hasil "NotGo" beserta baris prioritas 1 yang dipakai
```

> Note: AC-36.05 mengikuti Asumsi A-41.

---

## US-51 — Menghitung Simulasi Angsuran (Sales)

### AC-51.01 — Simulasi bunga efektif

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Installment Simulation"
When Saya mengisi "Principal" "100.000.000", "Tenor (months)" "12", "Interest Rate (% p.a.)" "12"
  And saya memilih "Effective" di "Interest Type"
  And saya mengklik tombol "Calculate"
Then Sistem menampilkan angsuran bulanan Rp8.884.879 dan tabel 12 baris berisi pokok, bunga, dan sisa pinjaman, dengan sisa pinjaman baris terakhir Rp0
```

### AC-51.02 — Perhitungan angsuran per jenis bunga sesuai matriks

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Installment Simulation"
When Saya mengisi input sesuai baris MRTM
  And saya mengklik tombol "Calculate"
Then Refer to MRTM Rows: TRM_INS_001 through TRM_INS_002 for comprehensive logic combinations. TRM_INS_003 through TRM_INS_007 berstatus Deferred (Floating, Hybrid, Capped).
```

### AC-51.03 — Tenor kosong

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Installment Simulation"
When Saya mengisi "Principal" dan "Interest Rate" tanpa mengisi "Tenor (months)"
  And saya mengklik tombol "Calculate"
Then Sistem menampilkan pesan "Tenor is required"
```

### AC-51.04 — Suku bunga 0%

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Installment Simulation"
When Saya mengisi "Principal" "12.000.000", "Tenor" "12", "Interest Rate" "0"
  And saya memilih "Flat"
  And saya mengklik tombol "Calculate"
Then Sistem menampilkan angsuran Rp1.000.000 per bulan tanpa bunga
```

> Note: AC-51.02 mengikuti Asumsi A-40, A-45.

#### MRTM US-51

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Interest Type | Principal | Tenor | Rate (% p.a.) | Input Tambahan 1 | Input Tambahan 2 | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| US_51 | AC_51.02 | Sales | TRM_INS_001 | Flat | 100.000.000 | 12 | 12 | [-] | [-] | [-] | Angsuran Rp9.333.333 per bulan untuk angsuran ke-1 s.d. ke-11 (pokok 8.333.333 + bunga 1.000.000); angsuran ke-12 Rp9.333.337 karena selisih pembulatan pokok Rp4 ditaruh di angsuran terakhir |
| US_51 | AC_51.02 | Sales | TRM_INS_002 | Effective | 100.000.000 | 12 | 12 | [-] | [-] | [-] | Angsuran tetap Rp8.884.879 per bulan, bunga menurun, pokok naik |
| US_51 | AC_51.02 | Sales | TRM_INS_003 | Floating | 100.000.000 | 12 | 10 | Spread 2 | [-] | [Deferred] Rate = interest + spread = 12% | Angsuran Rp8.884.879 per bulan |
| US_51 | AC_51.02 | Sales | TRM_INS_004 | Hybrid | 100.000.000 | 24 | 10 | Floating 14 | Tenor fixed 12 | [Deferred] [-] | Angsuran bulan 1 s.d. 12 dihitung dengan 10%, bulan 13 s.d. 24 dengan 14% atas sisa pokok |
| US_51 | AC_51.02 | Sales | TRM_INS_005 | Capped | 100.000.000 | 12 | 12 | Spread 2 | Cap 13 | [Deferred] Rate 14% melebihi cap | Angsuran dihitung dengan 13% |
| US_51 | AC_51.02 | Sales | TRM_INS_006 | Capped | 100.000.000 | 12 | 10 | Spread 2 | Cap 13 | [Deferred] Rate 12% di bawah cap | Angsuran dihitung dengan 12% |
| US_51 | AC_51.02 | Sales | TRM_INS_007 | Hybrid | 100.000.000 | 12 | 10 | Floating 14 | Tenor fixed 12 | [Deferred] Tenor fixed = tenor | Sistem menampilkan pesan "Fixed tenor must be less than total tenor" |

---

## US-59 — Mendapatkan Hasil Pengecekan Duplikasi Otomatis (Risk Manager)

### AC-59.01 — Hasil dedup dan langkah berikutnya sesuai matriks

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And Dedup Matrix sudah disetujui
When Saya membuka riwayat proses pengajuan yang baru melewati modul Dedup
Then Refer to MRTM Rows: TRM_DDP_001 through TRM_DDP_007 for comprehensive logic combinations.
```

### AC-59.02 — Layanan dedup gagal

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Process Monitoring"
  And modul Dedup gagal karena gangguan teknis
When Saya mencari Loan ID pengajuan tersebut
Then Sistem menampilkan pengajuan dengan status langkah "Error" dan pesan error dari modul Dedup
```

> Note: AC-59.01 mengikuti Asumsi A-02.

#### MRTM US-59

| User Story ID | Acceptance Criteria ID | User | Test Case ID | NIK | Full Name ID | DOB | POB | Mother Maiden Name | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|---|---|
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_001 | Match | Match | Match | Match | Match | [-] | Dedup = Match; langkah berikutnya Verification Document (Dukcapil dilewati) |
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_002 | Match | Fuzzy | Match | Match | Fuzzy | [-] | Dedup = Review; masuk antrean Prescreen Dedup |
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_003 | UnMatch | UnMatch | [ANY] | [ANY] | [ANY] | [-] | Dedup = UnMatch; langkah berikutnya Dukcapil |
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_004 | Match | UnMatch | UnMatch | UnMatch | UnMatch | NIK sama, identitas lain beda | Dedup = Review; masuk antrean Prescreen Dedup |
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_005 | [-] | [ANY] | [ANY] | [ANY] | [ANY] | NIK kosong | Dedup = Skip; diperlakukan sebagai UnMatch, langkah berikutnya Dukcapil |
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_006 | [ANY] | [ANY] | [ANY] | [ANY] | [ANY] | Modul Dedup dimatikan di rute produk | Dedup tidak dijalankan; riwayat mencatat "Skipped - not in route" |
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_007 | Match | [ANY] | [ANY] | [ANY] | [ANY] | NIK sama dengan pengajuan lain berstatus On Progress di company yang sama | Dedup = Duplicate In-Flight; masuk antrean Prescreen Dedup |

---

## US-61 — Mendapatkan Hasil Verifikasi Dukcapil Otomatis (Risk Manager)

### AC-61.01 — Hasil Dukcapil sesuai matriks

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And bobot nama 60%, nama ibu 40%, ambang Passed 0,90, Review 0,75
When Saya membuka riwayat proses pengajuan yang baru melewati modul Dukcapil
Then Refer to MRTM Rows: TRM_DKC_001 through TRM_DKC_008 for comprehensive logic combinations.
```

### AC-61.02 — Layanan Dukcapil tidak merespons

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Process Monitoring"
  And layanan Dukcapil tidak merespons dalam 30 detik pada 3 percobaan berturut-turut
When Saya mencari Loan ID pengajuan tersebut
Then Sistem menampilkan langkah "Dukcapil" dengan status "Error" dan pesan "Dukcapil service timeout"
```

> Note: AC-61.01 mengikuti Asumsi A-03. AC-61.02 mengikuti Grooming v2 T-03.

#### MRTM US-61

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Tanggal Lahir | Tempat Lahir | Skor Nama | Skor Nama Ibu | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|---|
| US_61 | AC_61.01 | Risk Manager | TRM_DKC_001 | Sama | Sama | 1,00 | 1,00 | Skor 1,00 | Passed; lanjut ke Verification Document |
| US_61 | AC_61.01 | Risk Manager | TRM_DKC_002 | Sama | Sama | 0,90 | 0,90 | Skor tepat 0,90 | Passed |
| US_61 | AC_61.01 | Risk Manager | TRM_DKC_003 | Sama | Sama | 0,90 | 0,85 | Skor 0,88 | Review; masuk antrean Prescreen Dukcapil |
| US_61 | AC_61.01 | Risk Manager | TRM_DKC_004 | Sama | Sama | 0,75 | 0,75 | Skor tepat 0,75 | Review |
| US_61 | AC_61.01 | Risk Manager | TRM_DKC_005 | Sama | Sama | 0,74 | 0,74 | Skor 0,74 | Failed; pengajuan berhenti dengan status Finish dan email penolakan |
| US_61 | AC_61.01 | Risk Manager | TRM_DKC_006 | Beda | Sama | 1,00 | 1,00 | Tanggal lahir beda | Failed tanpa menghitung skor |
| US_61 | AC_61.01 | Risk Manager | TRM_DKC_007 | Sama | Beda | 1,00 | 1,00 | Tempat lahir beda | Failed tanpa menghitung skor |
| US_61 | AC_61.01 | Risk Manager | TRM_DKC_008 | [-] | [ANY] | [ANY] | [ANY] | Tanggal lahir kosong | Skip; lanjut ke Verification Document |

---

## US-65 — Mendapatkan Hasil Fraud Check Otomatis (Risk Manager)

### AC-65.01 — Hasil fraud check sesuai matriks

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And Fraud Matrix sudah disetujui
When Saya membuka riwayat proses pengajuan yang baru melewati modul Fraud
Then Refer to MRTM Rows: TRM_FRD_001 through TRM_FRD_006 for comprehensive logic combinations.
```

### AC-65.02 — Pengajuan dari channel tanpa IP

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And pengajuan masuk melalui Upload Excel tanpa data IP pemohon
When Saya membuka riwayat proses modul Fraud
Then Sistem menampilkan pengecekan IP dengan status "Not applicable" dan hasil hanya dari blacklist serta frekuensi
```

> Note: AC-65.01 mengikuti Asumsi A-04.

#### MRTM US-65

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Blacklist | Kondisi IP | Jumlah Pengajuan Nama yang Sama | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|
| US_65 | AC_65.01 | Risk Manager | TRM_FRD_001 | Ada di blacklist | [ANY] | [ANY] | [-] | High Fraud Potential; pengajuan berstatus Finish |
| US_65 | AC_65.01 | Risk Manager | TRM_FRD_002 | Tidak | Normal | 4 pengajuan/hari | Batas 3 pengajuan per hari | High Fraud Potential; pengajuan berstatus Finish dan data pemohon masuk blacklist |
| US_65 | AC_65.01 | Risk Manager | TRM_FRD_003 | Tidak | Normal | 3 pengajuan/hari | Tepat di batas | Clean; lanjut ke modul berikutnya |
| US_65 | AC_65.01 | Risk Manager | TRM_FRD_004 | Tidak | VPN/Proxy | 1 | [-] | Suspicious; masuk antrean Prescreen Fraud |
| US_65 | AC_65.01 | Risk Manager | TRM_FRD_005 | Tidak | Lokasi IP beda domisili KTP | 1 | [-] | Suspicious; masuk antrean Prescreen Fraud |
| US_65 | AC_65.01 | Risk Manager | TRM_FRD_006 | Tidak | Normal | 1 | [-] | Clean; lanjut ke modul berikutnya |

---

## US-67 — Mendapatkan Hasil RAC dan Scoring Otomatis (Risk Manager)

### AC-67.01 — Hasil scoring lulus

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And model scoring KTA aktif dengan Constant 200 dan Cut Off 430
When Saya mengklik langkah "Scoring" di timeline pengajuan "20102026KTA0000013"
Then Sistem menampilkan Total Score 470, Cut Off 430, hasil "Pass", dan daftar kriteria yang terpenuhi
```

### AC-67.02 — Kriteria wajib RAC tidak terpenuhi

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And pengajuan Requested Limit 200.000.000, tenor 36 bulan, bunga efektif 12% p.a. (angsuran 6.642.862), penghasilan 2.000.000, DBR max 40%
When Saya mengklik langkah "RAC" di timeline
Then Sistem menampilkan hasil "Fail" dengan alasan "Installment to Income Ratio 332% exceeds DBR max 40%"
```

### AC-67.03 — Rasio angsuran tepat di DBR max

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And rasio angsuran terhadap penghasilan pengajuan tepat 40% dan DBR max 40%
When Saya mengklik langkah "RAC" di timeline
Then Sistem menampilkan kriteria kemampuan bayar "Pass"
```

### AC-67.04 — Produk tanpa model scoring aktif

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Process Monitoring"
  And produk KPR Subsidi belum punya model scoring aktif
When Saya mencari pengajuan KPR Subsidi yang tertahan di modul Scoring
Then Sistem menampilkan langkah "Scoring" berstatus "Error" dengan pesan "No active scoring model for product KPR Subsidi"
```

> Note: AC-67.02 mengikuti Asumsi A-26.

---

## US-68 — Mendapatkan Hasil Kolektibilitas SLIK (Risk Manager)

### AC-68.01 — Kolektibilitas lancar

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And SLIK mengembalikan kolektibilitas 1
When Saya mengklik langkah "SLIK" di timeline
Then Sistem menampilkan "Collectibility 1 - Good"
```

### AC-68.02 — Arti kolektibilitas SLIK sesuai matriks

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
When Saya mengklik langkah "SLIK" di timeline pengajuan sesuai baris MRTM
Then Refer to MRTM Rows: TRM_SLK_001 through TRM_SLK_007 for comprehensive logic combinations.
```

> Note: AC-68.02 mengikuti Grooming v3 (RM-16).

#### MRTM US-68

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Kolektibilitas dari SLIK | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_001 | 1 | [-] | Collectibility 1 - Good |
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_002 | 2 | [-] | Collectibility 2 - Fair |
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_003 | 3 | [-] | Collectibility 3 - Poor |
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_004 | 5 | Nilai tertinggi | Collectibility 5 - Poor |
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_005 | [-] | Tidak ada riwayat kredit | No credit history |
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_006 | 6 | Nilai di luar rentang dari layanan | Langkah SLIK berstatus "Error" dengan pesan "Invalid collectibility value: 6" |
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_007 | 1, 3, 2 | Beberapa fasilitas aktif; kolektibilitas terburuk dipakai (CREDIT_BUREAU_AGGREGATION) | Collectibility 3 - Poor |

---

## US-69 — Mendapatkan Keputusan Awal Go atau NotGo (Risk Manager)

### AC-69.01 — Keputusan Go

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And hasil Dedup UnMatch, Dukcapil Passed, Fraud Clean, RAC Pass, Scoring Pass, SLIK Collect 1
When Saya mengklik langkah "Decision" di timeline
Then Sistem menampilkan "Go" beserta baris Decision Matrix yang dipakai
  And langkah berikutnya sesuai rute (SIKP atau Approval)
```

### AC-69.02 — Keputusan NotGo

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And hasil RAC Fail
When Saya mengklik langkah "Decision" di timeline
Then Sistem menampilkan "NotGo"
  And pengajuan masuk antrean "Recontest"
  And tidak ada email yang dikirim ke pemohon
```

### AC-69.03 — Modul yang dilewati rute dianggap Skip

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And rute produk KTA mematikan modul SLIK
When Saya mengklik langkah "Decision" di timeline
Then Sistem menampilkan SLIK bernilai "Skip" pada kombinasi yang dipakai Decision Matrix
```

> Note: AC-69.02 mengikuti Asumsi A-07.

---
