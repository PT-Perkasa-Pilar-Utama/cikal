# Acceptance Criteria — Sprint 3

## User Stories in Scope

- **US-23** Memperbarui Data Wilayah — Maker
- **US-25** Mengatur Dokumen Wajib Pengajuan — Maker
- **US-40** Mengisi Data Pribadi Pemohon — Sales
- **US-44** Mengisi Data Pekerjaan Pemohon — Sales
- **US-47** Mengunggah Dokumen Pendukung — Sales
- **US-48** Mengisi Kontak Darurat — Sales
- **US-49** Menyimpan Pengajuan sebagai Draft — Sales
- **US-50** Mengirim Pengajuan untuk Diproses — Sales

---

## US-23 — Memperbarui Data Wilayah (Maker)

### AC-23.01 — Menjalankan sinkronisasi wilayah

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Master Geography"
When Saya mengklik tombol "Sync Region Data"
  And saya mengklik tombol "Yes" di konfirmasi
Then Sistem menampilkan pesan "Region sync completed: 12 added, 3 updated"
  And kolom "Last Sync" berisi waktu sinkronisasi
```

### AC-23.02 — Sumber data wilayah tidak merespons

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Master Geography"
  And layanan data wilayah tidak tersedia
When Saya mengklik tombol "Sync Region Data"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Region sync failed. Existing data is unchanged"
  And data wilayah tidak berubah
```

### AC-23.03 — Mencari wilayah tanpa membedakan huruf besar dan kecil

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Master Geography"
When Saya mengetik "gam" di field "Search"
Then Sistem menampilkan wilayah yang mengandung "gam" di provinsi, kota, kecamatan, kelurahan, atau kode pos, misalnya "Gambir"
```

### AC-23.04 — Filter berjenjang

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Master Geography"
When Saya membuka filter
  And saya memilih Province "DKI Jakarta"
  And saya mengklik dropdown "City"
Then Sistem menampilkan hanya kota di provinsi DKI Jakarta
```

---

## US-25 — Mengatur Dokumen Wajib Pengajuan (Maker)

### AC-25.01 — Membuat daftar dokumen wajib

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Document Checklist"
When Saya mengklik tombol "New Document Checklist"
  And saya memilih Product "KPR", Occupation "Karyawan Swasta", Marital "Kawin"
  And saya mencentang dokumen "KTP", "KK", "NPWP", "Slip Gaji", "Rekening Koran 3 Bulan", "Sertifikat", "KTP Pasangan"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And checklist tampil di "Pending Document Checklist" dengan jumlah dokumen 7
```

### AC-25.02 — Tanpa dokumen yang dipilih

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Document Checklist"
When Saya memilih Product, Occupation, dan Marital tanpa mencentang dokumen
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Select at least one document"
```

### AC-25.03 — Kombinasi sudah ada

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Document Checklist"
  And checklist KPR / Karyawan Swasta / Kawin sudah ada
When Saya memilih kombinasi yang sama
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Document checklist already exists for this combination"
```

### AC-25.04 — Form pengajuan memakai checklist yang cocok

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Document"
  And pengajuan KPR, Occupation Karyawan Swasta, Marital Kawin
When Saya membuka step "Document"
Then Sistem menampilkan 7 slot unggah sesuai checklist KPR / Karyawan Swasta / Kawin
```

### AC-25.05 — Tidak ada checklist untuk kombinasi pengajuan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Document"
  And tidak ada checklist untuk KTA / Pelajar / Belum Kawin
When Saya membuka step "Document"
Then Sistem menampilkan pesan "No document checklist is configured for this product. Please contact your administrator"
  And tombol "Submit" pengajuan nonaktif
```

---

## US-40 — Mengisi Data Pribadi Pemohon (Sales)

### AC-40.01 — Mengisi data pribadi lengkap

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And produk KTA dengan Requested Limit 20.000.000
When Saya mengisi "Full Name" "Rudi Hartono", "Full Name ID" "RUDI HARTONO", "Place of Birth" "Bandung", "Date of Birth" "14-02-1990"
  And saya memilih Gender "Laki-laki", Religion "Islam", Nationality "WNI", Education "S1", Marital "Belum Kawin"
  And saya mengisi "Mother Maiden Name" "Siti", "ID Card Number" "3273011402900001", "ID Date Issued" "10-01-2020"
  And saya mengisi alamat KTP dengan memilih Province, City, District, Sub District berjenjang
  And saya mengklik tombol "Next"
Then Sistem menampilkan step "Occupation" karena Marital "Belum Kawin"
```

