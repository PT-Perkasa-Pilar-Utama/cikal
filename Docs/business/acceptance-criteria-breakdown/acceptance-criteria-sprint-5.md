# Acceptance Criteria — Sprint 5

## User Stories in Scope

- **US-27** Menetapkan Approver per Level — Maker
- **US-37** Menyusun Model Scoring dan RAC — Maker
- **US-64** Memverifikasi Dokumen Pengajuan — Verifikator
- **US-72** Menyetujui Pengajuan Sesuai Kewenangan — Approver
- **US-73** Menolak atau Mengembalikan Pengajuan — Approver
- **US-74** Menyetujui Otomatis Pengajuan Bernilai Kecil — Approver
- **US-83** Mencari dan Menyaring Daftar Pengajuan — Pengguna LOS
- **US-84** Melihat Detail Pengajuan — Pengguna LOS

---

## US-27 — Menetapkan Approver per Level (Maker)

### AC-27.01 — Menetapkan approver

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Approval Hierarchy"
  And level 2 KPR Bandung sudah disetujui
When Saya mengklik tombol "New Hierarchy"
  And saya memilih Branch "011", Product "KPR", Job Level "2", Sub Level "1"
  And saya memilih user "rina.approver" di dropdown "Approver"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And hierarki tampil di "Pending Approval Setup"
```

### AC-27.02 — Approver tidak punya akses menu Approval

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Hierarchy"
  And user "sari.sales" tidak punya akses Approve di menu Approval
When Saya memilih "sari.sales" di dropdown "Approver"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Selected user does not have approval access"
```

### AC-27.03 — Approver dinonaktifkan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Approval Hierarchy"
  And approver "rina.approver" baru dinonaktifkan
When Saya membuka halaman "Approval Hierarchy"
Then Sistem menandai baris "rina.approver" dengan label "Inactive approver"
```

### AC-27.04 — Semua approver satu level nonaktif

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Process Monitoring"
  And semua approver level 2 KPR Bandung nonaktif
  And pengajuan "20102026KPR0000041" menunggu di level 2
When Saya mencari Loan ID "20102026KPR0000041"
Then Sistem menampilkan langkah "Approval" berstatus "Error" dengan pesan "No active approver for level 2"
  And tombol "Retry" menjalankan ulang routing setelah approver baru disetujui
```

> Note: AC-27.04 mengikuti Asumsi A-37.

---

## US-37 — Menyusun Model Scoring dan RAC (Maker)

### AC-37.01 — Membuat kriteria pada model scoring

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Scoring Model"
  And model "KTA-2026" berjenis Scoring untuk produk KTA
When Saya mengklik tombol "Add Criterion"
  And saya memilih field "Occupation", operator "is one of", nilai "ASN, Karyawan BUMN"
  And saya mengisi "Weight" dengan "50"
  And saya mengklik tombol "Save"
Then Sistem menampilkan kriteria "Occupation is one of ASN, Karyawan BUMN : +50" di daftar kriteria model
```

### AC-37.02 — Membuat kriteria RAC kemampuan bayar

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Scoring Model"
  And model "KTA-RAC" berjenis RAC
When Saya mengklik tombol "Add Criterion"
  And saya memilih field "Installment to Income Ratio (%)", operator "less than or equal", nilai "Product DBR Max"
  And saya memilih "Mandatory" di "Criterion Type"
  And saya mengklik tombol "Save"
Then Sistem menampilkan kriteria wajib "Installment to Income Ratio <= Product DBR Max" di model RAC
```

### AC-37.03 — Nilai kriteria tidak sesuai tipe field

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Criterion"
When Saya memilih field "Monthly Income" dan operator "greater than"
  And saya mengisi nilai "lima juta"
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Value must be a number"
```

### AC-37.04 — Bobot kriteria di luar rentang

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Criterion"
When Saya mengisi "Weight" dengan "1001"
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Weight must be between -1000 and 1000"
```

### AC-37.05 — Mengajukan model untuk disetujui

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Scoring Model"
  And model "KTA-2026" berisi 8 kriteria, Constant 200, Cut Off 430
When Saya mengklik tombol "Submit for Approval"
Then Sistem menampilkan pesan "Data submitted for approval"
  And model aktif sebelumnya tetap dipakai sampai model baru disetujui
```

> Note: AC-37.02 mengikuti Asumsi A-26.

---

## US-64 — Memverifikasi Dokumen Pengajuan (Verifikator)

### AC-64.01 — Semua dokumen Match

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Verification Document"
  And saya sudah mengambil tugas "20102026KTA0000013" dengan 7 dokumen
When Saya mengklik tombol "Proceed to Verification"
  And saya memilih "Match" untuk 7 dokumen
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Verification submitted"
  And langkah saat ini menjadi modul berikutnya di rute
```

