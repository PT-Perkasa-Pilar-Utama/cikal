# Acceptance Criteria — Sprint 7

## User Stories in Scope

- **US-02** Masuk dengan Akun SSO Perusahaan — Pegawai bank dengan akun SSO
- **US-03** Meminta Tautan Reset Password — Pengguna LOS dengan akun lokal
- **US-04** Mengatur Ulang Password — Pengguna LOS dengan akun lokal
- **US-05** Mengganti Password — Pengguna LOS dengan akun lokal
- **US-07** Mendaftarkan Pengguna Aplikasi — Maker
- **US-08** Mengelola Role — Maker
- **US-10** Mengatur Hak Akses Khusus per Pengguna — Maker
- **US-11** Mengelola Menu Aplikasi — Super User
- **US-13** Meminta dan Mengerjakan Revisi Perubahan — Checker dan Maker
- **US-15** Mendaftarkan Company Baru — Super User
- **US-16** Menyalin Konfigurasi dari Company Lain — Super User
- **US-17** Mengelola Struktur Organisasi Company — Maker
- **US-18** Mengelola Mata Uang Company — Maker
- **US-19** Mengelola Kurs Mata Uang — Maker
- **US-21** Mengelola General Parameter — Maker
- **US-22** Mengimpor dan Mengekspor General Parameter — Maker
- **US-24** Mengelola Template Dokumen — Maker
- **US-26** Mengatur Level Approval — Maker
- **US-28** Mengimpor Setup Approval — Maker
- **US-29** Mengelola Data Perusahaan Asuransi — Maker
- **US-30** Mengatur Parameter Sistem — Maker
- **US-32** Melihat Diagram Rute Produk — Maker, Checker, dan Risk Manager
- **US-33** Mengatur Dedup Matrix — Maker
- **US-34** Mengatur Aturan Verifikasi Dukcapil — Maker
- **US-35** Mengatur Fraud Matrix — Maker
- **US-41** Mengisi Data Pribadi dari Foto KTP — Sales
- **US-42** Memverifikasi Data Pensiun Pemohon — Sales
- **US-43** Mengisi Data Pasangan Pemohon — Sales
- **US-45** Mengisi Data Usaha Pemohon — Sales
- **US-46** Mengisi Data Agunan — Sales
- **US-52** Mengunggah Pengajuan Massal — Sales
- **US-53** Memantau Hasil Upload Massal — Sales
- **US-54** Mengirim Pengajuan melalui API Mitra — Tim IT mitra penyalur
- **US-55** Mencatat Pembayaran Biaya Appraisal — Customer Service
- **US-56** Mengisi Laporan Kunjungan Nasabah Mikro — Surveyor
- **US-57** Mengisi Laporan Kunjungan dan Appraisal KPR — Surveyor
- **US-60** Meninjau Hasil Duplikasi — Verifikator
- **US-62** Meninjau Hasil Dukcapil — Verifikator
- **US-63** Memutuskan Review Dukcapil Tingkat Supervisor — Supervisor
- **US-66** Meninjau Pengajuan Mencurigakan — Verifikator
- **US-70** Mendapatkan Hasil Pengecekan SIKP — Risk Manager
- **US-71** Memproses Ulang Pengajuan yang Ditolak — Risk Manager
- **US-75** Mengajukan E-Polis Asuransi Kredit — Admin Operasional
- **US-78** Mencetak Ulang Akad Kredit — Admin Operasional
- **US-79** Mengirim Data Pencairan ke Core Banking — Admin Operasional
- **US-80** Mencatat Respons Pencairan dari Core Banking — Admin Operasional
- **US-81** Melihat Dashboard Ringkasan Pengajuan — Kepala Cabang
- **US-82** Mengekspor Laporan Pengajuan — Kepala Cabang
- **US-87** Menerima Notifikasi Status Pengajuan — Nasabah
- **US-88** Melihat Beranda Mobile — Sales
- **US-89** Membuat Pengajuan dari Mobile — Sales
- **US-90** Melihat Daftar Pengajuan Saya di Mobile — Sales
- **US-91** Mengisi Laporan Kunjungan dari Mobile — Surveyor
- **US-92** Melihat Profil Pengguna di Mobile — Sales
- **US-93** Melihat Perangkat yang Dipakai Sales — Admin Sistem
- **US-94** Mensimulasikan Respons Layanan Eksternal — QA
- **US-95** Mengelola Blacklist — Risk Manager
- **US-96** Mengelola Aplikasi Mitra API — Maker
- **US-98** Memigrasikan Data LOS OS11 — Admin Sistem
- **US-99** Mengelola Lisensi Modul — Tim internal PPU

---

## US-02 — Masuk dengan Akun SSO Perusahaan (Pegawai bank dengan akun SSO)

### AC-02.01 — Masuk SSO dengan akun yang sudah punya role

```gherkin
Given Saya seorang pegawai dengan akun SSO "rina.approver" yang terdaftar di LOS dengan role Approver
  And saya berada di halaman "Login"
When Saya mengklik tombol "Login with SSO"
  And saya mengisi username dan password di halaman login SSO perusahaan
  And saya mengklik tombol "Sign In" di halaman SSO
Then Sistem menampilkan halaman "Dashboard" LOS
  And nama saya dan role "Approver" tampil di header
```

### AC-02.02 — Masuk SSO pertama kali untuk akun yang belum terdaftar

```gherkin
Given Saya seorang pegawai dengan akun SSO "budi.baru" yang belum pernah masuk LOS
  And saya berada di halaman "Login"
When Saya mengklik tombol "Login with SSO"
  And saya menyelesaikan login di halaman SSO perusahaan
Then Sistem menampilkan halaman dengan pesan "Your account has been created. Please wait until an administrator assigns your role"
  And menu aplikasi tidak tampil
  And user "budi.baru" tercatat di daftar User Application company pemilik penyedia SSO dengan status "No Role"
```

### AC-02.03 — Login SSO dibatalkan di halaman penyedia SSO

```gherkin
Given Saya seorang pegawai dengan akun SSO
  And saya berada di halaman "Login"
When Saya mengklik tombol "Login with SSO"
  And saya mengklik tombol "Cancel" di halaman SSO perusahaan
Then Sistem menampilkan halaman "Login" LOS dengan pesan "SSO login was cancelled"
```

### AC-02.04 — Akun SSO berstatus Inactive di LOS tidak bisa masuk

```gherkin
Given Saya seorang pegawai dengan akun SSO "dodi.sales" yang berstatus Inactive di LOS
  And saya berada di halaman "Login"
When Saya mengklik tombol "Login with SSO"
  And saya menyelesaikan login di halaman SSO perusahaan
Then Sistem menampilkan halaman "Login" dengan pesan "Your account is inactive. Please contact your administrator"
```

### AC-02.05 — Email akun SSO sudah dipakai user lokal

```gherkin
Given Saya seorang pegawai dengan akun SSO beremail "sari@contoh.co.id"
  And saya berada di halaman "Login"
  And user lokal "sales.bdg01" sudah memakai email "sari@contoh.co.id"
  And domain "contoh.co.id" terdaftar untuk company "001"
When Saya mengklik tombol "Login with SSO"
  And saya menyelesaikan login di halaman SSO perusahaan
Then Sistem menampilkan halaman "Dashboard" sebagai user "sales.bdg01" dan akun tersebut tertaut ke SSO tanpa membuat user baru
```

### AC-02.06 — Email SSO di luar domain terdaftar tidak ditautkan

```gherkin
Given Saya seorang pegawai dengan akun SSO beremail "sari@pribadi.com"
  And saya berada di halaman "Login"
  And user lokal "sales.bdg01" memakai email "sari@pribadi.com"
  And domain "pribadi.com" tidak terdaftar untuk company mana pun
When Saya mengklik tombol "Login with SSO"
  And saya menyelesaikan login di halaman SSO perusahaan
Then Sistem menampilkan halaman "Login" dengan pesan "Your SSO account cannot be linked. Please contact your administrator"
  And akun SSO tidak tertaut ke "sales.bdg01"
```

> Note: AC-02.02, AC-02.05, AC-02.06 mengikuti Asumsi A-11.

---

## US-03 — Meminta Tautan Reset Password (Pengguna LOS dengan akun lokal)

### AC-03.01 — Meminta tautan reset dengan email terdaftar

```gherkin
Given Saya seorang pengguna lokal dengan email "analis@contoh.co.id"
  And saya berada di halaman "Forgot Password"
When Saya mengetik "analis@contoh.co.id" di field "Email"
  And saya mengklik tombol "Send Reset Link"
Then Sistem menampilkan pesan "If the email is registered, a reset link has been sent"
  And email berisi tautan reset yang berlaku 10 menit terkirim ke "analis@contoh.co.id"
```

### AC-03.02 — Meminta tautan reset dengan email tidak terdaftar

```gherkin
Given Saya seorang pengunjung
  And saya berada di halaman "Forgot Password"
When Saya mengetik "bukan.user@contoh.co.id" di field "Email"
  And saya mengklik tombol "Send Reset Link"
Then Sistem menampilkan pesan "If the email is registered, a reset link has been sent" yang sama persis dengan email terdaftar
  And tidak ada email yang dikirim
```

### AC-03.03 — Format email tidak valid

```gherkin
Given Saya seorang pengunjung
  And saya berada di halaman "Forgot Password"
When Saya mengetik "analis@contoh" di field "Email"
  And saya mengklik tombol "Send Reset Link"
Then Sistem menampilkan pesan "Please enter a valid email address" di bawah field "Email"
```

### AC-03.04 — Akun SSO tidak menerima email reset password lokal

```gherkin
Given Saya seorang pegawai yang hanya memakai akun SSO dengan email "rina@contoh.co.id"
  And saya berada di halaman "Forgot Password"
When Saya mengetik "rina@contoh.co.id" di field "Email"
  And saya mengklik tombol "Send Reset Link"
Then Sistem menampilkan pesan "If the email is registered, a reset link has been sent"
  And tidak ada email reset yang dikirim karena akun dikelola SSO
```

> Note: AC-03.01 mengikuti Asumsi A-28.

---

## US-04 — Mengatur Ulang Password (Pengguna LOS dengan akun lokal)

### AC-04.01 — Membuat password baru yang memenuhi semua kriteria

```gherkin
Given Saya seorang pengguna lokal
  And saya berada di halaman "Reset Password"
  And saya membuka tautan reset yang masih berlaku
When Saya mengetik "Cikal@2026" di field "New Password"
  And saya mengetik "Cikal@2026" di field "Confirm New Password"
  And saya mengklik tombol "Reset Password"
Then Sistem menampilkan halaman "Login" dengan pesan "Your password has been reset. Please log in"
  And tautan reset yang sama tidak bisa dipakai lagi
```

### AC-04.02 — Aturan panjang dan komposisi password sesuai matriks

```gherkin
Given Saya seorang pengguna lokal
  And saya berada di halaman "Reset Password"
  And saya membuka tautan reset yang masih berlaku
When Saya mengetik nilai kolom "Contoh Password" di field "New Password" dan "Confirm New Password"
  And saya mengklik tombol "Reset Password"
Then Refer to MRTM Rows: TRM_PWD_001 through TRM_PWD_007 for comprehensive logic combinations.
```

### AC-04.03 — Konfirmasi password tidak sama

```gherkin
Given Saya seorang pengguna lokal
  And saya berada di halaman "Reset Password"
  And saya membuka tautan reset yang masih berlaku
When Saya mengetik "Cikal@2026" di field "New Password"
  And saya mengetik "Cikal@2027" di field "Confirm New Password"
  And saya mengklik tombol "Reset Password"
Then Sistem menampilkan pesan "Passwords do not match" di bawah field "Confirm New Password"
```

### AC-04.04 — Password baru sama dengan password saat ini

```gherkin
Given Saya seorang pengguna lokal dengan password saat ini "Cikal@2025"
  And saya berada di halaman "Reset Password"
  And saya membuka tautan reset yang masih berlaku
When Saya mengetik "Cikal@2025" di field "New Password" dan "Confirm New Password"
  And saya mengklik tombol "Reset Password"
Then Sistem menampilkan pesan "New password must be different from your current password"
```

### AC-04.05 — Membuka tautan reset pada menit ke-11

```gherkin
Given Saya seorang pengguna lokal
  And tautan reset saya dikirim 11 menit yang lalu
When Saya mengklik tautan reset di email
Then Sistem menampilkan halaman "Forgot Password" dengan pesan "The reset link is invalid or has expired. Please request a new one"
```

### AC-04.06 — Tautan kedaluwarsa saat form sedang diisi

```gherkin
Given Saya seorang pengguna lokal
  And saya berada di halaman "Reset Password"
  And saya membuka tautan reset 9 menit setelah dikirim
When Saya mengisi password valid di kedua field pada menit ke-11 setelah tautan dikirim
  And saya mengklik tombol "Reset Password"
Then Sistem menampilkan pesan "The reset link is invalid or has expired. Please request a new one"
  And password saya tidak berubah
```

> Note: AC-04.05 mengikuti Asumsi A-28.

#### MRTM US-04

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Contoh Password | Panjang | Huruf Besar | Huruf Kecil | Angka | Karakter Spesial | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_001 | Ckl@202 | 7 | Ya | Ya | Ya | Ya | [-] | Sistem menampilkan pesan "Password must be at least 8 characters" |
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_002 | Ckl@2026 | 8 | Ya | Ya | Ya | Ya | [-] | Password diterima, pesan "Your password has been reset. Please log in" |
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_003 | cikal@2026 | 10 | Tidak | Ya | Ya | Ya | [-] | Sistem menampilkan pesan "Password must contain at least one uppercase letter (A-Z)" |
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_004 | CIKAL@2026 | 10 | Ya | Tidak | Ya | Ya | [-] | Sistem menampilkan pesan "Password must contain at least one lowercase letter (a-z)" |
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_005 | Cikal@abcd | 10 | Ya | Ya | Tidak | Ya | [-] | Sistem menampilkan pesan "Password must contain at least one number (0-9)" |
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_006 | Cikal2026a | 10 | Ya | Ya | Ya | Tidak | [-] | Sistem menampilkan pesan "Password must contain at least one special character" |
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_007 | [ANY] 129 karakter | 129 | Ya | Ya | Ya | Ya | [-] | Sistem menampilkan pesan "Password must not exceed 128 characters" |