### AC-40.02 — NIK bukan 16 digit

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And ID Type "KTP"
When Saya mengisi "ID Card Number" dengan "327301140290000"
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "ID card number must be 16 digits"
```

### AC-40.03 — Usia pemohon di bawah minimum produk

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And produk KTA mensyaratkan usia 21 s.d. 55 tahun
  And hari ini 20-10-2026
When Saya mengisi "Date of Birth" dengan "21-10-2005"
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "Applicant age must be between 21 and 55 years for this product"
```

### AC-40.04 — Usia pemohon tepat 21 tahun

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And produk KTA mensyaratkan usia 21 s.d. 55 tahun
  And hari ini 20-10-2026
When Saya mengisi "Date of Birth" dengan "20-10-2005" dan field wajib lain dengan data valid
  And saya mengklik tombol "Next"
Then Sistem menampilkan step berikutnya
```

### AC-40.05 — NPWP wajib untuk limit di atas 50 juta

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And Requested Limit 50.000.001
When Saya membiarkan "NPWP Number" kosong dan field wajib lain terisi
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "NPWP is required for requested limit above 50,000,000"
```

### AC-40.06 — NPWP tidak wajib untuk limit tepat 50 juta

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And Requested Limit 50.000.000
When Saya membiarkan "NPWP Number" kosong dan field wajib lain terisi
  And saya mengklik tombol "Next"
Then Sistem menampilkan step berikutnya
```

### AC-40.07 — Alamat domisili sama dengan KTP

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And alamat KTP sudah terisi
When Saya mencentang checkbox "Same as ID Address"
Then Sistem menyalin seluruh field alamat KTP ke section "Residence Address" dan field tersebut tidak bisa diedit
```

### AC-40.08 — Persetujuan pemohon dicatat

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
When Saya mencentang checkbox "Applicant consents to credit checking and personal data processing"
  And saya mengklik tombol "Next"
Then Sistem menyimpan waktu persetujuan dan kanal "WEB" pada pengajuan
  And pengajuan tanpa centang tetap bisa lanjut selama parameter "REQUIRE_CONSENT_FOR_EXTERNAL_CHECK" bernilai "No"
```

### AC-40.09 — Usia pemohon saat lunas melebihi batas produk

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And produk KTA dengan usia maksimal saat lunas 55 tahun
  And Tenor Proposed 60 bulan
  And hari ini 20-10-2026
When Saya mengisi "Date of Birth" dengan "20-10-1975" dan field wajib lain dengan data valid
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "Applicant age at maturity must not exceed 55 years"
```

### AC-40.10 — Pilihan ID Type hanya KTP

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
When Saya mengklik dropdown "ID Type"
Then Sistem hanya menampilkan pilihan "KTP"
```

> Note: AC-40.01, AC-40.05 mengikuti Asumsi A-16. AC-40.02, AC-40.10 mengikuti Grooming v2 E-06. AC-40.08 mengikuti Grooming v3 (IN-12). AC-40.09 mengikuti Grooming v2 E-07.

---

## US-44 — Mengisi Data Pekerjaan Pemohon (Sales)

### AC-44.01 — Mengisi data pekerjaan karyawan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Occupation"
When Saya memilih "Bekerja" di "Source of Income", "Karyawan Swasta" di "Occupation", "Perdagangan" di "Industry of Profession"
  And saya mengisi "Tenure at Current Job (Years)" "4" dan "Monthly Income Allowance" "8.000.000"
  And saya mengisi data perusahaan
  And saya mengklik tombol "Next"
Then Sistem menampilkan step berikutnya sesuai produk
```

### AC-44.02 — Penghasilan bulanan 0

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Occupation"
  And produk KTA