### AC-64.02 — Ada dokumen Not Match

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Verification Detail"
When Saya memilih "Not Match" untuk dokumen "NPWP"
  And saya mengisi "Remarks" dengan "Nama di NPWP tidak sesuai KTP"
  And saya memilih "Match" untuk dokumen lain
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Verification submitted"
  And pengajuan kembali ke Sales dengan status "Draft" dan catatan "Nama di NPWP tidak sesuai KTP" pada dokumen NPWP
```

### AC-64.03 — Not Match tanpa remarks

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Verification Detail"
When Saya memilih "Not Match" untuk dokumen "NPWP" tanpa mengisi "Remarks"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Remarks are required for Not Match documents"
```

### AC-64.04 — Verifikasi sebagian disimpan

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Verification Detail"
When Saya memilih status untuk 4 dari 7 dokumen
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Verification saved"
  And pengajuan tetap di antrean saya dengan 4 status tersimpan
```

### AC-64.05 — Pratinjau dokumen

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Verification Detail"
When Saya mengklik nama dokumen "KTP"
Then Sistem menampilkan pratinjau dokumen "KTP" di samping daftar dokumen
```

---

## US-72 — Menyetujui Pengajuan Sesuai Kewenangan (Approver)

### AC-72.01 — Approve pada level terakhir

```gherkin
Given Saya seorang Approver level 1 (final)
  And saya berada di halaman "Approval"
  And pengajuan KPR "20102026KPR0000041" sudah disetujui approver level 2
When Saya mengklik tombol "Detail" pada baris tersebut
  And saya mengisi "Approval Comments" dengan "Agunan memadai"
  And saya mengklik tombol "Approve"
  And saya mengklik tombol "Yes" di konfirmasi "Are you sure you want to approve this application?"
Then Sistem menampilkan pesan "Loan application is successfully approved"
  And tab "Approval" menampilkan Plafond, Tenor, Interest Rate, Installment, dan jadwal angsuran dengan sisa pokok baris terakhir Rp0
  And dokumen SP3K terunduh
  And langkah saat ini menjadi "Epolis"
```

### AC-72.02 — Approve pada level bawah meneruskan ke level berikutnya

```gherkin
Given Saya seorang Approver level 2
  And saya berada di halaman "Approval Detail"
  And pengajuan butuh 2 level approval
When Saya mengisi "Approval Comments"
  And saya mengklik tombol "Approve"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Loan application is successfully approved"
  And pengajuan pindah ke antrean approver level 1 dan timeline approval menandai level 2 "Approved"
```

### AC-72.03 — Approver level atas menunggu level bawah

```gherkin
Given Saya seorang Approver level 1
  And saya berada di halaman "Approval Detail"
  And approver level 2 belum memberi keputusan
When Saya membuka detail pengajuan
Then Sistem menampilkan tombol "Approve", "Reject", dan "Return" dalam keadaan nonaktif dengan keterangan "Waiting for level 2 approval"
```

### AC-72.04 — Approve tanpa komentar

```gherkin
Given Saya seorang Approver
  And saya berada di halaman "Approval Detail"
When Saya mengklik tombol "Approve" tanpa mengisi "Approval Comments"
Then Sistem menampilkan pesan "Approval comments are required"
```

### AC-72.05 — Penginput pengajuan tidak bisa menjadi approver

```gherkin
Given Saya seorang Approver "budi.cabang" yang juga menginput pengajuan "20102026KTA0000013"
  And saya berada di halaman "Approval"
When Saya mencari pengajuan "20102026KTA0000013"
Then Sistem menampilkan pengajuan dengan keterangan "You cannot approve an application you submitted" tanpa tombol keputusan
```

### AC-72.06 — Routing approval berdasarkan nominal sesuai matriks

```gherkin
Given Saya seorang Approver
  And saya berada di halaman "Approval"
  And level approval KPR Bandung: level 2 untuk 0 s.d. 500.000.000, level 1 (tertinggi) untuk 500.000.001 s.d. 2.000.000.000
When Saya membuka antrean approval pengajuan sesuai baris MRTM
Then Refer to MRTM Rows: TRM_APV_001 through TRM_APV_005 for comprehensive logic combinations.
```

### AC-72.07 — Dua approver satu sub level memproses pengajuan yang sama

```gherkin
Given Saya seorang Approver level 2
  And saya berada di halaman "Approval Detail"
  And Approver lain di sub level yang sama sudah menyetujui pengajuan ini saat detail masih terbuka di layar saya
When Saya mengisi "Approval Comments"
  And saya mengklik tombol "Approve"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "This application has already been processed"
  And keputusan tidak dicatat dua kali
```

> Note: AC-72.05 mengikuti Asumsi A-14. AC-72.06, AC-72.07 mengikuti Asumsi A-37.

