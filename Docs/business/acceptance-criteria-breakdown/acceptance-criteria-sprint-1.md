# Acceptance Criteria — Sprint 1

## User Stories in Scope

- **US-01** Masuk dengan Username dan Password — Pengguna LOS
- **US-06** Keluar dari Aplikasi — Pengguna LOS
- **US-09** Mengatur Hak Akses Menu per Role — Maker
- **US-12** Menyetujui atau Menolak Perubahan Master Data — Checker
- **US-14** Melihat Jejak Audit Perubahan — Auditor
- **US-20** Mengelola Produk Kredit — Maker
- **US-97** Mengatur Suku Bunga dan Biaya Produk — Maker

---

## US-01 — Masuk dengan Username dan Password (Pengguna LOS)

### AC-01.01 — Masuk dengan username dan password yang benar

```gherkin
Given Saya seorang Sales dengan username "sales.jkt01"
  And saya berada di halaman "Login"
When Saya mengetik "sales.jkt01" di field "Username"
  And saya mengetik password yang benar di field "Password"
  And saya mengklik tombol "Login"
Then Sistem menampilkan halaman "Dashboard"
  And nama lengkap, role "Sales", dan nama company saya tampil di header kanan atas
```

### AC-01.02 — Gagal masuk karena password salah

```gherkin
Given Saya seorang Sales dengan username "sales.jkt01"
  And saya berada di halaman "Login"
When Saya mengetik "sales.jkt01" di field "Username"
  And saya mengetik password yang salah di field "Password"
  And saya mengklik tombol "Login"
Then Sistem menampilkan pesan "Invalid username or password"
  And saya tetap di halaman "Login"
```

### AC-01.03 — Gagal masuk karena username tidak terdaftar

```gherkin
Given Saya seorang pengunjung
  And saya berada di halaman "Login"
When Saya mengetik "tidak.terdaftar" di field "Username"
  And saya mengetik "Abc12345!" di field "Password"
  And saya mengklik tombol "Login"
Then Sistem menampilkan pesan "Invalid username or password" yang sama persis dengan pesan password salah
  And saya tetap di halaman "Login"
```

### AC-01.04 — Gagal masuk karena field wajib kosong

```gherkin
Given Saya seorang pengunjung
  And saya berada di halaman "Login"
When Saya membiarkan field "Username" dan "Password" kosong
  And saya mengklik tombol "Login"
Then Sistem menampilkan pesan "Username is required" di bawah field "Username"
  And pesan "Password is required" tampil di bawah field "Password"
```

### AC-01.05 — Akun terkunci pada kegagalan kelima berturut-turut

```gherkin
Given Saya seorang Sales dengan username "sales.jkt01"
  And saya berada di halaman "Login"
  And saya sudah 4 kali berturut-turut salah memasukkan password
When Saya mengetik password yang salah
  And saya mengklik tombol "Login"
Then Sistem menampilkan pesan "Your account is locked for 15 minutes due to too many failed attempts"
  And login dengan password benar selama 15 menit berikutnya ditolak dengan pesan yang sama
```

### AC-01.06 — Login benar setelah 4 kegagalan belum terkunci

```gherkin
Given Saya seorang Sales dengan username "sales.jkt01"
  And saya berada di halaman "Login"
  And saya sudah 4 kali berturut-turut salah memasukkan password
When Saya mengetik password yang benar
  And saya mengklik tombol "Login"
Then Sistem menampilkan halaman "Dashboard"
  And hitungan gagal login saya kembali ke 0
```

### AC-01.07 — User berstatus Inactive tidak bisa masuk

```gherkin
Given Saya seorang pengguna dengan username "sales.jkt02" yang berstatus Inactive
  And saya berada di halaman "Login"
When Saya mengetik "sales.jkt02" dan password yang benar
  And saya mengklik tombol "Login"
Then Sistem menampilkan pesan "Your account is inactive. Please contact your administrator"
  And saya tetap di halaman "Login"
```

### AC-01.08 — Input berisi pola injeksi tidak memberi akses

```gherkin
Given Saya seorang pengunjung
  And saya berada di halaman "Login"
When Saya mengetik "admin' OR '1'='1" di field "Username"
  And saya mengetik "x" di field "Password"
  And saya mengklik tombol "Login"
Then Sistem menampilkan pesan "Invalid username or password"
  And saya tetap di halaman "Login" tanpa akses ke aplikasi
```

### AC-01.09 — Verifikasi dua langkah untuk role berwenang tinggi