When Saya mengisi "Monthly Income Allowance" dengan "0"
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "Monthly income must be greater than 0"
```

### AC-44.03 — Penghasilan dan lama kerja tidak wajib untuk produk Pension

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Occupation"
  And produk Pension
When Saya membiarkan "Monthly Income Allowance" dan "Tenure at Current Job" kosong
  And saya mengklik tombol "Next"
Then Sistem menampilkan step berikutnya tanpa pesan wajib isi
```

### AC-44.04 — KUR hanya untuk wiraswasta

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Occupation"
  And produk KUR Kecil
When Saya memilih "Karyawan Swasta" di "Occupation"
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "This product is only available for self-employed applicants"
```

### AC-44.05 — Field wajib Occupation kosong

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Occupation"
  And produk KTA
When Saya membiarkan "Occupation" dan "Company Name" kosong
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong
  And saya tetap di step "Occupation"
```

> Note: AC-44.01 mengikuti Data dictionary (Grooming T-01). AC-44.05 mengikuti Field Dictionary (Grooming T-01).

---

## US-47 — Mengunggah Dokumen Pendukung (Sales)

### AC-47.01 — Mengunggah dokumen sesuai checklist

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Document"
  And checklist memuat 7 dokumen
When Saya mengklik tombol "Upload" pada slot "KTP"
  And saya memilih file "ktp.jpg" berukuran 800 KB
Then Sistem menampilkan nama file "ktp.jpg" dengan status "Uploaded" pada slot "KTP"
  And penghitung kelengkapan menjadi "1 of 7 documents"
```

### AC-47.02 — Ekstensi file tidak diizinkan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Document"
When Saya mengklik tombol "Upload" pada slot "NPWP"
  And saya memilih file "npwp.exe"
Then Sistem menampilkan pesan "Allowed file types: png, jpg, jpeg, pdf, docx"
```

### AC-47.03 — File tepat 2 MB diterima

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Document"
When Saya mengklik tombol "Upload" pada slot "Slip Gaji"
  And saya memilih file PDF berukuran tepat 2 MB
Then Sistem menampilkan status "Uploaded" pada slot "Slip Gaji"
```

### AC-47.04 — File 2,1 MB ditolak

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Document"
When Saya mengklik tombol "Upload" pada slot "Slip Gaji"
  And saya memilih file PDF berukuran 2,1 MB
Then Sistem menampilkan pesan "File must not exceed 2 MB"
```

### AC-47.05 — Melihat dan mengganti dokumen

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Document"
  And slot "KTP" sudah berisi file
When Saya mengklik ikon ganti pada slot "KTP"
  And saya memilih file "ktp-baru.jpg"
Then Sistem menampilkan "ktp-baru.jpg" pada slot "KTP" dan file lama tidak lagi dipakai
```

### AC-47.06 — Dokumen opsional tidak dihitung sebagai syarat

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Document"
  And checklist memuat 7 dokumen wajib dan 1 dokumen opsional "BPJS"
When Saya membuka step "Document"
Then Sistem menampilkan slot "BPJS" dengan label "Optional"
  And penghitung kelengkapan menampilkan "0 of 7 documents"
```

> Note: AC-47.01, AC-47.02, AC-47.03, AC-47.04 mengikuti Asumsi A-17. AC-47.06 mengikuti Grooming v2 T-02.

---

## US-48 — Mengisi Kontak Darurat (Sales)

### AC-48.01 — Mengisi kontak darurat

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Emergency Contact"
When Saya mengisi "Contact Name" "Dewi", "Mobile Number" "081234567890"
  And saya memilih "Saudara Kandung" di "Relation with Applicant"
  And saya mengisi alamat kontak
Then Sistem menampilkan tombol "Save as Draft" dan "Submit" dalam keadaan aktif
```

### AC-48.02 — Nomor HP tidak valid

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Emergency Contact"
When Saya mengisi "Mobile Number" dengan "12345"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Mobile number must start with 08 and contain 10 to 13 digits"
```

### AC-48.03 — Nomor kontak darurat sama dengan nomor pemohon

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Emergency Contact"
  And nomor HP pemohon 081234567890
When Saya mengisi "Mobile Number" dengan "081234567890"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Emergency contact number must be different from applicant number"
```

### AC-48.04 — Nomor HP 14 digit ditolak

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Emergency Contact"
When Saya mengisi "Mobile Number" dengan "08123456789012"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Mobile number must start with 08 and contain 10 to 13 digits"
```