#### MRTM US-72

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Produk | Cabang | Requested Limit | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|
| US_72 | AC_72.06 | Approver | TRM_APV_001 | KPR | 011 Bandung | 500.000.000 | [-] | Butuh approval level 2 saja |
| US_72 | AC_72.06 | Approver | TRM_APV_002 | KPR | 011 Bandung | 500.000.001 | [-] | Butuh approval level 2 lalu level 1 |
| US_72 | AC_72.06 | Approver | TRM_APV_003 | KPR | 011 Bandung | 2.000.000.000 | Batas atas | Butuh approval level 2 lalu level 1 |
| US_72 | AC_72.06 | Approver | TRM_APV_004 | KPR | 011 Bandung | 2.000.000.001 | Melebihi semua level | Langkah Approval berstatus "Error" dengan pesan "No approval level covers this amount" |
| US_72 | AC_72.06 | Approver | TRM_APV_005 | KPR | 012 Cimahi | 300.000.000 | Cabang tanpa setup approval | Langkah Approval berstatus "Error" dengan pesan "No approval setup for branch 012 and product KPR" |

---

## US-73 — Menolak atau Mengembalikan Pengajuan (Approver)

### AC-73.01 — Menolak pengajuan

```gherkin
Given Saya seorang Approver
  And saya berada di halaman "Approval Detail"
When Saya mengisi "Approval Comments" dengan "Penghasilan tidak terverifikasi"
  And saya mengklik tombol "Reject"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Loan application has been rejected"
  And status pengajuan menjadi "Finish" dan email penolakan terkirim ke pemohon
```

### AC-73.02 — Mengembalikan pengajuan ke Sales

```gherkin
Given Saya seorang Approver
  And saya berada di halaman "Approval Detail"
  And level saya mengizinkan aksi Return
When Saya mengisi "Approval Comments" dengan "Lengkapi rekening koran bulan September"
  And saya mengklik tombol "Return"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Application returned to sales"
  And pengajuan kembali ke Sales berstatus "Draft" dengan komentar approver tampil di atas form
```

### AC-73.03 — Tombol Return tidak tampil bila level tidak mengizinkan

```gherkin
Given Saya seorang Approver
  And saya berada di halaman "Approval Detail"
  And level saya tidak mencentang "Is Return"
When Saya membuka detail pengajuan
Then Sistem tidak menampilkan tombol "Return"
```

### AC-73.04 — Reject tanpa komentar

```gherkin
Given Saya seorang Approver
  And saya berada di halaman "Approval Detail"
When Saya mengklik tombol "Reject" tanpa mengisi "Approval Comments"
Then Sistem menampilkan pesan "Approval comments are required"
```

### AC-73.05 — Komentar melebihi 1.000 karakter

```gherkin
Given Saya seorang Approver
  And saya berada di halaman "Approval Detail"
When Saya mengisi "Approval Comments" dengan 1.001 karakter
  And saya mengklik tombol "Reject"
Then Sistem menampilkan pesan "Approval comments must not exceed 1000 characters"
```

> Note: AC-73.02 mengikuti Asumsi A-21.

---

## US-74 — Menyetujui Otomatis Pengajuan Bernilai Kecil (Approver)

### AC-74.01 — Pengajuan di bawah batas auto approval disetujui otomatis

```gherkin
Given Saya seorang Approver
  And saya berada di halaman "Application Detail - Workflow"
  And produk KTA Limit Auto Approval 10.000.000
  And pengajuan Requested Limit 8.000.000 dengan Decision Go
When Saya membuka timeline pengajuan
Then Sistem menampilkan langkah "Approval" berstatus "Auto Approved" dengan pelaku "System"
  And tab "Approval" menampilkan Plafond, Tenor, Interest Rate, Installment, dan jadwal angsuran dengan sisa pokok baris terakhir Rp0
  And langkah saat ini "Epolis"
```

### AC-74.02 — Limit tepat di batas auto approval

```gherkin
Given Saya seorang Approver
  And saya berada di halaman "Application Detail - Workflow"
  And produk KTA Limit Auto Approval 10.000.000
  And pengajuan Requested Limit 10.000.000 dengan Decision Go
When Saya membuka timeline pengajuan
Then Sistem menampilkan langkah "Approval" berstatus "Auto Approved"
  And langkah saat ini "Epolis"
```

### AC-74.03 — Limit satu rupiah di atas batas auto approval

```gherkin
Given Saya seorang Approver
  And saya berada di halaman "Application Detail - Workflow"
  And produk KTA Limit Auto Approval 10.000.000
  And pengajuan Requested Limit 10.000.001 dengan Decision Go
When Saya membuka timeline pengajuan
Then Sistem menampilkan langkah "Approval" berstatus "Waiting Approval" di antrean approver
```

### AC-74.04 — Pengajuan NotGo tidak diproses auto approval

