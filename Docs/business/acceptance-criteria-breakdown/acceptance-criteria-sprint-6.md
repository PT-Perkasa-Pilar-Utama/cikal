# Acceptance Criteria — Sprint 6

## User Stories in Scope

- **US-38** Menguji Model Scoring Sebelum Berlaku — Maker
- **US-76** Memvalidasi Data Pencairan — Admin Operasional
- **US-77** Mencetak Akad Kredit — Admin Operasional
- **US-101** Mencatat Hasil Pencairan Manual — Admin Operasional
- **US-102** Mengatur Format Penomoran Dokumen — Maker

---

## US-38 — Menguji Model Scoring Sebelum Berlaku (Maker)

### AC-38.01 — Menguji model dengan pengajuan contoh

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Scoring Model Test"
  And model draft "KTA-2026" punya Constant 200 dan Cut Off 430
When Saya mengetik Loan ID "15122025KTA0000013" di field "Sample Application"
  And saya mengklik tombol "Run Test"
Then Sistem menampilkan Total Score, Constant 200, Cut Off 430, hasil "Pass" atau "Fail"
  And rincian kriteria yang terpenuhi beserta bobotnya
```

### AC-38.02 — Skor tepat sama dengan Cut Off

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Scoring Model Test"
  And pengajuan contoh menghasilkan Constant + bobot = 430 dan Cut Off 430
When Saya mengklik tombol "Run Test"
Then Sistem menampilkan hasil "Pass"
```

### AC-38.03 — Skor satu poin di bawah Cut Off

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Scoring Model Test"
  And pengajuan contoh menghasilkan Constant + bobot = 429 dan Cut Off 430
When Saya mengklik tombol "Run Test"
Then Sistem menampilkan hasil "Fail"
```

### AC-38.04 — Loan ID contoh tidak ditemukan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Scoring Model Test"
When Saya mengetik "LOANTIDAKADA" di field "Sample Application"
  And saya mengklik tombol "Run Test"
Then Sistem menampilkan pesan "Application not found"
```

---

## US-76 — Memvalidasi Data Pencairan (Admin Operasional)

### AC-76.01 — Data valid dengan tanggal pencairan besok

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Validity Check"
  And saya sudah mengambil tugas "20102026KPR0000041"
  And hari ini 20-10-2026
  And tanggal pengajuan e-polis 20-10-2026
When Saya mengklik tombol "Validity Check"
  And saya memeriksa Disbursement Detail
  And saya mengisi "Disbursement Date" dengan "21-10-2026"
  And saya mengklik tombol "Valid"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Disbursement data validated"
  And jadwal angsuran disesuaikan dengan First Installment Date
  And langkah saat ini menjadi "Print Akad"
```

### AC-76.02 — Tanggal pencairan hari ini ditolak

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Validity Check Form"
  And hari ini 20-10-2026
When Saya mengisi "Disbursement Date" dengan "20-10-2026"
  And saya mengklik tombol "Valid"
Then Sistem menampilkan pesan "Disbursement date must be at least 1 day after today"
```

### AC-76.03 — Tanggal pencairan sebelum tanggal e-polis ditolak

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Validity Check Form"
  And modul M14 E-Polis berlisensi
  And hari ini 20-10-2026
  And tanggal pengajuan e-polis 25-10-2026
When Saya mengisi "Disbursement Date" dengan "24-10-2026"
  And saya mengklik tombol "Valid"
Then Sistem menampilkan pesan "Disbursement date must not be earlier than the epolis date (25-10-2026)"
```

### AC-76.04 — Data tidak valid

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Validity Check Form"
  And nomor rekening nasabah di Disbursement Detail salah
When Saya mengklik tombol "Not Valid"
  And saya mengisi "Reason" dengan "Nomor rekening salah"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Disbursement data marked as not valid"
  And pengajuan kembali ke Sales berstatus "Draft" dengan catatan "Nomor rekening salah"
```

### AC-76.05 — First Installment Date diubah

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Validity Check Form"
  And First Installment Date terisi 21-11-2026