```gherkin
Given Saya seorang Checker dengan username "checker.001"
  And saya berada di halaman "Login"
  And aplikasi authenticator saya sudah terdaftar
When Saya mengetik username dan password yang benar
  And saya mengklik tombol "Login"
Then Sistem menampilkan halaman "Verification Code"
  And halaman "Dashboard" baru tampil setelah saya mengisi kode 6 digit yang benar dari aplikasi authenticator
```

### AC-01.10 — Kode verifikasi salah

```gherkin
Given Saya seorang Checker
  And saya berada di halaman "Verification Code"
When Saya mengisi kode 6 digit yang salah
  And saya mengklik tombol "Verify"
Then Sistem menampilkan pesan "Invalid verification code"
  And saya tetap di halaman "Verification Code"
```

> Note: AC-01.05, AC-01.06, AC-01.09, AC-01.10 mengikuti Asumsi A-28.

> Note: Deferred, AC-01.09 dan AC-01.10 dipindah ke backlog pasca-POC (grooming AC tertunda POC 2026-10-22).

---

## US-06 — Keluar dari Aplikasi (Pengguna LOS)

### AC-06.01 — Keluar lewat tombol Logout

```gherkin
Given Saya seorang pengguna yang sudah login
  And saya berada di halaman "Dashboard"
When Saya mengklik ikon "Logout" di header
Then Sistem menampilkan halaman "Login"
  And menekan tombol Back di browser tidak menampilkan halaman aplikasi
```

### AC-06.02 — Membuka alamat halaman aplikasi setelah logout

```gherkin
Given Saya seorang pengguna yang baru saja logout
  And saya berada di halaman "Login"
When Saya mengetik alamat halaman "Dashboard" di address bar browser
Then Sistem menampilkan halaman "Login"
```

### AC-06.03 — Sesi berakhir setelah 30 menit tanpa aktivitas

```gherkin
Given Saya seorang pengguna yang sudah login
  And saya berada di halaman "Application Inquiry"
  And saya tidak melakukan aktivitas selama 30 menit
When Saya mengklik salah satu baris pengajuan
Then Sistem menampilkan halaman "Login" dengan pesan "Your session has expired. Please log in again"
```

### AC-06.04 — Sesi masih aktif pada menit ke-29

```gherkin
Given Saya seorang pengguna yang sudah login
  And saya berada di halaman "Application Inquiry"
  And saya tidak melakukan aktivitas selama 29 menit
When Saya mengklik salah satu baris pengajuan
Then Sistem menampilkan detail pengajuan yang saya klik
```

### AC-06.05 — Login di browser lain mengakhiri sesi sebelumnya

```gherkin
Given Saya seorang Sales yang sudah login di browser laptop
  And saya berada di halaman "Application Inquiry"
  And saya login lagi di browser lain dengan akun yang sama
When Saya mengklik salah satu baris pengajuan di browser laptop
Then Sistem menampilkan halaman "Login" dengan pesan "Your session was ended because you logged in from another browser"
```

> Note: AC-06.03, AC-06.04, AC-06.05 mengikuti Asumsi A-28.

---

## US-09 — Mengatur Hak Akses Menu per Role (Maker)

### AC-09.01 — Memberi akses menu ke role

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Role Access"
When Saya mengklik tombol "New Role Access"
  And saya memilih "Checker" di dropdown "Role"
  And saya memilih "Master Data" di dropdown "Menu" dan "Product" di dropdown "Sub Menu"
  And saya mengaktifkan toggle "View" dan "Approve"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And akses tampil di halaman "Pending Role Access" dengan status "Waiting Approval"
```

### AC-09.02 — Efek hak akses pada layar sesuai matriks

```gherkin
Given Saya seorang pengguna dengan role sesuai kolom Role
  And saya berada di halaman "Product"
When Saya membuka halaman "Product"
Then Refer to MRTM Rows: TRM_ACC_001 through TRM_ACC_004 for comprehensive logic combinations.
```

### AC-09.03 — Akses tanpa View ditolak

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Role Access"
When Saya memilih Role, Menu, dan Sub Menu
  And saya mengaktifkan toggle "Approve" tanpa mengaktifkan toggle "View"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "View access is required when other access is granted"
```

### AC-09.04 — Akses API ditolak walau tombol disembunyikan

```gherkin
Given Saya seorang Sales tanpa akses Create pada menu Product
When Saya mengirim permintaan pembuatan produk langsung ke alamat API produk
Then Sistem menolak permintaan dengan pesan "You do not have permission to perform this action"
  And tidak ada data produk yang dibuat
```

> Note: AC-09.01 mengikuti Asumsi A-13. AC-09.02 mengikuti Asumsi A-13, A-14.