---

## US-05 — Mengganti Password (Pengguna LOS dengan akun lokal)

### AC-05.01 — Mengganti password dari halaman profil

```gherkin
Given Saya seorang pengguna lokal yang sudah login
  And saya berada di halaman "My Profile"
When Saya mengklik tombol "Change Password"
  And saya mengetik password saat ini di field "Current Password"
  And saya mengetik "Cikal@2027" di field "New Password" dan "Confirm New Password"
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Your password has been changed"
  And login berikutnya hanya berhasil dengan password "Cikal@2027"
```

### AC-05.02 — Password saat ini salah

```gherkin
Given Saya seorang pengguna lokal yang sudah login
  And saya berada di halaman "Change Password"
When Saya mengetik password yang salah di field "Current Password"
  And saya mengetik "Cikal@2027" di field "New Password" dan "Confirm New Password"
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Current password is incorrect" di bawah field "Current Password"
```

### AC-05.03 — Wajib ganti password awal saat pertama kali masuk

```gherkin
Given Saya seorang pengguna lokal baru yang menerima password awal dari administrator
  And saya berada di halaman "Login"
When Saya login dengan username dan password awal
Then Sistem menampilkan halaman "Change Password" dengan pesan "Please change your initial password before continuing"
  And menu aplikasi tidak bisa diakses sebelum password diganti
```

### AC-05.04 — Halaman lain tidak bisa dibuka sebelum password awal diganti

```gherkin
Given Saya seorang pengguna lokal baru
  And saya berada di halaman "Change Password"
  And saya belum mengganti password awal
When Saya mengetik alamat halaman "Application Inquiry" di address bar browser
Then Sistem menampilkan kembali halaman "Change Password" dengan pesan "Please change your initial password before continuing"
```

### AC-05.05 — Password baru sama dengan salah satu dari 5 password terakhir

```gherkin
Given Saya seorang pengguna lokal yang sudah login
  And saya berada di halaman "Change Password"
  And "Cikal@2024" adalah password saya 3 penggantian yang lalu
When Saya mengetik password saat ini di field "Current Password"
  And saya mengetik "Cikal@2024" di field "New Password" dan "Confirm New Password"
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "New password must not match your last 5 passwords"
```

> Note: AC-05.05 mengikuti Asumsi A-28.

---

## US-07 — Mendaftarkan Pengguna Aplikasi (Maker)

### AC-07.01 — Mendaftarkan pengguna baru dengan data lengkap

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "User Application"
When Saya mengklik tombol "New User"
  And saya mengisi field "Username" dengan "sales.bdg01"
  And saya mengisi field "Full Name" dengan "Sari Wulandari"
  And saya mengisi field "Email" dengan "sari@contoh.co.id"
  And saya memilih "Sales" di dropdown "Role"
  And saya memilih Company "001 - Bank Contoh", Regional "01 - Jawa Barat", Branch "011 - Bandung", Sub Branch "0111 - Dago"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And pengguna "sales.bdg01" tampil di halaman "Pending User Application" dengan status "Waiting Approval"
  And pengguna belum bisa login sebelum disetujui
```

### AC-07.02 — Field wajib kosong

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New User Application"
When Saya membiarkan field "Username", "Role", dan "Branch" kosong
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong
```

### AC-07.03 — Username sudah dipakai atau sedang menunggu persetujuan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New User Application"
  And username "sales.bdg01" sudah ada di data aktif
When Saya mengisi field "Username" dengan "sales.bdg01" dan field wajib lain dengan data valid
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Username already exists"
```

### AC-07.04 — Username melebihi 50 karakter

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New User Application"
When Saya mengisi field "Username" dengan 51 karakter
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Username must not exceed 50 characters"
```

### AC-07.05 — Menonaktifkan pengguna

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "User Application"
  And pengguna "sales.bdg01" berstatus Active
When Saya mengklik ikon edit pada baris "sales.bdg01"
  And saya menghapus centang checkbox "Is Active"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And setelah Checker menyetujui, "sales.bdg01" tidak bisa login dan tugas antrean yang ia ambil kembali ke antrean umum
```

### AC-07.06 — Dropdown Branch hanya berisi cabang dari Regional terpilih

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New User Application"
When Saya memilih Regional "01 - Jawa Barat"
  And saya mengklik dropdown "Branch"
Then Sistem menampilkan hanya cabang aktif milik Regional "01 - Jawa Barat"
```

---

## US-08 — Mengelola Role (Maker)

### AC-08.01 — Membuat role baru

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Role"
When Saya mengklik tombol "New Role"
  And saya mengisi field "Role Name" dengan "Credit Analyst"
  And saya mencentang checkbox "Is Active"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And role "Credit Analyst" tampil di halaman "Pending Role" dengan status "Waiting Approval"
```

### AC-08.02 — Nama role sudah ada

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Role"
  And role "Sales" sudah ada
When Saya mengisi field "Role Name" dengan "sales"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Role already exists" (pengecekan tidak membedakan huruf besar dan kecil)
```

### AC-08.03 — Nama role 2 karakter ditolak

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Role"
When Saya mengisi field "Role Name" dengan "CS"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Role name must be 3 to 50 characters"
```

### AC-08.04 — Role yang masih dipakai pengguna aktif tidak bisa dinonaktifkan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Role"
  And role "Sales" dipakai 12 pengguna aktif
When Saya mengklik ikon edit pada baris "Sales"
  And saya menghapus centang checkbox "Is Active"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Role is assigned to 12 active users and cannot be deactivated"
```

---

## US-10 — Mengatur Hak Akses Khusus per Pengguna (Maker)

### AC-10.01 — Memberi akses sementara

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "User Access"
When Saya mengklik tombol "New User Access"
  And saya mencari dan memilih pengguna "rina.approver"
  And saya memilih Menu "Approval"
  And saya mengaktifkan toggle "View" dan "Approve"
  And saya mengisi "Valid From" dengan "01-11-2026" dan "Valid To" dengan "14-11-2026"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And akses tampil di halaman "Pending User Access" dengan periode 01-11-2026 s.d. 14-11-2026
```

### AC-10.02 — Valid To lebih awal dari Valid From

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New User Access"
When Saya mengisi "Valid From" dengan "14-11-2026" dan "Valid To" dengan "01-11-2026"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Valid To must be on or after Valid From"
```

### AC-10.03 — Akses berakhir setelah tanggal Valid To

```gherkin
Given Saya seorang pengguna "rina.approver" dengan akses Approval berlaku s.d. 14-11-2026
  And saya berada di halaman "Dashboard"
  And hari ini 15-11-2026
When Saya membuka menu samping
Then Sistem tidak menampilkan menu "Approval"
```

### AC-10.04 — Akses masih berlaku pada tanggal Valid To

```gherkin
Given Saya seorang pengguna "rina.approver" dengan akses Approval berlaku s.d. 14-11-2026
  And saya berada di halaman "Dashboard"
  And hari ini 14-11-2026
When Saya membuka menu samping
Then Sistem menampilkan menu "Approval"
```

---

## US-11 — Mengelola Menu Aplikasi (Super User)

### AC-11.01 — Menambah sub menu

```gherkin
Given Saya seorang Super User
  And saya berada di halaman "Menu"
When Saya mengklik tombol "New Menu"
  And saya mengisi "Menu Code" dengan "MON-03", "Menu Name" dengan "Process Monitoring", "Menu Index" dengan "3"
  And saya memilih "Monitoring" di dropdown "Parent Menu"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And menu tampil di halaman "Pending Menu" dengan status "Waiting Approval"
```

### AC-11.02 — Kode menu sudah ada

```gherkin
Given Saya seorang Super User
  And saya berada di halaman "New Menu"
  And kode "MON-03" sudah dipakai
When Saya mengisi "Menu Code" dengan "MON-03" dan field lain dengan data valid
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Menu code already exists"
```

### AC-11.03 — Menu induk yang dinonaktifkan menyembunyikan sub menunya

```gherkin
Given Saya seorang Super User
  And saya berada di halaman "Menu"
  And menu "Monitoring" punya 3 sub menu aktif
When Saya menonaktifkan menu "Monitoring"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And setelah disetujui, menu "Monitoring" dan 3 sub menunya tidak tampil untuk semua role
```

### AC-11.04 — Maker tidak bisa membuka halaman Menu

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Dashboard"
When Saya mengetik alamat halaman "Menu" di address bar browser
Then Sistem menampilkan pesan "You do not have access to this page"
```

---

## US-13 — Meminta dan Mengerjakan Revisi Perubahan (Checker dan Maker)

### AC-13.01 — Checker meminta revisi

```gherkin
Given Saya seorang Checker
  And saya berada di halaman "Pending Product"
  And perubahan produk "KTA" berstatus Waiting Approval
When Saya mengklik tombol "Detail" pada baris "KTA"
  And saya mengklik tombol "Revise"
  And saya mengisi field "Revise Reason" dengan "Limit auto approval harus 10.000.000"
  And saya mengklik tombol "Submit Revise"
Then Sistem menampilkan pesan "Revision requested"
  And status perubahan "KTA" menjadi "Revise" dengan alasan yang saya tulis
```

### AC-13.02 — Revise tanpa alasan

```gherkin
Given Saya seorang Checker
  And saya berada di halaman "Detail Pending Product"
When Saya mengklik tombol "Revise"
  And saya membiarkan field "Revise Reason" kosong
  And saya mengklik tombol "Submit Revise"
Then Sistem menampilkan pesan "Revise reason is required"
```

### AC-13.03 — Maker mengajukan ulang hasil revisi

```gherkin
Given Saya seorang Maker yang mengajukan perubahan "KTA"
  And saya berada di halaman "Pending Product"
  And status perubahan "KTA" adalah "Revise"
When Saya mengklik tombol "Edit" pada baris "KTA"
  And saya mengubah "Limit Auto Approval" menjadi "10.000.000"
  And saya mengklik tombol "Resubmit"
Then Sistem menampilkan pesan "Data resubmitted for approval"
  And status menjadi "Waiting Approval" dan alasan revisi tetap tersimpan di riwayat
```

### AC-13.04 — Alasan revisi melebihi 500 karakter

```gherkin
Given Saya seorang Checker
  And saya berada di halaman "Detail Pending Product"
When Saya mengklik tombol "Revise"
  And saya mengisi field "Revise Reason" dengan 501 karakter
  And saya mengklik tombol "Submit Revise"
Then Sistem menampilkan pesan "Revise reason must not exceed 500 characters"
```

### AC-13.05 — Maker lain tidak bisa mengedit revisi milik orang lain

```gherkin
Given Saya seorang Maker "maker.02"
  And saya berada di halaman "Pending Product"
  And perubahan "KTA" berstatus Revise diajukan oleh "maker.01"
When Saya melihat baris "KTA"
Then Sistem tidak menampilkan tombol "Edit" pada baris "KTA" untuk saya
```

---

## US-15 — Mendaftarkan Company Baru (Super User)

### AC-15.01 — Mendaftarkan company dengan data lengkap

```gherkin
Given Saya seorang Super User
  And saya berada di halaman "Company Configuration"
When Saya mengklik tombol "Create New Company"
  And saya mengisi "Company Code" dengan "007", "Company Name" dengan "Bank Contoh Tujuh"
  And saya memilih "Konvensional" di dropdown "Platform"
  And saya mengisi "Currency Code" dengan "360" dan "Currency Name" dengan "IDR"
  And saya mengisi "Admin Full Name", "Admin Username" "admin.007", dan "Admin Email" "admin007@contoh.co.id"
  And saya mengisi "Checker Full Name", "Checker Username" "checker.007", dan "Checker Email" "checker007@contoh.co.id"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Company created"
  And company "007" tampil di daftar company
  And user "admin.007" dengan role "Admin" dan user "checker.007" dengan role "Checker" terbentuk
  And masing-masing menerima email berisi tautan pembuatan password yang berlaku 24 jam
```

### AC-15.02 — Field wajib kosong

```gherkin
Given Saya seorang Super User
  And saya berada di halaman "Create New Company"
When Saya membiarkan "Company Name" dan "Admin Email" kosong
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong
```

### AC-15.03 — Company Code sudah dipakai

```gherkin
Given Saya seorang Super User
  And saya berada di halaman "Create New Company"
  And company "001" sudah ada
When Saya mengisi "Company Code" dengan "001" dan field lain dengan data valid
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Company code already exists"
```

### AC-15.04 — Company Code bukan 3 digit angka

```gherkin
Given Saya seorang Super User
  And saya berada di halaman "Create New Company"
When Saya mengisi "Company Code" dengan "07"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Company code must be a 3-digit number"
```

### AC-15.05 — Maker tidak bisa membuat company

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Dashboard"
When Saya mengetik alamat halaman "Company Configuration" di address bar browser
Then Sistem menampilkan pesan "You do not have access to this page"
```

### AC-15.06 — Admin dan Checker awal tidak boleh user yang sama

```gherkin
Given Saya seorang Super User
  And saya berada di halaman "Create New Company"
When Saya mengisi "Admin Username" dan "Checker Username" dengan "admin.007"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Admin and checker must be different users"
```

> Note: AC-15.01 mengikuti Asumsi A-12, A-28. AC-15.06 mengikuti Asumsi A-12.

---

## US-16 — Menyalin Konfigurasi dari Company Lain (Super User)

### AC-16.01 — Menyalin general parameter

