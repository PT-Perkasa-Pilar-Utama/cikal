# Acceptance Criteria — Sprint 2

## User Stories in Scope

- **US-31** Mengatur Rute Modul per Produk — Maker
- **US-39** Memulai Pengajuan Kredit Baru — Sales
- **US-58** Mengambil dan Melepas Tugas dari Antrean — Pengguna dengan langkah kerja manual
- **US-85** Melihat Riwayat Proses Pengajuan — Pengguna LOS
- **US-86** Memantau dan Memulihkan Proses yang Gagal — Admin Operasional
- **US-100** Menerbitkan File Lisensi On-Premise — Tim internal PPU

---

## US-31 — Mengatur Rute Modul per Produk (Maker)

### AC-31.01 — Mematikan modul Survey untuk produk KTA

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Product Route"
  And rute aktif produk "KTA" versi 2 memakai modul Survey
When Saya memilih "KTA" di dropdown "Product"
  And saya mengklik tombol "Edit Route"
  And saya mematikan toggle modul "Survey"
  And saya mengklik tombol "Submit for Approval"
Then Sistem menampilkan pesan "Route version 3 submitted for approval"
  And versi 3 tampil di "Pending Product Route" dengan status "Waiting Approval"
  And pengajuan KTA baru tetap memakai versi 2 sampai versi 3 disetujui
```

### AC-31.02 — Modul wajib tidak bisa dimatikan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Product Route"
  And saya sedang mengedit rute produk "KTA"
When Saya mengklik toggle modul "Approval"
Then Sistem menampilkan keterangan "Approval is a mandatory module and cannot be turned off"
  And toggle "Approval" tetap menyala
```

### AC-31.03 — Rute baru tidak memengaruhi pengajuan yang sedang berjalan

```gherkin
Given Saya seorang Checker
  And saya berada di halaman "Pending Product Route"
  And pengajuan KTA "20102026KTA0000005" sedang berada di modul Dedup memakai rute versi 2
When Saya menyetujui rute KTA versi 3 yang mematikan modul Survey
Then Sistem menampilkan pesan "Data approved"
  And pengajuan "20102026KTA0000005" tetap melanjutkan rute versi 2
  And pengajuan KTA yang disubmit setelah persetujuan memakai versi 3
```

### AC-31.04 — Modul bersyarat tetap mengikuti kondisinya

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application"
  And rute produk "KUR" memakai modul SIKP dengan batas SIKP 50.000.000
When Saya mensubmit pengajuan KUR dengan Requested Limit 40.000.000
Then Sistem melewati modul SIKP untuk pengajuan tersebut
  And riwayat proses menampilkan SIKP dengan status "Skipped - condition not met"
```

### AC-31.05 — Rute tanpa perubahan tidak bisa diajukan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Product Route"
  And saya membuka mode edit rute "KTA" tanpa mengubah toggle apa pun
When Saya mengklik tombol "Submit for Approval"
Then Sistem menampilkan pesan "No changes to submit"
```

### AC-31.06 — Pengguna tanpa akses Update hanya melihat rute

```gherkin
Given Saya seorang Checker
  And saya berada di halaman "Product Route"
When Saya memilih produk "KTA"
Then Sistem menampilkan diagram rute tanpa tombol "Edit Route"
```

### AC-31.08 — Editor rute hanya menampilkan modul berlisensi

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Product Route"
  And company tidak berlisensi M12 SIKP
When Saya membuka mode edit rute produk "KTA"
Then Sistem tidak menampilkan toggle modul "SIKP"
```

> Note: AC-31.01 mengikuti Asumsi A-30, rute produk R-02 dan R-07. AC-31.02 mengikuti Rute produk R-06. AC-31.03 mengikuti Rute produk R-08. AC-31.04 mengikuti Asumsi A-19, rute produk R-03. AC-31.08 mengikuti Grooming v2 N-04.

---

## US-39 — Memulai Pengajuan Kredit Baru (Sales)

### AC-39.01 — Mengisi section Application dengan data valid

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Application"
When Saya memilih "NTB" di "Application Type", "Mikro" di "Segment", "Non Collateral Loan" di "Product Category", "KTA" di "Product"
  And saya memilih "36" di "Tenor Proposed"
  And saya mengisi "Requested Limit" dengan "20.000.000"
  And saya memilih asuransi "Asuransi Contoh"
  And saya mengklik tombol "Next"
Then Sistem menampilkan step "Personal"
  And step "Application" bertanda selesai di stepper
```

### AC-39.02 — Field wajib Application kosong

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Application"
When Saya membiarkan "Product" dan "Requested Limit" kosong
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong
  And saya tetap di step "Application"