#### MRTM US-09

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Role | View | Create/Update | Delete | Approve | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|---|---|
| US_09 | AC_09.02 | Pengguna LOS | TRM_ACC_001 | Sales | Tidak | Tidak | Tidak | Tidak | [-] | Menu "Product" tidak tampil; membuka alamat halaman menampilkan pesan "You do not have access to this page" |
| US_09 | AC_09.02 | Pengguna LOS | TRM_ACC_002 | Checker | Ya | Tidak | Tidak | Ya | [-] | Daftar produk tampil; tombol "New Product", ikon edit, dan ikon hapus tidak tampil; tombol "Approve" tampil di Pending Product |
| US_09 | AC_09.02 | Pengguna LOS | TRM_ACC_003 | Maker | Ya | Ya | Ya | Tidak | [-] | Daftar produk, tombol "New Product", dan ikon edit tampil; tombol "Approve" di Pending Product tidak tampil |
| US_09 | AC_09.02 | Pengguna LOS | TRM_ACC_004 | Admin Sistem | Ya | Ya | Ya | Ya | Admin tetap tidak bisa menyetujui perubahannya sendiri | Semua tombol tampil |

---

## US-12 — Menyetujui atau Menolak Perubahan Master Data (Checker)

### AC-12.01 — Menyetujui data baru

```gherkin
Given Saya seorang Checker
  And saya berada di halaman "Pending Product"
  And terdapat produk baru "KPR Subsidi" berstatus Waiting Approval yang diajukan "maker.01"
When Saya mengklik tombol "Detail" pada baris "KPR Subsidi"
  And saya mengklik tombol "Approve"
  And saya mengklik tombol "Yes" di konfirmasi "Are you sure you want to approve?"
Then Sistem menampilkan pesan "Data approved"
  And produk "KPR Subsidi" tampil di halaman "Product"
  And baris hilang dari "Pending Product"
  And audit trail mencatat persetujuan oleh saya
```

### AC-12.02 — Melihat perbandingan data lama dan baru

```gherkin
Given Saya seorang Checker
  And saya berada di halaman "Pending Product"
  And terdapat perubahan "Limit Auto Approval" produk KTA dari 10.000.000 menjadi 15.000.000
When Saya mengklik tombol "Detail" pada baris KTA
Then Sistem menampilkan dua kolom "Current Data" dan "Proposed Data" dengan field yang berubah ditandai, "Limit Auto Approval" 10.000.000 dan 15.000.000
```

### AC-12.03 — Menolak perubahan

```gherkin
Given Saya seorang Checker
  And saya berada di halaman "Pending Product"
  And terdapat perubahan produk "KTA" berstatus Waiting Approval
When Saya mengklik tombol "Detail" pada baris "KTA"
  And saya mengklik tombol "Reject"
  And saya mengklik tombol "Yes" di konfirmasi "Are you sure you want to reject?"
Then Sistem menampilkan pesan "Data rejected"
  And data produk "KTA" di halaman "Product" tidak berubah
  And baris hilang dari "Pending Product"
```

### AC-12.04 — Maker tidak bisa menyetujui perubahannya sendiri

```gherkin
Given Saya seorang pengguna "admin.01" dengan akses Create dan Approve
  And saya berada di halaman "Pending Role"
  And perubahan role "Credit Analyst" diajukan oleh "admin.01"
When Saya mengklik tombol "Detail" pada baris "Credit Analyst"
Then Sistem menampilkan detail tanpa tombol "Approve", "Reject", dan "Revise"
  And tampil keterangan "You cannot review your own submission"
```

### AC-12.05 — Dua Checker memproses perubahan yang sama

```gherkin
Given Saya seorang Checker
  And saya berada di halaman "Pending Product"
  And Checker lain sudah menyetujui perubahan "KTA" saat detailnya masih terbuka di layar saya
When Saya mengklik tombol "Approve"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "This submission has already been processed"
  And data tidak diproses dua kali
```

### AC-12.06 — Perubahan kedua untuk data yang masih menunggu persetujuan ditolak

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Product"
  And produk "KTA" punya perubahan berstatus Waiting Approval
When Saya mengklik ikon edit pada baris "KTA"
Then Sistem menampilkan pesan "This data has a pending submission and cannot be edited"
```

### AC-12.07 — Menyetujui paket impor sekaligus

```gherkin
Given Saya seorang Checker
  And saya berada di halaman "Pending General Parameter"
  And terdapat satu paket impor berisi 50 parameter yang diajukan "maker.01"