```gherkin
Given Saya seorang Super User
  And saya berada di halaman "Company Configuration"
  And company "007" belum punya general parameter
When Saya mengklik tombol "Copy Configuration"
  And saya memilih "General Parameter" di dropdown "Configuration Type"
  And saya memilih Company "001" / Currency "360" sebagai sumber
  And saya memilih Company "007" / Currency "360" sebagai tujuan
  And saya mengklik tombol "Copy"
Then Sistem menampilkan pesan "Configuration copied: 412 records added, 0 skipped"
  And general parameter company "007" berisi 412 data
```

### AC-16.02 — Data yang sudah ada di tujuan dilewati

```gherkin
Given Saya seorang Super User
  And saya berada di halaman "Copy Configuration"
  And company "007" sudah punya 10 dari 412 general parameter
When Saya memilih sumber "001" dan tujuan "007" untuk "General Parameter"
  And saya mengklik tombol "Copy"
Then Sistem menampilkan pesan "Configuration copied: 402 records added, 10 skipped"
  And 10 data yang sudah ada di tujuan tidak berubah
```

### AC-16.03 — Sumber dan tujuan sama

```gherkin
Given Saya seorang Super User
  And saya berada di halaman "Copy Configuration"
When Saya memilih Company "001" sebagai sumber dan tujuan
  And saya mengklik tombol "Copy"
Then Sistem menampilkan pesan "Source and destination must be different"
```

### AC-16.04 — Company tujuan belum punya currency yang dipilih

```gherkin
Given Saya seorang Super User
  And saya berada di halaman "Copy Configuration"
  And company "007" tidak punya currency "840"
When Saya memilih Company "007" / Currency "840" sebagai tujuan
  And saya mengklik tombol "Copy"
Then Sistem menampilkan pesan "Destination currency does not exist for the selected company"
```

---

## US-17 — Mengelola Struktur Organisasi Company (Maker)

### AC-17.01 — Menambah branch

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Organization Structure"
  And Regional "01 - Jawa Barat" aktif
When Saya mengklik tombol "+" di tabel "Branch"
  And saya memilih Regional "01 - Jawa Barat"
  And saya mengisi "Branch Code" dengan "011" dan "Branch Name" dengan "Bandung"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And branch "011 - Bandung" tampil di halaman "Pending Organization" dengan status "Waiting Approval"
```

### AC-17.02 — Kode unit 1 digit ditolak

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Branch"
When Saya mengisi "Branch Code" dengan "1"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Code must be 2 to 3 digits"
```

### AC-17.03 — Kode unit 4 digit ditolak

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Branch"
When Saya mengisi "Branch Code" dengan "0111"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Code must be 2 to 3 digits"
```

### AC-17.04 — Kode branch sudah dipakai di regional yang sama

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Branch"
  And branch "011" sudah ada di Regional "01"
When Saya memilih Regional "01" dan mengisi "Branch Code" dengan "011"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Branch code already exists in this regional"
```

### AC-17.05 — Branch dengan pengajuan aktif tidak bisa dinonaktifkan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Organization Structure"
  And branch "011" punya 25 pengajuan yang belum selesai
When Saya menghapus centang "Is Active" pada branch "011"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Branch has 25 applications in progress and cannot be deactivated"
```

### AC-17.06 — Dropdown Regional hanya berisi regional aktif

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Branch"
  And Regional "09" berstatus Inactive
When Saya mengklik dropdown "Regional"
Then Sistem tidak menampilkan Regional "09" di daftar pilihan
```

> Note: AC-17.01 mengikuti Asumsi A-12. AC-17.02, AC-17.03 mengikuti Asumsi A-22.

---

## US-18 — Mengelola Mata Uang Company (Maker)

### AC-18.01 — Menambah mata uang dengan kode ISO 4217

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Organization Structure"
When Saya mengklik tombol "+" di tabel "Currency"
  And saya mengisi "Currency Code" dengan "840" dan "Currency Name" dengan "USD"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And setelah disetujui, currency "840 - USD" tampil dengan keterangan "US Dollar"
```

> Note: Deferred, valas ditunda (Grooming v1 N-03).

### AC-18.02 — Kode mata uang bukan kode ISO 4217

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Currency"
When Saya mengisi "Currency Code" dengan "999" dan "Currency Name" dengan "XYZ"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Currency code is not a valid ISO 4217 code"
```

> Note: Deferred, valas ditunda (Grooming v1 N-03).

### AC-18.03 — Kode mata uang 4 digit ditolak

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Currency"
When Saya mengetik "3601" di field "Currency Code"
Then Sistem hanya menerima 3 karakter pertama "360" di field "Currency Code"
```

> Note: Deferred, valas ditunda (Grooming v1 N-03).

### AC-18.04 — Mata uang sudah ada

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Currency"
  And currency "360" sudah ada
When Saya mengisi "Currency Code" dengan "360"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Currency already exists"
```

> Note: Deferred, valas ditunda (Grooming v1 N-03).

> Note: AC-18.01, AC-18.02, AC-18.03, AC-18.04 mengikuti Asumsi A-45.

---

## US-19 — Mengelola Kurs Mata Uang (Maker)

### AC-19.01 — Mencatat kurs baru

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Currency Rate"
When Saya mengklik tombol "New Currency Rate"
  And saya memilih Company "001" dan Currency "840 - USD"
  And saya mengisi "Rupiah Equivalent" dengan "16250" dan "Rate Timestamp" dengan "20-10-2026 08:00"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And kurs tampil di halaman "Pending Currency Rate" dengan status "Waiting Approval"
```

> Note: Deferred, valas ditunda (Grooming v1 N-03).

### AC-19.02 — Kurs untuk company dan currency yang sama sudah menunggu persetujuan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Currency Rate"
  And kurs USD company "001" berstatus Waiting Approval
When Saya memilih Company "001" dan Currency "840 - USD"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "A pending rate already exists for this company and currency"
```

> Note: Deferred, valas ditunda (Grooming v1 N-03).

### AC-19.03 — Rupiah Equivalent 0 ditolak

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Currency Rate"
When Saya mengisi "Rupiah Equivalent" dengan "0"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Rupiah equivalent must be greater than 0"
```

> Note: Deferred, valas ditunda (Grooming v1 N-03).

### AC-19.04 — Pengajuan memakai kurs yang berlaku saat submit

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application"
  And kurs USD 16.000 berlaku sampai kurs 16.250 disetujui pukul 10:00
When Saya mensubmit pengajuan USD pukul 09:59
Then Sistem menampilkan Rate 16.000 dan Rate Timestamp kurs tersebut di detail pengajuan
```

> Note: Deferred, valas ditunda (Grooming v1 N-03).

> Note: AC-19.01, AC-19.02, AC-19.03, AC-19.04 mengikuti Asumsi A-45.

---

## US-21 — Mengelola General Parameter (Maker)

### AC-21.01 — Menambah nilai parameter

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "General Parameter"
When Saya mengklik tombol "New Parameter"
  And saya memilih "Occupation" di "Param Type"
  And saya mengisi "Param Value" dengan "Pengemudi Daring" dan "BI Code" dengan "099"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And setelah disetujui, "Pengemudi Daring" tersedia di dropdown "Occupation" pada form pengajuan
```

### AC-21.02 — Nilai parameter duplikat dalam Param Type yang sama

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Parameter"
  And "Karyawan Swasta" sudah ada di Param Type Occupation
When Saya memilih "Occupation" dan mengisi "Param Value" dengan "karyawan swasta"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Parameter value already exists in this type"
```

### AC-21.03 — Parameter nonaktif tidak muncul di form tetapi tetap tampil di data lama

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Detail"
  And pengajuan lama memakai Occupation "Pengemudi Daring" yang kini Inactive
When Saya membuka tab "Occupation"
Then Sistem menampilkan "Pengemudi Daring" pada data pengajuan lama
  And dropdown "Occupation" di pengajuan baru tidak berisi "Pengemudi Daring"
```

### AC-21.04 — Param Value melebihi 100 karakter

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Parameter"
When Saya mengisi "Param Value" dengan 101 karakter
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Parameter value must not exceed 100 characters"
```

---

## US-22 — Mengimpor dan Mengekspor General Parameter (Maker)

### AC-22.01 — Mengimpor parameter dari Excel

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "General Parameter"
When Saya mengklik tombol "Import"
  And saya memilih file "parameter.xlsx" berisi 50 baris valid sesuai template
  And saya mengklik tombol "Upload"
Then Sistem menampilkan pesan "50 rows submitted for approval as 1 submission"
  And satu paket berisi 50 parameter tampil di "Pending General Parameter"
```

### AC-22.02 — File berisi baris tidak valid

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Import General Parameter"
When Saya memilih file berisi 48 baris valid dan 2 baris tanpa "Param Type"
  And saya mengklik tombol "Upload"
Then Sistem menampilkan pesan "Import failed: 2 invalid rows. Download the error file for details"
  And tidak ada baris yang diajukan
  And tombol "Download Error File" tampil
```

### AC-22.03 — Format file bukan xlsx

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Import General Parameter"
When Saya memilih file "parameter.csv"
  And saya mengklik tombol "Upload"
Then Sistem menampilkan pesan "Only .xlsx files are allowed"
```

### AC-22.04 — File melebihi 1.000 baris

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Import General Parameter"
When Saya memilih file berisi 1.001 baris
  And saya mengklik tombol "Upload"
Then Sistem menampilkan pesan "Maximum 1000 rows per import"
```

### AC-22.05 — Mengekspor parameter terfilter

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "General Parameter"
  And filter Param Type "Occupation" aktif
When Saya mengklik tombol "Export"
Then Sistem mengunduh file Excel berisi seluruh parameter Occupation sesuai filter
```

> Note: AC-22.01 mengikuti Asumsi A-33.

---

## US-24 — Mengelola Template Dokumen (Maker)

### AC-24.01 — Mengunggah template baru

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Document Template"
When Saya mengklik tombol "Add Document Template"
  And saya mengisi "Document Code" dengan "AKAD-KPR"
  And saya memilih file "akad-kpr.docx"
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Data submitted for approval"
  And template tampil di "Pending Document Template"
```

### AC-24.02 — Template tanpa file

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Document Template"
When Saya mengisi "Document Code" tanpa memilih file
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Template file is required"
```

### AC-24.03 — Template berisi placeholder yang tidak dikenal

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Document Template"
When Saya memilih file berisi placeholder "{{nama_ibu_kandng}}"
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Unknown placeholder: nama_ibu_kandng"
```

### AC-24.04 — File template melebihi 5 MB

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Document Template"
When Saya memilih file .docx berukuran 5,1 MB
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Template file must not exceed 5 MB"
```

### AC-24.05 — Melihat daftar placeholder yang tersedia

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Add Document Template"
When Saya mengklik tautan "Available Placeholders"
Then Sistem menampilkan daftar placeholder beserta keterangannya, misalnya "{{nama_ibu_kandung}}: Mother Maiden Name pemohon"
```

---

## US-26 — Mengatur Level Approval (Maker)

### AC-26.01 — Menambah level approval

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Approval Level Setup"
When Saya mengklik tombol "New Approval Level"
  And saya memilih Branch "011 - Bandung", Product "KPR", Job Level "2"
  And saya mengisi Description "Kepala Cabang", Amount Begin "0", Amount End "500.000.000"
  And saya mencentang "Is Approve", "Is Reject", "Is Return"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And level tampil di "Pending Approval Setup"
```

### AC-26.02 — Amount End lebih kecil dari Amount Begin

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Approval Level"
When Saya mengisi Amount Begin "500.000.000" dan Amount End "100.000.000"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Amount end must be greater than amount begin"
```

### AC-26.03 — Rentang nominal tumpang tindih dengan level lain

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Approval Level"
  And level 2 KPR Bandung memakai rentang 0 s.d. 500.000.000
When Saya mengisi Amount Begin "500.000.000" untuk level 1 KPR Bandung
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Amount range overlaps with level 2"
```

### AC-26.04 — Kombinasi Branch, Product, Job Level sudah ada

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Approval Level"
  And level 2 KPR Bandung sudah ada
When Saya memilih Branch "011", Product "KPR", Job Level "2"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Approval level already exists"
```

> Note: AC-26.01 mengikuti Asumsi A-21, A-37. AC-26.03 mengikuti Asumsi A-37.

---

## US-28 — Mengimpor Setup Approval (Maker)

### AC-28.01 — Mengimpor setup approval valid

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Approval Level Setup"
When Saya mengklik tombol "Import"
  And saya memilih file sesuai template berisi 40 baris valid
  And saya mengklik tombol "Upload"
Then Sistem menampilkan pesan "40 rows submitted for approval as 1 submission"
  And satu paket berisi 40 baris tampil di "Pending Approval Setup"
```

### AC-28.02 — Branch atau produk tidak ditemukan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Import Approval Setup"
When Saya memilih file dengan 1 baris Branch "999" yang tidak ada
  And saya mengklik tombol "Upload"
Then Sistem menampilkan pesan "Import failed: 1 invalid row. Download the error file for details"
  And file error berisi alasan "Branch 999 not found" di baris tersebut
```

### AC-28.03 — Username approver tidak ditemukan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Import Approval Setup"
When Saya memilih file dengan 1 baris berisi username "tidak.ada"
  And saya mengklik tombol "Upload"
Then Sistem menampilkan pesan "Import failed: 1 invalid row. Download the error file for details"
  And file error berisi alasan "User tidak.ada not found"
```

> Note: AC-28.01 mengikuti Asumsi A-33.

---

## US-29 — Mengelola Data Perusahaan Asuransi (Maker)

### AC-29.01 — Menambah perusahaan asuransi

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Insurance"
When Saya mengklik tombol "New Insurance"
  And saya mengisi "Insurance Code" "ASR01", "Insurance Name" "Asuransi Contoh"
  And saya mengisi tabel tarif dengan baris Age "47", Tenor Year "3", Premium Rate (%) "0,85"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And tabel tarif tampil di "Pending Insurance"
```