---

## US-49 — Menyimpan Pengajuan sebagai Draft (Sales)

### AC-49.01 — Menyimpan draft pertama kali membentuk Loan ID

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application"
  And saya sudah mengisi Application Type, Identity Type, Identity Number, Product Category, Product "KTA", Full Name, dan Full Name ID
  And hari ini 20-10-2026
  And Loan ID KTA terakhir hari ini berakhiran 0000012
When Saya mengklik tombol "Save as Draft"
Then Sistem menampilkan pesan "Application saved as draft. Loan ID: 20102026KTA0000013"
  And pengajuan tampil di "Application List" dengan status "Draft"
```

### AC-49.02 — Draft tanpa field minimum

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application"
  And field Product belum diisi
When Saya mengklik tombol "Save as Draft"
Then Sistem menampilkan pesan "Fill in Application Type, Identity Type, Identity Number, Product Category, Product, Full Name, and Full Name ID to save a draft"
```

### AC-49.03 — Loan ID tidak berubah saat draft disimpan ulang

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application"
  And draft "20102026KTA0000013" sudah ada
When Saya mengubah "Place of Birth"
  And saya mengklik tombol "Save as Draft"
Then Sistem menampilkan pesan "Application saved as draft. Loan ID: 20102026KTA0000013"
```

### AC-49.04 — Pembentukan Loan ID sesuai matriks

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application"
When Saya mengklik tombol "Save as Draft" untuk draft pertama sesuai baris MRTM
Then Refer to MRTM Rows: TRM_LID_001 through TRM_LID_006 for comprehensive logic combinations.
```

### AC-49.05 — Melanjutkan draft

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application List"
  And draft "20102026KTA0000013" tersimpan sampai step Occupation
When Saya mengklik Loan ID "20102026KTA0000013"
Then Sistem menampilkan form pengajuan pada step "Occupation" dengan data sebelumnya terisi
```

### AC-49.06 — Sales lain tidak bisa mengedit draft saya

```gherkin
Given Saya seorang Sales "sales.jkt02"
  And saya berada di halaman "Application List"
  And draft "20102026KTA0000013" milik "sales.jkt01"
When Saya mencari Loan ID "20102026KTA0000013"
Then Sistem tidak menampilkan draft tersebut di daftar saya
```

> Note: AC-49.01 mengikuti Asumsi A-15, A-24. AC-49.02 mengikuti Asumsi A-15. AC-49.04 mengikuti Asumsi A-24. AC-49.06 mengikuti Asumsi A-34.

#### MRTM US-49

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Tanggal Simpan | Kode Produk | Company | Counter Terakhir | Kondisi Bersamaan | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|---|---|
| US_49 | AC_49.04 | Sales | TRM_LID_001 | 20-10-2026 | KTA | 001 | 0000012 | - | [-] | Loan ID 20102026KTA0000013 |
| US_49 | AC_49.04 | Sales | TRM_LID_002 | 20-10-2026 | KPR | 001 | 0000040 | - | Counter terpisah per produk | Loan ID 20102026KPR0000041 |
| US_49 | AC_49.04 | Sales | TRM_LID_003 | 21-10-2026 | KTA | 001 | 0000013 | - | Counter tidak direset per hari | Loan ID 21102026KTA0000014 |
| US_49 | AC_49.04 | Sales | TRM_LID_004 | 20-10-2026 | KTA | 007 | 0000000 | - | Counter terpisah per company | Loan ID 20102026KTA0000001 |
| US_49 | AC_49.04 | Sales | TRM_LID_005 | 20-10-2026 | KTA | 001 | 9999999 | - | Batas counter | Sistem menampilkan pesan "Loan ID counter has reached its limit. Please contact your administrator" |
| US_49 | AC_49.04 | Sales | TRM_LID_006 | 20-10-2026 | KTA | 001 | 0000012 | Ada draft lain disimpan bersamaan | Dua Sales menyimpan pada detik yang sama | Kedua draft mendapat Loan ID berbeda: 0000013 dan 0000014 |

---

## US-50 — Mengirim Pengajuan untuk Diproses (Sales)

### AC-50.01 — Submit pengajuan lengkap

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Emergency Contact"
  And semua step wajib dan dokumen produk KTA sudah lengkap
  And rute KTA tidak memakai modul Survey
When Saya mengklik tombol "Submit"
  And saya mengklik tombol "Yes" di konfirmasi "Submit this application?"
Then Sistem menampilkan pesan "Application submitted. Loan ID: 20102026KTA0000013"
  And status pengajuan menjadi "On Progress" dengan langkah saat ini "Dedup"
  And data pengajuan tidak bisa diedit lagi oleh Sales
```