When Saya mengklik tombol "Detail" pada paket tersebut
  And saya mengklik tombol "Approve"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Data approved"
  And ke-50 parameter berlaku sekaligus
  And paket hilang dari "Pending General Parameter"
```

> Note: AC-12.04 mengikuti Asumsi A-14. AC-12.07 mengikuti Asumsi A-33.

---

## US-14 — Melihat Jejak Audit Perubahan (Auditor)

### AC-14.01 — Mencari jejak audit berdasarkan modul dan tanggal

```gherkin
Given Saya seorang Auditor
  And saya berada di halaman "Audit Trail"
When Saya memilih "Product" di dropdown "Module"
  And saya memilih periode "01-10-2026" s.d. "31-10-2026"
  And saya mengklik tombol "Search"
Then Sistem menampilkan daftar aktivitas modul Product pada periode tersebut dengan kolom Date Time, User, Action, Record
```

### AC-14.02 — Melihat detail perubahan

```gherkin
Given Saya seorang Auditor
  And saya berada di halaman "Audit Trail"
  And terdapat aktivitas "Approve" untuk produk "KTA"
When Saya mengklik baris aktivitas tersebut
Then Sistem menampilkan data sebelum dan sesudah perubahan berdampingan dengan field yang berubah ditandai
```

### AC-14.03 — Periode pencarian tidak valid

```gherkin
Given Saya seorang Auditor
  And saya berada di halaman "Audit Trail"
When Saya memilih periode "31-10-2026" s.d. "01-10-2026"
  And saya mengklik tombol "Search"
Then Sistem menampilkan pesan "End date must be on or after start date"
```

### AC-14.04 — Periode pencarian lebih dari 366 hari

```gherkin
Given Saya seorang Auditor
  And saya berada di halaman "Audit Trail"
When Saya memilih periode "01-01-2025" s.d. "02-01-2026"
  And saya mengklik tombol "Search"
Then Sistem menampilkan pesan "Search period must not exceed 366 days"
```

### AC-14.05 — Jejak audit tidak bisa diubah atau dihapus

```gherkin
Given Saya seorang Auditor
  And saya berada di halaman "Audit Trail"
When Saya membuka detail salah satu aktivitas
Then Sistem tidak menampilkan tombol edit atau hapus
```

### AC-14.06 — Menyaring jejak audit berdasarkan jenis kejadian

```gherkin
Given Saya seorang Auditor
  And saya berada di halaman "Audit Trail"
When Saya memilih "Authentication" di dropdown "Event Type"
  And saya memilih periode "01-10-2026" s.d. "31-10-2026"
  And saya mengklik tombol "Search"
Then Sistem menampilkan login berhasil, login gagal, dan logout pada periode tersebut dengan kolom Date Time, User, Action, IP Address
  And pilihan "Event Type" berisi Master Data, Application Action, Authentication, dan Data Access
```

> Note: AC-14.06 mengikuti Asumsi A-38.

---

## US-20 — Mengelola Produk Kredit (Maker)

### AC-20.01 — Membuat produk baru

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Product"
When Saya mengklik tombol "New Product"
  And saya mengisi "Product Code" "KTA", "Product Name" "Kredit Tanpa Agunan"
  And saya memilih "Non Collateral Loan" di "Product Category" dan "Effective" di "Interest Type"
  And saya mengisi Minimal Plafond "5.000.000", Maximal Plafond "300.000.000", Minimum Tenor "6", Maximum Tenor "60", Minimum Age "21", Maximum Age "55", DBR Max "40", Limit Auto Approval "10.000.000"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And produk "KTA" tampil di halaman "Pending Product" dengan status "Waiting Approval"
```

### AC-20.02 — Maximal Plafond lebih kecil dari Minimal Plafond

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Product"
When Saya mengisi Minimal Plafond "300.000.000" dan Maximal Plafond "5.000.000"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Maximal plafond must be greater than minimal plafond"
```

### AC-20.03 — Kode produk sudah ada

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Product"
  And produk "KTA" sudah ada
When Saya mengisi "Product Code" dengan "kta" dan field lain dengan data valid
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Product code already exists"
```

### AC-20.04 — Kode produk 6 karakter ditolak

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Product"
When Saya mengisi "Product Code" dengan "KPRSUB"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Product code must be 1 to 5 letters or digits"
```

### AC-20.05 — Limit Auto Approval melebihi Maximal Plafond

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Product"
When Saya mengisi Maximal Plafond "300.000.000" dan Limit Auto Approval "300.000.001"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Limit auto approval must not exceed maximal plafond"
```