### AC-29.02 — Tarif premi di atas 100%

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Insurance"
When Saya mengisi "Premium Rate (%)" dengan "100,01"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Premium rate must be between 0 and 100"
```

### AC-29.03 — Kode asuransi sudah ada

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "New Insurance"
  And kode "ASR01" sudah ada
When Saya mengisi "Insurance Code" dengan "ASR01"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Insurance code already exists"
```

> Note: AC-29.01 mengikuti Grooming v2 R-05.

---

## US-30 — Mengatur Parameter Sistem (Maker)

### AC-30.01 — Mengubah batas SIKP

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "System Parameter"
  And parameter "SIKP Minimum Limit" bernilai 50.000.000
When Saya mengklik ikon edit pada "SIKP Minimum Limit"
  And saya mengisi nilai "100.000.000"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And nilai lama tetap berlaku sampai disetujui Checker
```

### AC-30.02 — Nilai tidak sesuai tipe parameter

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Edit System Parameter"
  And parameter "SIKP Minimum Limit" bertipe angka
When Saya mengisi nilai "seratus juta"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Value must be a number"
```

### AC-30.03 — Nilai di luar rentang yang diizinkan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Edit System Parameter"
  And parameter "Dukcapil Review Threshold" hanya menerima 0 s.d. 1
When Saya mengisi nilai "1,01"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Value must be between 0 and 1"
```

### AC-30.04 — Nilai rahasia tidak ditampilkan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "System Parameter"
  And terdapat parameter rahasia "OCR API Key"
When Saya melihat baris "OCR API Key"
Then Sistem menampilkan nilai sebagai "********" dan tidak menyediakan tombol untuk melihat nilai aslinya
```

### AC-30.05 — Menonaktifkan channel untuk company

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "System Parameter"
  And parameter "Channel Mobile Enabled" company "001" bernilai "Yes"
When Saya mengubah nilai menjadi "No"
  And saya mengklik tombol "Submit"
  And Checker menyetujui perubahan
Then Sales company "001" yang login dari aplikasi mobile melihat pesan "Mobile channel is not enabled for your company"
```

> Note: AC-30.01 mengikuti Asumsi A-19. AC-30.05 mengikuti Asumsi A-46.

---

## US-32 — Melihat Diagram Rute Produk (Maker, Checker, dan Risk Manager)

### AC-32.01 — Melihat diagram rute aktif

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Product Route"
When Saya memilih "KPR" di dropdown "Product"
Then Sistem menampilkan diagram berisi node modul berurutan dengan pembeda warna: otomatis (biru), langkah manual (oranye), bersyarat (garis putus-putus), dan tidak dipakai (abu-abu dicoret)
  And nomor versi aktif dan tanggal berlakunya tampil di atas diagram
```

### AC-32.02 — Melihat detail modul

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Product Route"
  And diagram rute KUR tampil
When Saya mengklik node "SIKP"
Then Sistem menampilkan panel detail berisi jenis modul "Automatic", kondisi "Requested Limit > SIKP Minimum Limit (50.000.000)", dan tujuan untuk tiap hasil modul
```

### AC-32.03 — Membandingkan versi rute

```gherkin
Given Saya seorang Checker
  And saya berada di halaman "Pending Product Route"
  And rute KTA versi 3 menunggu persetujuan
When Saya mengklik tombol "Detail" pada baris KTA versi 3
Then Sistem menampilkan diagram versi 2 dan versi 3 berdampingan dengan modul yang berubah ditandai
```

> Note: Deferred, perbandingan diagram dua versi ditunda (Grooming v1 N-08).

### AC-32.04 — Produk belum punya rute

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Product Route"
  And produk "KPR Subsidi" belum punya rute
When Saya memilih "KPR Subsidi" di dropdown "Product"
Then Sistem menampilkan pesan "This product has no route yet"
```

### AC-32.05 — Produk yang dipilih tidak aktif

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Product Route"
  And produk "KPR Lama" berstatus Inactive
When Saya mengklik dropdown "Product"
Then Sistem tidak menampilkan "KPR Lama" di daftar produk
```

> Note: AC-32.01 mengikuti Rute produk R-04. AC-32.03 mengikuti Grooming N-08.

---

## US-33 — Mengatur Dedup Matrix (Maker)

### AC-33.01 — Mengubah outcome kombinasi dedup

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Dedup Matrix"
  And kombinasi NIK Match, Full Name Fuzzy, DOB Match, POB Match, MMN Fuzzy ber-outcome Review
When Saya mengklik ikon edit pada kombinasi tersebut
  And saya memilih "Match" di dropdown "Dedup Outcome"
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Data submitted for approval"
  And perubahan tampil di "Pending Dedup Matrix"
```

### AC-33.02 — Menyaring kombinasi matrix

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Dedup Matrix"
When Saya memilih "Match" di filter "NIK"
  And saya memilih "Review" di filter "Dedup Outcome"
Then Sistem menampilkan hanya kombinasi dengan NIK Match dan outcome Review
```

### AC-33.03 — Membatalkan perubahan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Edit Dedup Matrix"
When Saya memilih outcome baru
  And saya mengklik tombol "Cancel"
Then Sistem menutup form tanpa perubahan dan tidak ada data baru di "Pending Dedup Matrix"
```

### AC-33.04 — Ambang kemiripan fuzzy di luar rentang

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Dedup Matrix Setting"
When Saya mengisi "Fuzzy Match Threshold (%)" dengan "49"
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Fuzzy threshold must be between 50 and 100"
```

> Note: AC-33.01 mengikuti Asumsi A-02.

---

## US-34 — Mengatur Aturan Verifikasi Dukcapil (Maker)

### AC-34.01 — Mengubah ambang Passed

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Dukcapil Rule"
  And ambang Passed 0,90 dan Review 0,75
When Saya mengisi "Passed Threshold" dengan "0,92"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And perubahan tampil di "Pending Dukcapil Rule"
```

### AC-34.02 — Jumlah bobot tidak 100%

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Dukcapil Rule"
When Saya mengisi bobot "Full Name ID" 60 dan "Mother Maiden Name" 30
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Total weight must be 100%"
```

### AC-34.03 — Ambang Review lebih tinggi dari ambang Passed

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Dukcapil Rule"
When Saya mengisi "Passed Threshold" 0,80 dan "Review Threshold" 0,85
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Review threshold must be lower than passed threshold"
```

> Note: AC-34.01 mengikuti Asumsi A-03.

---

## US-35 — Mengatur Fraud Matrix (Maker)

### AC-35.01 — Mengubah outcome kombinasi fraud

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Fraud Matrix"
  And kombinasi Nama Normal dan IP VPN/Proxy ber-outcome Suspicious
When Saya mengklik ikon edit pada kombinasi tersebut
  And saya memilih "High Fraud Potential" di dropdown "Fraud Outcome"
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Data submitted for approval"
  And perubahan tampil di "Pending Fraud Matrix"
```

### AC-35.02 — Membatalkan perubahan

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Edit Fraud Matrix"
When Saya memilih outcome baru
  And saya mengklik tombol "Cancel"
Then Sistem menutup form tanpa perubahan
```

### AC-35.03 — Batas jumlah pengajuan per hari di luar rentang

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Fraud Matrix Setting"
When Saya mengisi "Max Applications per Name per Day" dengan "0"
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Value must be between 1 and 100"
```

> Note: AC-35.01 mengikuti Asumsi A-04.

---

## US-41 — Mengisi Data Pribadi dari Foto KTP (Sales)

### AC-41.01 — Mengisi data dari foto KTP yang jelas

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
When Saya mengklik tombol "Scan ID Card"
  And saya memilih foto KTP yang jelas
  And saya mengklik tombol "Read"
Then Sistem mengisi field NIK, Full Name ID, Place of Birth, Date of Birth, Gender, alamat KTP, Religion, dan Marital dari hasil bacaan
  And field hasil bacaan diberi tanda "Read from ID card" dan tetap bisa diedit
```

### AC-41.02 — Foto tidak terbaca

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
When Saya mengklik tombol "Scan ID Card"
  And saya memilih foto buram
  And saya mengklik tombol "Read"
Then Sistem menampilkan pesan "ID card could not be read. Please retake the photo or fill in manually"
  And field yang sudah terisi tidak berubah
```

### AC-41.03 — Foto melebihi 2 MB

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
When Saya mengklik tombol "Scan ID Card"
  And saya memilih foto berukuran 2,1 MB
Then Sistem menampilkan pesan "File must not exceed 2 MB"
```

### AC-41.04 — Layanan OCR tidak tersedia

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And layanan pembacaan KTP sedang tidak tersedia
When Saya mengklik tombol "Scan ID Card"
  And saya memilih foto KTP
  And saya mengklik tombol "Read"
Then Sistem menampilkan pesan "ID card reading is unavailable. Please fill in manually"
  And saya tetap bisa mengisi data pribadi secara manual
```

> Note: AC-41.03 mengikuti Asumsi A-17.

---

## US-42 — Memverifikasi Data Pensiun Pemohon (Sales)

### AC-42.01 — Nomor Taspen ditemukan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And produk Pension
When Saya mengisi "Taspen Number" dengan "1234567890"
  And saya mengklik ikon cari di samping field "Taspen Number"
Then Sistem mengisi "Account Number", "Pension Amount", dan "EDAPEM Date" dari data EDAPEM
  And ketiga field tidak bisa diedit
```

### AC-42.02 — Nomor Taspen tidak ditemukan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And produk Pension
When Saya mengisi "Taspen Number" dengan "9999999999"
  And saya mengklik ikon cari
Then Sistem menampilkan pesan "Taspen number not found in EDAPEM"
  And tombol "Next" tidak melanjutkan ke step berikutnya
```

### AC-42.03 — Lanjut tanpa verifikasi Taspen

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And produk Pension
When Saya mengisi semua field wajib tanpa mengklik ikon cari Taspen
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "Please verify the Taspen number first"
```

### AC-42.04 — Field Taspen tidak tampil untuk produk non pensiun

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And produk KTA
When Saya scroll ke seluruh section Personal
Then Sistem tidak menampilkan field "Taspen Number"
```

---

## US-43 — Mengisi Data Pasangan Pemohon (Sales)

### AC-43.01 — Mengisi data pasangan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Spouse"
  And Marital pemohon "Kawin"
When Saya mengisi "Spouse Full Name", "Spouse ID Number", "Spouse Date of Birth"
  And saya memilih "Spouse Occupation" "Karyawan Swasta" dan mengisi "Spouse Monthly Income" "6.000.000"
  And saya memilih "Prenuptial Agreement" "No"
  And saya mengklik tombol "Next"
Then Sistem menampilkan step "Occupation"
```

### AC-43.02 — NIK pasangan sama dengan NIK pemohon

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Spouse"
  And NIK pemohon 3273011402900001
When Saya mengisi "Spouse ID Number" dengan "3273011402900001"
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "Spouse ID number must be different from applicant ID number"
```

### AC-43.03 — Step Spouse tidak tampil untuk pemohon belum kawin

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And saya memilih Marital "Cerai Hidup"
When Saya mengklik tombol "Next"
Then Sistem menampilkan step "Occupation" dan stepper tidak memuat step "Spouse"
```

### AC-43.04 — Marital diubah dari Kawin menjadi Belum Kawin

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Personal"
  And data pasangan sudah terisi
When Saya mengubah Marital menjadi "Belum Kawin"
  And saya mengklik tombol "OK" di konfirmasi "Spouse data will be removed. Continue?"
Then Sistem menghapus data pasangan dan step "Spouse" hilang dari stepper
```

---

## US-45 — Mengisi Data Usaha Pemohon (Sales)

### AC-45.01 — Mengisi data usaha

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Business"
  And Occupation pemohon "Wiraswasta"
When Saya mengisi "Business Name" "Toko Sumber Rejeki", memilih "Business Field" "Perdagangan Eceran"
  And saya mengisi "Annual Sales" "600.000.000" dan "Business Launch Date" "01-03-2018"
  And saya mengisi alamat usaha
  And saya mengklik tombol "Next"
Then Sistem menampilkan step berikutnya sesuai produk
```

### AC-45.02 — Tanggal mulai usaha di masa depan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Business"
  And hari ini 20-10-2026
When Saya mengisi "Business Launch Date" dengan "21-10-2026"
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "Business launch date must not be in the future"
```

### AC-45.03 — Step Business hanya untuk wiraswasta

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Occupation"
  And saya memilih Occupation "Karyawan Swasta"
When Saya mengklik tombol "Next"
Then Sistem tidak menampilkan step "Business" di stepper
```

### AC-45.04 — Lama usaha kurang dari 6 bulan untuk KUR

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Business"
  And produk KUR mensyaratkan usaha berjalan minimal 6 bulan
  And hari ini 20-10-2026
When Saya mengisi "Business Launch Date" dengan "21-04-2026"
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "Business must have been running for at least 6 months"
```

### AC-45.05 — Field wajib Business kosong

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Business"
  And Occupation pemohon "Wiraswasta"
When Saya membiarkan "Business Name" dan "Business Field" kosong
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong
  And saya tetap di step "Business"
```

> Note: AC-45.01 mengikuti Data dictionary (Grooming T-01). AC-45.05 mengikuti Field Dictionary (Grooming T-01).

---

## US-46 — Mengisi Data Agunan (Sales)

### AC-46.01 — Mengisi agunan kendaraan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Collateral"
  And produk Kredit Agunan
When Saya memilih "Kendaraan" di "Collateral Type"
  And saya mengisi Type, Brand, Model, Year "2021", Price "180.000.000", Color, Machine Number, Frame Number, BPKB Number, Police Number, dan alamat kendaraan
  And saya mengklik tombol "Next"