When Saya mengubah "First Installment Date" menjadi "25-11-2026"
  And saya mengklik tombol "Valid"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Disbursement data validated"
  And semua tanggal jatuh tempo angsuran bergeser mengikuti tanggal 25 setiap bulan
```

### AC-76.06 — Tanpa M14, tanggal e-polis tidak diperiksa

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Validity Check Form"
  And modul M14 E-Polis tidak berlisensi
  And hari ini 20-10-2026
When Saya mengisi "Disbursement Date" dengan "21-10-2026"
  And saya mengklik tombol "Valid"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Disbursement data validated"
  And Disbursement Detail tidak menampilkan tanggal e-polis
```

> Note: AC-76.01, AC-76.02, AC-76.03 mengikuti Asumsi A-18.

> Note: Deferred, AC-76.03 berlaku bila M14 E-Polis berlisensi; POC memakai AC-76.06 (grooming AC tertunda POC 2026-10-22).

---

## US-77 — Mencetak Akad Kredit (Admin Operasional)

### AC-77.01 — Mencetak akad

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Print Akad"
  And saya sudah mengambil tugas "20102026KPR0000041"
When Saya mengklik tombol "View Detail"
  And saya mengklik tombol "Print Akad"
  And saya memilih Payment Method, Bank Account No, Customer Account No, dan Risk Manager
  And saya mengklik tombol "Print"
Then Sistem mengunduh PDF "Surat Perjanjian Kredit" sesuai template aktif
  And langkah saat ini menjadi "Disbursement" dan pengajuan tampil di menu "Reprint Akad"
```

### AC-77.02 — Field cetak wajib kosong

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Print Akad Form"
When Saya mengklik tombol "Print" tanpa memilih "Risk Manager"
Then Sistem menampilkan pesan "This field is required" di bawah field "Risk Manager"
```

### AC-77.03 — Template akad belum tersedia

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Print Akad Form"
  And template "AKAD-KPR" belum disetujui
When Saya mengisi semua field
  And saya mengklik tombol "Print"
Then Sistem menampilkan pesan "Document template AKAD-KPR is not available"
```

---

## US-101 — Mencatat Hasil Pencairan Manual (Admin Operasional)

> Note: Mode MANUAL adapter core (IN-08), cadangan bila core tidak bisa dihubungi (Grooming v3).

### AC-101.01 — Mencatat pencairan berhasil

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Record Disbursement"
  And saya sudah mengambil tugas "20102026KTA0000013" yang akadnya sudah dicetak
When Saya memilih "Disbursed" di "Result"
  And saya mengisi "Disbursement Date" dengan "21-10-2026" dan "Core Loan Number" dengan "LN-0012345"
  And saya mengklik tombol "Submit"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Disbursement recorded"
  And status pengajuan menjadi "Disbursed" dan langkah "Finish"
  And email "Kredit 20102026KTA0000013 telah dicairkan" terkirim ke pemohon
```

### AC-101.02 — Mencatat pencairan gagal

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Record Disbursement"
When Saya memilih "Failed" di "Result"
  And saya mengisi "Reason" dengan "Rekening nasabah tidak aktif"
  And saya mengklik tombol "Submit"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Disbursement failure recorded"
  And pengajuan masuk antrean "Recontest"
```

### AC-101.03 — Field wajib kosong

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Record Disbursement"
When Saya memilih "Disbursed" tanpa mengisi "Disbursement Date" dan "Core Loan Number"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong
```

### AC-101.04 — Tanggal cair sebelum tanggal yang divalidasi

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Record Disbursement"
  And Disbursement Date hasil Validity Check 21-10-2026
When Saya mengisi "Disbursement Date" dengan "20-10-2026"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Disbursement date must not be earlier than the validated date (21-10-2026)"
```

### AC-101.05 — Gagal tanpa alasan

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Record Disbursement"
When Saya memilih "Failed" tanpa mengisi "Reason"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Reason is required"
```

> Note: AC-101.01, AC-101.02, AC-101.03, AC-101.04, AC-101.05 mengikuti Grooming v2 N-05.

---

## US-102 — Mengatur Format Penomoran Dokumen (Maker)