### AC-50.02 — Submit dengan dokumen belum lengkap

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Emergency Contact"
  And baru 5 dari 7 dokumen terunggah
When Saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Please upload all required documents (5 of 7 required)"
  And sistem menampilkan step "Document"
```

### AC-50.03 — Submit dengan field wajib di step lain kosong

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Emergency Contact"
  And field "Education" di step Personal kosong
When Saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Please complete all required fields"
  And step "Personal" bertanda error di stepper
```

### AC-50.04 — Langkah pertama mengikuti rute produk

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Emergency Contact"
  And pengajuan KPR lengkap dan rute KPR memakai modul Survey
When Saya mengklik tombol "Submit"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Application submitted. Loan ID: 20102026KPR0000041"
  And langkah saat ini "Survey" dan pengajuan masuk antrean "Application LKN - KPR"
```

### AC-50.05 — Email konfirmasi ke pemohon

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Emergency Contact"
  And email pemohon "rudi@contoh.com" terisi
When Saya mengklik tombol "Submit"
  And saya mengklik tombol "Yes"
Then Sistem mengirim email ke "rudi@contoh.com" dengan subjek "Pengajuan kredit 20102026KTA0000013 telah kami terima"
```

### AC-50.06 — Urutan step form pengajuan sesuai matriks

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application"
  And produk, status perkawinan, dan pekerjaan sesuai baris MRTM
When Saya mengklik tombol "Next" di setiap step sampai step terakhir
Then Refer to MRTM Rows: TRM_STP_001 through TRM_STP_006 for comprehensive logic combinations.
```

### AC-50.07 — Tombol Submit diklik dua kali

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Emergency Contact"
  And semua step wajib dan dokumen sudah lengkap
When Saya mengklik tombol "Submit" dua kali dengan cepat
  And saya mengklik tombol "Yes" di konfirmasi
Then Sistem hanya menjalankan satu proses untuk pengajuan tersebut
  And riwayat proses hanya berisi satu langkah "Data Entry"
```

> Note: AC-50.02 mengikuti Grooming v2 T-02. AC-50.04 mengikuti Asumsi A-05. AC-50.05 mengikuti Asumsi A-27. AC-50.06 mengikuti Asumsi A-25.

#### MRTM US-50

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Produk (Kategori) | Marital | Occupation | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|
| US_50 | AC_50.06 | Sales | TRM_STP_001 | KTA (Non Collateral) | Belum Kawin | Karyawan Swasta | [-] | Application > Personal > Occupation > Document > Emergency Contact |
| US_50 | AC_50.06 | Sales | TRM_STP_002 | KTA (Non Collateral) | Kawin | Karyawan Swasta | [-] | Application > Personal > Spouse > Occupation > Document > Emergency Contact |
| US_50 | AC_50.06 | Sales | TRM_STP_003 | Kredit Agunan (Collateral) | Kawin | Wiraswasta | [-] | Application > Personal > Spouse > Occupation > Business > Collateral > Document > Emergency Contact |
| US_50 | AC_50.06 | Sales | TRM_STP_004 | KUR Kecil (Collateral) | Belum Kawin | Wiraswasta | [-] | Application > Personal > Occupation > Business > Collateral > Document > Emergency Contact |
| US_50 | AC_50.06 | Sales | TRM_STP_005 | KPR (Collateral) | Cerai Hidup | ASN | Agunan otomatis Sertifikat | Application > Personal > Occupation > Collateral > Document > Emergency Contact |
| US_50 | AC_50.06 | Sales | TRM_STP_006 | Pension | Kawin | Pensiunan | Wajib verifikasi Taspen | Application > Personal (Taspen) > Spouse > Occupation > Collateral (SK) > Document > Emergency Contact |

---