Then Sistem menampilkan step "Document"
```

### AC-46.02 — Agunan KPR otomatis sertifikat

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Collateral"
  And produk KPR
When Saya membuka step "Collateral"
Then Sistem menampilkan "Collateral Type" terisi "Sertifikat" tanpa pilihan lain
  And form Certificate Details dan Certificate Address tampil
```

### AC-46.03 — Agunan pensiun berupa SK

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Collateral"
  And produk Pension
When Saya mengisi "Decree Number" dan "Decree Date"
  And saya mengklik tombol "Next"
Then Sistem menampilkan step "Document"
```

### AC-46.04 — Tahun kendaraan melebihi tahun berjalan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Collateral"
  And hari ini 20-10-2026
When Saya mengisi "Year of Vehicle Release" dengan "2027"
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "Vehicle year must not be later than 2026"
```

### AC-46.05 — Step Collateral tidak tampil untuk produk tanpa agunan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application"
  And produk KTA berkategori Non Collateral Loan
When Saya mengklik tombol "Next" di step terakhir sebelum Document
Then Sistem menampilkan step "Document" dan stepper tidak memuat step "Collateral"
```

### AC-46.06 — Field wajib agunan kendaraan kosong

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "New Application - Collateral"
  And Collateral Type "Kendaraan"
When Saya membiarkan "Frame Number" dan "BPKB Number" kosong
  And saya mengklik tombol "Next"
Then Sistem menampilkan pesan "This field is required" di bawah field "Frame Number" dan "BPKB Number"
```

> Note: AC-46.01 mengikuti Data dictionary (Grooming T-01).

---

## US-52 — Mengunggah Pengajuan Massal (Sales)

### AC-52.01 — Mengunduh template upload

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application List"
When Saya mengklik tombol "More Action"
  And saya mengklik "Download Template"
Then Sistem mengunduh file Excel template dengan kolom dropdown berisi pilihan dari General Parameter
```

### AC-52.02 — Mengunggah file valid

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application List"
When Saya mengklik tombol "More Action"
  And saya mengklik "Upload Applications"
  And saya memilih file template berisi 100 baris
  And saya mengklik tombol "Upload"
Then Sistem menampilkan pesan "Upload received. Track progress in Monitor Upload"
  And file tampil di "Monitor Upload" dengan status "In Progress"
  And setelah selesai diproses, baris yang berhasil tampil di "Application List" berstatus "Draft" milik saya
```

### AC-52.03 — File tidak sesuai template

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Upload Applications"
When Saya memilih file Excel dengan kolom berbeda dari template
  And saya mengklik tombol "Upload"
Then Sistem menampilkan pesan "File does not match the template. Please download the latest template"
```

### AC-52.04 — File melebihi 500 baris

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Upload Applications"
When Saya memilih file berisi 501 baris
  And saya mengklik tombol "Upload"
Then Sistem menampilkan pesan "Maximum 500 applications per file"
```

> Note: AC-52.02 mengikuti Asumsi A-43.

---

## US-53 — Memantau Hasil Upload Massal (Sales)

### AC-53.01 — Melihat hasil upload selesai

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Monitor Upload"
  And file "payroll-okt.xlsx" selesai diproses dengan 97 berhasil dan 3 gagal
When Saya melihat baris "payroll-okt.xlsx"
Then Sistem menampilkan status "Done", Total 100, Success 97, Failed 3, dan tombol "Download Failed"
```

### AC-53.02 — Mengunduh baris gagal

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Monitor Upload"
  And file "payroll-okt.xlsx" punya 3 baris gagal
When Saya mengklik tombol "Download Failed"
Then Sistem mengunduh file Excel berisi 3 baris gagal dengan kolom terakhir "Failed Reason", misalnya "ID card number must be 16 digits"
```

### AC-53.03 — Tombol unduh tidak tampil bila semua baris berhasil

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Monitor Upload"
  And file "payroll-nov.xlsx" selesai dengan 0 baris gagal
When Saya melihat baris "payroll-nov.xlsx"
Then Sistem tidak menampilkan tombol "Download Failed" pada baris tersebut
```

### AC-53.04 — Hanya file milik company sendiri yang tampil

```gherkin
Given Saya seorang Sales company "001"
  And saya berada di halaman "Monitor Upload"
When Saya membuka halaman "Monitor Upload"
Then Sistem hanya menampilkan file upload milik company "001"
```

### AC-53.05 — File gagal diproses seluruhnya

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Monitor Upload"
  And file "payroll-des.xlsx" gagal dibaca karena rusak
When Saya melihat baris "payroll-des.xlsx"
Then Sistem menampilkan status "Failed" dengan keterangan "File could not be read"
```

---

## US-54 — Mengirim Pengajuan melalui API Mitra (Tim IT mitra penyalur)

### AC-54.01 — Memperoleh token dengan API key valid

```gherkin
Given Saya seorang Tim IT mitra dengan API key aktif yang diterbitkan untuk company "001"
When Saya mengirim permintaan login dengan API key tersebut ke endpoint autentikasi
Then Sistem mengembalikan token bertipe Bearer beserta waktu kedaluwarsanya dengan pesan "Create token successfully"
```

### AC-54.02 — Mengirim pengajuan dengan token valid

```gherkin
Given Saya seorang Tim IT mitra dengan token Bearer yang masih berlaku
  And dokumen wajib pengajuan sudah diunggah lewat endpoint dokumen
When Saya mengirim data pengajuan lengkap ke endpoint insert customer
Then Sistem mengembalikan Loan ID baru dan status "Submitted"
  And pengajuan tampil di Application Inquiry dengan channel "API"
```

### AC-54.03 — Token kedaluwarsa

```gherkin
Given Saya seorang Tim IT mitra dengan token yang sudah kedaluwarsa
When Saya mengirim data pengajuan ke endpoint insert customer
Then Sistem menolak permintaan dengan kode 401 dan pesan "Token expired"
```

### AC-54.04 — Data pengajuan tidak valid

```gherkin
Given Saya seorang Tim IT mitra dengan token valid
When Saya mengirim data pengajuan dengan NIK 15 digit
Then Sistem menolak permintaan dengan kode 400 dan daftar error berisi "ID card number must be 16 digits"
  And tidak ada pengajuan yang dibuat
```

### AC-54.05 — Pengiriman ulang data yang sama tidak membuat pengajuan ganda

```gherkin
Given Saya seorang Tim IT mitra dengan token valid
  And pengajuan dengan reference number mitra "MTR-0001" sudah diterima
When Saya mengirim ulang data dengan reference number "MTR-0001"
Then Sistem mengembalikan Loan ID yang sama dengan pesan "Application already received"
  And tidak ada pengajuan baru yang dibuat
```

> Note: AC-54.02 mengikuti Asumsi A-43.

---

## US-55 — Mencatat Pembayaran Biaya Appraisal (Customer Service)

### AC-55.01 — Mencatat pembayaran appraisal

```gherkin
Given Saya seorang Customer Service
  And saya berada di halaman "Application LKN - KPR"
  And pengajuan "20102026KPR0000041" berstatus "Need Survey"
When Saya mengklik tombol "Edit" pada baris "20102026KPR0000041"
  And saya membuka step "Appraisal"
  And saya memilih file bukti bayar "bukti.jpg"
  And saya mengisi "Appraisal Fee" dengan "750.000"
  And saya mengklik tombol "Submit Payment"
Then Sistem menampilkan pesan "Appraisal payment recorded"
  And status pengajuan di daftar menjadi "Waiting Appraisal"
```

### AC-55.02 — Nominal biaya appraisal kosong

```gherkin
Given Saya seorang Customer Service
  And saya berada di halaman "Appraisal Payment"
When Saya memilih file bukti bayar tanpa mengisi "Appraisal Fee"
  And saya mengklik tombol "Submit Payment"
Then Sistem menampilkan pesan "Appraisal fee is required"
```

### AC-55.03 — Biaya appraisal 0

```gherkin
Given Saya seorang Customer Service
  And saya berada di halaman "Appraisal Payment"
When Saya mengisi "Appraisal Fee" dengan "0"
  And saya mengklik tombol "Submit Payment"
Then Sistem menampilkan pesan "Appraisal fee must be greater than 0"
```

### AC-55.04 — Surveyor tidak bisa mencatat pembayaran

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Appraisal Payment"
  And pembayaran appraisal belum dicatat
When Saya membuka step "Appraisal"
Then Sistem menampilkan catatan "Payment of the appraisal fee must be completed before filling out the appraisal form. Only Customer Service can record the payment" tanpa form unggah bukti bayar
```

---

## US-56 — Mengisi Laporan Kunjungan Nasabah Mikro (Surveyor)

### AC-56.01 — Submit LKN mikro lengkap

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Application LKN - Mikro"
  And saya sudah mengambil tugas pengajuan "20102026KUR0000012"
When Saya mengklik tombol "Edit" pada baris tersebut
  And saya mengisi Survey Date, Surveyor, Invitation Date, Meet Person, Relation
  And saya mengisi data lokasi usaha, pendapatan usaha, biaya usaha, pendapatan dan biaya rumah tangga
  And saya mengunggah 3 foto survey
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Survey submitted"
  And pengajuan hilang dari antrean LKN dan langkah saat ini menjadi modul berikutnya di rute
```

### AC-56.02 — Field wajib kunjungan kosong

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Application LKN Detail"
When Saya membiarkan "Survey Date" dan "Meet Person" kosong
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong
```

### AC-56.03 — Menyimpan LKN sebagai draft

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Application LKN Detail"
When Saya mengisi sebagian data kunjungan
  And saya mengklik tombol "Save as Draft"
Then Sistem menampilkan pesan "Survey saved as draft"
  And pengajuan tetap di antrean LKN dengan status "Draft"
```

### AC-56.04 — Tanggal survey di masa depan

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Application LKN Detail"
  And hari ini 20-10-2026
When Saya mengisi "Survey Date" dengan "21-10-2026"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Survey date must not be in the future"
```

### AC-56.05 — Menghapus foto survey

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Application LKN Detail"
  And terdapat foto "survey_rumah.jpg"
When Saya mengklik ikon hapus pada "survey_rumah.jpg"
  And saya mengklik tombol "Yes" di konfirmasi
Then Sistem menghapus foto dari daftar foto survey
```

> Note: AC-56.01 mengikuti Data dictionary (Grooming T-01).

---

## US-57 — Mengisi Laporan Kunjungan dan Appraisal KPR (Surveyor)

### AC-57.01 — Submit LKN dan appraisal KPR

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Application LKN - KPR"
  And pengajuan "20102026KPR0000041" berstatus "Waiting Appraisal"
When Saya mengisi form LKN KPR
  And saya mengklik tombol "Next"
  And saya mengisi Appraiser Name, Appraisal Date, Property Type, Appraisal Method, Market Value "850.000.000", Liquidation Value "680.000.000"
  And saya mengunggah foto properti
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Survey submitted"
  And langkah saat ini menjadi modul berikutnya di rute KPR
```

### AC-57.02 — Form appraisal terkunci sebelum biaya dibayar

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Application LKN - KPR"
  And pengajuan berstatus "Need Survey"
When Saya mengisi form LKN KPR
  And saya mengklik tombol "Next"
Then Sistem menampilkan catatan "Payment of the appraisal fee must be completed before filling out the appraisal form. Only Customer Service can record the payment"
```

### AC-57.03 — Nilai likuidasi melebihi nilai pasar

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Appraisal"
When Saya mengisi Market Value "850.000.000" dan Liquidation Value "900.000.000"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Liquidation value must not exceed market value"
```

### AC-57.04 — Nilai likuidasi sama dengan nilai pasar diterima

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Appraisal"
When Saya mengisi Market Value "850.000.000" dan Liquidation Value "850.000.000" serta field wajib lain
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Survey submitted"
```

### AC-57.05 — Field wajib appraisal kosong

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Appraisal"
When Saya membiarkan "Appraiser Name" dan "Market Value" kosong
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong
```

> Note: AC-57.01 mengikuti Data dictionary (Grooming T-01). AC-57.05 mengikuti Field Dictionary (Grooming T-01).

---

## US-60 — Meninjau Hasil Duplikasi (Verifikator)

### AC-60.01 — Memutuskan Match

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Dedup"
  And saya sudah mengambil tugas "20102026KTA0000013" dengan hasil Dedup Review
When Saya mengklik tombol "Review"
  And saya memilih "Match" di dropdown "Final Outcome"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Review submitted"
  And pengajuan hilang dari Prescreen Dedup dan langkah saat ini menjadi "Verification Document"
```

### AC-60.02 — Memutuskan UnMatch

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Dedup Detail"
When Saya memilih "UnMatch" di dropdown "Final Outcome"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Review submitted"
  And langkah saat ini menjadi "Dukcapil"
```

### AC-60.03 — Melihat data pembanding

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Dedup"
  And pengajuan mirip dengan 7 data nasabah lama
When Saya mengklik tombol "Review"
Then Sistem menampilkan data pengajuan baru berdampingan dengan 7 data pembanding beserta kolom yang cocok ditandai, dengan paging 5 data per halaman
```

### AC-60.04 — Submit tanpa Final Outcome

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Dedup Detail"
When Saya mengklik tombol "Submit" tanpa memilih "Final Outcome"
Then Sistem menampilkan pesan "Final outcome is required"
```

### AC-60.05 — Tugas dilepas setelah Final Outcome dipilih tetapi belum disubmit

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Dedup Detail"
  And saya sudah memilih "Match" tetapi belum mengklik Submit
When Saya mengklik tombol "Release Me"
  And saya mengklik tombol "Yes"
Then Sistem melepas tugas tanpa menyimpan pilihan "Match" dan pengajuan kembali ke antrean dengan hasil Dedup Review
```

### AC-60.06 — Menghentikan pengajuan ganda yang sedang berjalan

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Dedup Detail"
  And pengajuan "20102026KTA0000015" ber-hasil Dedup "Duplicate In-Flight" terhadap pengajuan "20102026KTA0000013" yang masih On Progress