### AC-102.01 — Mengubah format nomor SP3K

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Document Numbering"
  And format SP3K aktif "{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}" dengan reset Monthly
When Saya mengklik ikon edit pada baris "SP3K"
  And saya mengisi "Pattern" dengan "SP3K-{BRANCH_CODE}-{YYYY}{MM}-{SEQ:5}"
  And saya memilih "Monthly" di "Reset Period" dan "Branch" di "Counter Scope"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pratinjau "SP3K-011-202610-00001" dan pesan "Data submitted for approval"
  And format lama tetap dipakai sampai Checker menyetujui
```

### AC-102.02 — Nomor SP3K dibentuk dari format aktif

```gherkin
Given Saya seorang Approver level 1 (final)
  And saya berada di halaman "Approval Detail"
  And pengajuan KPR cabang 011
  And format SP3K aktif "{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}"
  And nomor urut SP3K cabang 011 bulan Oktober 2026 terakhir 0012
When Saya mengisi "Approval Comments"
  And saya mengklik tombol "Approve"
  And saya mengklik tombol "Yes"
Then Sistem membentuk SP3K bernomor "0013/SP3K/011/X/2026"
```

### AC-102.03 — Nomor urut direset saat periode berganti

```gherkin
Given Saya seorang Approver level 1 (final)
  And saya berada di halaman "Approval Detail"
  And format SP3K direset Monthly
  And SP3K terakhir cabang 011 bernomor "0013/SP3K/011/X/2026"
  And hari ini 01-11-2026
When Saya menyetujui pengajuan KPR cabang 011
Then Sistem membentuk SP3K bernomor "0001/SP3K/011/XI/2026"
```

### AC-102.04 — Pola tanpa nomor urut ditolak

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Edit Document Numbering"
When Saya mengisi "Pattern" dengan "SP3K/{BRANCH_CODE}/{YYYY}"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Pattern must contain exactly one sequence token {SEQ:n} with n between 3 and 9"
```

### AC-102.05 — Token tidak dikenal ditolak

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Edit Document Numbering"
When Saya mengisi "Pattern" dengan "{SEQ:4}/SP3K/{BRANCH_NAME}"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Unknown token: BRANCH_NAME"
```

### AC-102.06 — Nomor urut habis

```gherkin
Given Saya seorang Approver level 1 (final)
  And saya berada di halaman "Approval Detail"
  And format SP3K memakai "{SEQ:4}" dan nomor urut periode berjalan sudah 9999
When Saya menyetujui pengajuan KPR
Then Sistem menampilkan pesan "Document number sequence for SP3K has reached its limit. Please contact your administrator"
  And SP3K tidak dibentuk
```

### AC-102.07 — Dua dokumen dibentuk bersamaan

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Print Akad Form"
  And Admin Operasional lain mencetak akad cabang yang sama pada detik yang sama
  And nomor kontrak terakhir 000041
When Saya mengklik tombol "Print"
Then Kedua akad mendapat nomor kontrak berbeda: "011/PK/2026/000042" dan "011/PK/2026/000043"
```

### AC-102.08 — Nomor kontrak tercetak di akad

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Print Akad Form"
  And format CONTRACT aktif "{BRANCH_CODE}/PK/{YYYY}/{SEQ:6}" dengan reset Yearly
  And belum ada kontrak cabang 011 di tahun 2026
When Saya mengisi semua field
  And saya mengklik tombol "Print"
Then Sistem mengunduh PDF "Surat Perjanjian Kredit" dengan nomor kontrak "011/PK/2026/000001"
  And cetak ulang akad yang sama menampilkan nomor yang sama
```

> Note: AC-102.01 mengikuti Grooming v3 DN-05, DN-09. AC-102.02 mengikuti Grooming v3 DN-02. AC-102.03 mengikuti Grooming v3 DN-04. AC-102.04, AC-102.05 mengikuti Grooming v3 DN-03. AC-102.06 mengikuti Grooming v3 DN-08. AC-102.07 mengikuti Grooming v3 DN-07. AC-102.08 mengikuti Grooming v3 DN-06, DN-10.

---