### AC-20.06 — Produk baru tanpa rute tidak muncul di form pengajuan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application"
  And produk "KTA" sudah disetujui tetapi belum punya rute produk yang disetujui
When Saya mengklik dropdown "Product"
Then Sistem tidak menampilkan "KTA" di daftar produk
```

### AC-20.07 — Maximum Tenor melebihi batas core banking

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Product"
  And parameter "CORE_MAX_TENOR_MONTHS" company "001" bernilai 24
When Saya mengisi "Maximum Tenor" dengan "36" dan field lain dengan data valid
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Maximum tenor must not exceed core banking limit (24 months)"
```

### AC-20.08 — Perubahan produk tidak memengaruhi pengajuan yang sudah disubmit

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And pengajuan KTA "20102026KTA0000013" disubmit saat DBR Max produk 40
  And perubahan DBR Max KTA menjadi 35 disetujui setelahnya
When Saya mengklik langkah "RAC" di timeline pengajuan tersebut
Then Sistem menampilkan RAC dihitung dengan DBR Max 40
```

> Note: AC-20.01 mengikuti Asumsi A-25. AC-20.04 mengikuti Asumsi A-24. AC-20.06 mengikuti Rute produk R-09. AC-20.07 mengikuti Grooming v3 (CORE_MAX_TENOR_MONTHS). AC-20.08 mengikuti Asumsi A-36.

---

## US-97 — Mengatur Suku Bunga dan Biaya Produk (Maker)

### AC-97.01 — Mengatur pricing produk

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Product"
When Saya membuka tab "Pricing" pada produk "KTA"
  And saya menambah baris Interest Rate 12% p.a. berlaku 01-10-2026 s.d. 31-12-2026 dan baris Interest Rate 14% p.a. berlaku mulai 01-01-2027 tanpa tanggal akhir
  And saya mengisi "Approver Rate Range" 11% s.d. 15% pada kedua baris
  And saya mengisi "Provision Fee (%)" "1" dan "Admin Fee" "250.000"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And perubahan pricing tampil di "Pending Product"
```

### AC-97.02 — Periode harga tumpang tindih

```gherkin
Given Saya seorang Maker
  And saya berada di tab "Pricing" produk "KTA"
When Saya menambah baris berlaku 01-10-2026 s.d. 31-12-2026 dan baris berlaku mulai 15-12-2026
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Pricing periods must not overlap"
```

### AC-97.03 — Rentang suku bunga Approver tidak mencakup suku bunga

```gherkin
Given Saya seorang Maker
  And saya berada di tab "Pricing" produk "KTA"
When Saya mengisi Interest Rate 14% p.a. dengan "Approver Rate Range" 10% s.d. 13%
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Approver rate range must include the interest rate"
```

### AC-97.04 — Suku bunga tampil read-only di pengajuan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Application"
  And pricing KTA yang berlaku hari ini ber-Interest Rate 14% p.a.
When Saya memilih Product "KTA"
Then Sistem menampilkan "Interest Rate" 14% p.a. dalam keadaan tidak bisa diedit
```

### AC-97.05 — Approver mengubah suku bunga di luar rentang

```gherkin
Given Saya seorang Approver level 1
  And saya berada di halaman "Approval Detail"
  And pengajuan KTA tenor 36 dengan Interest Rate 14% dan Approver Rate Range 11% s.d. 15%
When Saya mengubah "Interest Rate" menjadi "16"
  And saya mengisi "Approval Comments"
  And saya mengklik tombol "Approve"
Then Sistem menampilkan pesan "Interest rate must be between 11% and 15%"
```

### AC-97.06 — Approver mengubah suku bunga dalam rentang

```gherkin
Given Saya seorang Approver level 1
  And saya berada di halaman "Approval Detail"
  And pengajuan KTA tenor 36 dengan Interest Rate 14% dan Approver Rate Range 11% s.d. 15%
When Saya mengubah "Interest Rate" menjadi "13"
  And saya mengisi "Approval Comments" dengan "Nasabah payroll"
  And saya mengklik tombol "Approve"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Loan application is successfully approved"
  And jadwal angsuran dihitung dengan 13% p.a.
  And riwayat mencatat perubahan Interest Rate dari 14% menjadi 13%
```

> Note: AC-97.01, AC-97.02, AC-97.03, AC-97.04, AC-97.05, AC-97.06 mengikuti Asumsi A-48. AC-97.01 s.d. AC-97.04 ditulis ulang untuk suku bunga per periode berlaku (Grooming v2 R-19, grooming AC tertunda POC 2026-10-22).

---