```

### AC-39.03 — Batas plafon dan tenor sesuai produk sesuai matriks

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Application"
  And produk KTA: plafon 5.000.000 s.d. 300.000.000, tenor 6 s.d. 60 bulan
When Saya mengisi "Requested Limit" dan "Tenor Proposed" sesuai baris MRTM
  And saya mengklik tombol "Next"
Then Refer to MRTM Rows: TRM_APP_001 through TRM_APP_008 for comprehensive logic combinations.
```

### AC-39.04 — Kembali dari step Application tanpa menyimpan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Application"
  And saya sudah mengisi beberapa field
When Saya mengklik tombol "Back"
  And saya mengklik tombol "OK" di konfirmasi "Unsaved data will be lost. Continue?"
Then Sistem menampilkan halaman "Application List"
  And tidak ada pengajuan baru yang tersimpan
```

### AC-39.05 — Dropdown produk hanya berisi produk aktif dengan rute disetujui

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Application"
  And produk "KPR Subsidi" aktif tetapi belum punya rute disetujui
When Saya memilih "Collateral Loan" di "Product Category"
  And saya mengklik dropdown "Product"
Then Sistem tidak menampilkan "KPR Subsidi" di daftar produk
```

> Note: AC-39.05 mengikuti Rute produk R-09.

#### MRTM US-39

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Requested Limit | Tenor Proposed | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|
| US_39 | AC_39.03 | Sales | TRM_APP_001 | 4.999.999 | 36 | [-] | Sistem menampilkan pesan "Requested limit must be between 5,000,000 and 300,000,000" |
| US_39 | AC_39.03 | Sales | TRM_APP_002 | 5.000.000 | 36 | [-] | Lanjut ke step "Personal" |
| US_39 | AC_39.03 | Sales | TRM_APP_003 | 300.000.000 | 36 | [-] | Lanjut ke step "Personal" |
| US_39 | AC_39.03 | Sales | TRM_APP_004 | 300.000.001 | 36 | [-] | Sistem menampilkan pesan "Requested limit must be between 5,000,000 and 300,000,000" |
| US_39 | AC_39.03 | Sales | TRM_APP_005 | 20.000.000 | 5 | [-] | Sistem menampilkan pesan "Tenor must be between 6 and 60 months" |
| US_39 | AC_39.03 | Sales | TRM_APP_006 | 20.000.000 | 6 | [-] | Lanjut ke step "Personal" |
| US_39 | AC_39.03 | Sales | TRM_APP_007 | 20.000.000 | 60 | [-] | Lanjut ke step "Personal" |
| US_39 | AC_39.03 | Sales | TRM_APP_008 | 20.000.000 | 61 | [-] | Sistem menampilkan pesan "Tenor must be between 6 and 60 months" |

---

## US-58 — Mengambil dan Melepas Tugas dari Antrean (Pengguna dengan langkah kerja manual)

### AC-58.01 — Mengambil tugas

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Verification Document"
  And pengajuan "20102026KTA0000013" belum diambil siapa pun
When Saya mengklik tombol "Assign to Me" pada baris tersebut
Then Sistem menampilkan nama saya di kolom "Assigned To"
  And tombol "Proceed" tampil untuk saya
```

### AC-58.02 — Tugas milik orang lain tidak bisa dikerjakan

```gherkin
Given Saya seorang Verifikator "veri.02"
  And saya berada di halaman "Verification Document"
  And pengajuan "20102026KTA0000013" sudah diambil "veri.01"
When Saya melihat baris tersebut
Then Sistem menampilkan "veri.01" di kolom "Assigned To" tanpa tombol "Assign to Me" dan "Proceed" untuk saya
```

### AC-58.03 — Melepas tugas

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Verification Document"
  And pengajuan "20102026KTA0000013" sedang saya ambil
When Saya mengklik tombol "Release Me" pada baris tersebut
Then Sistem mengosongkan kolom "Assigned To" dan tugas bisa diambil Verifikator lain
```

### AC-58.04 — Dua pengguna mengambil tugas pada saat bersamaan

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Verification Document"
  And Verifikator lain mengambil tugas yang sama beberapa detik sebelum saya
When Saya mengklik tombol "Assign to Me"
Then Sistem menampilkan pesan "This task has already been assigned to veri.01"
```

### AC-58.05 — Supervisor melepas tugas yang tertahan

```gherkin
Given Saya seorang Supervisor
  And saya berada di halaman "Verification Document"
  And tugas "20102026KTA0000013" diambil "veri.01" yang sedang cuti
When Saya mengklik tombol "Release" pada baris tersebut
  And saya mengklik tombol "Yes"
Then Sistem mengosongkan kolom "Assigned To" dan audit trail mencatat pelepasan oleh saya
```

### AC-58.06 — Melepas tugas yang bukan milik saya

```gherkin
Given Saya seorang Verifikator "veri.02"
  And saya berada di halaman "Verification Document"
  And tugas "20102026KTA0000013" diambil "veri.01"