When Saya memilih "Duplicate - Finish" di dropdown "Final Outcome"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Review submitted"
  And pengajuan "20102026KTA0000015" berstatus "Finish" dengan alasan "Duplicate in-flight application"
  And pengajuan "20102026KTA0000013" tidak berubah
```

> Note: AC-60.01, AC-60.02, AC-60.06 mengikuti Asumsi A-02.

---

## US-62 — Meninjau Hasil Dukcapil (Verifikator)

### AC-62.01 — Memutuskan Pass

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Dukcapil"
  And saya sudah mengambil tugas dengan hasil Dukcapil Review
When Saya mengklik tombol "Review"
  And saya memilih "Pass" di "Decision"
  And saya mengisi "Notes" dengan "Beda ejaan nama"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Review submitted"
  And langkah saat ini menjadi "Verification Document"
```

### AC-62.02 — Meneruskan ke Supervisor

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Dukcapil Detail"
When Saya memilih "Review" di "Decision"
  And saya mengisi "Notes"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Review submitted"
  And pengajuan tampil di antrean "Supervisor Review" dengan status "Manual Verification"
```

### AC-62.03 — Memutuskan Fail

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Dukcapil Detail"
When Saya memilih "Fail" di "Decision"
  And saya mengisi "Notes" dengan "Nama ibu tidak cocok"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Review submitted"
  And pengajuan berstatus "Finish" dengan alasan "Dukcapil review failed"
```

### AC-62.04 — Keputusan tanpa catatan

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Dukcapil Detail"
When Saya memilih "Fail" tanpa mengisi "Notes"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Notes are required"
```

### AC-62.05 — Catatan melebihi 500 karakter

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Dukcapil Detail"
When Saya memilih "Pass"
  And saya mengisi "Notes" dengan 501 karakter
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Notes must not exceed 500 characters"
```

> Note: AC-62.01 mengikuti Asumsi A-06.

---

## US-63 — Memutuskan Review Dukcapil Tingkat Supervisor (Supervisor)

### AC-63.01 — Meloloskan pengajuan

```gherkin
Given Saya seorang Supervisor
  And saya berada di halaman "Supervisor Review"
  And terdapat pengajuan berstatus "Manual Verification"
When Saya mengklik tombol "Review"
  And saya memilih "Pass / Skip Review"
  And saya mengisi "Notes"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Review submitted"
  And langkah saat ini menjadi "Verification Document"
```

### AC-63.02 — Menggagalkan pengajuan

```gherkin
Given Saya seorang Supervisor
  And saya berada di halaman "Supervisor Review Detail"
When Saya memilih "Fail"
  And saya mengisi "Notes"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Review submitted"
  And pengajuan berstatus "Finish" dengan alasan "Dukcapil supervisor review failed"
```

### AC-63.03 — Verifikator tidak bisa membuka antrean Supervisor

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Dashboard"
When Saya mengetik alamat halaman "Supervisor Review" di address bar browser
Then Sistem menampilkan pesan "You do not have access to this page"
```

### AC-63.04 — Keputusan tanpa catatan

```gherkin
Given Saya seorang Supervisor
  And saya berada di halaman "Supervisor Review Detail"
When Saya memilih "Fail" tanpa mengisi "Notes"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Notes are required"
```

### AC-63.05 — Supervisor yang sama dengan Verifikator pengaju

```gherkin
Given Saya seorang Supervisor "sup.01" yang juga meneruskan pengajuan ini sebagai Verifikator
  And saya berada di halaman "Supervisor Review"
When Saya membuka detail pengajuan tersebut
Then Sistem menampilkan keterangan "You cannot review an application you escalated" tanpa tombol keputusan
```

> Note: AC-63.05 mengikuti Asumsi A-14.

---

## US-66 — Meninjau Pengajuan Mencurigakan (Verifikator)

### AC-66.01 — Meloloskan pengajuan Suspicious

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Fraud"
  And saya sudah mengambil tugas dengan hasil Fraud Suspicious karena VPN
When Saya mengklik tombol "Review"
  And saya memilih "Clear"
  And saya mengisi "Notes" dengan "Nasabah memakai VPN kantor, terverifikasi via telepon"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Review submitted"
  And langkah saat ini menjadi modul berikutnya di rute
```

### AC-66.02 — Menolak dan memasukkan ke blacklist

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Fraud Detail"
When Saya memilih "Reject and Blacklist"
  And saya mengisi "Notes"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Review submitted"
  And pengajuan berstatus "Finish" dan data pemohon tercatat di blacklist
```

### AC-66.03 — Keputusan tanpa catatan

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Fraud Detail"
When Saya memilih "Clear" tanpa mengisi "Notes"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Notes are required"
```

### AC-66.04 — Pemohon yang sama di pengajuan lain ikut ditandai

```gherkin
Given Saya seorang Verifikator
  And saya berada di halaman "Prescreen Fraud Detail"
  And pemohon punya pengajuan lain yang sedang On Progress
When Saya memilih "Reject and Blacklist"
  And saya mengisi "Notes"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Review submitted"
  And pengajuan lain milik pemohon yang sama ditandai "Blacklisted applicant" di Application Inquiry
```

> Note: AC-66.01 mengikuti Asumsi A-04.

---

## US-70 — Mendapatkan Hasil Pengecekan SIKP (Risk Manager)

### AC-70.01 — Pemohon belum punya KUR aktif

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And pengajuan KUR Requested Limit 100.000.000, batas SIKP 50.000.000
  And SIKP mengembalikan Days Remaining 0
When Saya mengklik langkah "SIKP" di timeline
Then Sistem menampilkan "SIKP Go - no active KUR at other banks"
  And langkah berikutnya "Approval"
```

### AC-70.02 — Pemohon masih punya KUR aktif

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And SIKP mengembalikan Days Remaining 120
When Saya mengklik langkah "SIKP" di timeline
Then Sistem menampilkan "SIKP NotGo - active KUR found (120 days remaining)"
  And pengajuan masuk antrean "Recontest"
```

### AC-70.03 — Limit tepat di batas SIKP

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And pengajuan KUR Requested Limit 50.000.000, batas SIKP 50.000.000
When Saya membuka timeline pengajuan
Then Sistem menampilkan langkah "SIKP" berstatus "Skipped - condition not met"
```

### AC-70.04 — Limit satu rupiah di atas batas SIKP

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And pengajuan KUR Requested Limit 50.000.001, batas SIKP 50.000.000
When Saya membuka timeline pengajuan
Then Sistem menampilkan langkah "SIKP" dijalankan dengan hasilnya
```

> Note: AC-70.01, AC-70.03, AC-70.04 mengikuti Asumsi A-19.

---

## US-71 — Memproses Ulang Pengajuan yang Ditolak (Risk Manager)

### AC-71.01 — Recontest pengajuan NotGo

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Recontest"
  And pengajuan "20102026KTA0000013" NotGo karena RAC
When Saya mengklik tombol "Recontest" pada baris tersebut
  And saya mengisi "Reason" dengan "Limit diturunkan menjadi 15.000.000 sesuai kesepakatan nasabah"
  And saya mengubah "Requested Limit" menjadi "15.000.000"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Application resubmitted for processing"
  And pengajuan memulai proses baru dari modul pertama setelah Data Entry dengan nomor recontest 1
  And riwayat proses sebelumnya tetap tersimpan
```

### AC-71.02 — Mengakhiri pengajuan

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Recontest"
When Saya mengklik tombol "Finish" pada pengajuan
  And saya mengisi "Reason"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "Application closed"
  And status pengajuan menjadi "Finish"
  And email penolakan terkirim ke pemohon
```

### AC-71.03 — Recontest tanpa alasan

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Recontest Detail"
When Saya mengklik tombol "Submit" tanpa mengisi "Reason"
Then Sistem menampilkan pesan "Reason is required"
```

### AC-71.04 — Batas maksimal recontest

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Recontest"
  And pengajuan sudah di-recontest 3 kali dan batas recontest 3
When Saya melihat baris pengajuan tersebut
Then Sistem tidak menampilkan tombol "Recontest" dan menampilkan keterangan "Maximum recontest reached"
```

### AC-71.05 — Recontest setelah pencairan gagal di core

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Recontest"
  And pengajuan berstatus Recontest karena respons core "GAGAL"
When Saya mengklik tombol "Recontest"
  And saya mengisi "Reason"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Application resubmitted for processing"
```

### AC-71.06 — Recontest memakai ulang hasil layanan eksternal yang masih berlaku

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Recontest"
  And hasil SLIK dan Dukcapil pengajuan tertanggal 10-10-2026
  And hari ini 20-10-2026
  And NIK, nama, tanggal lahir, dan nama ibu tidak berubah
  And "Result Reuse Days" penyedia SLIK dan Dukcapil bernilai 30
When Saya mengklik tombol "Recontest"
  And saya mengisi "Reason"
  And saya mengklik tombol "Submit"
Then Sistem tidak memanggil ulang layanan SLIK dan Dukcapil
  And riwayat proses menampilkan langkah SLIK dan Dukcapil dengan keterangan "Reused from 10-10-2026"
```

### AC-71.07 — Hasil layanan eksternal berumur lebih dari 30 hari dipanggil ulang

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Recontest"
  And hasil SLIK pengajuan tertanggal 19-09-2026
  And hari ini 20-10-2026
  And "Result Reuse Days" penyedia SLIK bernilai 30
When Saya mengklik tombol "Recontest"
  And saya mengisi "Reason"
  And saya mengklik tombol "Submit"
Then Sistem memanggil ulang layanan SLIK
  And riwayat proses menampilkan hasil SLIK baru tertanggal 20-10-2026
```

> Note: AC-71.01, AC-71.02, AC-71.05 mengikuti Asumsi A-07. AC-71.06, AC-71.07 mengikuti Grooming v3 (IN-10).

---

## US-75 — Mengajukan E-Polis Asuransi Kredit (Admin Operasional)

### AC-75.01 — Mengajukan e-polis dengan premi terhitung

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Request Epolis"
  And saya sudah mengambil tugas "20102026KPR0000041" yang disetujui dengan plafon 850.000.000
  And tarif premi "Asuransi Contoh" untuk usia pemohon dan tahun tenor pengajuan 0,85%
When Saya mengklik tombol "Request Epolis"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan "IJK Value" 7.225.000 hasil hitung plafon x tarif premi
  And sistem menampilkan pesan "Epolis issued. Policy number: POL-2026-000123"
  And struktur kredit dihitung ulang dengan nilai asuransi 7.225.000
  And langkah saat ini menjadi "Validity Check"
```

### AC-75.02 — Tarif premi untuk usia dan tahun tenor belum tersedia

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Request Epolis Form"
  And tabel tarif "Asuransi Contoh" belum punya baris untuk usia 47 dan tahun tenor 3
When Saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "No premium rate for age 47 and tenor year 3"
  And pengajuan tetap di antrean Request Epolis
```

### AC-75.03 — Nilai IJK tidak bisa diubah

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Request Epolis Form"
When Saya mengklik field "IJK Value"
Then Sistem menampilkan field "IJK Value" dalam keadaan tidak bisa diedit
```

### AC-75.04 — Layanan asuransi gagal

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Request Epolis Form"
  And layanan asuransi tidak merespons
When Saya mengisi "IJK Value"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Insurance service is unavailable. Please try again later"
  And pengajuan tetap di antrean Request Epolis
```

> Note: AC-75.01 mengikuti Asumsi A-08, A-23. AC-75.02 mengikuti Grooming v2 R-05. AC-75.03 mengikuti Asumsi A-23.

---

## US-78 — Mencetak Ulang Akad Kredit (Admin Operasional)

### AC-78.01 — Mencetak ulang akad

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Reprint Akad"
  And akad "20102026KPR0000041" sudah dicetak
When Saya mengklik tombol "View Detail"
  And saya mengklik tombol "Reprint Akad"
  And saya mengklik tombol "Print"
Then Sistem mengunduh PDF yang isinya sama dengan cetakan pertama
  And audit trail mencatat cetak ulang oleh saya
```

### AC-78.02 — Data cetak ulang tidak bisa diubah

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Reprint Akad Form"
When Saya mengklik field "Customer Account No"
Then Sistem menampilkan field dalam keadaan tidak bisa diedit
```

### AC-78.03 — Cetak ulang tidak mengubah langkah proses

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Reprint Akad"
  And pengajuan berada di langkah "Disbursement"
When Saya mencetak ulang akad
Then Sistem tetap menampilkan langkah saat ini "Disbursement"
```

---

## US-79 — Mengirim Data Pencairan ke Core Banking (Admin Operasional)

### AC-79.01 — Membuat file pencairan

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Disbursement"
  And saya sudah mengambil tugas "20102026KPR0000041"
When Saya mengklik tombol "Disburse"
  And saya mengklik tombol "Yes" di konfirmasi
Then Sistem mengunduh file "20102026KPR0000041.json" berisi satu objek pengajuan dengan buss_unit "LB2", create_by "LOS", obj_code "HONVAR011"
  And langkah saat ini menjadi "Waiting Core Response"
```

### AC-79.02 — Tenor melebihi batas core

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Disbursement"
  And pengajuan bertenor 36 bulan dan core FAST hanya menerima maksimal 24 bulan
When Saya mengklik tombol "Disburse"
Then Sistem menampilkan pesan "Core banking accepts a maximum tenor of 24 months"
```

### AC-79.03 — Tenor tepat 24 bulan diterima

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Disbursement"
  And pengajuan bertenor 24 bulan
When Saya mengklik tombol "Disburse"
  And saya mengklik tombol "Yes"