```gherkin
Given Saya seorang Approver
  And saya berada di halaman "Application Detail - Workflow"
  And pengajuan Requested Limit 5.000.000 dengan Decision NotGo
When Saya membuka timeline pengajuan
Then Sistem menampilkan langkah "Recontest" dan langkah "Approval" tidak dijalankan
```

### AC-74.05 — Limit auto approval 0 menonaktifkan auto approval

```gherkin
Given Saya seorang Approver
  And saya berada di halaman "Application Detail - Workflow"
  And produk KPR Limit Auto Approval 0
  And pengajuan KPR Requested Limit 1.000.000 dengan Decision Go
When Saya membuka timeline pengajuan
Then Sistem menampilkan langkah "Approval" berstatus "Waiting Approval"
```

> Note: AC-74.01, AC-74.02, AC-74.03 mengikuti Asumsi A-20.

---

## US-83 — Mencari dan Menyaring Daftar Pengajuan (Pengguna LOS)

### AC-83.01 — Mencari berdasarkan nama tanpa membedakan huruf besar dan kecil

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Inquiry"
When Saya mengetik "rudi" di field "Search"
Then Sistem menampilkan pengajuan yang Loan ID atau namanya mengandung "rudi", termasuk "RUDI HARTONO"
```

### AC-83.02 — Menyaring berdasarkan langkah proses

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Inquiry"
When Saya membuka filter
  And saya memilih "Approval" di "State"
  And saya mengklik tombol "Apply"
Then Sistem menampilkan hanya pengajuan yang berada di langkah Approval
```

### AC-83.03 — Mengurutkan kolom

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Inquiry"
When Saya mengklik header kolom "Modified Date"
Then Sistem mengurutkan daftar dari tanggal terbaru dan klik kedua mengurutkan dari tanggal terlama
```

### AC-83.04 — Pencarian tanpa hasil

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Inquiry"
When Saya mengetik "zzzz" di field "Search"
Then Sistem menampilkan pesan "No applications found"
```

### AC-83.05 — Paging 20 baris per halaman

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Inquiry"
  And terdapat 41 pengajuan
When Saya mengklik halaman "3" di pagination
Then Sistem menampilkan 1 pengajuan dan teks "41 items"
```

### AC-83.06 — Daftar diperbarui saat langkah pengajuan berubah

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Inquiry"
  And pengajuan "20102026KTA0000013" tampil dengan state "Dedup"
When Saya tetap berada di halaman "Application Inquiry" sampai modul Dedup selesai
Then Sistem memperbarui state pengajuan menjadi langkah berikutnya tanpa saya memuat ulang halaman dalam 30 detik setelah modul Dedup selesai
```

### AC-83.07 — Rentang tanggal filter tidak valid

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Inquiry"
When Saya membuka filter
  And saya memilih "Submitted Date" dari "31-10-2026" sampai "01-10-2026"
  And saya mengklik tombol "Apply"
Then Sistem menampilkan pesan "End date must be on or after start date"
```

> Note: AC-83.06 mengikuti Asumsi A-44.

---

## US-84 — Melihat Detail Pengajuan (Pengguna LOS)

### AC-84.01 — Membuka detail pengajuan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Inquiry"
When Saya mengklik Loan ID "20102026KPR0000041"
Then Sistem menampilkan ringkasan Loan Number, Application Type, Loan Amount, Tenor Approved dan tab detail dengan tab "Detail" terbuka
```

### AC-84.02 — Melihat dan mengunduh dokumen

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Detail - Document"
When Saya mengklik ikon "Download" pada dokumen "KTP"
Then Sistem mengunduh file KTP dalam format PDF
```

### AC-84.03 — Tab yang tidak relevan tidak tampil

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Detail"
  And pengajuan KTA pemohon belum kawin dan karyawan
When Saya melihat daftar tab
Then Sistem tidak menampilkan tab "Spouse", "Business", "LKN", dan "Collateral"
```

### AC-84.04 — Pengajuan company lain tidak bisa dibuka

```gherkin
Given Saya seorang Sales company "001"
When Saya mengetik alamat detail pengajuan milik company "007" di address bar browser
Then Sistem menampilkan pesan "Application not found"
```

### AC-84.05 — Loan ID tidak ada

```gherkin
Given Saya seorang Sales
When Saya mengetik alamat detail dengan Loan ID "TIDAKADA" di address bar browser
Then Sistem menampilkan pesan "Application not found"
```

### AC-84.06 — Membuka detail pengajuan tercatat di audit trail

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Inquiry"
When Saya mengklik Loan ID "20102026KPR0000041"
Then Sistem menampilkan detail pengajuan
  And audit trail mencatat akses saya dengan Event Type "Data Access", waktu, dan Loan ID
```

> Note: AC-84.04 mengikuti Asumsi A-35. AC-84.06 mengikuti Asumsi A-38.

---