When Saya melihat baris tersebut
Then Sistem tidak menampilkan tombol "Release Me" untuk saya
```

---

## US-85 — Melihat Riwayat Proses Pengajuan (Pengguna LOS)

### AC-85.01 — Melihat timeline proses

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Detail"
When Saya mengklik tombol "Workflow"
Then Sistem menampilkan timeline langkah (Data Entry, Dedup, Dukcapil, Verification, Fraud, RAC, Scoring, SLIK, Decision, Approval, Epolis, dan seterusnya) dengan Start Date, End Date, Aging (hari), pelaku, dan hasil
  And daftar modul rute versi yang dipakai pengajuan tampil dengan langkah saat ini disorot
```

### AC-85.02 — Langkah yang dilewati rute ditandai

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Workflow"
  And rute KTA tidak memakai Survey
When Saya melihat timeline
Then Sistem menampilkan langkah "Survey" dengan status "Skipped - not in route"
```

### AC-85.03 — Riwayat recontest

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Workflow"
  And pengajuan pernah di-recontest 1 kali
When Saya memilih "Recontest 1" di dropdown "Process"
Then Sistem menampilkan timeline proses recontest 1, sedangkan proses awal tetap bisa dipilih
```

### AC-85.04 — Aging dihitung dalam hari kalender

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Workflow"
  And langkah Approval dimulai 20-10-2026 16:00 dan selesai 22-10-2026 09:00
When Saya melihat baris langkah Approval
Then Sistem menampilkan Aging "2" (selisih tanggal kalender End Date dan Start Date)
```

### AC-85.05 — Pengajuan Draft belum punya riwayat proses

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Detail"
  And pengajuan berstatus Draft
When Saya mengklik tombol "Workflow"
Then Sistem menampilkan pesan "Process has not started. Submit the application to start the process"
```

### AC-85.06 — Langkah modul tak berlisensi ditandai

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Workflow"
  And company tidak berlisensi M10 SLIK
When Saya melihat timeline
Then Sistem menampilkan langkah "SLIK" dengan status "Skipped - not licensed"
```

> Note: AC-85.06 mengikuti Grooming v2 N-04.

---

## US-86 — Memantau dan Memulihkan Proses yang Gagal (Admin Operasional)

### AC-86.01 — Mengulang langkah yang error

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Process Monitoring"
  And pengajuan "20102026KTA0000013" error di langkah Dukcapil dan layanan Dukcapil sudah pulih
When Saya mengklik tombol "View Detail" pada baris tersebut
  And saya mengklik tombol "Retry"
Then Sistem menampilkan pesan "Step retried"
  And langkah Dukcapil dijalankan ulang dan pengajuan hilang dari daftar error bila berhasil
```

### AC-86.02 — Menghentikan proses

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Process Monitoring Detail"
When Saya mengklik tombol "Finish"
  And saya mengisi "Reason" dengan "Data nasabah ganda, dibatalkan cabang"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Process finished"
  And status pengajuan menjadi "Finish" dengan alasan tersebut
```

### AC-86.03 — Retry yang gagal lagi

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Process Monitoring Detail"
  And layanan Dukcapil masih tidak tersedia
When Saya mengklik tombol "Retry"
Then Sistem menampilkan pesan "Step failed again: Dukcapil service timeout"
  And jumlah percobaan bertambah 1
```

### AC-86.04 — Menyaring pengajuan error

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Process Monitoring"
When Saya memilih "Error" di filter "Status"
Then Sistem menampilkan hanya pengajuan yang langkah saat ininya berstatus Error beserta pesan error
```

---

## US-100 — Menerbitkan File Lisensi On-Premise (Tim internal PPU)

### AC-100.01 — Aplikasi menerima lisensi yang sah

```gherkin
Given Saya seorang Super User di instalasi on-premise
  And file lisensi berisi company "001", modul CORE, M06 s.d. M11, M14, M15, berlaku s.d. 31-12-2027
When Saya memasang file lisensi lalu login
Then Sistem menampilkan menu modul berlisensi saja
  And halaman "License" menampilkan daftar modul dan masa berlaku
```

### AC-100.02 — Lisensi yang diubah ditolak

```gherkin
Given Saya seorang Super User di instalasi on-premise
  And isi file lisensi diubah setelah diterbitkan
When Saya memasang file lisensi tersebut
Then Sistem menampilkan pesan "License file is invalid"
  And lisensi sebelumnya tetap berlaku
```

### AC-100.03 — Modul tidak berlisensi tidak bisa dipakai

```gherkin
Given Saya seorang Maker
  And lisensi tidak memuat M12 SIKP
When Saya membuka mode edit rute produk
Then Sistem tidak menampilkan toggle modul SIKP
```

> Note: AC-100.01, AC-100.02, AC-100.03 mengikuti Grooming v2 N-03.

---