Then Sistem mengunduh file pencairan dengan 24 baris angsuran
```

### AC-79.04 — Data agunan kendaraan ikut terisi

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Disbursement"
  And pengajuan Kredit Agunan dengan agunan kendaraan
When Saya mengklik tombol "Disburse"
  And saya mengklik tombol "Yes"
Then Sistem mengunduh file dengan field nosin, noka, no_polisi, warna, no_bpkb, obj_tahun, dan obj_price terisi dari data agunan
```

> Note: AC-79.01 mengikuti Asumsi A-09.

---

## US-80 — Mencatat Respons Pencairan dari Core Banking (Admin Operasional)

### AC-80.01 — Respons SUKSES

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Core Disbursement"
  And core mengirim respons "SUKSES" untuk "20102026KPR0000041"
When Saya mencari Loan ID "20102026KPR0000041"
Then Sistem menampilkan respons "SUKSES" beserta file respons core
  And status pengajuan "Disbursed" dan langkah "Finish"
```

### AC-80.02 — Respons GAGAL

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Core Disbursement"
  And core mengirim respons "GAGAL" untuk "20102026KPR0000041"
When Saya mencari Loan ID "20102026KPR0000041"
Then Sistem menampilkan respons "GAGAL" beserta alasan dari core
  And pengajuan masuk antrean "Recontest"
```

### AC-80.03 — Respons untuk Loan ID yang tidak menunggu respons

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Core Disbursement"
  And core mengirim respons untuk pengajuan yang sudah Finish
When Saya membuka daftar respons core
Then Sistem menampilkan respons tersebut dengan status "Ignored - application not waiting for core response"
```

### AC-80.04 — Respons ganda untuk pengajuan yang sama

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Core Disbursement"
  And core mengirim respons "SUKSES" dua kali untuk pengajuan yang sama
When Saya membuka daftar respons core
Then Sistem menampilkan respons kedua dengan status "Duplicate - ignored"
  And status pengajuan tetap "Disbursed"
```

### AC-80.05 — File respons core tidak bisa dibaca

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Core Disbursement"
When Core mengirim file respons yang rusak ke endpoint respons core
Then Sistem mencatat respons dengan status "Ignored - file could not be read"
  And tidak ada status pengajuan yang berubah
```

### AC-80.06 — Respons core dengan hasil campuran

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Core Disbursement"
  And file respons berisi PEMBIAYAAN GAGAL dan LIMIT-INDUK SUKSES untuk "20102026KPR0000041"
When Core mengirim file respons tersebut ke endpoint respons core
Then Sistem memasukkan pengajuan ke antrean "Recontest"
  And halaman "Core Disbursement" menampilkan peringatan "Partial core records exist; coordinate with core team"
```

### AC-80.07 — Respons core lewat endpoint

```gherkin
Given Saya seorang Admin Operasional
  And saya berada di halaman "Core Disbursement"
  And pengajuan "20102026KPR0000041" berada di langkah "Waiting Core Response"
When Core mengirim file respons "SUKSES" ke endpoint respons core
Then Sistem menampilkan status pengajuan "Disbursed"
  And respons tampil dengan sumber "Core endpoint"
```

> Note: AC-80.02 mengikuti Asumsi A-07. AC-80.05 mengikuti Grooming v3 (IN-15). AC-80.06 mengikuti Grooming v2 E-03. AC-80.07 mengikuti Grooming v2 R-07.

---

## US-81 — Melihat Dashboard Ringkasan Pengajuan (Kepala Cabang)

### AC-81.01 — Melihat dashboard semua produk

```gherkin
Given Saya seorang Kepala Cabang
  And saya berada di halaman "Dashboard"
  And cabang saya punya 3 pengajuan Draft dan 8 pengajuan yang sudah disubmit
  And hasil Decision terakhir dari pengajuan yang disubmit: 2 GO dan 1 NOT GO
When Saya membuka halaman "Dashboard"
Then Sistem menampilkan Total Applications 11, kartu Save as Draft 3, Submitted 8, GO 2, NOT GO 1, grafik Disbursement per regional, dan daftar Application State dengan jumlahnya
```

### AC-81.02 — Menyaring dashboard per produk

```gherkin
Given Saya seorang Kepala Cabang
  And saya berada di halaman "Dashboard"
When Saya memilih "KPR" di dropdown "All Products"
Then Sistem menampilkan seluruh angka dan grafik hanya untuk produk KPR
```

### AC-81.03 — Membuka daftar pengajuan dari kartu status

```gherkin
Given Saya seorang Kepala Cabang
  And saya berada di halaman "Dashboard"
When Saya mengklik kartu "NOT GO"
Then Sistem menampilkan halaman "Application Inquiry" dengan filter status NOT GO
```

### AC-81.04 — Belum ada pengajuan

```gherkin
Given Saya seorang Kepala Cabang company baru
  And saya berada di halaman "Dashboard"
  And belum ada pengajuan
When Saya membuka halaman "Dashboard"
Then Sistem menampilkan angka 0 pada semua kartu dan pesan "No disbursement data yet" pada grafik
```

### AC-81.05 — Data dibatasi sesuai unit kerja

```gherkin
Given Saya seorang Kepala Cabang Bandung
  And saya berada di halaman "Dashboard"
When Saya membuka halaman "Dashboard"
Then Sistem hanya menghitung pengajuan cabang Bandung
```

### AC-81.06 — Reset filter

```gherkin
Given Saya seorang Kepala Cabang
  And saya berada di halaman "Dashboard"
  And filter produk KPR aktif
When Saya mengklik tombol "Reset Filter"
Then Sistem menampilkan dashboard untuk semua produk
```

### AC-81.07 — Pengguna tanpa akses dashboard

```gherkin
Given Saya seorang QA tanpa akses menu Dashboard
  And saya berada di halaman "Login"
When Saya login
Then Sistem menampilkan halaman pertama yang saya punya aksesnya dan menu "Dashboard" tidak tampil
```

### AC-81.08 — Melihat metrik kinerja proses

```gherkin
Given Saya seorang Kepala Cabang
  And saya berada di halaman "Dashboard"
When Saya membuka panel "Process Metrics" untuk bulan berjalan
Then Sistem menampilkan median waktu Submit sampai Decision, persentase pengajuan Auto Approved, dan persentase pengajuan yang dikembalikan Verifikator atau Approver
```

> Note: AC-81.01 mengikuti Grooming v3 (pemetaan status ke label UI, data dictionary). AC-81.05 mengikuti Asumsi A-34.

---

## US-82 — Mengekspor Laporan Pengajuan (Kepala Cabang)

### AC-82.01 — Mengekspor laporan

```gherkin
Given Saya seorang Kepala Cabang
  And saya berada di halaman "Dashboard"
When Saya mengklik tombol "Export Option"
  And saya memilih periode "01-10-2026" s.d. "31-10-2026", status "On Progress", state "Approval"
  And saya mengklik tombol "Export"
Then Sistem mengunduh file Excel berisi pengajuan sesuai filter dengan kolom Loan ID, Nama, Produk, Limit, Status, State, Tanggal
```

### AC-82.02 — Periode tidak valid

```gherkin
Given Saya seorang Kepala Cabang
  And saya berada di halaman "Export Option"
When Saya memilih periode "31-10-2026" s.d. "01-10-2026"
  And saya mengklik tombol "Export"
Then Sistem menampilkan pesan "End date must be on or after start date"
```

### AC-82.03 — Hasil melebihi 50.000 baris

```gherkin
Given Saya seorang Kepala Cabang
  And saya berada di halaman "Export Option"
When Saya memilih filter yang menghasilkan 50.001 baris
  And saya mengklik tombol "Export"
Then Sistem menampilkan pesan "Export is limited to 50,000 rows. Please narrow the filter"
```

### AC-82.04 — Tidak ada data sesuai filter

```gherkin
Given Saya seorang Kepala Cabang
  And saya berada di halaman "Export Option"
When Saya memilih filter yang tidak menghasilkan data
  And saya mengklik tombol "Export"
Then Sistem menampilkan pesan "No data matches the selected filter"
```

### AC-82.05 — NIK disamarkan di file ekspor

```gherkin
Given Saya seorang Kepala Cabang
  And saya berada di halaman "Export Option"
  And pengajuan pemohon ber-NIK "3273011402900001" termasuk dalam filter
When Saya mengklik tombol "Export"
Then Sistem mengunduh file dengan kolom NIK berisi "3273********0001"
```

> Note: AC-82.05 mengikuti Asumsi A-38.

---

## US-87 — Menerima Notifikasi Status Pengajuan (Nasabah)

### AC-87.01 — Pemicu dan isi email nasabah sesuai matriks

```gherkin
Given Saya seorang Nasabah dengan email "rudi@contoh.com" pada pengajuan "20102026KTA0000013"
When Saya membuka kotak masuk email setelah kejadian pada baris MRTM
Then Refer to MRTM Rows: TRM_NTF_001 through TRM_NTF_008 for comprehensive logic combinations.
```

> Note: AC-87.01 mengikuti Asumsi A-07, A-27.

#### MRTM US-87

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Kejadian | Subjek Email | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|
| US_87 | AC_87.01 | Nasabah | TRM_NTF_001 | Pengajuan disubmit | Pengajuan kredit 20102026KTA0000013 telah kami terima | [-] | Email terkirim satu kali |
| US_87 | AC_87.01 | Nasabah | TRM_NTF_002 | Decision NotGo | [-] | Pengajuan masuk antrean Recontest | Tidak ada email |
| US_87 | AC_87.01 | Nasabah | TRM_NTF_003 | Approver Reject | Pengajuan kredit 20102026KTA0000013 belum dapat disetujui | [-] | Email terkirim satu kali |
| US_87 | AC_87.01 | Nasabah | TRM_NTF_004 | Respons core SUKSES | Kredit 20102026KTA0000013 telah dicairkan | [-] | Email terkirim satu kali |
| US_87 | AC_87.01 | Nasabah | TRM_NTF_005 | Recontest dimulai | [-] | [-] | Tidak ada email |
| US_87 | AC_87.01 | Nasabah | TRM_NTF_006 | Pengajuan disubmit | [-] | Email nasabah kosong | Tidak ada email; riwayat mencatat "Notification skipped - no email" |
| US_87 | AC_87.01 | Nasabah | TRM_NTF_007 | Risk Manager memilih Finish di Recontest | Pengajuan kredit 20102026KTA0000013 belum dapat disetujui | [-] | Email terkirim satu kali |
| US_87 | AC_87.01 | Nasabah | TRM_NTF_008 | Dukcapil Failed (pengajuan Finish) | Pengajuan kredit 20102026KTA0000013 belum dapat disetujui | [-] | Email terkirim satu kali |

---

## US-88 — Melihat Beranda Mobile (Sales)

### AC-88.01 — Melihat beranda

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Home (mobile)"
When Saya membuka aplikasi mobile setelah login
Then Sistem menampilkan Total Sales bulan berjalan (total plafon pengajuan saya yang berstatus Disbursed), persentase dibanding bulan lalu ((bulan ini dikurangi bulan lalu) dibagi bulan lalu, "-" bila bulan lalu 0), dan 3 tile kategori: Non Collateral Loan, Collateral Loan, Pension Credit
```

### AC-88.02 — Memilih kategori produk

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Home (mobile)"
When Saya mengetuk tile "Collateral Loan"
Then Sistem menampilkan daftar produk aktif kategori Collateral Loan yang sudah punya rute disetujui
```

### AC-88.03 — Kategori tanpa produk

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Home (mobile)"
  And belum ada produk Pension Credit yang aktif
When Saya mengetuk tile "Pension Credit"
Then Sistem menampilkan pesan "No products available in this category"
```

### AC-88.04 — Tanpa koneksi internet

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Home (mobile)"
  And perangkat tidak terhubung internet
When Saya menarik layar ke bawah untuk memuat ulang
Then Sistem menampilkan pesan "No internet connection" dan data terakhir yang tersimpan
```

> Note: AC-88.01 mengikuti Asumsi A-25.

---

## US-89 — Membuat Pengajuan dari Mobile (Sales)

### AC-89.01 — Melengkapi section dan submit

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Loan Application (mobile)"
  And semua section bertanda centang hijau
When Saya mengetuk tombol "Apply Loan Now"
  And saya mengetuk tombol "Yes" di konfirmasi
Then Sistem menampilkan pesan "Application submitted. Loan ID: 20102026KTA0000014"
  And pengajuan tampil di tab "On Progress" pada Loan List dengan channel "Mobile"
```

### AC-89.02 — Tombol Apply nonaktif sebelum section lengkap

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Loan Application (mobile)"
  And section Document belum lengkap
When Saya melihat tombol "Apply Loan Now"
Then Sistem menampilkan tombol "Apply Loan Now" dalam keadaan nonaktif
```

### AC-89.03 — Section berikutnya terkunci sebelum section sebelumnya selesai

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Loan Application (mobile)"
  And section Personal belum disubmit
When Saya mengetuk section "Occupation Details"
Then Sistem menampilkan pesan "Please complete Personal Details first"
```

### AC-89.04 — Progres section tersimpan saat aplikasi ditutup

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Personal Details (mobile)"
  And saya sudah mengisi step 1 dari 3
When Saya menutup aplikasi
  And saya membuka kembali draft dari Loan List tab "Draft"
Then Sistem menampilkan section Personal Details pada step 2 dengan data step 1 terisi
```

### AC-89.05 — Validasi field sama dengan web

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Personal Details (mobile)"
When Saya mengisi "ID Card Number" dengan 15 digit
  And saya mengetuk tombol "Next"
Then Sistem menampilkan pesan "ID card number must be 16 digits"
```

---

## US-90 — Melihat Daftar Pengajuan Saya di Mobile (Sales)

### AC-90.01 — Melihat tab On Progress

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Loan List (mobile)"
When Saya mengetuk tab "On Progress"
Then Sistem menampilkan pengajuan saya yang sedang diproses dengan Loan ID, nama, limit, tenor, rate, dan langkah saat ini
```

### AC-90.02 — Mencari pengajuan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Loan List (mobile)"
When Saya mengetik "rudi" di field pencarian
Then Sistem menampilkan pengajuan saya yang Loan ID atau namanya mengandung "rudi"
```

### AC-90.03 — Tab kosong

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Loan List (mobile)"
  And belum ada pengajuan yang dicairkan
When Saya mengetuk tab "Disburse"
Then Sistem menampilkan pesan "No disbursed applications yet"
```

### AC-90.04 — Pengajuan On Progress tidak bisa diedit

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Loan List (mobile)"
When Saya mengetuk pengajuan di tab "On Progress"
Then Sistem menampilkan detail pengajuan tanpa tombol edit
```

---

## US-91 — Mengisi Laporan Kunjungan dari Mobile (Surveyor)

### AC-91.01 — Submit LKN dari mobile

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "List LKN (mobile)"
  And pengajuan "20102026KUR0000012" berstatus Need Survey
When Saya mengetuk pengajuan tersebut
  And saya mengisi data kunjungan, usaha, dan rumah tangga
  And saya mengambil 3 foto dengan kamera
  And saya mengetuk tombol "Submit"
Then Sistem menampilkan pesan "Survey submitted"
  And pengajuan hilang dari List LKN
```

### AC-91.02 — Foto melebihi 2 MB

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Detail LKN (mobile)"
When Saya memilih foto 2,1 MB dari galeri
Then Sistem menampilkan pesan "File must not exceed 2 MB"
```

### AC-91.03 — Lokasi foto tercatat

```gherkin
Given Saya seorang Surveyor
  And saya berada di halaman "Detail LKN (mobile)"
  And izin lokasi perangkat aktif
When Saya mengambil foto survey
Then Sistem menyimpan koordinat dan waktu pengambilan pada foto tersebut
```

> Note: AC-91.02 mengikuti Asumsi A-17.

---

## US-92 — Melihat Profil Pengguna di Mobile (Sales)

### AC-92.01 — Melihat profil

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Profile (mobile)"
When Saya mengetuk ikon profil di bottom bar
Then Sistem menampilkan Full Name, Username, Role Name, Email, Phone Number serta menu Change Password, Help, dan Logout
```

### AC-92.02 — Logout dari mobile

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Profile (mobile)"
When Saya mengetuk menu "Logout"
  And saya mengetuk tombol "Yes"
Then Sistem menampilkan halaman Login mobile dan draft lokal yang belum tersimpan dihapus
```

### AC-92.03 — Logout saat ada draft yang belum disimpan

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Profile (mobile)"
  And terdapat isian section yang belum disimpan ke server
When Saya mengetuk menu "Logout"
Then Sistem menampilkan konfirmasi "You have unsaved application data. Log out anyway?"
```

### AC-92.04 — Nomor telepon kosong

```gherkin
Given Saya seorang Sales tanpa nomor telepon di data user
  And saya berada di halaman "Profile (mobile)"
When Saya mengetuk ikon profil
Then Sistem menampilkan "Phone Number" berisi "-"
```

---

## US-93 — Melihat Perangkat yang Dipakai Sales (Admin Sistem)

### AC-93.01 — Melihat daftar perangkat

```gherkin
Given Saya seorang Admin Sistem
  And saya berada di halaman "Device Info"
When Saya membuka halaman "Device Info"
Then Sistem menampilkan daftar perangkat dengan username, model perangkat, versi aplikasi, dan waktu login terakhir
```

### AC-93.02 — Melihat lokasi perangkat

```gherkin
Given Saya seorang Admin Sistem
  And saya berada di halaman "Device Info"
When Saya mengklik tombol "Location" pada salah satu perangkat
Then Sistem menampilkan nama lokasi dan koordinat terakhir perangkat
```

### AC-93.03 — Perangkat tanpa data lokasi

```gherkin
Given Saya seorang Admin Sistem
  And saya berada di halaman "Device Info"
  And perangkat tidak mengizinkan akses lokasi
When Saya mengklik tombol "Location"
Then Sistem menampilkan pesan "Location not available for this device"
```

### AC-93.04 — Sales tidak bisa membuka Device Info

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Dashboard"
When Saya mengetik alamat halaman "Device Info" di address bar browser
Then Sistem menampilkan pesan "You do not have access to this page"
```

### AC-93.05 — Pencarian perangkat tanpa hasil

```gherkin
Given Saya seorang Admin Sistem
  And saya berada di halaman "Device Info"
When Saya mengetik "tidak.ada" di field "Search"
Then Sistem menampilkan pesan "No devices found"
```

---

## US-94 — Mensimulasikan Respons Layanan Eksternal (QA)

### AC-94.01 — Mengatur respons core tiruan

```gherkin
Given Saya seorang QA di lingkungan UAT
  And saya berada di halaman "Simulation - Core Response"
  And pengajuan "20102026KPR0000041" berada di langkah Waiting Core Response
When Saya mengklik tombol "Generate" pada baris tersebut
  And saya memilih "No" di "Outcome" dan mengisi "Sequence" dengan "1"
  And saya mengklik tombol "Process"
Then Sistem menampilkan pesan "Simulated response processed"
  And pengajuan masuk antrean Recontest
```

### AC-94.02 — Menambah data Dukcapil tiruan

```gherkin
Given Saya seorang QA di lingkungan UAT
  And saya berada di halaman "Simulation - Dukcapil Data"
When Saya mengklik tombol "Add Data"
  And saya mengisi NIK, nama, tempat lahir, tanggal lahir, dan nama ibu
  And saya mengklik tombol "Save"
Then Sistem menampilkan pesan "Data saved"
  And modul Dukcapil di UAT memakai data tersebut untuk NIK yang sama
```

### AC-94.03 — Menu simulasi tidak tersedia di produksi

```gherkin
Given Saya seorang QA di lingkungan produksi
  And saya berada di halaman "Dashboard"
When Saya mengetik alamat halaman "Simulation" di address bar browser
Then Sistem menampilkan pesan "Page not found"
```

### AC-94.04 — Simulasi untuk pengajuan yang tidak menunggu respons

```gherkin
Given Saya seorang QA di lingkungan UAT
  And saya berada di halaman "Simulation - Core Response"
  And pengajuan sudah Finish
When Saya mencari pengajuan tersebut
Then Sistem tidak menampilkan pengajuan tersebut di daftar
```

### AC-94.05 — Sequence kosong ditolak

```gherkin
Given Saya seorang QA di lingkungan UAT
  And saya berada di halaman "Simulation - Core Response"
When Saya mengklik tombol "Generate"
  And saya memilih "Yes" di "Outcome" tanpa mengisi "Sequence"
  And saya mengklik tombol "Process"
Then Sistem menampilkan pesan "Sequence is required"
```

> Note: AC-94.01 mengikuti Asumsi A-29, A-10. AC-94.03 mengikuti Asumsi A-29.

---

## US-95 — Mengelola Blacklist (Risk Manager)

### AC-95.01 — Menambah data blacklist

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Blacklist"
When Saya mengklik tombol "New Blacklist"
  And saya mengisi "ID Card Number" dengan "3273011402900009" dan "Full Name ID" dengan "BUDI SANTOSO"
  And saya mengisi "Reason" dengan "Dokumen palsu terkonfirmasi"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And data tampil di "Pending Blacklist" dengan status "Waiting Approval"
```

### AC-95.02 — Mencabut data blacklist

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Blacklist"
  And NIK "3273011402900009" ada di blacklist
When Saya mengklik ikon cabut pada baris tersebut
  And saya mengisi "Reason" dengan "Salah input, terverifikasi Dukcapil"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And setelah Checker menyetujui, pengajuan baru dengan NIK tersebut tidak lagi ber-hasil High Fraud Potential
```

### AC-95.03 — Tanpa alasan

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "New Blacklist"
When Saya mengisi "ID Card Number" tanpa mengisi "Reason"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Reason is required"
```

### AC-95.04 — NIK sudah di blacklist

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "New Blacklist"
  And NIK "3273011402900009" sudah ada di blacklist
When Saya mengisi "ID Card Number" dengan "3273011402900009"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "ID card number is already blacklisted"
```

### AC-95.05 — Asal data dari keputusan Verifikator

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Blacklist"
  And Verifikator memilih "Reject and Blacklist" untuk pemohon NIK "3273011402900010"
When Saya mengetik "3273011402900010" di field "Search"
Then Sistem menampilkan data dengan Source "Prescreen Fraud", Loan ID asal, nama Verifikator, dan catatannya
```

> Note: AC-95.01, AC-95.02, AC-95.05 mengikuti Asumsi A-04.

---

## US-96 — Mengelola Aplikasi Mitra API (Maker)

### AC-96.01 — Mendaftarkan mitra

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Partner Application"
When Saya mengklik tombol "New Partner"
  And saya mengisi "Partner Code" "MTR01" dan "Partner Name" "Koperasi Contoh"
  And saya memilih Branch "011 - Bandung" dan Product "KTA"
  And saya mengklik tombol "Submit"
Then Sistem menampilkan pesan "Data submitted for approval"
  And setelah Checker menyetujui, user sistem "partner.MTR01" terbentuk di Branch "011 - Bandung"
```

### AC-96.02 — Menerbitkan API key

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Partner Application"
  And mitra "MTR01" aktif
When Saya mengklik tombol "Generate API Key" pada mitra "MTR01"
  And saya mengklik tombol "Yes"
Then Sistem menampilkan API key satu kali dengan keterangan "Copy this key now. It will not be shown again"
```

### AC-96.03 — Mencabut API key

```gherkin
Given Saya seorang Maker
  And saya berada di halaman "Partner Application"
  And mitra "MTR01" punya API key aktif
When Saya mengklik tombol "Revoke" pada API key tersebut
  And saya mengklik tombol "Yes"
Then Sistem menampilkan pesan "API key revoked"
  And permintaan token dengan key tersebut ditolak dengan kode 401
```

### AC-96.04 — Produk di luar izin mitra

```gherkin
Given Saya seorang Tim IT mitra "MTR01" dengan token valid
  And mitra hanya diizinkan mengirim produk KTA
When Saya mengirim pengajuan produk KPR
Then Sistem menolak permintaan dengan kode 403 dan pesan "Product KPR is not allowed for this partner"
```

### AC-96.05 — Batas jumlah permintaan

```gherkin
Given Saya seorang Tim IT mitra dengan token valid
  And saya sudah mengirim 60 permintaan dalam 1 menit terakhir
When Saya mengirim permintaan ke-61
Then Sistem menolak permintaan dengan kode 429 dan pesan "Rate limit exceeded. Try again later"
```

### AC-96.06 — Pengajuan tanpa dokumen wajib

```gherkin
Given Saya seorang Tim IT mitra dengan token valid
  And pengajuan dengan reference number "MTR-0002" belum punya dokumen KTP
When Saya mengirim pengajuan "MTR-0002" ke endpoint insert customer
Then Sistem menolak permintaan dengan kode 400 dan pesan "Required documents missing: KTP"
  And tidak ada pengajuan yang dibuat
```

> Note: AC-96.01, AC-96.02, AC-96.03, AC-96.04, AC-96.05, AC-96.06 mengikuti Asumsi A-43.

---

## US-98 — Memigrasikan Data LOS OS11 (Admin Sistem)

> Note: Rilis pertama tanpa migrasi (Grooming v3, tech ref TO-05).

### AC-98.01 — Migrasi dengan laporan rekonsiliasi

```gherkin
Given Saya seorang Admin Sistem di lingkungan migrasi
  And file ekstrak OS11 berisi 1.200 user, 15.000 nasabah, dan 40.000 pengajuan historis
When Saya menjalankan proses migrasi
Then Sistem menampilkan laporan rekonsiliasi dengan jumlah sumber, berhasil, dan gagal per jenis data
  And jumlah berhasil ditambah gagal sama dengan jumlah sumber
```

### AC-98.02 — Baris gagal tidak menghentikan migrasi

```gherkin
Given Saya seorang Admin Sistem di lingkungan migrasi
  And file ekstrak berisi 3 user tanpa email
When Saya menjalankan proses migrasi
Then Sistem menampilkan 3 baris gagal dengan alasan "Email is required"
  And baris lain tetap termigrasi
```

### AC-98.03 — Pengajuan in-flight tidak dimigrasi

```gherkin
Given Saya seorang Admin Sistem di lingkungan migrasi
  And file ekstrak berisi pengajuan OS11 berstatus On Progress
When Saya menjalankan proses migrasi
Then Sistem tidak memigrasikan pengajuan tersebut
  And laporan menampilkannya di kategori "Skipped - in-flight, completed in OS11"
```

### AC-98.04 — Pengajuan historis hanya bisa dibaca

```gherkin
Given Saya seorang Sales
  And saya berada di halaman "Application Inquiry"
  And terdapat pengajuan hasil migrasi dari OS11
When Saya membuka detail pengajuan tersebut
Then Sistem menampilkan label "Migrated from OS11" tanpa tombol edit dan tanpa langkah proses yang bisa dijalankan
```

### AC-98.05 — Dedup membandingkan dengan data hasil migrasi

```gherkin
Given Saya seorang Risk Manager
  And saya berada di halaman "Application Detail - Workflow"
  And nasabah hasil migrasi ber-NIK "3273011402900001"
When Saya membuka riwayat proses pengajuan baru dengan NIK "3273011402900001" yang baru melewati modul Dedup
Then Sistem menampilkan hasil Dedup "Match" dengan data pembanding nasabah hasil migrasi
```

> Note: AC-98.01, AC-98.02, AC-98.03, AC-98.04 mengikuti Asumsi A-49. AC-98.05 mengikuti Asumsi A-02, A-49.

---

## US-99 — Mengelola Lisensi Modul (Tim internal PPU)

> Note: Dokumen BA: konsol lisensi minimal untuk tim PPU dibangun di rilis pertama (Grooming v3, tech ref TO-09). Belum ada AC.

---
