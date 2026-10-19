# Doc BA Cikal: User Story dan Acceptance Criteria

Draft TO-BE untuk rebuild LOS (code name Cikal). Disusun dengan aturan skill `my-ba-flow:us-ac-writer` (SysFunc_US_AC_Guide dan Appendix D BA Handbook).

- Sumber: Doc BA LOS Versi 1, 63 dokumen teknis LOS OS11, Figma LOS Product, `Docs/cikal-to-be-concept.md`.
- Label UI dan pesan sistem ditulis dalam bahasa Inggris (Asumsi A-27).
- Asumsi untuk pertanyaan yang belum dijawab stakeholder tercatat di bagian akhir dokumen dan di sheet "Asumsi" pada xlsx.
- Governance (Rule AI-01, AI-03): seluruh isi dokumen ini dibuat dengan bantuan AI dan wajib direview BA penanggung jawab sebelum menjadi deliverable resmi.

## US-01: Masuk dengan Username dan Password

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Pengguna LOS | masuk ke aplikasi memakai username dan password yang terdaftar | hanya pengguna terdaftar yang mengakses data pengajuan sesuai perannya |

### Acceptance Criteria US-01

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-01.01 | Masuk dengan username dan password yang benar | Saya seorang Sales dengan username "sales.jkt01"<br>AND saya berada di halaman "Login" | Saya mengetik "sales.jkt01" di field "Username"<br>AND saya mengetik password yang benar di field "Password"<br>AND saya mengklik tombol "Login" | Sistem menampilkan halaman "Dashboard"<br>AND nama lengkap, role "Sales", dan nama company saya tampil di header kanan atas | Draft |
| AC-01.02 | Gagal masuk karena password salah | Saya seorang Sales dengan username "sales.jkt01"<br>AND saya berada di halaman "Login" | Saya mengetik "sales.jkt01" di field "Username"<br>AND saya mengetik password yang salah di field "Password"<br>AND saya mengklik tombol "Login" | Sistem menampilkan pesan "Invalid username or password"<br>AND saya tetap di halaman "Login" | Draft |
| AC-01.03 | Gagal masuk karena username tidak terdaftar | Saya seorang pengunjung<br>AND saya berada di halaman "Login" | Saya mengetik "tidak.terdaftar" di field "Username"<br>AND saya mengetik "Abc12345!" di field "Password"<br>AND saya mengklik tombol "Login" | Sistem menampilkan pesan "Invalid username or password" yang sama persis dengan pesan password salah<br>AND saya tetap di halaman "Login" | Draft |
| AC-01.04 | Gagal masuk karena field wajib kosong | Saya seorang pengunjung<br>AND saya berada di halaman "Login" | Saya membiarkan field "Username" dan "Password" kosong<br>AND saya mengklik tombol "Login" | Sistem menampilkan pesan "Username is required" di bawah field "Username"<br>AND pesan "Password is required" tampil di bawah field "Password" | Draft |
| AC-01.05 | Akun terkunci pada kegagalan kelima berturut-turut | Saya seorang Sales dengan username "sales.jkt01"<br>AND saya berada di halaman "Login"<br>AND saya sudah 4 kali berturut-turut salah memasukkan password | Saya mengetik password yang salah<br>AND saya mengklik tombol "Login" | Sistem menampilkan pesan "Your account is locked for 15 minutes due to too many failed attempts"<br>AND login dengan password benar selama 15 menit berikutnya ditolak dengan pesan yang sama | Draft |
| AC-01.06 | Login benar setelah 4 kegagalan belum terkunci | Saya seorang Sales dengan username "sales.jkt01"<br>AND saya berada di halaman "Login"<br>AND saya sudah 4 kali berturut-turut salah memasukkan password | Saya mengetik password yang benar<br>AND saya mengklik tombol "Login" | Sistem menampilkan halaman "Dashboard"<br>AND hitungan gagal login saya kembali ke 0 | Draft |
| AC-01.07 | User berstatus Inactive tidak bisa masuk | Saya seorang pengguna dengan username "sales.jkt02" yang berstatus Inactive<br>AND saya berada di halaman "Login" | Saya mengetik "sales.jkt02" dan password yang benar<br>AND saya mengklik tombol "Login" | Sistem menampilkan pesan "Your account is inactive. Please contact your administrator"<br>AND saya tetap di halaman "Login" | Draft |
| AC-01.08 | Input berisi pola injeksi tidak memberi akses | Saya seorang pengunjung<br>AND saya berada di halaman "Login" | Saya mengetik "admin' OR '1'='1" di field "Username"<br>AND saya mengetik "x" di field "Password"<br>AND saya mengklik tombol "Login" | Sistem menampilkan pesan "Invalid username or password"<br>AND saya tetap di halaman "Login" tanpa akses ke aplikasi | Draft |

Catatan: AC-01.05, AC-01.06 mengikuti Asumsi A-28.

## US-02: Masuk dengan Akun SSO Perusahaan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Pegawai bank dengan akun SSO | masuk ke aplikasi memakai akun SSO perusahaan tanpa password terpisah | pegawai tidak mengelola password tambahan dan akses dikendalikan identitas perusahaan |

### Acceptance Criteria US-02

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-02.01 | Masuk SSO dengan akun yang sudah punya role | Saya seorang pegawai dengan akun SSO "rina.approver" yang terdaftar di LOS dengan role Approver<br>AND saya berada di halaman "Login" | Saya mengklik tombol "Login with SSO"<br>AND saya mengisi username dan password di halaman login SSO perusahaan<br>AND saya mengklik tombol "Sign In" di halaman SSO | Sistem menampilkan halaman "Dashboard" LOS<br>AND nama saya dan role "Approver" tampil di header | Draft |
| AC-02.02 | Masuk SSO pertama kali untuk akun yang belum terdaftar | Saya seorang pegawai dengan akun SSO "budi.baru" yang belum pernah masuk LOS<br>AND saya berada di halaman "Login" | Saya mengklik tombol "Login with SSO"<br>AND saya menyelesaikan login di halaman SSO perusahaan | Sistem menampilkan halaman dengan pesan "Your account has been created. Please wait until an administrator assigns your role"<br>AND menu aplikasi tidak tampil<br>AND user "budi.baru" tercatat di daftar User Application dengan status "No Role" | Draft |
| AC-02.03 | Login SSO dibatalkan di halaman penyedia SSO | Saya seorang pegawai dengan akun SSO<br>AND saya berada di halaman "Login" | Saya mengklik tombol "Login with SSO"<br>AND saya mengklik tombol "Cancel" di halaman SSO perusahaan | Sistem menampilkan halaman "Login" LOS dengan pesan "SSO login was cancelled" | Draft |
| AC-02.04 | Akun SSO berstatus Inactive di LOS tidak bisa masuk | Saya seorang pegawai dengan akun SSO "dodi.sales" yang berstatus Inactive di LOS<br>AND saya berada di halaman "Login" | Saya mengklik tombol "Login with SSO"<br>AND saya menyelesaikan login di halaman SSO perusahaan | Sistem menampilkan halaman "Login" dengan pesan "Your account is inactive. Please contact your administrator" | Draft |
| AC-02.05 | Email akun SSO sudah dipakai user lokal | Saya seorang pegawai dengan akun SSO beremail "sari@contoh.co.id"<br>AND saya berada di halaman "Login"<br>AND user lokal "sales.bdg01" sudah memakai email "sari@contoh.co.id" | Saya mengklik tombol "Login with SSO"<br>AND saya menyelesaikan login di halaman SSO perusahaan | Sistem menampilkan halaman "Dashboard" sebagai user "sales.bdg01" dan akun tersebut tertaut ke SSO tanpa membuat user baru | Draft |

Catatan: AC-02.02 mengikuti Asumsi A-11.

## US-03: Meminta Tautan Reset Password

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Pengguna LOS dengan akun lokal | meminta tautan reset password ke email terdaftar saat lupa password | pengguna memulihkan akses secara mandiri tanpa menunggu administrator |

### Acceptance Criteria US-03

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-03.01 | Meminta tautan reset dengan email terdaftar | Saya seorang pengguna lokal dengan email "analis@contoh.co.id"<br>AND saya berada di halaman "Forgot Password" | Saya mengetik "analis@contoh.co.id" di field "Email"<br>AND saya mengklik tombol "Send Reset Link" | Sistem menampilkan pesan "If the email is registered, a reset link has been sent"<br>AND email berisi tautan reset yang berlaku 10 menit terkirim ke "analis@contoh.co.id" | Draft |
| AC-03.02 | Meminta tautan reset dengan email tidak terdaftar | Saya seorang pengunjung<br>AND saya berada di halaman "Forgot Password" | Saya mengetik "bukan.user@contoh.co.id" di field "Email"<br>AND saya mengklik tombol "Send Reset Link" | Sistem menampilkan pesan "If the email is registered, a reset link has been sent" yang sama persis dengan email terdaftar<br>AND tidak ada email yang dikirim | Draft |
| AC-03.03 | Format email tidak valid | Saya seorang pengunjung<br>AND saya berada di halaman "Forgot Password" | Saya mengetik "analis@contoh" di field "Email"<br>AND saya mengklik tombol "Send Reset Link" | Sistem menampilkan pesan "Please enter a valid email address" di bawah field "Email" | Draft |
| AC-03.04 | Akun SSO tidak menerima email reset password lokal | Saya seorang pegawai yang hanya memakai akun SSO dengan email "rina@contoh.co.id"<br>AND saya berada di halaman "Forgot Password" | Saya mengetik "rina@contoh.co.id" di field "Email"<br>AND saya mengklik tombol "Send Reset Link" | Sistem menampilkan pesan "If the email is registered, a reset link has been sent"<br>AND tidak ada email reset yang dikirim karena akun dikelola SSO | Draft |

Catatan: AC-03.01 mengikuti Asumsi A-28.

## US-04: Mengatur Ulang Password

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Pengguna LOS dengan akun lokal | membuat password baru melalui tautan reset dari email | akses pulih dengan password yang memenuhi standar keamanan |

### Acceptance Criteria US-04

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-04.01 | Membuat password baru yang memenuhi semua kriteria | Saya seorang pengguna lokal<br>AND saya berada di halaman "Reset Password"<br>AND saya membuka tautan reset yang masih berlaku | Saya mengetik "Cikal@2026" di field "New Password"<br>AND saya mengetik "Cikal@2026" di field "Confirm New Password"<br>AND saya mengklik tombol "Reset Password" | Sistem menampilkan halaman "Login" dengan pesan "Your password has been reset. Please log in"<br>AND tautan reset yang sama tidak bisa dipakai lagi | Draft |
| AC-04.02 | Aturan panjang dan komposisi password sesuai matriks | Saya seorang pengguna lokal<br>AND saya berada di halaman "Reset Password"<br>AND saya membuka tautan reset yang masih berlaku | Saya mengetik nilai kolom "Contoh Password" di field "New Password" dan "Confirm New Password"<br>AND saya mengklik tombol "Reset Password" | Refer to MRTM Rows: TRM_PWD_001 through TRM_PWD_007 for comprehensive logic combinations. | Draft |
| AC-04.03 | Konfirmasi password tidak sama | Saya seorang pengguna lokal<br>AND saya berada di halaman "Reset Password"<br>AND saya membuka tautan reset yang masih berlaku | Saya mengetik "Cikal@2026" di field "New Password"<br>AND saya mengetik "Cikal@2027" di field "Confirm New Password"<br>AND saya mengklik tombol "Reset Password" | Sistem menampilkan pesan "Passwords do not match" di bawah field "Confirm New Password" | Draft |
| AC-04.04 | Password baru sama dengan password saat ini | Saya seorang pengguna lokal dengan password saat ini "Cikal@2025"<br>AND saya berada di halaman "Reset Password"<br>AND saya membuka tautan reset yang masih berlaku | Saya mengetik "Cikal@2025" di field "New Password" dan "Confirm New Password"<br>AND saya mengklik tombol "Reset Password" | Sistem menampilkan pesan "New password must be different from your current password" | Draft |
| AC-04.05 | Membuka tautan reset pada menit ke-11 | Saya seorang pengguna lokal<br>AND tautan reset saya dikirim 11 menit yang lalu | Saya mengklik tautan reset di email | Sistem menampilkan halaman "Forgot Password" dengan pesan "The reset link is invalid or has expired. Please request a new one" | Draft |
| AC-04.06 | Tautan kedaluwarsa saat form sedang diisi | Saya seorang pengguna lokal<br>AND saya berada di halaman "Reset Password"<br>AND saya membuka tautan reset 9 menit setelah dikirim | Saya mengisi password valid di kedua field pada menit ke-11 setelah tautan dikirim<br>AND saya mengklik tombol "Reset Password" | Sistem menampilkan pesan "The reset link is invalid or has expired. Please request a new one"<br>AND password saya tidak berubah | Draft |

Catatan: AC-04.05 mengikuti Asumsi A-28.

### MRTM US-04

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Contoh Password | Panjang | Huruf Besar | Huruf Kecil | Angka | Karakter Spesial | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_001 | Ckl@202 | 7 | Ya | Ya | Ya | Ya | [-] | Sistem menampilkan pesan "Password must be at least 8 characters" |
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_002 | Ckl@2026 | 8 | Ya | Ya | Ya | Ya | [-] | Password diterima, pesan "Your password has been reset. Please log in" |
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_003 | cikal@2026 | 10 | Tidak | Ya | Ya | Ya | [-] | Sistem menampilkan pesan "Password must contain at least one uppercase letter (A-Z)" |
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_004 | CIKAL@2026 | 10 | Ya | Tidak | Ya | Ya | [-] | Sistem menampilkan pesan "Password must contain at least one lowercase letter (a-z)" |
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_005 | Cikal@abcd | 10 | Ya | Ya | Tidak | Ya | [-] | Sistem menampilkan pesan "Password must contain at least one number (0-9)" |
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_006 | Cikal2026a | 10 | Ya | Ya | Ya | Tidak | [-] | Sistem menampilkan pesan "Password must contain at least one special character" |
| US_04 | AC_04.02 | Pengguna lokal | TRM_PWD_007 | [ANY] 129 karakter | 129 | Ya | Ya | Ya | Ya | [-] | Sistem menampilkan pesan "Password must not exceed 128 characters" |

## US-05: Mengganti Password

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Pengguna LOS dengan akun lokal | mengganti password sendiri, termasuk mengganti password awal dari administrator saat pertama masuk | password bawaan tidak dipakai terus dan akun tetap aman |

### Acceptance Criteria US-05

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-05.01 | Mengganti password dari halaman profil | Saya seorang pengguna lokal yang sudah login<br>AND saya berada di halaman "My Profile" | Saya mengklik tombol "Change Password"<br>AND saya mengetik password saat ini di field "Current Password"<br>AND saya mengetik "Cikal@2027" di field "New Password" dan "Confirm New Password"<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Your password has been changed"<br>AND login berikutnya hanya berhasil dengan password "Cikal@2027" | Draft |
| AC-05.02 | Password saat ini salah | Saya seorang pengguna lokal yang sudah login<br>AND saya berada di halaman "Change Password" | Saya mengetik password yang salah di field "Current Password"<br>AND saya mengetik "Cikal@2027" di field "New Password" dan "Confirm New Password"<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Current password is incorrect" di bawah field "Current Password" | Draft |
| AC-05.03 | Wajib ganti password awal saat pertama kali masuk | Saya seorang pengguna lokal baru yang menerima password awal dari administrator<br>AND saya berada di halaman "Login" | Saya login dengan username dan password awal | Sistem menampilkan halaman "Change Password" dengan pesan "Please change your initial password before continuing"<br>AND menu aplikasi tidak bisa diakses sebelum password diganti | Draft |
| AC-05.04 | Halaman lain tidak bisa dibuka sebelum password awal diganti | Saya seorang pengguna lokal baru<br>AND saya berada di halaman "Change Password"<br>AND saya belum mengganti password awal | Saya mengetik alamat halaman "Application Inquiry" di address bar browser | Sistem menampilkan kembali halaman "Change Password" dengan pesan "Please change your initial password before continuing" | Draft |

## US-06: Keluar dari Aplikasi

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Pengguna LOS | mengakhiri sesi aplikasi | data pengajuan tidak bisa diakses orang lain dari perangkat yang sama |

### Acceptance Criteria US-06

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-06.01 | Keluar lewat tombol Logout | Saya seorang pengguna yang sudah login<br>AND saya berada di halaman "Dashboard" | Saya mengklik ikon "Logout" di header | Sistem menampilkan halaman "Login"<br>AND menekan tombol Back di browser tidak menampilkan halaman aplikasi | Draft |
| AC-06.02 | Membuka alamat halaman aplikasi setelah logout | Saya seorang pengguna yang baru saja logout<br>AND saya berada di halaman "Login" | Saya mengetik alamat halaman "Dashboard" di address bar browser | Sistem menampilkan halaman "Login" | Draft |
| AC-06.03 | Sesi berakhir setelah 30 menit tanpa aktivitas | Saya seorang pengguna yang sudah login<br>AND saya berada di halaman "Application Inquiry"<br>AND saya tidak melakukan aktivitas selama 30 menit | Saya mengklik salah satu baris pengajuan | Sistem menampilkan halaman "Login" dengan pesan "Your session has expired. Please log in again" | Draft |
| AC-06.04 | Sesi masih aktif pada menit ke-29 | Saya seorang pengguna yang sudah login<br>AND saya berada di halaman "Application Inquiry"<br>AND saya tidak melakukan aktivitas selama 29 menit | Saya mengklik salah satu baris pengajuan | Sistem menampilkan detail pengajuan yang saya klik | Draft |

Catatan: AC-06.03, AC-06.04 mengikuti Asumsi A-28.

## US-07: Mendaftarkan Pengguna Aplikasi

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | mendaftarkan pengguna baru beserta role, company, dan unit kerjanya | setiap pegawai hanya melihat data cabang dan fungsi sesuai tugasnya |

### Acceptance Criteria US-07

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-07.01 | Mendaftarkan pengguna baru dengan data lengkap | Saya seorang Maker<br>AND saya berada di halaman "User Application" | Saya mengklik tombol "New User"<br>AND saya mengisi field "Username" dengan "sales.bdg01"<br>AND saya mengisi field "Full Name" dengan "Sari Wulandari"<br>AND saya mengisi field "Email" dengan "sari@contoh.co.id"<br>AND saya memilih "Sales" di dropdown "Role"<br>AND saya memilih Company "001 - Bank Contoh", Regional "01 - Jawa Barat", Branch "011 - Bandung", Sub Branch "0111 - Dago"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND pengguna "sales.bdg01" tampil di halaman "Pending User Application" dengan status "Waiting Approval"<br>AND pengguna belum bisa login sebelum disetujui | Draft |
| AC-07.02 | Field wajib kosong | Saya seorang Maker<br>AND saya berada di halaman "New User Application" | Saya membiarkan field "Username", "Role", dan "Branch" kosong<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong | Draft |
| AC-07.03 | Username sudah dipakai atau sedang menunggu persetujuan | Saya seorang Maker<br>AND saya berada di halaman "New User Application"<br>AND username "sales.bdg01" sudah ada di data aktif | Saya mengisi field "Username" dengan "sales.bdg01" dan field wajib lain dengan data valid<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Username already exists" | Draft |
| AC-07.04 | Username melebihi 50 karakter | Saya seorang Maker<br>AND saya berada di halaman "New User Application" | Saya mengisi field "Username" dengan 51 karakter<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Username must not exceed 50 characters" | Draft |
| AC-07.05 | Menonaktifkan pengguna | Saya seorang Maker<br>AND saya berada di halaman "User Application"<br>AND pengguna "sales.bdg01" berstatus Active | Saya mengklik ikon edit pada baris "sales.bdg01"<br>AND saya menghapus centang checkbox "Is Active"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND setelah Checker menyetujui, "sales.bdg01" tidak bisa login dan tugas antrean yang ia ambil kembali ke antrean umum | Draft |
| AC-07.06 | Dropdown Branch hanya berisi cabang dari Regional terpilih | Saya seorang Maker<br>AND saya berada di halaman "New User Application" | Saya memilih Regional "01 - Jawa Barat"<br>AND saya mengklik dropdown "Branch" | Sistem menampilkan hanya cabang aktif milik Regional "01 - Jawa Barat" | Draft |

## US-08: Mengelola Role

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | membuat, mengubah nama, dan menonaktifkan role | struktur tugas bank tercermin di aplikasi tanpa perubahan program |

### Acceptance Criteria US-08

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-08.01 | Membuat role baru | Saya seorang Maker<br>AND saya berada di halaman "Role" | Saya mengklik tombol "New Role"<br>AND saya mengisi field "Role Name" dengan "Credit Analyst"<br>AND saya mencentang checkbox "Is Active"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND role "Credit Analyst" tampil di halaman "Pending Role" dengan status "Waiting Approval" | Draft |
| AC-08.02 | Nama role sudah ada | Saya seorang Maker<br>AND saya berada di halaman "New Role"<br>AND role "Sales" sudah ada | Saya mengisi field "Role Name" dengan "sales"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Role already exists" (pengecekan tidak membedakan huruf besar dan kecil) | Draft |
| AC-08.03 | Nama role 2 karakter ditolak | Saya seorang Maker<br>AND saya berada di halaman "New Role" | Saya mengisi field "Role Name" dengan "CS"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Role name must be 3 to 50 characters" | Draft |
| AC-08.04 | Role yang masih dipakai pengguna aktif tidak bisa dinonaktifkan | Saya seorang Maker<br>AND saya berada di halaman "Role"<br>AND role "Sales" dipakai 12 pengguna aktif | Saya mengklik ikon edit pada baris "Sales"<br>AND saya menghapus centang checkbox "Is Active"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Role is assigned to 12 active users and cannot be deactivated" | Draft |

## US-09: Mengatur Hak Akses Menu per Role

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menentukan menu dan tindakan (View, Create, Update, Delete, Approve) yang boleh dipakai setiap role | pegawai hanya menjalankan tindakan yang menjadi kewenangannya |

### Acceptance Criteria US-09

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-09.01 | Memberi akses menu ke role | Saya seorang Maker<br>AND saya berada di halaman "Role Access" | Saya mengklik tombol "New Role Access"<br>AND saya memilih "Checker" di dropdown "Role"<br>AND saya memilih "Master Data" di dropdown "Menu" dan "Product" di dropdown "Sub Menu"<br>AND saya mengaktifkan toggle "View" dan "Approve"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND akses tampil di halaman "Pending Role Access" dengan status "Waiting Approval" | Draft |
| AC-09.02 | Efek hak akses pada layar sesuai matriks | Saya seorang pengguna dengan role sesuai kolom Role<br>AND saya berada di halaman "Product" | Saya membuka halaman "Product" | Refer to MRTM Rows: TRM_ACC_001 through TRM_ACC_004 for comprehensive logic combinations. | Draft |
| AC-09.03 | Akses tanpa View ditolak | Saya seorang Maker<br>AND saya berada di halaman "New Role Access" | Saya memilih Role, Menu, dan Sub Menu<br>AND saya mengaktifkan toggle "Approve" tanpa mengaktifkan toggle "View"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "View access is required when other access is granted" | Draft |
| AC-09.04 | Akses API ditolak walau tombol disembunyikan | Saya seorang Sales tanpa akses Create pada menu Product | Saya mengirim permintaan pembuatan produk langsung ke alamat API produk | Sistem menolak permintaan dengan pesan "You do not have permission to perform this action"<br>AND tidak ada data produk yang dibuat | Draft |

Catatan: AC-09.01 mengikuti Asumsi A-13. AC-09.02 mengikuti Asumsi A-13, A-14.

### MRTM US-09

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Role | View | Create/Update | Delete | Approve | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|---|---|
| US_09 | AC_09.02 | Pengguna LOS | TRM_ACC_001 | Sales | Tidak | Tidak | Tidak | Tidak | [-] | Menu "Product" tidak tampil; membuka alamat halaman menampilkan pesan "You do not have access to this page" |
| US_09 | AC_09.02 | Pengguna LOS | TRM_ACC_002 | Checker | Ya | Tidak | Tidak | Ya | [-] | Daftar produk tampil; tombol "New Product", ikon edit, dan ikon hapus tidak tampil; tombol "Approve" tampil di Pending Product |
| US_09 | AC_09.02 | Pengguna LOS | TRM_ACC_003 | Maker | Ya | Ya | Ya | Tidak | [-] | Daftar produk, tombol "New Product", dan ikon edit tampil; tombol "Approve" di Pending Product tidak tampil |
| US_09 | AC_09.02 | Pengguna LOS | TRM_ACC_004 | Admin Sistem | Ya | Ya | Ya | Ya | Admin tetap tidak bisa menyetujui perubahannya sendiri | Semua tombol tampil |

## US-10: Mengatur Hak Akses Khusus per Pengguna

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menambah atau mencabut akses menu untuk pengguna tertentu dalam periode tertentu | kebutuhan sementara seperti pengganti cuti terpenuhi tanpa mengubah role |

### Acceptance Criteria US-10

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-10.01 | Memberi akses sementara | Saya seorang Maker<br>AND saya berada di halaman "User Access" | Saya mengklik tombol "New User Access"<br>AND saya mencari dan memilih pengguna "rina.approver"<br>AND saya memilih Menu "Approval"<br>AND saya mengaktifkan toggle "View" dan "Approve"<br>AND saya mengisi "Valid From" dengan "01-11-2026" dan "Valid To" dengan "14-11-2026"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND akses tampil di halaman "Pending User Access" dengan periode 01-11-2026 s.d. 14-11-2026 | Draft |
| AC-10.02 | Valid To lebih awal dari Valid From | Saya seorang Maker<br>AND saya berada di halaman "New User Access" | Saya mengisi "Valid From" dengan "14-11-2026" dan "Valid To" dengan "01-11-2026"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Valid To must be on or after Valid From" | Draft |
| AC-10.03 | Akses berakhir setelah tanggal Valid To | Saya seorang pengguna "rina.approver" dengan akses Approval berlaku s.d. 14-11-2026<br>AND saya berada di halaman "Dashboard"<br>AND hari ini 15-11-2026 | Saya membuka menu samping | Sistem tidak menampilkan menu "Approval" | Draft |
| AC-10.04 | Akses masih berlaku pada tanggal Valid To | Saya seorang pengguna "rina.approver" dengan akses Approval berlaku s.d. 14-11-2026<br>AND saya berada di halaman "Dashboard"<br>AND hari ini 14-11-2026 | Saya membuka menu samping | Sistem menampilkan menu "Approval" | Draft |

## US-11: Mengelola Menu Aplikasi

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Super User | menambah, mengubah urutan, dan menonaktifkan menu serta sub menu | navigasi aplikasi mengikuti kebutuhan operasional tanpa rilis ulang |

### Acceptance Criteria US-11

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-11.01 | Menambah sub menu | Saya seorang Super User<br>AND saya berada di halaman "Menu" | Saya mengklik tombol "New Menu"<br>AND saya mengisi "Menu Code" dengan "MON-03", "Menu Name" dengan "Process Monitoring", "Menu Index" dengan "3"<br>AND saya memilih "Monitoring" di dropdown "Parent Menu"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND menu tampil di halaman "Pending Menu" dengan status "Waiting Approval" | Draft |
| AC-11.02 | Kode menu sudah ada | Saya seorang Super User<br>AND saya berada di halaman "New Menu"<br>AND kode "MON-03" sudah dipakai | Saya mengisi "Menu Code" dengan "MON-03" dan field lain dengan data valid<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Menu code already exists" | Draft |
| AC-11.03 | Menu induk yang dinonaktifkan menyembunyikan sub menunya | Saya seorang Super User<br>AND saya berada di halaman "Menu"<br>AND menu "Monitoring" punya 3 sub menu aktif | Saya menonaktifkan menu "Monitoring"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND setelah disetujui, menu "Monitoring" dan 3 sub menunya tidak tampil untuk semua role | Draft |
| AC-11.04 | Maker tidak bisa membuka halaman Menu | Saya seorang Maker<br>AND saya berada di halaman "Dashboard" | Saya mengetik alamat halaman "Menu" di address bar browser | Sistem menampilkan pesan "You do not have access to this page" | Draft |

## US-12: Menyetujui atau Menolak Perubahan Master Data

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Checker | meninjau perbandingan data lama dan baru lalu menyetujui atau menolak perubahan yang diajukan Maker | setiap perubahan konfigurasi diperiksa orang kedua sebelum berlaku |

### Acceptance Criteria US-12

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-12.01 | Menyetujui data baru | Saya seorang Checker<br>AND saya berada di halaman "Pending Product"<br>AND terdapat produk baru "KPR Subsidi" berstatus Waiting Approval yang diajukan "maker.01" | Saya mengklik tombol "Detail" pada baris "KPR Subsidi"<br>AND saya mengklik tombol "Approve"<br>AND saya mengklik tombol "Yes" di konfirmasi "Are you sure you want to approve?" | Sistem menampilkan pesan "Data approved"<br>AND produk "KPR Subsidi" tampil di halaman "Product"<br>AND baris hilang dari "Pending Product"<br>AND audit trail mencatat persetujuan oleh saya | Draft |
| AC-12.02 | Melihat perbandingan data lama dan baru | Saya seorang Checker<br>AND saya berada di halaman "Pending Currency Rate"<br>AND terdapat perubahan kurs USD dari 16.000 menjadi 16.250 | Saya mengklik tombol "Detail" pada baris USD | Sistem menampilkan dua kolom "Current Data" dan "Proposed Data" dengan field yang berubah ditandai, "Rate" 16.000 dan 16.250 | Draft |
| AC-12.03 | Menolak perubahan | Saya seorang Checker<br>AND saya berada di halaman "Pending Product"<br>AND terdapat perubahan produk "KTA" berstatus Waiting Approval | Saya mengklik tombol "Detail" pada baris "KTA"<br>AND saya mengklik tombol "Reject"<br>AND saya mengklik tombol "Yes" di konfirmasi "Are you sure you want to reject?" | Sistem menampilkan pesan "Data rejected"<br>AND data produk "KTA" di halaman "Product" tidak berubah<br>AND baris hilang dari "Pending Product" | Draft |
| AC-12.04 | Maker tidak bisa menyetujui perubahannya sendiri | Saya seorang pengguna "admin.01" dengan akses Create dan Approve<br>AND saya berada di halaman "Pending Role"<br>AND perubahan role "Credit Analyst" diajukan oleh "admin.01" | Saya mengklik tombol "Detail" pada baris "Credit Analyst" | Sistem menampilkan detail tanpa tombol "Approve", "Reject", dan "Revise"<br>AND tampil keterangan "You cannot review your own submission" | Draft |
| AC-12.05 | Dua Checker memproses perubahan yang sama | Saya seorang Checker<br>AND saya berada di halaman "Pending Product"<br>AND Checker lain sudah menyetujui perubahan "KTA" saat detailnya masih terbuka di layar saya | Saya mengklik tombol "Approve"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "This submission has already been processed"<br>AND data tidak diproses dua kali | Draft |
| AC-12.06 | Perubahan kedua untuk data yang masih menunggu persetujuan ditolak | Saya seorang Maker<br>AND saya berada di halaman "Product"<br>AND produk "KTA" punya perubahan berstatus Waiting Approval | Saya mengklik ikon edit pada baris "KTA" | Sistem menampilkan pesan "This data has a pending submission and cannot be edited" | Draft |

Catatan: AC-12.04 mengikuti Asumsi A-14.

## US-13: Meminta dan Mengerjakan Revisi Perubahan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Checker dan Maker | mengembalikan perubahan ke Maker dengan alasan, lalu Maker memperbaiki dan mengajukan ulang | perubahan yang hampir benar tidak perlu dibuat ulang dari awal |

### Acceptance Criteria US-13

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-13.01 | Checker meminta revisi | Saya seorang Checker<br>AND saya berada di halaman "Pending Product"<br>AND perubahan produk "KTA" berstatus Waiting Approval | Saya mengklik tombol "Detail" pada baris "KTA"<br>AND saya mengklik tombol "Revise"<br>AND saya mengisi field "Revise Reason" dengan "Limit auto approval harus 10.000.000"<br>AND saya mengklik tombol "Submit Revise" | Sistem menampilkan pesan "Revision requested"<br>AND status perubahan "KTA" menjadi "Revise" dengan alasan yang saya tulis | Draft |
| AC-13.02 | Revise tanpa alasan | Saya seorang Checker<br>AND saya berada di halaman "Detail Pending Product" | Saya mengklik tombol "Revise"<br>AND saya membiarkan field "Revise Reason" kosong<br>AND saya mengklik tombol "Submit Revise" | Sistem menampilkan pesan "Revise reason is required" | Draft |
| AC-13.03 | Maker mengajukan ulang hasil revisi | Saya seorang Maker yang mengajukan perubahan "KTA"<br>AND saya berada di halaman "Pending Product"<br>AND status perubahan "KTA" adalah "Revise" | Saya mengklik tombol "Edit" pada baris "KTA"<br>AND saya mengubah "Limit Auto Approval" menjadi "10.000.000"<br>AND saya mengklik tombol "Resubmit" | Sistem menampilkan pesan "Data resubmitted for approval"<br>AND status menjadi "Waiting Approval" dan alasan revisi tetap tersimpan di riwayat | Draft |
| AC-13.04 | Alasan revisi melebihi 500 karakter | Saya seorang Checker<br>AND saya berada di halaman "Detail Pending Product" | Saya mengklik tombol "Revise"<br>AND saya mengisi field "Revise Reason" dengan 501 karakter<br>AND saya mengklik tombol "Submit Revise" | Sistem menampilkan pesan "Revise reason must not exceed 500 characters" | Draft |
| AC-13.05 | Maker lain tidak bisa mengedit revisi milik orang lain | Saya seorang Maker "maker.02"<br>AND saya berada di halaman "Pending Product"<br>AND perubahan "KTA" berstatus Revise diajukan oleh "maker.01" | Saya melihat baris "KTA" | Sistem tidak menampilkan tombol "Edit" pada baris "KTA" untuk saya | Draft |

## US-14: Melihat Jejak Audit Perubahan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Auditor | melihat siapa mengubah data apa, kapan, beserta nilai sebelum dan sesudah perubahan | bank memenuhi kebutuhan audit internal dan regulator |

### Acceptance Criteria US-14

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-14.01 | Mencari jejak audit berdasarkan modul dan tanggal | Saya seorang Auditor<br>AND saya berada di halaman "Audit Trail" | Saya memilih "Product" di dropdown "Module"<br>AND saya memilih periode "01-10-2026" s.d. "31-10-2026"<br>AND saya mengklik tombol "Search" | Sistem menampilkan daftar aktivitas modul Product pada periode tersebut dengan kolom Date Time, User, Action, Record | Draft |
| AC-14.02 | Melihat detail perubahan | Saya seorang Auditor<br>AND saya berada di halaman "Audit Trail"<br>AND terdapat aktivitas "Approve" untuk produk "KTA" | Saya mengklik baris aktivitas tersebut | Sistem menampilkan data sebelum dan sesudah perubahan berdampingan dengan field yang berubah ditandai | Draft |
| AC-14.03 | Periode pencarian tidak valid | Saya seorang Auditor<br>AND saya berada di halaman "Audit Trail" | Saya memilih periode "31-10-2026" s.d. "01-10-2026"<br>AND saya mengklik tombol "Search" | Sistem menampilkan pesan "End date must be on or after start date" | Draft |
| AC-14.04 | Periode pencarian lebih dari 366 hari | Saya seorang Auditor<br>AND saya berada di halaman "Audit Trail" | Saya memilih periode "01-01-2025" s.d. "02-01-2026"<br>AND saya mengklik tombol "Search" | Sistem menampilkan pesan "Search period must not exceed 366 days" | Draft |
| AC-14.05 | Jejak audit tidak bisa diubah atau dihapus | Saya seorang Auditor<br>AND saya berada di halaman "Audit Trail" | Saya membuka detail salah satu aktivitas | Sistem tidak menampilkan tombol edit atau hapus | Draft |

## US-15: Mendaftarkan Company Baru

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Super User | mendaftarkan bank baru beserta mata uang utama dan akun admin awalnya | bank baru mulai memakai LOS tanpa bantuan developer |

### Acceptance Criteria US-15

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-15.01 | Mendaftarkan company dengan data lengkap | Saya seorang Super User<br>AND saya berada di halaman "Company Configuration" | Saya mengklik tombol "Create New Company"<br>AND saya mengisi "Company Code" dengan "007", "Company Name" dengan "Bank Contoh Syariah"<br>AND saya memilih "Syariah" di dropdown "Platform"<br>AND saya mengisi "Currency Code" dengan "360" dan "Currency Name" dengan "IDR"<br>AND saya mengisi "Admin Full Name", "Admin Username" "admin.007", dan "Admin Email" "admin007@contoh.co.id"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Company created"<br>AND company "007" tampil di daftar company<br>AND user "admin.007" dengan role "Admin" terbentuk dan menerima email berisi tautan untuk membuat password | Draft |
| AC-15.02 | Field wajib kosong | Saya seorang Super User<br>AND saya berada di halaman "Create New Company" | Saya membiarkan "Company Name" dan "Admin Email" kosong<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong | Draft |
| AC-15.03 | Company Code sudah dipakai | Saya seorang Super User<br>AND saya berada di halaman "Create New Company"<br>AND company "001" sudah ada | Saya mengisi "Company Code" dengan "001" dan field lain dengan data valid<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Company code already exists" | Draft |
| AC-15.04 | Company Code bukan 3 digit angka | Saya seorang Super User<br>AND saya berada di halaman "Create New Company" | Saya mengisi "Company Code" dengan "07"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Company code must be a 3-digit number" | Draft |
| AC-15.05 | Maker tidak bisa membuat company | Saya seorang Maker<br>AND saya berada di halaman "Dashboard" | Saya mengetik alamat halaman "Company Configuration" di address bar browser | Sistem menampilkan pesan "You do not have access to this page" | Draft |

Catatan: AC-15.01 mengikuti Asumsi A-12.

## US-16: Menyalin Konfigurasi dari Company Lain

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Super User | menyalin general parameter, document checklist, rute produk, dan matrix keputusan dari company sumber ke company tujuan | bank baru siap beroperasi dalam hitungan menit dengan konfigurasi standar |

### Acceptance Criteria US-16

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-16.01 | Menyalin general parameter | Saya seorang Super User<br>AND saya berada di halaman "Company Configuration"<br>AND company "007" belum punya general parameter | Saya mengklik tombol "Copy Configuration"<br>AND saya memilih "General Parameter" di dropdown "Configuration Type"<br>AND saya memilih Company "001" / Currency "360" sebagai sumber<br>AND saya memilih Company "007" / Currency "360" sebagai tujuan<br>AND saya mengklik tombol "Copy" | Sistem menampilkan pesan "Configuration copied: 412 records added, 0 skipped"<br>AND general parameter company "007" berisi 412 data | Draft |
| AC-16.02 | Data yang sudah ada di tujuan dilewati | Saya seorang Super User<br>AND saya berada di halaman "Copy Configuration"<br>AND company "007" sudah punya 10 dari 412 general parameter | Saya memilih sumber "001" dan tujuan "007" untuk "General Parameter"<br>AND saya mengklik tombol "Copy" | Sistem menampilkan pesan "Configuration copied: 402 records added, 10 skipped"<br>AND 10 data yang sudah ada di tujuan tidak berubah | Draft |
| AC-16.03 | Sumber dan tujuan sama | Saya seorang Super User<br>AND saya berada di halaman "Copy Configuration" | Saya memilih Company "001" sebagai sumber dan tujuan<br>AND saya mengklik tombol "Copy" | Sistem menampilkan pesan "Source and destination must be different" | Draft |
| AC-16.04 | Company tujuan belum punya currency yang dipilih | Saya seorang Super User<br>AND saya berada di halaman "Copy Configuration"<br>AND company "007" tidak punya currency "840" | Saya memilih Company "007" / Currency "840" sebagai tujuan<br>AND saya mengklik tombol "Copy" | Sistem menampilkan pesan "Destination currency does not exist for the selected company" | Draft |

## US-17: Mengelola Struktur Organisasi Company

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menambah dan mengubah Regional, Branch, dan Sub Branch milik company | pengajuan dan approval dikelompokkan sesuai unit kerja bank |

### Acceptance Criteria US-17

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-17.01 | Menambah branch | Saya seorang Maker<br>AND saya berada di halaman "Organization Structure"<br>AND Regional "01 - Jawa Barat" aktif | Saya mengklik tombol "+" di tabel "Branch"<br>AND saya memilih Regional "01 - Jawa Barat"<br>AND saya mengisi "Branch Code" dengan "011" dan "Branch Name" dengan "Bandung"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND branch "011 - Bandung" tampil di halaman "Pending Organization" dengan status "Waiting Approval" | Draft |
| AC-17.02 | Kode unit 1 digit ditolak | Saya seorang Maker<br>AND saya berada di halaman "Add Branch" | Saya mengisi "Branch Code" dengan "1"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Code must be 2 to 3 digits" | Draft |
| AC-17.03 | Kode unit 4 digit ditolak | Saya seorang Maker<br>AND saya berada di halaman "Add Branch" | Saya mengisi "Branch Code" dengan "0111"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Code must be 2 to 3 digits" | Draft |
| AC-17.04 | Kode branch sudah dipakai di regional yang sama | Saya seorang Maker<br>AND saya berada di halaman "Add Branch"<br>AND branch "011" sudah ada di Regional "01" | Saya memilih Regional "01" dan mengisi "Branch Code" dengan "011"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Branch code already exists in this regional" | Draft |
| AC-17.05 | Branch dengan pengajuan aktif tidak bisa dinonaktifkan | Saya seorang Maker<br>AND saya berada di halaman "Organization Structure"<br>AND branch "011" punya 25 pengajuan yang belum selesai | Saya menghapus centang "Is Active" pada branch "011"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Branch has 25 applications in progress and cannot be deactivated" | Draft |
| AC-17.06 | Dropdown Regional hanya berisi regional aktif | Saya seorang Maker<br>AND saya berada di halaman "Add Branch"<br>AND Regional "09" berstatus Inactive | Saya mengklik dropdown "Regional" | Sistem tidak menampilkan Regional "09" di daftar pilihan | Draft |

Catatan: AC-17.01 mengikuti Asumsi A-12. AC-17.02, AC-17.03 mengikuti Asumsi A-22.

## US-18: Mengelola Mata Uang Company

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menambah dan mengubah mata uang yang dipakai company | produk dalam mata uang selain rupiah tercatat dengan kode yang benar |

### Acceptance Criteria US-18

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-18.01 | Menambah mata uang dengan kode ISO 4217 | Saya seorang Maker<br>AND saya berada di halaman "Organization Structure" | Saya mengklik tombol "+" di tabel "Currency"<br>AND saya mengisi "Currency Code" dengan "840" dan "Currency Name" dengan "USD"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND setelah disetujui, currency "840 - USD" tampil dengan keterangan "US Dollar" | Draft |
| AC-18.02 | Kode mata uang bukan kode ISO 4217 | Saya seorang Maker<br>AND saya berada di halaman "Add Currency" | Saya mengisi "Currency Code" dengan "999" dan "Currency Name" dengan "XYZ"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Currency code is not a valid ISO 4217 code" | Draft |
| AC-18.03 | Kode mata uang 4 digit ditolak | Saya seorang Maker<br>AND saya berada di halaman "Add Currency" | Saya mengetik "3601" di field "Currency Code" | Sistem hanya menerima 3 karakter pertama "360" di field "Currency Code" | Draft |
| AC-18.04 | Mata uang sudah ada | Saya seorang Maker<br>AND saya berada di halaman "Add Currency"<br>AND currency "360" sudah ada | Saya mengisi "Currency Code" dengan "360"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Currency already exists" | Draft |

## US-19: Mengelola Kurs Mata Uang

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | mencatat kurs mata uang terhadap rupiah beserta waktu berlakunya | nilai pinjaman valas dikonversi dengan kurs yang disetujui |

### Acceptance Criteria US-19

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-19.01 | Mencatat kurs baru | Saya seorang Maker<br>AND saya berada di halaman "Currency Rate" | Saya mengklik tombol "New Currency Rate"<br>AND saya memilih Company "001" dan Currency "840 - USD"<br>AND saya mengisi "Rupiah Equivalent" dengan "16250" dan "Rate Timestamp" dengan "20-10-2026 08:00"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND kurs tampil di halaman "Pending Currency Rate" dengan status "Waiting Approval" | Draft |
| AC-19.02 | Kurs untuk company dan currency yang sama sudah menunggu persetujuan | Saya seorang Maker<br>AND saya berada di halaman "New Currency Rate"<br>AND kurs USD company "001" berstatus Waiting Approval | Saya memilih Company "001" dan Currency "840 - USD"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "A pending rate already exists for this company and currency" | Draft |
| AC-19.03 | Rupiah Equivalent 0 ditolak | Saya seorang Maker<br>AND saya berada di halaman "New Currency Rate" | Saya mengisi "Rupiah Equivalent" dengan "0"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Rupiah equivalent must be greater than 0" | Draft |
| AC-19.04 | Pengajuan memakai kurs yang berlaku saat submit | Saya seorang Sales<br>AND saya berada di halaman "New Application"<br>AND kurs USD 16.000 berlaku sampai kurs 16.250 disetujui pukul 10:00 | Saya mensubmit pengajuan USD pukul 09:59 | Sistem menampilkan Rate 16.000 dan Rate Timestamp kurs tersebut di detail pengajuan | Draft |

## US-20: Mengelola Produk Kredit

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | membuat dan mengubah produk kredit beserta batas plafon, tenor, usia, biaya, dan limit auto approval | bisnis meluncurkan atau menyesuaikan produk tanpa perubahan program |

### Acceptance Criteria US-20

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-20.01 | Membuat produk baru | Saya seorang Maker<br>AND saya berada di halaman "Product" | Saya mengklik tombol "New Product"<br>AND saya mengisi "Product Code" "KTA", "Product Name" "Kredit Tanpa Agunan"<br>AND saya memilih "Non Collateral Loan" di "Product Category" dan "Effective" di "Interest Type"<br>AND saya mengisi Minimal Plafond "5.000.000", Maximal Plafond "300.000.000", Minimum Tenor "6", Maximum Tenor "60", Minimum Age "21", Maximum Age "55", DBR Max "40", Limit Auto Approval "10.000.000"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND produk "KTA" tampil di halaman "Pending Product" dengan status "Waiting Approval" | Draft |
| AC-20.02 | Maximal Plafond lebih kecil dari Minimal Plafond | Saya seorang Maker<br>AND saya berada di halaman "New Product" | Saya mengisi Minimal Plafond "300.000.000" dan Maximal Plafond "5.000.000"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Maximal plafond must be greater than minimal plafond" | Draft |
| AC-20.03 | Kode produk sudah ada | Saya seorang Maker<br>AND saya berada di halaman "New Product"<br>AND produk "KTA" sudah ada | Saya mengisi "Product Code" dengan "kta" dan field lain dengan data valid<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Product code already exists" | Draft |
| AC-20.04 | Kode produk 6 karakter ditolak | Saya seorang Maker<br>AND saya berada di halaman "New Product" | Saya mengisi "Product Code" dengan "KPRSUB"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Product code must be 1 to 5 letters or digits" | Draft |
| AC-20.05 | Limit Auto Approval melebihi Maximal Plafond | Saya seorang Maker<br>AND saya berada di halaman "New Product" | Saya mengisi Maximal Plafond "300.000.000" dan Limit Auto Approval "300.000.001"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Limit auto approval must not exceed maximal plafond" | Draft |
| AC-20.06 | Produk baru tanpa rute tidak muncul di form pengajuan | Saya seorang Sales<br>AND saya berada di halaman "New Application"<br>AND produk "KTA" sudah disetujui tetapi belum punya rute produk yang disetujui | Saya mengklik dropdown "Product" | Sistem tidak menampilkan "KTA" di daftar produk | Draft |

Catatan: AC-20.01 mengikuti Asumsi A-25. AC-20.04 mengikuti Asumsi A-24. AC-20.06 mengikuti Rute produk R-09.

## US-21: Mengelola General Parameter

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menambah dan mengubah nilai pilihan yang dipakai di dropdown aplikasi beserta kode BI-nya | pilihan data nasabah seragam dan sesuai kode pelaporan regulator |

### Acceptance Criteria US-21

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-21.01 | Menambah nilai parameter | Saya seorang Maker<br>AND saya berada di halaman "General Parameter" | Saya mengklik tombol "New Parameter"<br>AND saya memilih "Occupation" di "Param Type"<br>AND saya mengisi "Param Value" dengan "Pengemudi Daring" dan "BI Code" dengan "099"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND setelah disetujui, "Pengemudi Daring" tersedia di dropdown "Occupation" pada form pengajuan | Draft |
| AC-21.02 | Nilai parameter duplikat dalam Param Type yang sama | Saya seorang Maker<br>AND saya berada di halaman "New Parameter"<br>AND "Karyawan Swasta" sudah ada di Param Type Occupation | Saya memilih "Occupation" dan mengisi "Param Value" dengan "karyawan swasta"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Parameter value already exists in this type" | Draft |
| AC-21.03 | Parameter nonaktif tidak muncul di form tetapi tetap tampil di data lama | Saya seorang Sales<br>AND saya berada di halaman "Application Detail"<br>AND pengajuan lama memakai Occupation "Pengemudi Daring" yang kini Inactive | Saya membuka tab "Occupation" | Sistem menampilkan "Pengemudi Daring" pada data pengajuan lama<br>AND dropdown "Occupation" di pengajuan baru tidak berisi "Pengemudi Daring" | Draft |
| AC-21.04 | Param Value melebihi 100 karakter | Saya seorang Maker<br>AND saya berada di halaman "New Parameter" | Saya mengisi "Param Value" dengan 101 karakter<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Parameter value must not exceed 100 characters" | Draft |

## US-22: Mengimpor dan Mengekspor General Parameter

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | mengunduh template, mengunggah banyak parameter sekaligus, dan mengekspor parameter ke Excel | penyiapan ratusan nilai parameter tidak diinput satu per satu |

### Acceptance Criteria US-22

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-22.01 | Mengimpor parameter dari Excel | Saya seorang Maker<br>AND saya berada di halaman "General Parameter" | Saya mengklik tombol "Import"<br>AND saya memilih file "parameter.xlsx" berisi 50 baris valid sesuai template<br>AND saya mengklik tombol "Upload" | Sistem menampilkan pesan "50 rows submitted for approval"<br>AND 50 parameter tampil di "Pending General Parameter" | Draft |
| AC-22.02 | File berisi baris tidak valid | Saya seorang Maker<br>AND saya berada di halaman "Import General Parameter" | Saya memilih file berisi 48 baris valid dan 2 baris tanpa "Param Type"<br>AND saya mengklik tombol "Upload" | Sistem menampilkan pesan "Import failed: 2 invalid rows. Download the error file for details"<br>AND tidak ada baris yang diajukan<br>AND tombol "Download Error File" tampil | Draft |
| AC-22.03 | Format file bukan xlsx | Saya seorang Maker<br>AND saya berada di halaman "Import General Parameter" | Saya memilih file "parameter.csv"<br>AND saya mengklik tombol "Upload" | Sistem menampilkan pesan "Only .xlsx files are allowed" | Draft |
| AC-22.04 | File melebihi 1.000 baris | Saya seorang Maker<br>AND saya berada di halaman "Import General Parameter" | Saya memilih file berisi 1.001 baris<br>AND saya mengklik tombol "Upload" | Sistem menampilkan pesan "Maximum 1000 rows per import" | Draft |
| AC-22.05 | Mengekspor parameter terfilter | Saya seorang Maker<br>AND saya berada di halaman "General Parameter"<br>AND filter Param Type "Occupation" aktif | Saya mengklik tombol "Export" | Sistem mengunduh file Excel berisi seluruh parameter Occupation sesuai filter | Draft |

## US-23: Memperbarui Data Wilayah

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | memperbarui data provinsi sampai kode pos dari sumber data wilayah resmi dan mencari datanya | alamat nasabah dan agunan tercatat sesuai wilayah administratif terbaru |

### Acceptance Criteria US-23

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-23.01 | Menjalankan sinkronisasi wilayah | Saya seorang Maker<br>AND saya berada di halaman "Master Geography" | Saya mengklik tombol "Sync Region Data"<br>AND saya mengklik tombol "Yes" di konfirmasi | Sistem menampilkan pesan "Region sync completed: 12 added, 3 updated"<br>AND kolom "Last Sync" berisi waktu sinkronisasi | Draft |
| AC-23.02 | Sumber data wilayah tidak merespons | Saya seorang Maker<br>AND saya berada di halaman "Master Geography"<br>AND layanan data wilayah tidak tersedia | Saya mengklik tombol "Sync Region Data"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Region sync failed. Existing data is unchanged"<br>AND data wilayah tidak berubah | Draft |
| AC-23.03 | Mencari wilayah tanpa membedakan huruf besar dan kecil | Saya seorang Maker<br>AND saya berada di halaman "Master Geography" | Saya mengetik "gam" di field "Search" | Sistem menampilkan wilayah yang mengandung "gam" di provinsi, kota, kecamatan, kelurahan, atau kode pos, misalnya "Gambir" | Draft |
| AC-23.04 | Filter berjenjang | Saya seorang Maker<br>AND saya berada di halaman "Master Geography" | Saya membuka filter<br>AND saya memilih Province "DKI Jakarta"<br>AND saya mengklik dropdown "City" | Sistem menampilkan hanya kota di provinsi DKI Jakarta | Draft |

## US-24: Mengelola Template Dokumen

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | mengunggah dan mengganti template dokumen keluaran seperti akad kredit, SP3K, dan surat pengajuan | isi dokumen resmi mengikuti format terbaru bank tanpa perubahan program |

### Acceptance Criteria US-24

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-24.01 | Mengunggah template baru | Saya seorang Maker<br>AND saya berada di halaman "Document Template" | Saya mengklik tombol "Add Document Template"<br>AND saya mengisi "Document Code" dengan "AKAD-KPR"<br>AND saya memilih file "akad-kpr.docx"<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Data submitted for approval"<br>AND template tampil di "Pending Document Template" | Draft |
| AC-24.02 | Template tanpa file | Saya seorang Maker<br>AND saya berada di halaman "Add Document Template" | Saya mengisi "Document Code" tanpa memilih file<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Template file is required" | Draft |
| AC-24.03 | Template berisi placeholder yang tidak dikenal | Saya seorang Maker<br>AND saya berada di halaman "Add Document Template" | Saya memilih file berisi placeholder "{{nama_ibu_kandng}}"<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Unknown placeholder: nama_ibu_kandng" | Draft |
| AC-24.04 | File template melebihi 5 MB | Saya seorang Maker<br>AND saya berada di halaman "Add Document Template" | Saya memilih file .docx berukuran 5,1 MB<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Template file must not exceed 5 MB" | Draft |

## US-25: Mengatur Dokumen Wajib Pengajuan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menentukan dokumen yang wajib diunggah berdasarkan produk, pekerjaan, dan status perkawinan | kelengkapan dokumen setiap pengajuan sesuai kebijakan kredit |

### Acceptance Criteria US-25

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-25.01 | Membuat daftar dokumen wajib | Saya seorang Maker<br>AND saya berada di halaman "Document Checklist" | Saya mengklik tombol "New Document Checklist"<br>AND saya memilih Product "KPR", Occupation "Karyawan Swasta", Marital "Kawin"<br>AND saya mencentang dokumen "KTP", "KK", "NPWP", "Slip Gaji", "Rekening Koran 3 Bulan", "Sertifikat", "KTP Pasangan"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND checklist tampil di "Pending Document Checklist" dengan jumlah dokumen 7 | Draft |
| AC-25.02 | Tanpa dokumen yang dipilih | Saya seorang Maker<br>AND saya berada di halaman "New Document Checklist" | Saya memilih Product, Occupation, dan Marital tanpa mencentang dokumen<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Select at least one document" | Draft |
| AC-25.03 | Kombinasi sudah ada | Saya seorang Maker<br>AND saya berada di halaman "New Document Checklist"<br>AND checklist KPR / Karyawan Swasta / Kawin sudah ada | Saya memilih kombinasi yang sama<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Document checklist already exists for this combination" | Draft |
| AC-25.04 | Form pengajuan memakai checklist yang cocok | Saya seorang Sales<br>AND saya berada di halaman "New Application - Document"<br>AND pengajuan KPR, Occupation Karyawan Swasta, Marital Kawin | Saya membuka step "Document" | Sistem menampilkan 7 slot unggah sesuai checklist KPR / Karyawan Swasta / Kawin | Draft |
| AC-25.05 | Tidak ada checklist untuk kombinasi pengajuan | Saya seorang Sales<br>AND saya berada di halaman "New Application - Document"<br>AND tidak ada checklist untuk KTA / Pelajar / Belum Kawin | Saya membuka step "Document" | Sistem menampilkan pesan "No document checklist is configured for this product. Please contact your administrator"<br>AND tombol "Submit" pengajuan nonaktif | Draft |

## US-26: Mengatur Level Approval

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menentukan level approval per produk dan cabang beserta rentang nominal dan aksi yang diizinkan tiap level | pengajuan disetujui pejabat yang sesuai kewenangan nominalnya |

### Acceptance Criteria US-26

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-26.01 | Menambah level approval | Saya seorang Maker<br>AND saya berada di halaman "Approval Level Setup" | Saya mengklik tombol "New Approval Level"<br>AND saya memilih Branch "011 - Bandung", Product "KPR", Job Level "2"<br>AND saya mengisi Description "Kepala Cabang", Amount Begin "100.000.001", Amount End "500.000.000"<br>AND saya mencentang "Is Approve", "Is Reject", "Is Return"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND level tampil di "Pending Approval Setup" | Draft |
| AC-26.02 | Amount End lebih kecil dari Amount Begin | Saya seorang Maker<br>AND saya berada di halaman "New Approval Level" | Saya mengisi Amount Begin "500.000.000" dan Amount End "100.000.000"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Amount end must be greater than amount begin" | Draft |
| AC-26.03 | Rentang nominal tumpang tindih dengan level lain | Saya seorang Maker<br>AND saya berada di halaman "New Approval Level"<br>AND level 1 KPR Bandung memakai rentang 0 s.d. 100.000.000 | Saya mengisi Amount Begin "100.000.000" untuk level 2 KPR Bandung<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Amount range overlaps with level 1" | Draft |
| AC-26.04 | Kombinasi Branch, Product, Job Level sudah ada | Saya seorang Maker<br>AND saya berada di halaman "New Approval Level"<br>AND level 2 KPR Bandung sudah ada | Saya memilih Branch "011", Product "KPR", Job Level "2"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Approval level already exists" | Draft |

Catatan: AC-26.01 mengikuti Asumsi A-21.

## US-27: Menetapkan Approver per Level

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menetapkan pengguna yang menjadi approver di setiap level dan sub level approval | antrean approval selalu sampai ke orang yang tepat |

### Acceptance Criteria US-27

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-27.01 | Menetapkan approver | Saya seorang Maker<br>AND saya berada di halaman "Approval Hierarchy"<br>AND level 2 KPR Bandung sudah disetujui | Saya mengklik tombol "New Hierarchy"<br>AND saya memilih Branch "011", Product "KPR", Job Level "2", Sub Level "1"<br>AND saya memilih user "rina.approver" di dropdown "Approver"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND hierarki tampil di "Pending Approval Setup" | Draft |
| AC-27.02 | Approver tidak punya akses menu Approval | Saya seorang Maker<br>AND saya berada di halaman "New Hierarchy"<br>AND user "sari.sales" tidak punya akses Approve di menu Approval | Saya memilih "sari.sales" di dropdown "Approver"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Selected user does not have approval access" | Draft |
| AC-27.03 | Approver dinonaktifkan | Saya seorang Maker<br>AND saya berada di halaman "Approval Hierarchy"<br>AND approver "rina.approver" baru dinonaktifkan | Saya membuka halaman "Approval Hierarchy" | Sistem menandai baris "rina.approver" dengan label "Inactive approver" | Draft |

## US-28: Mengimpor Setup Approval

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | mengunggah level approval dan approver sekaligus dari Excel | penyiapan approval puluhan cabang selesai dalam satu kali unggah |

### Acceptance Criteria US-28

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-28.01 | Mengimpor setup approval valid | Saya seorang Maker<br>AND saya berada di halaman "Approval Level Setup" | Saya mengklik tombol "Import"<br>AND saya memilih file sesuai template berisi 40 baris valid<br>AND saya mengklik tombol "Upload" | Sistem menampilkan pesan "40 rows submitted for approval"<br>AND baris tampil di "Pending Approval Setup" | Draft |
| AC-28.02 | Branch atau produk tidak ditemukan | Saya seorang Maker<br>AND saya berada di halaman "Import Approval Setup" | Saya memilih file dengan 1 baris Branch "999" yang tidak ada<br>AND saya mengklik tombol "Upload" | Sistem menampilkan pesan "Import failed: 1 invalid row. Download the error file for details"<br>AND file error berisi alasan "Branch 999 not found" di baris tersebut | Draft |
| AC-28.03 | Username approver tidak ditemukan | Saya seorang Maker<br>AND saya berada di halaman "Import Approval Setup" | Saya memilih file dengan 1 baris berisi username "tidak.ada"<br>AND saya mengklik tombol "Upload" | Sistem menampilkan pesan "Import failed: 1 invalid row. Download the error file for details"<br>AND file error berisi alasan "User tidak.ada not found" | Draft |

## US-29: Mengelola Data Perusahaan Asuransi

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | mencatat perusahaan asuransi rekanan beserta tarif premi per produk | nilai premi e-polis dihitung dari tarif yang disetujui |

### Acceptance Criteria US-29

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-29.01 | Menambah perusahaan asuransi | Saya seorang Maker<br>AND saya berada di halaman "Insurance" | Saya mengklik tombol "New Insurance"<br>AND saya mengisi "Insurance Code" "ASR01", "Insurance Name" "Asuransi Contoh"<br>AND saya memilih Product "KPR" dan mengisi "Premium Rate (%)" dengan "0,85"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND asuransi tampil di "Pending Insurance" | Draft |
| AC-29.02 | Tarif premi di atas 100% | Saya seorang Maker<br>AND saya berada di halaman "New Insurance" | Saya mengisi "Premium Rate (%)" dengan "100,01"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Premium rate must be between 0 and 100" | Draft |
| AC-29.03 | Kode asuransi sudah ada | Saya seorang Maker<br>AND saya berada di halaman "New Insurance"<br>AND kode "ASR01" sudah ada | Saya mengisi "Insurance Code" dengan "ASR01"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Insurance code already exists" | Draft |

## US-30: Mengatur Parameter Sistem

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | mengubah parameter operasional seperti batas SIKP, ambang Dukcapil, masa berlaku tautan, dan batas upload | aturan operasional disesuaikan tanpa rilis ulang aplikasi |

### Acceptance Criteria US-30

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-30.01 | Mengubah batas SIKP | Saya seorang Maker<br>AND saya berada di halaman "System Parameter"<br>AND parameter "SIKP Minimum Limit" bernilai 50.000.000 | Saya mengklik ikon edit pada "SIKP Minimum Limit"<br>AND saya mengisi nilai "100.000.000"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND nilai lama tetap berlaku sampai disetujui Checker | Draft |
| AC-30.02 | Nilai tidak sesuai tipe parameter | Saya seorang Maker<br>AND saya berada di halaman "Edit System Parameter"<br>AND parameter "SIKP Minimum Limit" bertipe angka | Saya mengisi nilai "seratus juta"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Value must be a number" | Draft |
| AC-30.03 | Nilai di luar rentang yang diizinkan | Saya seorang Maker<br>AND saya berada di halaman "Edit System Parameter"<br>AND parameter "Dukcapil Review Threshold" hanya menerima 0 s.d. 1 | Saya mengisi nilai "1,01"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Value must be between 0 and 1" | Draft |
| AC-30.04 | Nilai rahasia tidak ditampilkan | Saya seorang Maker<br>AND saya berada di halaman "System Parameter"<br>AND terdapat parameter rahasia "OCR API Key" | Saya melihat baris "OCR API Key" | Sistem menampilkan nilai sebagai "********" dan tidak menyediakan tombol untuk melihat nilai aslinya | Draft |

Catatan: AC-30.01 mengikuti Asumsi A-19.

## US-31: Mengatur Rute Modul per Produk

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | memilih modul proses yang dilewati pengajuan untuk setiap produk | alur pengajuan tiap produk menyesuaikan kebijakan tanpa perubahan program |

### Acceptance Criteria US-31

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-31.01 | Mematikan modul Survey untuk produk KTA | Saya seorang Maker<br>AND saya berada di halaman "Product Route"<br>AND rute aktif produk "KTA" versi 2 memakai modul Survey | Saya memilih "KTA" di dropdown "Product"<br>AND saya mengklik tombol "Edit Route"<br>AND saya mematikan toggle modul "Survey"<br>AND saya mengklik tombol "Submit for Approval" | Sistem menampilkan pesan "Route version 3 submitted for approval"<br>AND versi 3 tampil di "Pending Product Route" dengan status "Waiting Approval"<br>AND pengajuan KTA baru tetap memakai versi 2 sampai versi 3 disetujui | Draft |
| AC-31.02 | Modul wajib tidak bisa dimatikan | Saya seorang Maker<br>AND saya berada di halaman "Product Route"<br>AND saya sedang mengedit rute produk "KTA" | Saya mengklik toggle modul "Approval" | Sistem menampilkan keterangan "Approval is a mandatory module and cannot be turned off"<br>AND toggle "Approval" tetap menyala | Draft |
| AC-31.03 | Rute baru tidak memengaruhi pengajuan yang sedang berjalan | Saya seorang Checker<br>AND saya berada di halaman "Pending Product Route"<br>AND pengajuan KTA "20102026KTA0000005" sedang berada di modul Dedup memakai rute versi 2 | Saya menyetujui rute KTA versi 3 yang mematikan modul Survey | Sistem menampilkan pesan "Data approved"<br>AND pengajuan "20102026KTA0000005" tetap melanjutkan rute versi 2<br>AND pengajuan KTA yang disubmit setelah persetujuan memakai versi 3 | Draft |
| AC-31.04 | Modul bersyarat tetap mengikuti kondisinya | Saya seorang Sales<br>AND saya berada di halaman "New Application"<br>AND rute produk "KUR" memakai modul SIKP dengan batas SIKP 50.000.000 | Saya mensubmit pengajuan KUR dengan Requested Limit 40.000.000 | Sistem melewati modul SIKP untuk pengajuan tersebut<br>AND riwayat proses menampilkan SIKP dengan status "Skipped - condition not met" | Draft |
| AC-31.05 | Rute tanpa perubahan tidak bisa diajukan | Saya seorang Maker<br>AND saya berada di halaman "Product Route"<br>AND saya membuka mode edit rute "KTA" tanpa mengubah toggle apa pun | Saya mengklik tombol "Submit for Approval" | Sistem menampilkan pesan "No changes to submit" | Draft |
| AC-31.06 | Pengguna tanpa akses Update hanya melihat rute | Saya seorang Checker<br>AND saya berada di halaman "Product Route" | Saya memilih produk "KTA" | Sistem menampilkan diagram rute tanpa tombol "Edit Route" | Draft |

Catatan: AC-31.01 mengikuti Asumsi A-30, rute produk R-02 dan R-07. AC-31.02 mengikuti Rute produk R-06. AC-31.03 mengikuti Rute produk R-08. AC-31.04 mengikuti Asumsi A-19, rute produk R-03.

## US-32: Melihat Diagram Rute Produk

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker, Checker, dan Risk Manager | melihat rute modul setiap produk dalam bentuk diagram alur | semua pihak memahami tahapan pengajuan suatu produk tanpa membaca dokumen teknis |

### Acceptance Criteria US-32

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-32.01 | Melihat diagram rute aktif | Saya seorang Risk Manager<br>AND saya berada di halaman "Product Route" | Saya memilih "KPR" di dropdown "Product" | Sistem menampilkan diagram berisi node modul berurutan dengan pembeda warna: otomatis (biru), langkah manual (oranye), bersyarat (garis putus-putus), dan tidak dipakai (abu-abu dicoret)<br>AND nomor versi aktif dan tanggal berlakunya tampil di atas diagram | Draft |
| AC-32.02 | Melihat detail modul | Saya seorang Risk Manager<br>AND saya berada di halaman "Product Route"<br>AND diagram rute KUR tampil | Saya mengklik node "SIKP" | Sistem menampilkan panel detail berisi jenis modul "Automatic", kondisi "Requested Limit > SIKP Minimum Limit (50.000.000)", dan tujuan untuk tiap hasil modul | Draft |
| AC-32.03 | Membandingkan versi rute | Saya seorang Checker<br>AND saya berada di halaman "Pending Product Route"<br>AND rute KTA versi 3 menunggu persetujuan | Saya mengklik tombol "Detail" pada baris KTA versi 3 | Sistem menampilkan diagram versi 2 dan versi 3 berdampingan dengan modul yang berubah ditandai | Draft |
| AC-32.04 | Produk belum punya rute | Saya seorang Risk Manager<br>AND saya berada di halaman "Product Route"<br>AND produk "KPR Subsidi" belum punya rute | Saya memilih "KPR Subsidi" di dropdown "Product" | Sistem menampilkan pesan "This product has no route yet" | Draft |
| AC-32.05 | Produk yang dipilih tidak aktif | Saya seorang Risk Manager<br>AND saya berada di halaman "Product Route"<br>AND produk "KPR Lama" berstatus Inactive | Saya mengklik dropdown "Product" | Sistem tidak menampilkan "KPR Lama" di daftar produk | Draft |

Catatan: AC-32.01 mengikuti Rute produk R-04.

## US-33: Mengatur Dedup Matrix

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menentukan hasil pengecekan duplikasi untuk setiap kombinasi kecocokan NIK, nama, tanggal lahir, tempat lahir, dan nama ibu kandung | kebijakan deteksi pengajuan ganda bisa diperketat atau dilonggarkan oleh bisnis |

### Acceptance Criteria US-33

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-33.01 | Mengubah outcome kombinasi dedup | Saya seorang Maker<br>AND saya berada di halaman "Dedup Matrix"<br>AND kombinasi NIK Match, Full Name Fuzzy, DOB Match, POB Match, MMN Fuzzy ber-outcome Review | Saya mengklik ikon edit pada kombinasi tersebut<br>AND saya memilih "Match" di dropdown "Dedup Outcome"<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Data submitted for approval"<br>AND perubahan tampil di "Pending Dedup Matrix" | Draft |
| AC-33.02 | Menyaring kombinasi matrix | Saya seorang Maker<br>AND saya berada di halaman "Dedup Matrix" | Saya memilih "Match" di filter "NIK"<br>AND saya memilih "Review" di filter "Dedup Outcome" | Sistem menampilkan hanya kombinasi dengan NIK Match dan outcome Review | Draft |
| AC-33.03 | Membatalkan perubahan | Saya seorang Maker<br>AND saya berada di halaman "Edit Dedup Matrix" | Saya memilih outcome baru<br>AND saya mengklik tombol "Cancel" | Sistem menutup form tanpa perubahan dan tidak ada data baru di "Pending Dedup Matrix" | Draft |
| AC-33.04 | Ambang kemiripan fuzzy di luar rentang | Saya seorang Maker<br>AND saya berada di halaman "Dedup Matrix Setting" | Saya mengisi "Fuzzy Match Threshold (%)" dengan "49"<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Fuzzy threshold must be between 50 and 100" | Draft |

Catatan: AC-33.01 mengikuti Asumsi A-02.

## US-34: Mengatur Aturan Verifikasi Dukcapil

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | mengatur bobot kecocokan nama dan nama ibu serta ambang hasil Passed, Review, dan Failed | tingkat kehati-hatian verifikasi identitas sesuai selera risiko bank |

### Acceptance Criteria US-34

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-34.01 | Mengubah ambang Passed | Saya seorang Maker<br>AND saya berada di halaman "Dukcapil Rule"<br>AND ambang Passed 0,90 dan Review 0,75 | Saya mengisi "Passed Threshold" dengan "0,92"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND perubahan tampil di "Pending Dukcapil Rule" | Draft |
| AC-34.02 | Jumlah bobot tidak 100% | Saya seorang Maker<br>AND saya berada di halaman "Dukcapil Rule" | Saya mengisi bobot "Full Name ID" 60 dan "Mother Maiden Name" 30<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Total weight must be 100%" | Draft |
| AC-34.03 | Ambang Review lebih tinggi dari ambang Passed | Saya seorang Maker<br>AND saya berada di halaman "Dukcapil Rule" | Saya mengisi "Passed Threshold" 0,80 dan "Review Threshold" 0,85<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Review threshold must be lower than passed threshold" | Draft |

Catatan: AC-34.01 mengikuti Asumsi A-03.

## US-35: Mengatur Fraud Matrix

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menentukan hasil fraud check untuk kombinasi kondisi nama pemohon dan alamat IP pengajuan | pengajuan berisiko penipuan tertahan sejak awal proses |

### Acceptance Criteria US-35

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-35.01 | Mengubah outcome kombinasi fraud | Saya seorang Maker<br>AND saya berada di halaman "Fraud Matrix"<br>AND kombinasi Nama Normal dan IP VPN/Proxy ber-outcome Suspicious | Saya mengklik ikon edit pada kombinasi tersebut<br>AND saya memilih "High Fraud Potential" di dropdown "Fraud Outcome"<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Data submitted for approval"<br>AND perubahan tampil di "Pending Fraud Matrix" | Draft |
| AC-35.02 | Membatalkan perubahan | Saya seorang Maker<br>AND saya berada di halaman "Edit Fraud Matrix" | Saya memilih outcome baru<br>AND saya mengklik tombol "Cancel" | Sistem menutup form tanpa perubahan | Draft |
| AC-35.03 | Batas jumlah pengajuan per hari di luar rentang | Saya seorang Maker<br>AND saya berada di halaman "Fraud Matrix Setting" | Saya mengisi "Max Applications per Name per Day" dengan "0"<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Value must be between 1 and 100" | Draft |

Catatan: AC-35.01 mengikuti Asumsi A-04.

## US-36: Mengatur Decision Matrix

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menentukan keputusan Go atau NotGo untuk kombinasi hasil Dedup, Dukcapil, Fraud, RAC, Scoring, dan SLIK | keputusan awal kredit konsisten dan mengikuti kebijakan risiko |

### Acceptance Criteria US-36

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-36.01 | Mengubah keputusan kombinasi | Saya seorang Maker<br>AND saya berada di halaman "Decision Matrix"<br>AND kombinasi SLIK Collect 2 dan Scoring Pass ber-decision NotGo | Saya mengklik ikon edit pada kombinasi tersebut<br>AND saya memilih "Go" di dropdown "Decision Outcome"<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Data submitted for approval"<br>AND perubahan tampil di "Pending Decision Matrix" | Draft |
| AC-36.02 | Menyimulasikan keputusan | Saya seorang Maker<br>AND saya berada di halaman "Decision Matrix" | Saya mengklik tombol "Simulate"<br>AND saya memilih Dedup "UnMatch", Dukcapil "Passed", Fraud "Clean", RAC "Pass", Scoring "Pass", SLIK "Collect 1"<br>AND saya mengklik tombol "Run" | Sistem menampilkan hasil "Go" beserta baris matrix yang dipakai | Draft |
| AC-36.03 | Kombinasi tanpa baris matrix | Saya seorang Maker<br>AND saya berada di halaman "Decision Matrix Simulation" | Saya memilih kombinasi yang tidak punya baris matrix<br>AND saya mengklik tombol "Run" | Sistem menampilkan hasil "NotGo" dengan keterangan "No matching rule, default decision applied" | Draft |
| AC-36.04 | Simulasi tanpa memilih semua hasil modul | Saya seorang Maker<br>AND saya berada di halaman "Decision Matrix Simulation" | Saya memilih Dedup, Dukcapil, dan Fraud tanpa memilih RAC, Scoring, dan SLIK<br>AND saya mengklik tombol "Run" | Sistem menampilkan pesan "Select an outcome for every module" | Draft |

## US-37: Menyusun Model Scoring dan RAC

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menyusun model penilaian berisi kriteria berbasis data pengajuan, bobot, nilai konstanta, dan batas lulus tanpa menulis kode | tim risiko menyesuaikan kriteria kelayakan kredit tanpa bergantung pada developer |

### Acceptance Criteria US-37

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-37.01 | Membuat kriteria pada model scoring | Saya seorang Maker<br>AND saya berada di halaman "Scoring Model"<br>AND model "KTA-2026" berjenis Scoring untuk produk KTA | Saya mengklik tombol "Add Criterion"<br>AND saya memilih field "Occupation", operator "is one of", nilai "ASN, Karyawan BUMN"<br>AND saya mengisi "Weight" dengan "50"<br>AND saya mengklik tombol "Save" | Sistem menampilkan kriteria "Occupation is one of ASN, Karyawan BUMN : +50" di daftar kriteria model | Draft |
| AC-37.02 | Membuat kriteria RAC kemampuan bayar | Saya seorang Maker<br>AND saya berada di halaman "Scoring Model"<br>AND model "KTA-RAC" berjenis RAC | Saya mengklik tombol "Add Criterion"<br>AND saya memilih field "Installment to Income Ratio (%)", operator "less than or equal", nilai "Product DBR Max"<br>AND saya memilih "Mandatory" di "Criterion Type"<br>AND saya mengklik tombol "Save" | Sistem menampilkan kriteria wajib "Installment to Income Ratio <= Product DBR Max" di model RAC | Draft |
| AC-37.03 | Nilai kriteria tidak sesuai tipe field | Saya seorang Maker<br>AND saya berada di halaman "Add Criterion" | Saya memilih field "Monthly Income" dan operator "greater than"<br>AND saya mengisi nilai "lima juta"<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Value must be a number" | Draft |
| AC-37.04 | Bobot kriteria di luar rentang | Saya seorang Maker<br>AND saya berada di halaman "Add Criterion" | Saya mengisi "Weight" dengan "1001"<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Weight must be between -1000 and 1000" | Draft |
| AC-37.05 | Mengajukan model untuk disetujui | Saya seorang Maker<br>AND saya berada di halaman "Scoring Model"<br>AND model "KTA-2026" berisi 8 kriteria, Constant 200, Cut Off 430 | Saya mengklik tombol "Submit for Approval" | Sistem menampilkan pesan "Data submitted for approval"<br>AND model aktif sebelumnya tetap dipakai sampai model baru disetujui | Draft |

Catatan: AC-37.02 mengikuti Asumsi A-26.

## US-38: Menguji Model Scoring Sebelum Berlaku

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Maker | menjalankan model scoring terhadap pengajuan contoh dan melihat rincian nilai tiap kriteria | kesalahan kriteria terdeteksi sebelum memengaruhi keputusan kredit nasabah |

### Acceptance Criteria US-38

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-38.01 | Menguji model dengan pengajuan contoh | Saya seorang Maker<br>AND saya berada di halaman "Scoring Model Test"<br>AND model draft "KTA-2026" punya Constant 200 dan Cut Off 430 | Saya mengetik Loan ID "15122025KTA0000013" di field "Sample Application"<br>AND saya mengklik tombol "Run Test" | Sistem menampilkan Total Score, Constant 200, Cut Off 430, hasil "Pass" atau "Fail"<br>AND rincian kriteria yang terpenuhi beserta bobotnya | Draft |
| AC-38.02 | Skor tepat sama dengan Cut Off | Saya seorang Maker<br>AND saya berada di halaman "Scoring Model Test"<br>AND pengajuan contoh menghasilkan Constant + bobot = 430 dan Cut Off 430 | Saya mengklik tombol "Run Test" | Sistem menampilkan hasil "Pass" | Draft |
| AC-38.03 | Skor satu poin di bawah Cut Off | Saya seorang Maker<br>AND saya berada di halaman "Scoring Model Test"<br>AND pengajuan contoh menghasilkan Constant + bobot = 429 dan Cut Off 430 | Saya mengklik tombol "Run Test" | Sistem menampilkan hasil "Fail" | Draft |
| AC-38.04 | Loan ID contoh tidak ditemukan | Saya seorang Maker<br>AND saya berada di halaman "Scoring Model Test" | Saya mengetik "LOANTIDAKADA" di field "Sample Application"<br>AND saya mengklik tombol "Run Test" | Sistem menampilkan pesan "Application not found" | Draft |

## US-39: Memulai Pengajuan Kredit Baru

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | memulai pengajuan dengan memilih produk dan mengisi jenis pemohon, tenor, serta limit yang diminta | data calon nasabah mulai tercatat sejak pertemuan pertama |

### Acceptance Criteria US-39

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-39.01 | Mengisi section Application dengan data valid | Saya seorang Sales<br>AND saya berada di halaman "New Application - Application" | Saya memilih "NTB" di "Application Type", "Mikro" di "Segment", "Non Collateral Loan" di "Product Category", "KTA" di "Product"<br>AND saya memilih "36" di "Tenor Proposed"<br>AND saya mengisi "Requested Limit" dengan "20.000.000"<br>AND saya memilih asuransi "Asuransi Contoh"<br>AND saya mengklik tombol "Next" | Sistem menampilkan step "Personal"<br>AND step "Application" bertanda selesai di stepper | Draft |
| AC-39.02 | Field wajib Application kosong | Saya seorang Sales<br>AND saya berada di halaman "New Application - Application" | Saya membiarkan "Product" dan "Requested Limit" kosong<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong<br>AND saya tetap di step "Application" | Draft |
| AC-39.03 | Batas plafon dan tenor sesuai produk sesuai matriks | Saya seorang Sales<br>AND saya berada di halaman "New Application - Application"<br>AND produk KTA: plafon 5.000.000 s.d. 300.000.000, tenor 6 s.d. 60 bulan | Saya mengisi "Requested Limit" dan "Tenor Proposed" sesuai baris MRTM<br>AND saya mengklik tombol "Next" | Refer to MRTM Rows: TRM_APP_001 through TRM_APP_008 for comprehensive logic combinations. | Draft |
| AC-39.04 | Kembali dari step Application tanpa menyimpan | Saya seorang Sales<br>AND saya berada di halaman "New Application - Application"<br>AND saya sudah mengisi beberapa field | Saya mengklik tombol "Back"<br>AND saya mengklik tombol "OK" di konfirmasi "Unsaved data will be lost. Continue?" | Sistem menampilkan halaman "Application List"<br>AND tidak ada pengajuan baru yang tersimpan | Draft |
| AC-39.05 | Dropdown produk hanya berisi produk aktif dengan rute disetujui | Saya seorang Sales<br>AND saya berada di halaman "New Application - Application"<br>AND produk "KPR Subsidi" aktif tetapi belum punya rute disetujui | Saya memilih "Collateral Loan" di "Product Category"<br>AND saya mengklik dropdown "Product" | Sistem tidak menampilkan "KPR Subsidi" di daftar produk | Draft |

Catatan: AC-39.05 mengikuti Rute produk R-09.

### MRTM US-39

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

## US-40: Mengisi Data Pribadi Pemohon

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | mengisi identitas, kontak, alamat KTP, dan alamat domisili pemohon | identitas pemohon tercatat lengkap sebagai dasar verifikasi dan pelaporan |

### Acceptance Criteria US-40

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-40.01 | Mengisi data pribadi lengkap | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND produk KTA dengan Requested Limit 20.000.000 | Saya mengisi "Full Name" "Rudi Hartono", "Full Name ID" "RUDI HARTONO", "Place of Birth" "Bandung", "Date of Birth" "14-02-1990"<br>AND saya memilih Gender "Laki-laki", Religion "Islam", Nationality "WNI", Education "S1", Marital "Belum Kawin"<br>AND saya mengisi "Mother Maiden Name" "Siti", "ID Card Number" "3273011402900001", "ID Date Issued" "10-01-2020"<br>AND saya mengisi alamat KTP dengan memilih Province, City, District, Sub District berjenjang<br>AND saya mengklik tombol "Next" | Sistem menampilkan step "Occupation" karena Marital "Belum Kawin" | Draft |
| AC-40.02 | NIK bukan 16 digit | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal" | Saya mengisi "ID Card Number" dengan "327301140290000"<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "ID card number must be 16 digits" | Draft |
| AC-40.03 | Usia pemohon di bawah minimum produk | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND produk KTA mensyaratkan usia 21 s.d. 55 tahun<br>AND hari ini 20-10-2026 | Saya mengisi "Date of Birth" dengan "21-10-2005"<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "Applicant age must be between 21 and 55 years for this product" | Draft |
| AC-40.04 | Usia pemohon tepat 21 tahun | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND produk KTA mensyaratkan usia 21 s.d. 55 tahun<br>AND hari ini 20-10-2026 | Saya mengisi "Date of Birth" dengan "20-10-2005" dan field wajib lain dengan data valid<br>AND saya mengklik tombol "Next" | Sistem menampilkan step berikutnya | Draft |
| AC-40.05 | NPWP wajib untuk limit di atas 50 juta | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND Requested Limit 50.000.001 | Saya membiarkan "NPWP Number" kosong dan field wajib lain terisi<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "NPWP is required for requested limit above 50,000,000" | Draft |
| AC-40.06 | NPWP tidak wajib untuk limit tepat 50 juta | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND Requested Limit 50.000.000 | Saya membiarkan "NPWP Number" kosong dan field wajib lain terisi<br>AND saya mengklik tombol "Next" | Sistem menampilkan step berikutnya | Draft |
| AC-40.07 | Alamat domisili sama dengan KTP | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND alamat KTP sudah terisi | Saya mencentang checkbox "Same as ID Address" | Sistem menyalin seluruh field alamat KTP ke section "Residence Address" dan field tersebut tidak bisa diedit | Draft |

Catatan: AC-40.01, AC-40.05 mengikuti Asumsi A-16.

## US-41: Mengisi Data Pribadi dari Foto KTP

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | memotret atau mengunggah KTP lalu memakai hasil bacaannya untuk mengisi data pribadi | input data lebih cepat dan salah ketik NIK serta nama berkurang |

### Acceptance Criteria US-41

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-41.01 | Mengisi data dari foto KTP yang jelas | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal" | Saya mengklik tombol "Scan ID Card"<br>AND saya memilih foto KTP yang jelas<br>AND saya mengklik tombol "Read" | Sistem mengisi field NIK, Full Name ID, Place of Birth, Date of Birth, Gender, alamat KTP, Religion, dan Marital dari hasil bacaan<br>AND field hasil bacaan diberi tanda "Read from ID card" dan tetap bisa diedit | Draft |
| AC-41.02 | Foto tidak terbaca | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal" | Saya mengklik tombol "Scan ID Card"<br>AND saya memilih foto buram<br>AND saya mengklik tombol "Read" | Sistem menampilkan pesan "ID card could not be read. Please retake the photo or fill in manually"<br>AND field yang sudah terisi tidak berubah | Draft |
| AC-41.03 | Foto melebihi 2 MB | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal" | Saya mengklik tombol "Scan ID Card"<br>AND saya memilih foto berukuran 2,1 MB | Sistem menampilkan pesan "File must not exceed 2 MB" | Draft |
| AC-41.04 | Layanan OCR tidak tersedia | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND layanan pembacaan KTP sedang tidak tersedia | Saya mengklik tombol "Scan ID Card"<br>AND saya memilih foto KTP<br>AND saya mengklik tombol "Read" | Sistem menampilkan pesan "ID card reading is unavailable. Please fill in manually"<br>AND saya tetap bisa mengisi data pribadi secara manual | Draft |

Catatan: AC-41.03 mengikuti Asumsi A-17.

## US-42: Memverifikasi Data Pensiun Pemohon

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | memeriksa Nomor Taspen pemohon kredit pensiun ke data EDAPEM | kredit pensiun hanya diberikan kepada pensiunan dengan data manfaat pensiun yang valid |

### Acceptance Criteria US-42

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-42.01 | Nomor Taspen ditemukan | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND produk Pension | Saya mengisi "Taspen Number" dengan "1234567890"<br>AND saya mengklik ikon cari di samping field "Taspen Number" | Sistem mengisi "Account Number", "Pension Amount", dan "EDAPEM Date" dari data EDAPEM<br>AND ketiga field tidak bisa diedit | Draft |
| AC-42.02 | Nomor Taspen tidak ditemukan | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND produk Pension | Saya mengisi "Taspen Number" dengan "9999999999"<br>AND saya mengklik ikon cari | Sistem menampilkan pesan "Taspen number not found in EDAPEM"<br>AND tombol "Next" tidak melanjutkan ke step berikutnya | Draft |
| AC-42.03 | Lanjut tanpa verifikasi Taspen | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND produk Pension | Saya mengisi semua field wajib tanpa mengklik ikon cari Taspen<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "Please verify the Taspen number first" | Draft |
| AC-42.04 | Field Taspen tidak tampil untuk produk non pensiun | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND produk KTA | Saya scroll ke seluruh section Personal | Sistem tidak menampilkan field "Taspen Number" | Draft |

## US-43: Mengisi Data Pasangan Pemohon

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | mengisi identitas dan pekerjaan pasangan untuk pemohon berstatus kawin | kemampuan bayar rumah tangga dan persetujuan pasangan dinilai lengkap |

### Acceptance Criteria US-43

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-43.01 | Mengisi data pasangan | Saya seorang Sales<br>AND saya berada di halaman "New Application - Spouse"<br>AND Marital pemohon "Kawin" | Saya mengisi "Spouse Full Name", "Spouse ID Number", "Spouse Date of Birth"<br>AND saya memilih "Spouse Occupation" "Karyawan Swasta" dan mengisi "Spouse Monthly Income" "6.000.000"<br>AND saya memilih "Prenuptial Agreement" "No"<br>AND saya mengklik tombol "Next" | Sistem menampilkan step "Occupation" | Draft |
| AC-43.02 | NIK pasangan sama dengan NIK pemohon | Saya seorang Sales<br>AND saya berada di halaman "New Application - Spouse"<br>AND NIK pemohon 3273011402900001 | Saya mengisi "Spouse ID Number" dengan "3273011402900001"<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "Spouse ID number must be different from applicant ID number" | Draft |
| AC-43.03 | Step Spouse tidak tampil untuk pemohon belum kawin | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND saya memilih Marital "Cerai Hidup" | Saya mengklik tombol "Next" | Sistem menampilkan step "Occupation" dan stepper tidak memuat step "Spouse" | Draft |
| AC-43.04 | Marital diubah dari Kawin menjadi Belum Kawin | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND data pasangan sudah terisi | Saya mengubah Marital menjadi "Belum Kawin"<br>AND saya mengklik tombol "OK" di konfirmasi "Spouse data will be removed. Continue?" | Sistem menghapus data pasangan dan step "Spouse" hilang dari stepper | Draft |

## US-44: Mengisi Data Pekerjaan Pemohon

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | mengisi sumber penghasilan, pekerjaan, lama bekerja, penghasilan bulanan, dan data perusahaan pemohon | sumber dan besar penghasilan pemohon bisa diverifikasi |

### Acceptance Criteria US-44

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-44.01 | Mengisi data pekerjaan karyawan | Saya seorang Sales<br>AND saya berada di halaman "New Application - Occupation" | Saya memilih "Bekerja" di "Source of Income", "Karyawan Swasta" di "Occupation", "Perdagangan" di "Industry of Profession"<br>AND saya mengisi "Tenure at Current Job (Years)" "4" dan "Monthly Income Allowance" "8.000.000"<br>AND saya mengisi data perusahaan<br>AND saya mengklik tombol "Next" | Sistem menampilkan step berikutnya sesuai produk | Draft |
| AC-44.02 | Penghasilan bulanan 0 | Saya seorang Sales<br>AND saya berada di halaman "New Application - Occupation"<br>AND produk KTA | Saya mengisi "Monthly Income Allowance" dengan "0"<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "Monthly income must be greater than 0" | Draft |
| AC-44.03 | Penghasilan dan lama kerja tidak wajib untuk produk Pension | Saya seorang Sales<br>AND saya berada di halaman "New Application - Occupation"<br>AND produk Pension | Saya membiarkan "Monthly Income Allowance" dan "Tenure at Current Job" kosong<br>AND saya mengklik tombol "Next" | Sistem menampilkan step berikutnya tanpa pesan wajib isi | Draft |
| AC-44.04 | KUR hanya untuk wiraswasta | Saya seorang Sales<br>AND saya berada di halaman "New Application - Occupation"<br>AND produk KUR Kecil | Saya memilih "Karyawan Swasta" di "Occupation"<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "This product is only available for self-employed applicants" | Draft |

## US-45: Mengisi Data Usaha Pemohon

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | mengisi profil usaha, omzet, lama usaha, dan alamat usaha untuk pemohon wiraswasta | kelayakan usaha sebagai sumber pembayaran bisa dinilai |

### Acceptance Criteria US-45

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-45.01 | Mengisi data usaha | Saya seorang Sales<br>AND saya berada di halaman "New Application - Business"<br>AND Occupation pemohon "Wiraswasta" | Saya mengisi "Business Name" "Toko Sumber Rejeki", memilih "Business Field" "Perdagangan Eceran"<br>AND saya mengisi "Annual Sales" "600.000.000" dan "Business Launch Date" "01-03-2018"<br>AND saya mengisi alamat usaha<br>AND saya mengklik tombol "Next" | Sistem menampilkan step berikutnya sesuai produk | Draft |
| AC-45.02 | Tanggal mulai usaha di masa depan | Saya seorang Sales<br>AND saya berada di halaman "New Application - Business"<br>AND hari ini 20-10-2026 | Saya mengisi "Business Launch Date" dengan "21-10-2026"<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "Business launch date must not be in the future" | Draft |
| AC-45.03 | Step Business hanya untuk wiraswasta | Saya seorang Sales<br>AND saya berada di halaman "New Application - Occupation"<br>AND saya memilih Occupation "Karyawan Swasta" | Saya mengklik tombol "Next" | Sistem tidak menampilkan step "Business" di stepper | Draft |
| AC-45.04 | Lama usaha kurang dari 6 bulan untuk KUR | Saya seorang Sales<br>AND saya berada di halaman "New Application - Business"<br>AND produk KUR mensyaratkan usaha berjalan minimal 6 bulan<br>AND hari ini 20-10-2026 | Saya mengisi "Business Launch Date" dengan "21-04-2026"<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "Business must have been running for at least 6 months" | Draft |

## US-46: Mengisi Data Agunan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | mencatat agunan berupa kendaraan, sertifikat tanah dan bangunan, atau SK pensiun sesuai produk | nilai dan legalitas jaminan pinjaman tercatat sebagai dasar penilaian kredit |

### Acceptance Criteria US-46

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-46.01 | Mengisi agunan kendaraan | Saya seorang Sales<br>AND saya berada di halaman "New Application - Collateral"<br>AND produk Kredit Agunan | Saya memilih "Kendaraan" di "Collateral Type"<br>AND saya mengisi Type, Brand, Model, Year "2021", Price "180.000.000", Color, Machine Number, Frame Number, BPKB Number, Police Number, dan alamat kendaraan<br>AND saya mengklik tombol "Next" | Sistem menampilkan step "Document" | Draft |
| AC-46.02 | Agunan KPR otomatis sertifikat | Saya seorang Sales<br>AND saya berada di halaman "New Application - Collateral"<br>AND produk KPR | Saya membuka step "Collateral" | Sistem menampilkan "Collateral Type" terisi "Sertifikat" tanpa pilihan lain<br>AND form Certificate Details dan Certificate Address tampil | Draft |
| AC-46.03 | Agunan pensiun berupa SK | Saya seorang Sales<br>AND saya berada di halaman "New Application - Collateral"<br>AND produk Pension | Saya mengisi "Decree Number" dan "Decree Date"<br>AND saya mengklik tombol "Next" | Sistem menampilkan step "Document" | Draft |
| AC-46.04 | Tahun kendaraan melebihi tahun berjalan | Saya seorang Sales<br>AND saya berada di halaman "New Application - Collateral"<br>AND hari ini 20-10-2026 | Saya mengisi "Year of Vehicle Release" dengan "2027"<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "Vehicle year must not be later than 2026" | Draft |
| AC-46.05 | Step Collateral tidak tampil untuk produk tanpa agunan | Saya seorang Sales<br>AND saya berada di halaman "New Application"<br>AND produk KTA berkategori Non Collateral Loan | Saya mengklik tombol "Next" di step terakhir sebelum Document | Sistem menampilkan step "Document" dan stepper tidak memuat step "Collateral" | Draft |
| AC-46.06 | Field wajib agunan kendaraan kosong | Saya seorang Sales<br>AND saya berada di halaman "New Application - Collateral"<br>AND Collateral Type "Kendaraan" | Saya membiarkan "Frame Number" dan "BPKB Number" kosong<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "This field is required" di bawah field "Frame Number" dan "BPKB Number" | Draft |

## US-47: Mengunggah Dokumen Pendukung

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | mengunggah dokumen pendukung sesuai daftar dokumen wajib produk | kelengkapan administrasi terpenuhi sebelum pengajuan diproses |

### Acceptance Criteria US-47

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-47.01 | Mengunggah dokumen sesuai checklist | Saya seorang Sales<br>AND saya berada di halaman "New Application - Document"<br>AND checklist memuat 7 dokumen | Saya mengklik tombol "Upload" pada slot "KTP"<br>AND saya memilih file "ktp.jpg" berukuran 800 KB | Sistem menampilkan nama file "ktp.jpg" dengan status "Uploaded" pada slot "KTP"<br>AND penghitung kelengkapan menjadi "1 of 7 documents" | Draft |
| AC-47.02 | Ekstensi file tidak diizinkan | Saya seorang Sales<br>AND saya berada di halaman "New Application - Document" | Saya mengklik tombol "Upload" pada slot "NPWP"<br>AND saya memilih file "npwp.exe" | Sistem menampilkan pesan "Allowed file types: png, jpg, jpeg, pdf, docx" | Draft |
| AC-47.03 | File tepat 2 MB diterima | Saya seorang Sales<br>AND saya berada di halaman "New Application - Document" | Saya mengklik tombol "Upload" pada slot "Slip Gaji"<br>AND saya memilih file PDF berukuran tepat 2 MB | Sistem menampilkan status "Uploaded" pada slot "Slip Gaji" | Draft |
| AC-47.04 | File 2,1 MB ditolak | Saya seorang Sales<br>AND saya berada di halaman "New Application - Document" | Saya mengklik tombol "Upload" pada slot "Slip Gaji"<br>AND saya memilih file PDF berukuran 2,1 MB | Sistem menampilkan pesan "File must not exceed 2 MB" | Draft |
| AC-47.05 | Melihat dan mengganti dokumen | Saya seorang Sales<br>AND saya berada di halaman "New Application - Document"<br>AND slot "KTP" sudah berisi file | Saya mengklik ikon ganti pada slot "KTP"<br>AND saya memilih file "ktp-baru.jpg" | Sistem menampilkan "ktp-baru.jpg" pada slot "KTP" dan file lama tidak lagi dipakai | Draft |

Catatan: AC-47.01, AC-47.02, AC-47.03, AC-47.04 mengikuti Asumsi A-17.

## US-48: Mengisi Kontak Darurat

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | mengisi kontak darurat pemohon yang tidak tinggal serumah | bank punya jalur komunikasi alternatif saat pemohon sulit dihubungi |

### Acceptance Criteria US-48

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-48.01 | Mengisi kontak darurat | Saya seorang Sales<br>AND saya berada di halaman "New Application - Emergency Contact" | Saya mengisi "Contact Name" "Dewi", "Mobile Number" "081234567890"<br>AND saya memilih "Saudara Kandung" di "Relation with Applicant"<br>AND saya mengisi alamat kontak | Sistem menampilkan tombol "Save as Draft" dan "Submit" dalam keadaan aktif | Draft |
| AC-48.02 | Nomor HP tidak valid | Saya seorang Sales<br>AND saya berada di halaman "New Application - Emergency Contact" | Saya mengisi "Mobile Number" dengan "12345"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Mobile number must start with 08 and contain 10 to 13 digits" | Draft |
| AC-48.03 | Nomor kontak darurat sama dengan nomor pemohon | Saya seorang Sales<br>AND saya berada di halaman "New Application - Emergency Contact"<br>AND nomor HP pemohon 081234567890 | Saya mengisi "Mobile Number" dengan "081234567890"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Emergency contact number must be different from applicant number" | Draft |
| AC-48.04 | Nomor HP 14 digit ditolak | Saya seorang Sales<br>AND saya berada di halaman "New Application - Emergency Contact" | Saya mengisi "Mobile Number" dengan "08123456789012"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Mobile number must start with 08 and contain 10 to 13 digits" | Draft |

## US-49: Menyimpan Pengajuan sebagai Draft

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | menyimpan pengajuan yang belum lengkap dan melanjutkannya di lain waktu | data yang sudah diisi tidak hilang saat dokumen nasabah belum lengkap |

### Acceptance Criteria US-49

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-49.01 | Menyimpan draft pertama kali membentuk Loan ID | Saya seorang Sales<br>AND saya berada di halaman "New Application"<br>AND saya sudah mengisi Application Type, Identity Type, Identity Number, Product Category, Product "KTA", Full Name, dan Full Name ID<br>AND hari ini 20-10-2026<br>AND Loan ID KTA terakhir hari ini berakhiran 0000012 | Saya mengklik tombol "Save as Draft" | Sistem menampilkan pesan "Application saved as draft. Loan ID: 20102026KTA0000013"<br>AND pengajuan tampil di "Application List" dengan status "Draft" | Draft |
| AC-49.02 | Draft tanpa field minimum | Saya seorang Sales<br>AND saya berada di halaman "New Application"<br>AND field Product belum diisi | Saya mengklik tombol "Save as Draft" | Sistem menampilkan pesan "Fill in Application Type, Identity Type, Identity Number, Product Category, Product, Full Name, and Full Name ID to save a draft" | Draft |
| AC-49.03 | Loan ID tidak berubah saat draft disimpan ulang | Saya seorang Sales<br>AND saya berada di halaman "New Application"<br>AND draft "20102026KTA0000013" sudah ada | Saya mengubah "Place of Birth"<br>AND saya mengklik tombol "Save as Draft" | Sistem menampilkan pesan "Application saved as draft. Loan ID: 20102026KTA0000013" | Draft |
| AC-49.04 | Pembentukan Loan ID sesuai matriks | Saya seorang Sales<br>AND saya berada di halaman "New Application" | Saya mengklik tombol "Save as Draft" untuk draft pertama sesuai baris MRTM | Refer to MRTM Rows: TRM_LID_001 through TRM_LID_006 for comprehensive logic combinations. | Draft |
| AC-49.05 | Melanjutkan draft | Saya seorang Sales<br>AND saya berada di halaman "Application List"<br>AND draft "20102026KTA0000013" tersimpan sampai step Occupation | Saya mengklik Loan ID "20102026KTA0000013" | Sistem menampilkan form pengajuan pada step "Occupation" dengan data sebelumnya terisi | Draft |
| AC-49.06 | Sales lain tidak bisa mengedit draft saya | Saya seorang Sales "sales.jkt02"<br>AND saya berada di halaman "Application List"<br>AND draft "20102026KTA0000013" milik "sales.jkt01" | Saya mencari Loan ID "20102026KTA0000013" | Sistem tidak menampilkan draft tersebut di daftar saya | Draft |

Catatan: AC-49.01 mengikuti Asumsi A-15, A-24. AC-49.02 mengikuti Asumsi A-15. AC-49.04 mengikuti Asumsi A-24.

### MRTM US-49

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Tanggal Simpan | Kode Produk | Company | Counter Terakhir | Kondisi Bersamaan | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|---|---|
| US_49 | AC_49.04 | Sales | TRM_LID_001 | 20-10-2026 | KTA | 001 | 0000012 | - | [-] | Loan ID 20102026KTA0000013 |
| US_49 | AC_49.04 | Sales | TRM_LID_002 | 20-10-2026 | KPR | 001 | 0000040 | - | Counter terpisah per produk | Loan ID 20102026KPR0000041 |
| US_49 | AC_49.04 | Sales | TRM_LID_003 | 21-10-2026 | KTA | 001 | 0000013 | - | Counter tidak direset per hari | Loan ID 21102026KTA0000014 |
| US_49 | AC_49.04 | Sales | TRM_LID_004 | 20-10-2026 | KTA | 007 | 0000000 | - | Counter terpisah per company | Loan ID 20102026KTA0000001 |
| US_49 | AC_49.04 | Sales | TRM_LID_005 | 20-10-2026 | KTA | 001 | 9999999 | - | Batas counter | Sistem menampilkan pesan "Loan ID counter has reached its limit. Please contact your administrator" |
| US_49 | AC_49.04 | Sales | TRM_LID_006 | 20-10-2026 | KTA | 001 | 0000012 | Ada draft lain disimpan bersamaan | Dua Sales menyimpan pada detik yang sama | Kedua draft mendapat Loan ID berbeda: 0000013 dan 0000014 |

## US-50: Mengirim Pengajuan untuk Diproses

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | mengirim pengajuan yang sudah lengkap ke proses verifikasi | pengajuan masuk tahap penilaian sesuai rute produknya tanpa jeda manual |

### Acceptance Criteria US-50

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-50.01 | Submit pengajuan lengkap | Saya seorang Sales<br>AND saya berada di halaman "New Application - Emergency Contact"<br>AND semua step wajib dan dokumen produk KTA sudah lengkap<br>AND rute KTA tidak memakai modul Survey | Saya mengklik tombol "Submit"<br>AND saya mengklik tombol "Yes" di konfirmasi "Submit this application?" | Sistem menampilkan pesan "Application submitted. Loan ID: 20102026KTA0000013"<br>AND status pengajuan menjadi "On Progress" dengan langkah saat ini "Dedup"<br>AND data pengajuan tidak bisa diedit lagi oleh Sales | Draft |
| AC-50.02 | Submit dengan dokumen belum lengkap | Saya seorang Sales<br>AND saya berada di halaman "New Application - Emergency Contact"<br>AND baru 5 dari 7 dokumen terunggah | Saya mengklik tombol "Submit" | Sistem menampilkan pesan "Please upload all required documents (5 of 7)"<br>AND sistem menampilkan step "Document" | Draft |
| AC-50.03 | Submit dengan field wajib di step lain kosong | Saya seorang Sales<br>AND saya berada di halaman "New Application - Emergency Contact"<br>AND field "Education" di step Personal kosong | Saya mengklik tombol "Submit" | Sistem menampilkan pesan "Please complete all required fields"<br>AND step "Personal" bertanda error di stepper | Draft |
| AC-50.04 | Langkah pertama mengikuti rute produk | Saya seorang Sales<br>AND saya berada di halaman "New Application - Emergency Contact"<br>AND pengajuan KPR lengkap dan rute KPR memakai modul Survey | Saya mengklik tombol "Submit"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Application submitted. Loan ID: 20102026KPR0000041"<br>AND langkah saat ini "Survey" dan pengajuan masuk antrean "Application LKN - KPR" | Draft |
| AC-50.05 | Email konfirmasi ke pemohon | Saya seorang Sales<br>AND saya berada di halaman "New Application - Emergency Contact"<br>AND email pemohon "rudi@contoh.com" terisi | Saya mengklik tombol "Submit"<br>AND saya mengklik tombol "Yes" | Sistem mengirim email ke "rudi@contoh.com" dengan subjek "Your loan application 20102026KTA0000013 has been received" | Draft |
| AC-50.06 | Urutan step form pengajuan sesuai matriks | Saya seorang Sales<br>AND saya berada di halaman "New Application"<br>AND produk, status perkawinan, dan pekerjaan sesuai baris MRTM | Saya mengklik tombol "Next" di setiap step sampai step terakhir | Refer to MRTM Rows: TRM_STP_001 through TRM_STP_006 for comprehensive logic combinations. | Draft |

Catatan: AC-50.04 mengikuti Asumsi A-05. AC-50.06 mengikuti Asumsi A-25.

### MRTM US-50

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Produk (Kategori) | Marital | Occupation | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|
| US_50 | AC_50.06 | Sales | TRM_STP_001 | KTA (Non Collateral) | Belum Kawin | Karyawan Swasta | [-] | Application > Personal > Occupation > Document > Emergency Contact |
| US_50 | AC_50.06 | Sales | TRM_STP_002 | KTA (Non Collateral) | Kawin | Karyawan Swasta | [-] | Application > Personal > Spouse > Occupation > Document > Emergency Contact |
| US_50 | AC_50.06 | Sales | TRM_STP_003 | Kredit Agunan (Collateral) | Kawin | Wiraswasta | [-] | Application > Personal > Spouse > Occupation > Business > Collateral > Document > Emergency Contact |
| US_50 | AC_50.06 | Sales | TRM_STP_004 | KUR Kecil (Collateral) | Belum Kawin | Wiraswasta | [-] | Application > Personal > Occupation > Business > Collateral > Document > Emergency Contact |
| US_50 | AC_50.06 | Sales | TRM_STP_005 | KPR (Collateral) | Cerai Hidup | ASN | Agunan otomatis Sertifikat | Application > Personal > Occupation > Collateral > Document > Emergency Contact |
| US_50 | AC_50.06 | Sales | TRM_STP_006 | Pension | Kawin | Pensiunan | Wajib verifikasi Taspen | Application > Personal (Taspen) > Spouse > Occupation > Collateral (SK) > Document > Emergency Contact |

## US-51: Menghitung Simulasi Angsuran

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | menghitung angsuran bulanan berdasarkan pokok, tenor, suku bunga, dan jenis bunga | calon nasabah mendapat gambaran angsuran sebelum mengajukan |

### Acceptance Criteria US-51

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-51.01 | Simulasi bunga efektif | Saya seorang Sales<br>AND saya berada di halaman "Installment Simulation" | Saya mengisi "Principal" "100.000.000", "Tenor (months)" "12", "Interest Rate (% p.a.)" "12"<br>AND saya memilih "Effective" di "Interest Type"<br>AND saya mengklik tombol "Calculate" | Sistem menampilkan angsuran bulanan Rp8.884.879 dan tabel 12 baris berisi pokok, bunga, dan sisa pinjaman, dengan sisa pinjaman baris terakhir Rp0 | Draft |
| AC-51.02 | Perhitungan angsuran per jenis bunga sesuai matriks | Saya seorang Sales<br>AND saya berada di halaman "Installment Simulation" | Saya mengisi input sesuai baris MRTM<br>AND saya mengklik tombol "Calculate" | Refer to MRTM Rows: TRM_INS_001 through TRM_INS_007 for comprehensive logic combinations. | Draft |
| AC-51.03 | Tenor kosong | Saya seorang Sales<br>AND saya berada di halaman "Installment Simulation" | Saya mengisi "Principal" dan "Interest Rate" tanpa mengisi "Tenor (months)"<br>AND saya mengklik tombol "Calculate" | Sistem menampilkan pesan "Tenor is required" | Draft |
| AC-51.04 | Suku bunga 0% | Saya seorang Sales<br>AND saya berada di halaman "Installment Simulation" | Saya mengisi "Principal" "12.000.000", "Tenor" "12", "Interest Rate" "0"<br>AND saya memilih "Flat"<br>AND saya mengklik tombol "Calculate" | Sistem menampilkan angsuran Rp1.000.000 per bulan tanpa bunga | Draft |

### MRTM US-51

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Interest Type | Principal | Tenor | Rate (% p.a.) | Input Tambahan 1 | Input Tambahan 2 | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| US_51 | AC_51.02 | Sales | TRM_INS_001 | Flat | 100.000.000 | 12 | 12 | [-] | [-] | [-] | Angsuran tetap Rp9.333.333 per bulan (pokok 8.333.333 + bunga 1.000.000) |
| US_51 | AC_51.02 | Sales | TRM_INS_002 | Effective | 100.000.000 | 12 | 12 | [-] | [-] | [-] | Angsuran tetap Rp8.884.879 per bulan, bunga menurun, pokok naik |
| US_51 | AC_51.02 | Sales | TRM_INS_003 | Floating | 100.000.000 | 12 | 10 | Spread 2 | [-] | Rate = interest + spread = 12% | Angsuran Rp8.884.879 per bulan |
| US_51 | AC_51.02 | Sales | TRM_INS_004 | Hybrid | 100.000.000 | 24 | 10 | Floating 14 | Tenor fixed 12 | [-] | Angsuran bulan 1 s.d. 12 dihitung dengan 10%, bulan 13 s.d. 24 dengan 14% atas sisa pokok |
| US_51 | AC_51.02 | Sales | TRM_INS_005 | Capped | 100.000.000 | 12 | 12 | Spread 2 | Cap 13 | Rate 14% melebihi cap | Angsuran dihitung dengan 13% |
| US_51 | AC_51.02 | Sales | TRM_INS_006 | Capped | 100.000.000 | 12 | 10 | Spread 2 | Cap 13 | Rate 12% di bawah cap | Angsuran dihitung dengan 12% |
| US_51 | AC_51.02 | Sales | TRM_INS_007 | Hybrid | 100.000.000 | 12 | 10 | Floating 14 | Tenor fixed 12 | Tenor fixed = tenor | Sistem menampilkan pesan "Fixed tenor must be less than total tenor" |

## US-52: Mengunggah Pengajuan Massal

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | mengunggah banyak pengajuan sekaligus melalui template Excel | pengajuan dari program kemitraan atau payroll diproses tanpa input satu per satu |

### Acceptance Criteria US-52

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-52.01 | Mengunduh template upload | Saya seorang Sales<br>AND saya berada di halaman "Application List" | Saya mengklik tombol "More Action"<br>AND saya mengklik "Download Template" | Sistem mengunduh file Excel template dengan kolom dropdown berisi pilihan dari General Parameter | Draft |
| AC-52.02 | Mengunggah file valid | Saya seorang Sales<br>AND saya berada di halaman "Application List" | Saya mengklik tombol "More Action"<br>AND saya mengklik "Upload Applications"<br>AND saya memilih file template berisi 100 baris<br>AND saya mengklik tombol "Upload" | Sistem menampilkan pesan "Upload received. Track progress in Monitor Upload"<br>AND file tampil di "Monitor Upload" dengan status "In Progress" | Draft |
| AC-52.03 | File tidak sesuai template | Saya seorang Sales<br>AND saya berada di halaman "Upload Applications" | Saya memilih file Excel dengan kolom berbeda dari template<br>AND saya mengklik tombol "Upload" | Sistem menampilkan pesan "File does not match the template. Please download the latest template" | Draft |
| AC-52.04 | File melebihi 500 baris | Saya seorang Sales<br>AND saya berada di halaman "Upload Applications" | Saya memilih file berisi 501 baris<br>AND saya mengklik tombol "Upload" | Sistem menampilkan pesan "Maximum 500 applications per file" | Draft |

## US-53: Memantau Hasil Upload Massal

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | melihat status pemrosesan file upload dan mengunduh baris yang gagal beserta alasannya | pengajuan yang gagal diunggah bisa segera diperbaiki dan diunggah ulang |

### Acceptance Criteria US-53

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-53.01 | Melihat hasil upload selesai | Saya seorang Sales<br>AND saya berada di halaman "Monitor Upload"<br>AND file "payroll-okt.xlsx" selesai diproses dengan 97 berhasil dan 3 gagal | Saya melihat baris "payroll-okt.xlsx" | Sistem menampilkan status "Done", Total 100, Success 97, Failed 3, dan tombol "Download Failed" | Draft |
| AC-53.02 | Mengunduh baris gagal | Saya seorang Sales<br>AND saya berada di halaman "Monitor Upload"<br>AND file "payroll-okt.xlsx" punya 3 baris gagal | Saya mengklik tombol "Download Failed" | Sistem mengunduh file Excel berisi 3 baris gagal dengan kolom terakhir "Failed Reason", misalnya "ID card number must be 16 digits" | Draft |
| AC-53.03 | Tombol unduh tidak tampil bila semua baris berhasil | Saya seorang Sales<br>AND saya berada di halaman "Monitor Upload"<br>AND file "payroll-nov.xlsx" selesai dengan 0 baris gagal | Saya melihat baris "payroll-nov.xlsx" | Sistem tidak menampilkan tombol "Download Failed" pada baris tersebut | Draft |
| AC-53.04 | Hanya file milik company sendiri yang tampil | Saya seorang Sales company "001"<br>AND saya berada di halaman "Monitor Upload" | Saya membuka halaman "Monitor Upload" | Sistem hanya menampilkan file upload milik company "001" | Draft |
| AC-53.05 | File gagal diproses seluruhnya | Saya seorang Sales<br>AND saya berada di halaman "Monitor Upload"<br>AND file "payroll-des.xlsx" gagal dibaca karena rusak | Saya melihat baris "payroll-des.xlsx" | Sistem menampilkan status "Failed" dengan keterangan "File could not be read" | Draft |

## US-54: Mengirim Pengajuan melalui API Mitra

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Tim IT mitra penyalur | mendaftarkan aplikasi mitra, memperoleh token, dan mengirim data pengajuan nasabah ke LOS | pengajuan dari kanal mitra masuk ke LOS tanpa input ulang oleh Sales |

### Acceptance Criteria US-54

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-54.01 | Memperoleh token dengan API key valid | Saya seorang Tim IT mitra dengan API key aktif yang diterbitkan untuk company "001" | Saya mengirim permintaan login dengan API key tersebut ke endpoint autentikasi | Sistem mengembalikan token bertipe Bearer beserta waktu kedaluwarsanya dengan pesan "Create token successfully" | Draft |
| AC-54.02 | Mengirim pengajuan dengan token valid | Saya seorang Tim IT mitra dengan token Bearer yang masih berlaku | Saya mengirim data pengajuan lengkap ke endpoint insert customer | Sistem mengembalikan Loan ID baru dan status "Submitted"<br>AND pengajuan tampil di Application Inquiry dengan channel "API" | Draft |
| AC-54.03 | Token kedaluwarsa | Saya seorang Tim IT mitra dengan token yang sudah kedaluwarsa | Saya mengirim data pengajuan ke endpoint insert customer | Sistem menolak permintaan dengan kode 401 dan pesan "Token expired" | Draft |
| AC-54.04 | Data pengajuan tidak valid | Saya seorang Tim IT mitra dengan token valid | Saya mengirim data pengajuan dengan NIK 15 digit | Sistem menolak permintaan dengan kode 400 dan daftar error berisi "ID card number must be 16 digits"<br>AND tidak ada pengajuan yang dibuat | Draft |
| AC-54.05 | Pengiriman ulang data yang sama tidak membuat pengajuan ganda | Saya seorang Tim IT mitra dengan token valid<br>AND pengajuan dengan reference number mitra "MTR-0001" sudah diterima | Saya mengirim ulang data dengan reference number "MTR-0001" | Sistem mengembalikan Loan ID yang sama dengan pesan "Application already received"<br>AND tidak ada pengajuan baru yang dibuat | Draft |

## US-55: Mencatat Pembayaran Biaya Appraisal

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Customer Service | mengunggah bukti bayar dan mencatat nominal biaya appraisal pengajuan KPR | appraiser hanya mengerjakan pengajuan yang biaya appraisal-nya sudah dibayar |

### Acceptance Criteria US-55

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-55.01 | Mencatat pembayaran appraisal | Saya seorang Customer Service<br>AND saya berada di halaman "Application LKN - KPR"<br>AND pengajuan "20102026KPR0000041" berstatus "Need Survey" | Saya mengklik tombol "Edit" pada baris "20102026KPR0000041"<br>AND saya membuka step "Appraisal"<br>AND saya memilih file bukti bayar "bukti.jpg"<br>AND saya mengisi "Appraisal Fee" dengan "750.000"<br>AND saya mengklik tombol "Submit Payment" | Sistem menampilkan pesan "Appraisal payment recorded"<br>AND status pengajuan di daftar menjadi "Waiting Appraisal" | Draft |
| AC-55.02 | Nominal biaya appraisal kosong | Saya seorang Customer Service<br>AND saya berada di halaman "Appraisal Payment" | Saya memilih file bukti bayar tanpa mengisi "Appraisal Fee"<br>AND saya mengklik tombol "Submit Payment" | Sistem menampilkan pesan "Appraisal fee is required" | Draft |
| AC-55.03 | Biaya appraisal 0 | Saya seorang Customer Service<br>AND saya berada di halaman "Appraisal Payment" | Saya mengisi "Appraisal Fee" dengan "0"<br>AND saya mengklik tombol "Submit Payment" | Sistem menampilkan pesan "Appraisal fee must be greater than 0" | Draft |
| AC-55.04 | Surveyor tidak bisa mencatat pembayaran | Saya seorang Surveyor<br>AND saya berada di halaman "Appraisal Payment"<br>AND pembayaran appraisal belum dicatat | Saya membuka step "Appraisal" | Sistem menampilkan catatan "Payment of the appraisal fee must be completed before filling out the appraisal form. Only Customer Service can record the payment" tanpa form unggah bukti bayar | Draft |

## US-56: Mengisi Laporan Kunjungan Nasabah Mikro

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Surveyor | mencatat hasil kunjungan, kondisi usaha, keuangan rumah tangga, dan foto survey untuk pengajuan mikro | data faktual calon nasabah tervalidasi sebelum penilaian kredit |

### Acceptance Criteria US-56

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-56.01 | Submit LKN mikro lengkap | Saya seorang Surveyor<br>AND saya berada di halaman "Application LKN - Mikro"<br>AND saya sudah mengambil tugas pengajuan "20102026KUR0000012" | Saya mengklik tombol "Edit" pada baris tersebut<br>AND saya mengisi Survey Date, Surveyor, Invitation Date, Meet Person, Relation<br>AND saya mengisi data lokasi usaha, pendapatan usaha, biaya usaha, pendapatan dan biaya rumah tangga<br>AND saya mengunggah 3 foto survey<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Survey submitted"<br>AND pengajuan hilang dari antrean LKN dan langkah saat ini menjadi modul berikutnya di rute | Draft |
| AC-56.02 | Field wajib kunjungan kosong | Saya seorang Surveyor<br>AND saya berada di halaman "Application LKN Detail" | Saya membiarkan "Survey Date" dan "Meet Person" kosong<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong | Draft |
| AC-56.03 | Menyimpan LKN sebagai draft | Saya seorang Surveyor<br>AND saya berada di halaman "Application LKN Detail" | Saya mengisi sebagian data kunjungan<br>AND saya mengklik tombol "Save as Draft" | Sistem menampilkan pesan "Survey saved as draft"<br>AND pengajuan tetap di antrean LKN dengan status "Draft" | Draft |
| AC-56.04 | Tanggal survey di masa depan | Saya seorang Surveyor<br>AND saya berada di halaman "Application LKN Detail"<br>AND hari ini 20-10-2026 | Saya mengisi "Survey Date" dengan "21-10-2026"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Survey date must not be in the future" | Draft |
| AC-56.05 | Menghapus foto survey | Saya seorang Surveyor<br>AND saya berada di halaman "Application LKN Detail"<br>AND terdapat foto "survey_rumah.jpg" | Saya mengklik ikon hapus pada "survey_rumah.jpg"<br>AND saya mengklik tombol "Yes" di konfirmasi | Sistem menghapus foto dari daftar foto survey | Draft |

## US-57: Mengisi Laporan Kunjungan dan Appraisal KPR

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Surveyor | mencatat hasil kunjungan dan penilaian properti agunan untuk pengajuan KPR | nilai agunan properti diketahui sebelum keputusan kredit |

### Acceptance Criteria US-57

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-57.01 | Submit LKN dan appraisal KPR | Saya seorang Surveyor<br>AND saya berada di halaman "Application LKN - KPR"<br>AND pengajuan "20102026KPR0000041" berstatus "Waiting Appraisal" | Saya mengisi form LKN KPR<br>AND saya mengklik tombol "Next"<br>AND saya mengisi Appraiser Name, Appraisal Date, Property Type, Appraisal Method, Market Value "850.000.000", Liquidation Value "680.000.000"<br>AND saya mengunggah foto properti<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Survey submitted"<br>AND langkah saat ini menjadi modul berikutnya di rute KPR | Draft |
| AC-57.02 | Form appraisal terkunci sebelum biaya dibayar | Saya seorang Surveyor<br>AND saya berada di halaman "Application LKN - KPR"<br>AND pengajuan berstatus "Need Survey" | Saya mengisi form LKN KPR<br>AND saya mengklik tombol "Next" | Sistem menampilkan catatan "Payment of the appraisal fee must be completed before filling out the appraisal form. Only Customer Service can record the payment" | Draft |
| AC-57.03 | Nilai likuidasi melebihi nilai pasar | Saya seorang Surveyor<br>AND saya berada di halaman "Appraisal" | Saya mengisi Market Value "850.000.000" dan Liquidation Value "900.000.000"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Liquidation value must not exceed market value" | Draft |
| AC-57.04 | Nilai likuidasi sama dengan nilai pasar diterima | Saya seorang Surveyor<br>AND saya berada di halaman "Appraisal" | Saya mengisi Market Value "850.000.000" dan Liquidation Value "850.000.000" serta field wajib lain<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Survey submitted" | Draft |

## US-58: Mengambil dan Melepas Tugas dari Antrean

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Pengguna dengan langkah kerja manual | mengambil tugas pengajuan dari antrean sebelum mengerjakannya dan melepasnya bila batal | satu pengajuan tidak dikerjakan dua orang sekaligus |

### Acceptance Criteria US-58

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-58.01 | Mengambil tugas | Saya seorang Verifikator<br>AND saya berada di halaman "Verification Document"<br>AND pengajuan "20102026KTA0000013" belum diambil siapa pun | Saya mengklik tombol "Assign to Me" pada baris tersebut | Sistem menampilkan nama saya di kolom "Assigned To"<br>AND tombol "Proceed" tampil untuk saya | Draft |
| AC-58.02 | Tugas milik orang lain tidak bisa dikerjakan | Saya seorang Verifikator "veri.02"<br>AND saya berada di halaman "Verification Document"<br>AND pengajuan "20102026KTA0000013" sudah diambil "veri.01" | Saya melihat baris tersebut | Sistem menampilkan "veri.01" di kolom "Assigned To" tanpa tombol "Assign to Me" dan "Proceed" untuk saya | Draft |
| AC-58.03 | Melepas tugas | Saya seorang Verifikator<br>AND saya berada di halaman "Verification Document"<br>AND pengajuan "20102026KTA0000013" sedang saya ambil | Saya mengklik tombol "Release Me" pada baris tersebut | Sistem mengosongkan kolom "Assigned To" dan tugas bisa diambil Verifikator lain | Draft |
| AC-58.04 | Dua pengguna mengambil tugas pada saat bersamaan | Saya seorang Verifikator<br>AND saya berada di halaman "Verification Document"<br>AND Verifikator lain mengambil tugas yang sama beberapa detik sebelum saya | Saya mengklik tombol "Assign to Me" | Sistem menampilkan pesan "This task has already been assigned to veri.01" | Draft |
| AC-58.05 | Supervisor melepas tugas yang tertahan | Saya seorang Supervisor<br>AND saya berada di halaman "Verification Document"<br>AND tugas "20102026KTA0000013" diambil "veri.01" yang sedang cuti | Saya mengklik tombol "Release" pada baris tersebut<br>AND saya mengklik tombol "Yes" | Sistem mengosongkan kolom "Assigned To" dan audit trail mencatat pelepasan oleh saya | Draft |
| AC-58.06 | Melepas tugas yang bukan milik saya | Saya seorang Verifikator "veri.02"<br>AND saya berada di halaman "Verification Document"<br>AND tugas "20102026KTA0000013" diambil "veri.01" | Saya melihat baris tersebut | Sistem tidak menampilkan tombol "Release Me" untuk saya | Draft |

## US-59: Mendapatkan Hasil Pengecekan Duplikasi Otomatis

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Risk Manager | mendapatkan hasil pengecekan duplikasi setiap pengajuan terhadap data nasabah yang sudah ada | pengajuan ganda teridentifikasi sejak awal proses |

### Acceptance Criteria US-59

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-59.01 | Hasil dedup dan langkah berikutnya sesuai matriks | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND Dedup Matrix sudah disetujui | Saya membuka riwayat proses pengajuan yang baru melewati modul Dedup | Refer to MRTM Rows: TRM_DDP_001 through TRM_DDP_006 for comprehensive logic combinations. | Draft |
| AC-59.02 | Layanan dedup gagal | Saya seorang Admin Operasional<br>AND saya berada di halaman "Process Monitoring"<br>AND modul Dedup gagal karena gangguan teknis | Saya mencari Loan ID pengajuan tersebut | Sistem menampilkan pengajuan dengan status langkah "Error" dan pesan error dari modul Dedup | Draft |

Catatan: AC-59.01 mengikuti Asumsi A-02.

### MRTM US-59

| User Story ID | Acceptance Criteria ID | User | Test Case ID | NIK | Full Name ID | DOB | POB | Mother Maiden Name | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|---|---|
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_001 | Match | Match | Match | Match | Match | [-] | Dedup = Match; langkah berikutnya Verification Document (Dukcapil dilewati) |
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_002 | Match | Fuzzy | Match | Match | Fuzzy | [-] | Dedup = Review; masuk antrean Prescreen Dedup |
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_003 | UnMatch | UnMatch | [ANY] | [ANY] | [ANY] | [-] | Dedup = UnMatch; langkah berikutnya Dukcapil |
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_004 | Match | UnMatch | UnMatch | UnMatch | UnMatch | NIK sama, identitas lain beda | Dedup = Review; masuk antrean Prescreen Dedup |
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_005 | [-] | [ANY] | [ANY] | [ANY] | [ANY] | NIK kosong | Dedup = Skip; diperlakukan sebagai UnMatch, langkah berikutnya Dukcapil |
| US_59 | AC_59.01 | Risk Manager | TRM_DDP_006 | [ANY] | [ANY] | [ANY] | [ANY] | [ANY] | Modul Dedup dimatikan di rute produk | Dedup tidak dijalankan; riwayat mencatat "Skipped - not in route" |

## US-60: Meninjau Hasil Duplikasi

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Verifikator | membandingkan pengajuan baru dengan data nasabah yang mirip lalu memutuskan Match atau UnMatch | keputusan duplikasi yang meragukan diambil manusia, bukan ditebak sistem |

### Acceptance Criteria US-60

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-60.01 | Memutuskan Match | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Dedup"<br>AND saya sudah mengambil tugas "20102026KTA0000013" dengan hasil Dedup Review | Saya mengklik tombol "Review"<br>AND saya memilih "Match" di dropdown "Final Outcome"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Review submitted"<br>AND pengajuan hilang dari Prescreen Dedup dan langkah saat ini menjadi "Verification Document" | Draft |
| AC-60.02 | Memutuskan UnMatch | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Dedup Detail" | Saya memilih "UnMatch" di dropdown "Final Outcome"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Review submitted"<br>AND langkah saat ini menjadi "Dukcapil" | Draft |
| AC-60.03 | Melihat data pembanding | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Dedup"<br>AND pengajuan mirip dengan 7 data nasabah lama | Saya mengklik tombol "Review" | Sistem menampilkan data pengajuan baru berdampingan dengan 7 data pembanding beserta kolom yang cocok ditandai, dengan paging 5 data per halaman | Draft |
| AC-60.04 | Submit tanpa Final Outcome | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Dedup Detail" | Saya mengklik tombol "Submit" tanpa memilih "Final Outcome" | Sistem menampilkan pesan "Final outcome is required" | Draft |
| AC-60.05 | Tugas dilepas setelah Final Outcome dipilih tetapi belum disubmit | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Dedup Detail"<br>AND saya sudah memilih "Match" tetapi belum mengklik Submit | Saya mengklik tombol "Release Me"<br>AND saya mengklik tombol "Yes" | Sistem melepas tugas tanpa menyimpan pilihan "Match" dan pengajuan kembali ke antrean dengan hasil Dedup Review | Draft |

Catatan: AC-60.01, AC-60.02 mengikuti Asumsi A-02.

## US-61: Mendapatkan Hasil Verifikasi Dukcapil Otomatis

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Risk Manager | mendapatkan hasil pencocokan identitas pemohon dengan data kependudukan | identitas palsu atau salah ketik terdeteksi sebelum penilaian kredit |

### Acceptance Criteria US-61

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-61.01 | Hasil Dukcapil sesuai matriks | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND bobot nama 60%, nama ibu 40%, ambang Passed 0,90, Review 0,75 | Saya membuka riwayat proses pengajuan yang baru melewati modul Dukcapil | Refer to MRTM Rows: TRM_DKC_001 through TRM_DKC_008 for comprehensive logic combinations. | Draft |
| AC-61.02 | Layanan Dukcapil tidak merespons | Saya seorang Admin Operasional<br>AND saya berada di halaman "Process Monitoring"<br>AND layanan Dukcapil tidak merespons dalam 30 detik | Saya mencari Loan ID pengajuan tersebut | Sistem menampilkan langkah "Dukcapil" dengan status "Error" dan pesan "Dukcapil service timeout" | Draft |

Catatan: AC-61.01 mengikuti Asumsi A-03.

### MRTM US-61

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

## US-62: Meninjau Hasil Dukcapil

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Verifikator | memutuskan Pass, Fail, atau meneruskan ke Supervisor untuk hasil Dukcapil yang perlu ditinjau | data kependudukan yang meragukan diputuskan secara terkontrol |

### Acceptance Criteria US-62

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-62.01 | Memutuskan Pass | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Dukcapil"<br>AND saya sudah mengambil tugas dengan hasil Dukcapil Review | Saya mengklik tombol "Review"<br>AND saya memilih "Pass" di "Decision"<br>AND saya mengisi "Notes" dengan "Beda ejaan nama"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Review submitted"<br>AND langkah saat ini menjadi "Verification Document" | Draft |
| AC-62.02 | Meneruskan ke Supervisor | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Dukcapil Detail" | Saya memilih "Review" di "Decision"<br>AND saya mengisi "Notes"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Review submitted"<br>AND pengajuan tampil di antrean "Supervisor Review" dengan status "Manual Verification" | Draft |
| AC-62.03 | Memutuskan Fail | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Dukcapil Detail" | Saya memilih "Fail" di "Decision"<br>AND saya mengisi "Notes" dengan "Nama ibu tidak cocok"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Review submitted"<br>AND pengajuan berstatus "Finish" dengan alasan "Dukcapil review failed" | Draft |
| AC-62.04 | Keputusan tanpa catatan | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Dukcapil Detail" | Saya memilih "Fail" tanpa mengisi "Notes"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Notes are required" | Draft |
| AC-62.05 | Catatan melebihi 500 karakter | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Dukcapil Detail" | Saya memilih "Pass"<br>AND saya mengisi "Notes" dengan 501 karakter<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Notes must not exceed 500 characters" | Draft |

Catatan: AC-62.01 mengikuti Asumsi A-06.

## US-63: Memutuskan Review Dukcapil Tingkat Supervisor

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Supervisor | memberi keputusan akhir untuk hasil Dukcapil yang diteruskan Verifikator | kasus identitas yang sulit diputuskan pejabat berwenang |

### Acceptance Criteria US-63

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-63.01 | Meloloskan pengajuan | Saya seorang Supervisor<br>AND saya berada di halaman "Supervisor Review"<br>AND terdapat pengajuan berstatus "Manual Verification" | Saya mengklik tombol "Review"<br>AND saya memilih "Pass / Skip Review"<br>AND saya mengisi "Notes"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Review submitted"<br>AND langkah saat ini menjadi "Verification Document" | Draft |
| AC-63.02 | Menggagalkan pengajuan | Saya seorang Supervisor<br>AND saya berada di halaman "Supervisor Review Detail" | Saya memilih "Fail"<br>AND saya mengisi "Notes"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Review submitted"<br>AND pengajuan berstatus "Finish" dengan alasan "Dukcapil supervisor review failed" | Draft |
| AC-63.03 | Verifikator tidak bisa membuka antrean Supervisor | Saya seorang Verifikator<br>AND saya berada di halaman "Dashboard" | Saya mengetik alamat halaman "Supervisor Review" di address bar browser | Sistem menampilkan pesan "You do not have access to this page" | Draft |
| AC-63.04 | Keputusan tanpa catatan | Saya seorang Supervisor<br>AND saya berada di halaman "Supervisor Review Detail" | Saya memilih "Fail" tanpa mengisi "Notes"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Notes are required" | Draft |
| AC-63.05 | Supervisor yang sama dengan Verifikator pengaju | Saya seorang Supervisor "sup.01" yang juga meneruskan pengajuan ini sebagai Verifikator<br>AND saya berada di halaman "Supervisor Review" | Saya membuka detail pengajuan tersebut | Sistem menampilkan keterangan "You cannot review an application you escalated" tanpa tombol keputusan | Draft |

Catatan: AC-63.05 mengikuti Asumsi A-14.

## US-64: Memverifikasi Dokumen Pengajuan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Verifikator | mencocokkan setiap dokumen yang diunggah dengan data pengajuan | keputusan kredit tidak didasarkan pada dokumen yang tidak sesuai |

### Acceptance Criteria US-64

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-64.01 | Semua dokumen Match | Saya seorang Verifikator<br>AND saya berada di halaman "Verification Document"<br>AND saya sudah mengambil tugas "20102026KTA0000013" dengan 7 dokumen | Saya mengklik tombol "Proceed to Verification"<br>AND saya memilih "Match" untuk 7 dokumen<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Verification submitted"<br>AND langkah saat ini menjadi modul berikutnya di rute | Draft |
| AC-64.02 | Ada dokumen Not Match | Saya seorang Verifikator<br>AND saya berada di halaman "Verification Detail" | Saya memilih "Not Match" untuk dokumen "NPWP"<br>AND saya mengisi "Remarks" dengan "Nama di NPWP tidak sesuai KTP"<br>AND saya memilih "Match" untuk dokumen lain<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Verification submitted"<br>AND pengajuan kembali ke Sales dengan status "Draft" dan catatan "Nama di NPWP tidak sesuai KTP" pada dokumen NPWP | Draft |
| AC-64.03 | Not Match tanpa remarks | Saya seorang Verifikator<br>AND saya berada di halaman "Verification Detail" | Saya memilih "Not Match" untuk dokumen "NPWP" tanpa mengisi "Remarks"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Remarks are required for Not Match documents" | Draft |
| AC-64.04 | Verifikasi sebagian disimpan | Saya seorang Verifikator<br>AND saya berada di halaman "Verification Detail" | Saya memilih status untuk 4 dari 7 dokumen<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Verification saved"<br>AND pengajuan tetap di antrean saya dengan 4 status tersimpan | Draft |
| AC-64.05 | Pratinjau dokumen | Saya seorang Verifikator<br>AND saya berada di halaman "Verification Detail" | Saya mengklik nama dokumen "KTP" | Sistem menampilkan pratinjau dokumen "KTP" di samping daftar dokumen | Draft |

## US-65: Mendapatkan Hasil Fraud Check Otomatis

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Risk Manager | mendapatkan hasil fraud check setiap pengajuan berdasarkan daftar hitam, alamat IP, dan frekuensi pengajuan | pengajuan penipuan tertahan dan pelakunya tercatat |

### Acceptance Criteria US-65

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-65.01 | Hasil fraud check sesuai matriks | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND Fraud Matrix sudah disetujui | Saya membuka riwayat proses pengajuan yang baru melewati modul Fraud | Refer to MRTM Rows: TRM_FRD_001 through TRM_FRD_006 for comprehensive logic combinations. | Draft |
| AC-65.02 | Pengajuan dari channel tanpa IP | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND pengajuan masuk melalui Upload Excel tanpa data IP pemohon | Saya membuka riwayat proses modul Fraud | Sistem menampilkan pengecekan IP dengan status "Not applicable" dan hasil hanya dari blacklist serta frekuensi | Draft |

Catatan: AC-65.01 mengikuti Asumsi A-04.

### MRTM US-65

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Blacklist | Kondisi IP | Jumlah Pengajuan Nama yang Sama | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|
| US_65 | AC_65.01 | Risk Manager | TRM_FRD_001 | Ada di blacklist | [ANY] | [ANY] | [-] | High Fraud Potential; pengajuan berstatus Finish |
| US_65 | AC_65.01 | Risk Manager | TRM_FRD_002 | Tidak | Normal | 4 pengajuan/hari | Batas 3 pengajuan per hari | High Fraud Potential; pengajuan berstatus Finish dan data pemohon masuk blacklist |
| US_65 | AC_65.01 | Risk Manager | TRM_FRD_003 | Tidak | Normal | 3 pengajuan/hari | Tepat di batas | Clean; lanjut ke modul berikutnya |
| US_65 | AC_65.01 | Risk Manager | TRM_FRD_004 | Tidak | VPN/Proxy | 1 | [-] | Suspicious; masuk antrean Prescreen Fraud |
| US_65 | AC_65.01 | Risk Manager | TRM_FRD_005 | Tidak | Lokasi IP beda domisili KTP | 1 | [-] | Suspicious; masuk antrean Prescreen Fraud |
| US_65 | AC_65.01 | Risk Manager | TRM_FRD_006 | Tidak | Normal | 1 | [-] | Clean; lanjut ke modul berikutnya |

## US-66: Meninjau Pengajuan Mencurigakan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Verifikator | meninjau pengajuan berstatus Suspicious lalu meloloskan atau menolaknya | pengajuan sah tidak tertolak hanya karena sinyal teknis seperti VPN |

### Acceptance Criteria US-66

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-66.01 | Meloloskan pengajuan Suspicious | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Fraud"<br>AND saya sudah mengambil tugas dengan hasil Fraud Suspicious karena VPN | Saya mengklik tombol "Review"<br>AND saya memilih "Clear"<br>AND saya mengisi "Notes" dengan "Nasabah memakai VPN kantor, terverifikasi via telepon"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Review submitted"<br>AND langkah saat ini menjadi modul berikutnya di rute | Draft |
| AC-66.02 | Menolak dan memasukkan ke blacklist | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Fraud Detail" | Saya memilih "Reject and Blacklist"<br>AND saya mengisi "Notes"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Review submitted"<br>AND pengajuan berstatus "Finish" dan data pemohon tercatat di blacklist | Draft |
| AC-66.03 | Keputusan tanpa catatan | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Fraud Detail" | Saya memilih "Clear" tanpa mengisi "Notes"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Notes are required" | Draft |
| AC-66.04 | Pemohon yang sama di pengajuan lain ikut ditandai | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Fraud Detail"<br>AND pemohon punya pengajuan lain yang sedang On Progress | Saya memilih "Reject and Blacklist"<br>AND saya mengisi "Notes"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Review submitted"<br>AND pengajuan lain milik pemohon yang sama ditandai "Blacklisted applicant" di Application Inquiry | Draft |

Catatan: AC-66.01 mengikuti Asumsi A-04.

## US-67: Mendapatkan Hasil RAC dan Scoring Otomatis

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Risk Manager | mendapatkan hasil kriteria penerimaan risiko dan skor kredit setiap pengajuan beserta rinciannya | penilaian kelayakan kredit objektif dan bisa dijelaskan |

### Acceptance Criteria US-67

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-67.01 | Hasil scoring lulus | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND model scoring KTA aktif dengan Constant 200 dan Cut Off 430 | Saya mengklik langkah "Scoring" di timeline pengajuan "20102026KTA0000013" | Sistem menampilkan Total Score 470, Cut Off 430, hasil "Pass", dan daftar kriteria yang terpenuhi | Draft |
| AC-67.02 | Kriteria wajib RAC tidak terpenuhi | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND pengajuan Requested Limit 200.000.000, tenor 36 bulan, bunga efektif 12% p.a. (angsuran 6.642.862), penghasilan 2.000.000, DBR max 40% | Saya mengklik langkah "RAC" di timeline | Sistem menampilkan hasil "Fail" dengan alasan "Installment to Income Ratio 332% exceeds DBR max 40%" | Draft |
| AC-67.03 | Rasio angsuran tepat di DBR max | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND rasio angsuran terhadap penghasilan pengajuan tepat 40% dan DBR max 40% | Saya mengklik langkah "RAC" di timeline | Sistem menampilkan kriteria kemampuan bayar "Pass" | Draft |
| AC-67.04 | Produk tanpa model scoring aktif | Saya seorang Admin Operasional<br>AND saya berada di halaman "Process Monitoring"<br>AND produk KPR Subsidi belum punya model scoring aktif | Saya mencari pengajuan KPR Subsidi yang tertahan di modul Scoring | Sistem menampilkan langkah "Scoring" berstatus "Error" dengan pesan "No active scoring model for product KPR Subsidi" | Draft |

Catatan: AC-67.02 mengikuti Asumsi A-26.

## US-68: Mendapatkan Hasil Kolektibilitas SLIK

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Risk Manager | mendapatkan kolektibilitas kredit pemohon di lembaga keuangan lain | riwayat tunggakan pemohon ikut menentukan keputusan kredit |

### Acceptance Criteria US-68

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-68.01 | Kolektibilitas lancar | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND SLIK mengembalikan kolektibilitas 1 | Saya mengklik langkah "SLIK" di timeline | Sistem menampilkan "Collectibility 1 - Good" | Draft |
| AC-68.02 | Arti kolektibilitas SLIK sesuai matriks | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow" | Saya mengklik langkah "SLIK" di timeline pengajuan sesuai baris MRTM | Refer to MRTM Rows: TRM_SLK_001 through TRM_SLK_006 for comprehensive logic combinations. | Draft |

### MRTM US-68

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Kolektibilitas dari SLIK | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_001 | 1 | [-] | Collectibility 1 - Good |
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_002 | 2 | [-] | Collectibility 2 - Fair |
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_003 | 3 | [-] | Collectibility 3 - Poor |
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_004 | 5 | Nilai tertinggi | Collectibility 5 - Poor |
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_005 | [-] | Tidak ada riwayat kredit | No credit history |
| US_68 | AC_68.02 | Risk Manager | TRM_SLK_006 | 6 | Nilai di luar rentang dari layanan | Langkah SLIK berstatus "Error" dengan pesan "Invalid collectibility value: 6" |

## US-69: Mendapatkan Keputusan Awal Go atau NotGo

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Risk Manager | mendapatkan keputusan awal pengajuan dari gabungan hasil seluruh modul penilaian | pengajuan yang tidak layak berhenti sebelum memakan waktu approver |

### Acceptance Criteria US-69

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-69.01 | Keputusan Go | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND hasil Dedup UnMatch, Dukcapil Passed, Fraud Clean, RAC Pass, Scoring Pass, SLIK Collect 1 | Saya mengklik langkah "Decision" di timeline | Sistem menampilkan "Go" beserta baris Decision Matrix yang dipakai<br>AND langkah berikutnya sesuai rute (SIKP atau Approval) | Draft |
| AC-69.02 | Keputusan NotGo | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND hasil RAC Fail | Saya mengklik langkah "Decision" di timeline | Sistem menampilkan "NotGo"<br>AND pengajuan masuk antrean "Recontest" dan email penolakan terkirim ke pemohon | Draft |
| AC-69.03 | Modul yang dilewati rute dianggap Skip | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND rute produk KTA mematikan modul SLIK | Saya mengklik langkah "Decision" di timeline | Sistem menampilkan SLIK bernilai "Skip" pada kombinasi yang dipakai Decision Matrix | Draft |

Catatan: AC-69.02 mengikuti Asumsi A-07.

## US-70: Mendapatkan Hasil Pengecekan SIKP

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Risk Manager | mendapatkan status pemohon KUR di Sistem Informasi Kredit Program | KUR disalurkan tepat sasaran dan tidak tumpang tindih dengan KUR di bank lain |

### Acceptance Criteria US-70

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-70.01 | Pemohon belum punya KUR aktif | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND pengajuan KUR Requested Limit 100.000.000, batas SIKP 50.000.000<br>AND SIKP mengembalikan Days Remaining 0 | Saya mengklik langkah "SIKP" di timeline | Sistem menampilkan "SIKP Go - no active KUR at other banks"<br>AND langkah berikutnya "Approval" | Draft |
| AC-70.02 | Pemohon masih punya KUR aktif | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND SIKP mengembalikan Days Remaining 120 | Saya mengklik langkah "SIKP" di timeline | Sistem menampilkan "SIKP NotGo - active KUR found (120 days remaining)"<br>AND pengajuan masuk antrean "Recontest" | Draft |
| AC-70.03 | Limit tepat di batas SIKP | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND pengajuan KUR Requested Limit 50.000.000, batas SIKP 50.000.000 | Saya membuka timeline pengajuan | Sistem menampilkan langkah "SIKP" berstatus "Skipped - condition not met" | Draft |
| AC-70.04 | Limit satu rupiah di atas batas SIKP | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND pengajuan KUR Requested Limit 50.000.001, batas SIKP 50.000.000 | Saya membuka timeline pengajuan | Sistem menampilkan langkah "SIKP" dijalankan dengan hasilnya | Draft |

Catatan: AC-70.01, AC-70.03, AC-70.04 mengikuti Asumsi A-19.

## US-71: Memproses Ulang Pengajuan yang Ditolak

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Risk Manager | memproses ulang pengajuan NotGo atau gagal pencairan setelah profil diperbaiki, atau mengakhirinya | pengajuan yang layak setelah perbaikan tidak perlu dibuat ulang dari awal |

### Acceptance Criteria US-71

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-71.01 | Recontest pengajuan NotGo | Saya seorang Risk Manager<br>AND saya berada di halaman "Recontest"<br>AND pengajuan "20102026KTA0000013" NotGo karena RAC | Saya mengklik tombol "Recontest" pada baris tersebut<br>AND saya mengisi "Reason" dengan "Limit diturunkan menjadi 15.000.000 sesuai kesepakatan nasabah"<br>AND saya mengubah "Requested Limit" menjadi "15.000.000"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Application resubmitted for processing"<br>AND pengajuan memulai proses baru dari modul pertama setelah Data Entry dengan nomor recontest 1<br>AND riwayat proses sebelumnya tetap tersimpan | Draft |
| AC-71.02 | Mengakhiri pengajuan | Saya seorang Risk Manager<br>AND saya berada di halaman "Recontest" | Saya mengklik tombol "Finish" pada pengajuan<br>AND saya mengisi "Reason"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Application closed"<br>AND status pengajuan menjadi "Finish" | Draft |
| AC-71.03 | Recontest tanpa alasan | Saya seorang Risk Manager<br>AND saya berada di halaman "Recontest Detail" | Saya mengklik tombol "Submit" tanpa mengisi "Reason" | Sistem menampilkan pesan "Reason is required" | Draft |
| AC-71.04 | Batas maksimal recontest | Saya seorang Risk Manager<br>AND saya berada di halaman "Recontest"<br>AND pengajuan sudah di-recontest 3 kali dan batas recontest 3 | Saya melihat baris pengajuan tersebut | Sistem tidak menampilkan tombol "Recontest" dan menampilkan keterangan "Maximum recontest reached" | Draft |
| AC-71.05 | Recontest setelah pencairan gagal di core | Saya seorang Risk Manager<br>AND saya berada di halaman "Recontest"<br>AND pengajuan berstatus Recontest karena respons core "GAGAL" | Saya mengklik tombol "Recontest"<br>AND saya mengisi "Reason"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Application resubmitted for processing" | Draft |

Catatan: AC-71.01, AC-71.05 mengikuti Asumsi A-07.

## US-72: Menyetujui Pengajuan Sesuai Kewenangan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Approver | meninjau dan menyetujui pengajuan yang masuk antrean sesuai level kewenangan nominal | keputusan kredit diambil pejabat yang berwenang secara berjenjang |

### Acceptance Criteria US-72

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-72.01 | Approve pada level terakhir | Saya seorang Approver level 1 (final)<br>AND saya berada di halaman "Approval"<br>AND pengajuan KPR "20102026KPR0000041" sudah disetujui approver level 2 | Saya mengklik tombol "Detail" pada baris tersebut<br>AND saya mengisi "Approval Comments" dengan "Agunan memadai"<br>AND saya mengklik tombol "Approve"<br>AND saya mengklik tombol "Yes" di konfirmasi "Are you sure you want to approve this application?" | Sistem menampilkan pesan "Loan application is successfully approved"<br>AND struktur kredit dan jadwal angsuran terbentuk<br>AND dokumen SP3K terunduh<br>AND langkah saat ini menjadi "Epolis" | Draft |
| AC-72.02 | Approve pada level bawah meneruskan ke level berikutnya | Saya seorang Approver level 2<br>AND saya berada di halaman "Approval Detail"<br>AND pengajuan butuh 2 level approval | Saya mengisi "Approval Comments"<br>AND saya mengklik tombol "Approve"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Loan application is successfully approved"<br>AND pengajuan pindah ke antrean approver level 1 dan timeline approval menandai level 2 "Approved" | Draft |
| AC-72.03 | Approver level atas menunggu level bawah | Saya seorang Approver level 1<br>AND saya berada di halaman "Approval Detail"<br>AND approver level 2 belum memberi keputusan | Saya membuka detail pengajuan | Sistem menampilkan tombol "Approve", "Reject", dan "Return" dalam keadaan nonaktif dengan keterangan "Waiting for level 2 approval" | Draft |
| AC-72.04 | Approve tanpa komentar | Saya seorang Approver<br>AND saya berada di halaman "Approval Detail" | Saya mengklik tombol "Approve" tanpa mengisi "Approval Comments" | Sistem menampilkan pesan "Approval comments are required" | Draft |
| AC-72.05 | Penginput pengajuan tidak bisa menjadi approver | Saya seorang Approver "budi.cabang" yang juga menginput pengajuan "20102026KTA0000013"<br>AND saya berada di halaman "Approval" | Saya mencari pengajuan "20102026KTA0000013" | Sistem menampilkan pengajuan dengan keterangan "You cannot approve an application you submitted" tanpa tombol keputusan | Draft |
| AC-72.06 | Routing approval berdasarkan nominal sesuai matriks | Saya seorang Approver<br>AND saya berada di halaman "Approval"<br>AND level approval KPR Bandung: level 2 untuk 0 s.d. 500.000.000 (final), level 1 untuk 500.000.001 s.d. 2.000.000.000 (final) | Saya membuka antrean approval pengajuan sesuai baris MRTM | Refer to MRTM Rows: TRM_APV_001 through TRM_APV_005 for comprehensive logic combinations. | Draft |

Catatan: AC-72.05 mengikuti Asumsi A-14.

### MRTM US-72

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Produk | Cabang | Requested Limit | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|---|
| US_72 | AC_72.06 | Approver | TRM_APV_001 | KPR | 011 Bandung | 500.000.000 | [-] | Butuh approval level 2 saja |
| US_72 | AC_72.06 | Approver | TRM_APV_002 | KPR | 011 Bandung | 500.000.001 | [-] | Butuh approval level 2 lalu level 1 |
| US_72 | AC_72.06 | Approver | TRM_APV_003 | KPR | 011 Bandung | 2.000.000.000 | Batas atas | Butuh approval level 2 lalu level 1 |
| US_72 | AC_72.06 | Approver | TRM_APV_004 | KPR | 011 Bandung | 2.000.000.001 | Melebihi semua level | Langkah Approval berstatus "Error" dengan pesan "No approval level covers this amount" |
| US_72 | AC_72.06 | Approver | TRM_APV_005 | KPR | 012 Cimahi | 300.000.000 | Cabang tanpa setup approval | Langkah Approval berstatus "Error" dengan pesan "No approval setup for branch 012 and product KPR" |

## US-73: Menolak atau Mengembalikan Pengajuan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Approver | menolak pengajuan atau mengembalikannya ke Sales untuk diperbaiki dengan alasan | pengajuan yang tidak layak berhenti dan yang kurang lengkap diperbaiki tanpa dibuat ulang |

### Acceptance Criteria US-73

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-73.01 | Menolak pengajuan | Saya seorang Approver<br>AND saya berada di halaman "Approval Detail" | Saya mengisi "Approval Comments" dengan "Penghasilan tidak terverifikasi"<br>AND saya mengklik tombol "Reject"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Loan application has been rejected"<br>AND status pengajuan menjadi "Finish" dan email penolakan terkirim ke pemohon | Draft |
| AC-73.02 | Mengembalikan pengajuan ke Sales | Saya seorang Approver<br>AND saya berada di halaman "Approval Detail"<br>AND level saya mengizinkan aksi Return | Saya mengisi "Approval Comments" dengan "Lengkapi rekening koran bulan September"<br>AND saya mengklik tombol "Return"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Application returned to sales"<br>AND pengajuan kembali ke Sales berstatus "Draft" dengan komentar approver tampil di atas form | Draft |
| AC-73.03 | Tombol Return tidak tampil bila level tidak mengizinkan | Saya seorang Approver<br>AND saya berada di halaman "Approval Detail"<br>AND level saya tidak mencentang "Is Return" | Saya membuka detail pengajuan | Sistem tidak menampilkan tombol "Return" | Draft |
| AC-73.04 | Reject tanpa komentar | Saya seorang Approver<br>AND saya berada di halaman "Approval Detail" | Saya mengklik tombol "Reject" tanpa mengisi "Approval Comments" | Sistem menampilkan pesan "Approval comments are required" | Draft |
| AC-73.05 | Komentar melebihi 1.000 karakter | Saya seorang Approver<br>AND saya berada di halaman "Approval Detail" | Saya mengisi "Approval Comments" dengan 1.001 karakter<br>AND saya mengklik tombol "Reject" | Sistem menampilkan pesan "Approval comments must not exceed 1000 characters" | Draft |

Catatan: AC-73.02 mengikuti Asumsi A-21.

## US-74: Menyetujui Otomatis Pengajuan Bernilai Kecil

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Kepala Cabang | pengajuan Go dengan limit sampai batas auto approval produk disetujui tanpa antrean approver | pengajuan berisiko rendah cair lebih cepat dan approver fokus pada pengajuan besar |

### Acceptance Criteria US-74

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-74.01 | Pengajuan di bawah batas auto approval disetujui otomatis | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND produk KTA Limit Auto Approval 10.000.000<br>AND pengajuan Requested Limit 8.000.000 dengan Decision Go | Saya membuka timeline pengajuan | Sistem menampilkan langkah "Approval" berstatus "Auto Approved" dengan pelaku "System"<br>AND struktur kredit dan jadwal angsuran terbentuk<br>AND langkah saat ini "Epolis" | Draft |
| AC-74.02 | Limit tepat di batas auto approval | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND produk KTA Limit Auto Approval 10.000.000<br>AND pengajuan Requested Limit 10.000.000 dengan Decision Go | Saya membuka timeline pengajuan | Sistem menampilkan langkah "Approval" berstatus "Auto Approved"<br>AND langkah saat ini "Epolis" | Draft |
| AC-74.03 | Limit satu rupiah di atas batas auto approval | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND produk KTA Limit Auto Approval 10.000.000<br>AND pengajuan Requested Limit 10.000.001 dengan Decision Go | Saya membuka timeline pengajuan | Sistem menampilkan langkah "Approval" berstatus "Waiting Approval" di antrean approver | Draft |
| AC-74.04 | Pengajuan NotGo tidak diproses auto approval | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND pengajuan Requested Limit 5.000.000 dengan Decision NotGo | Saya membuka timeline pengajuan | Sistem menampilkan langkah "Recontest" dan langkah "Approval" tidak dijalankan | Draft |
| AC-74.05 | Limit auto approval 0 menonaktifkan auto approval | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND produk KPR Limit Auto Approval 0<br>AND pengajuan KPR Requested Limit 1.000.000 dengan Decision Go | Saya membuka timeline pengajuan | Sistem menampilkan langkah "Approval" berstatus "Waiting Approval" | Draft |

Catatan: AC-74.01, AC-74.02, AC-74.03 mengikuti Asumsi A-20.

## US-75: Mengajukan E-Polis Asuransi Kredit

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Admin Operasional | mengajukan polis asuransi untuk pengajuan yang sudah disetujui dengan mengisi nilai premi | pinjaman terlindungi asuransi sebelum dana dicairkan |

### Acceptance Criteria US-75

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-75.01 | Mengajukan e-polis | Saya seorang Admin Operasional<br>AND saya berada di halaman "Request Epolis"<br>AND saya sudah mengambil tugas "20102026KPR0000041" yang disetujui | Saya mengklik tombol "Request Epolis"<br>AND saya mengisi "IJK Value" dengan "7.225.000"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Epolis issued. Policy number: POL-2026-000123"<br>AND struktur kredit dihitung ulang dengan nilai asuransi 7.225.000<br>AND langkah saat ini menjadi "Validity Check" | Draft |
| AC-75.02 | Nilai IJK kosong | Saya seorang Admin Operasional<br>AND saya berada di halaman "Request Epolis Form" | Saya mengklik tombol "Submit" tanpa mengisi "IJK Value" | Sistem menampilkan pesan "IJK value is required" | Draft |
| AC-75.03 | Nilai IJK 0 | Saya seorang Admin Operasional<br>AND saya berada di halaman "Request Epolis Form" | Saya mengisi "IJK Value" dengan "0"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "IJK value must be greater than 0" | Draft |
| AC-75.04 | Layanan asuransi gagal | Saya seorang Admin Operasional<br>AND saya berada di halaman "Request Epolis Form"<br>AND layanan asuransi tidak merespons | Saya mengisi "IJK Value"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Insurance service is unavailable. Please try again later"<br>AND pengajuan tetap di antrean Request Epolis | Draft |

Catatan: AC-75.01 mengikuti Asumsi A-08, A-23.

## US-76: Memvalidasi Data Pencairan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Admin Operasional | memeriksa detail pencairan lalu menetapkan tanggal pencairan dan tanggal angsuran pertama | data yang dikirim ke core banking benar sebelum dana dicairkan |

### Acceptance Criteria US-76

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-76.01 | Data valid dengan tanggal pencairan besok | Saya seorang Admin Operasional<br>AND saya berada di halaman "Validity Check"<br>AND saya sudah mengambil tugas "20102026KPR0000041"<br>AND hari ini 20-10-2026<br>AND tanggal pengajuan e-polis 20-10-2026 | Saya mengklik tombol "Validity Check"<br>AND saya memeriksa Disbursement Detail<br>AND saya mengisi "Disbursement Date" dengan "21-10-2026"<br>AND saya mengklik tombol "Valid"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Disbursement data validated"<br>AND jadwal angsuran disesuaikan dengan First Installment Date<br>AND langkah saat ini menjadi "Print Akad" | Draft |
| AC-76.02 | Tanggal pencairan hari ini ditolak | Saya seorang Admin Operasional<br>AND saya berada di halaman "Validity Check Form"<br>AND hari ini 20-10-2026 | Saya mengisi "Disbursement Date" dengan "20-10-2026"<br>AND saya mengklik tombol "Valid" | Sistem menampilkan pesan "Disbursement date must be at least 1 day after today" | Draft |
| AC-76.03 | Tanggal pencairan sebelum tanggal e-polis ditolak | Saya seorang Admin Operasional<br>AND saya berada di halaman "Validity Check Form"<br>AND hari ini 20-10-2026<br>AND tanggal pengajuan e-polis 25-10-2026 | Saya mengisi "Disbursement Date" dengan "24-10-2026"<br>AND saya mengklik tombol "Valid" | Sistem menampilkan pesan "Disbursement date must not be earlier than the epolis date (25-10-2026)" | Draft |
| AC-76.04 | Data tidak valid | Saya seorang Admin Operasional<br>AND saya berada di halaman "Validity Check Form"<br>AND nomor rekening nasabah di Disbursement Detail salah | Saya mengklik tombol "Not Valid"<br>AND saya mengisi "Reason" dengan "Nomor rekening salah"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Disbursement data marked as not valid"<br>AND pengajuan kembali ke Sales berstatus "Draft" dengan catatan "Nomor rekening salah" | Draft |
| AC-76.05 | First Installment Date diubah | Saya seorang Admin Operasional<br>AND saya berada di halaman "Validity Check Form"<br>AND First Installment Date terisi 21-11-2026 | Saya mengubah "First Installment Date" menjadi "25-11-2026"<br>AND saya mengklik tombol "Valid"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Disbursement data validated"<br>AND semua tanggal jatuh tempo angsuran bergeser mengikuti tanggal 25 setiap bulan | Draft |

Catatan: AC-76.01, AC-76.02, AC-76.03 mengikuti Asumsi A-18.

## US-77: Mencetak Akad Kredit

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Admin Operasional | mencetak dokumen perjanjian kredit untuk ditandatangani nasabah | perikatan kredit sah sebelum dana dicairkan |

### Acceptance Criteria US-77

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-77.01 | Mencetak akad | Saya seorang Admin Operasional<br>AND saya berada di halaman "Print Akad"<br>AND saya sudah mengambil tugas "20102026KPR0000041" | Saya mengklik tombol "View Detail"<br>AND saya mengklik tombol "Print Akad"<br>AND saya memilih Payment Method, Bank Account No, Customer Account No, dan Risk Manager<br>AND saya mengklik tombol "Print" | Sistem mengunduh PDF "Surat Perjanjian Kredit" sesuai template aktif<br>AND langkah saat ini menjadi "Disbursement" dan pengajuan tampil di menu "Reprint Akad" | Draft |
| AC-77.02 | Field cetak wajib kosong | Saya seorang Admin Operasional<br>AND saya berada di halaman "Print Akad Form" | Saya mengklik tombol "Print" tanpa memilih "Risk Manager" | Sistem menampilkan pesan "This field is required" di bawah field "Risk Manager" | Draft |
| AC-77.03 | Template akad belum tersedia | Saya seorang Admin Operasional<br>AND saya berada di halaman "Print Akad Form"<br>AND template "AKAD-KPR" belum disetujui | Saya mengisi semua field<br>AND saya mengklik tombol "Print" | Sistem menampilkan pesan "Document template AKAD-KPR is not available" | Draft |

## US-78: Mencetak Ulang Akad Kredit

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Admin Operasional | mencetak ulang akad yang sudah pernah dicetak dengan data yang sama | dokumen yang hilang atau rusak bisa diganti tanpa mengubah perjanjian |

### Acceptance Criteria US-78

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-78.01 | Mencetak ulang akad | Saya seorang Admin Operasional<br>AND saya berada di halaman "Reprint Akad"<br>AND akad "20102026KPR0000041" sudah dicetak | Saya mengklik tombol "View Detail"<br>AND saya mengklik tombol "Reprint Akad"<br>AND saya mengklik tombol "Print" | Sistem mengunduh PDF yang isinya sama dengan cetakan pertama<br>AND audit trail mencatat cetak ulang oleh saya | Draft |
| AC-78.02 | Data cetak ulang tidak bisa diubah | Saya seorang Admin Operasional<br>AND saya berada di halaman "Reprint Akad Form" | Saya mengklik field "Customer Account No" | Sistem menampilkan field dalam keadaan tidak bisa diedit | Draft |
| AC-78.03 | Cetak ulang tidak mengubah langkah proses | Saya seorang Admin Operasional<br>AND saya berada di halaman "Reprint Akad"<br>AND pengajuan berada di langkah "Disbursement" | Saya mencetak ulang akad | Sistem tetap menampilkan langkah saat ini "Disbursement" | Draft |

## US-79: Mengirim Data Pencairan ke Core Banking

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Admin Operasional | membuat file data pencairan per pengajuan dalam format core banking | pencairan dieksekusi core banking tanpa penyuntingan file manual |

### Acceptance Criteria US-79

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-79.01 | Membuat file pencairan | Saya seorang Admin Operasional<br>AND saya berada di halaman "Disbursement"<br>AND saya sudah mengambil tugas "20102026KPR0000041" | Saya mengklik tombol "Disburse"<br>AND saya mengklik tombol "Yes" di konfirmasi | Sistem mengunduh file "20102026KPR0000041.json" berisi satu objek pengajuan dengan buss_unit "LB2", create_by "LOS", obj_code "HONVAR011"<br>AND langkah saat ini menjadi "Waiting Core Response" | Draft |
| AC-79.02 | Tenor melebihi batas core | Saya seorang Admin Operasional<br>AND saya berada di halaman "Disbursement"<br>AND pengajuan bertenor 36 bulan dan core FAST hanya menerima maksimal 24 bulan | Saya mengklik tombol "Disburse" | Sistem menampilkan pesan "Core banking accepts a maximum tenor of 24 months" | Draft |
| AC-79.03 | Tenor tepat 24 bulan diterima | Saya seorang Admin Operasional<br>AND saya berada di halaman "Disbursement"<br>AND pengajuan bertenor 24 bulan | Saya mengklik tombol "Disburse"<br>AND saya mengklik tombol "Yes" | Sistem mengunduh file pencairan dengan 24 baris angsuran | Draft |
| AC-79.04 | Data agunan kendaraan ikut terisi | Saya seorang Admin Operasional<br>AND saya berada di halaman "Disbursement"<br>AND pengajuan Kredit Agunan dengan agunan kendaraan | Saya mengklik tombol "Disburse"<br>AND saya mengklik tombol "Yes" | Sistem mengunduh file dengan field nosin, noka, no_polisi, warna, no_bpkb, obj_tahun, dan obj_price terisi dari data agunan | Draft |

Catatan: AC-79.01 mengikuti Asumsi A-09.

## US-80: Mencatat Respons Pencairan dari Core Banking

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Admin Operasional | melihat hasil pencairan yang dikirim core banking dan status akhir pengajuan | status pengajuan selalu sesuai hasil pencairan sebenarnya |

### Acceptance Criteria US-80

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-80.01 | Respons SUKSES | Saya seorang Admin Operasional<br>AND saya berada di halaman "Core Disbursement"<br>AND core mengirim respons "SUKSES" untuk "20102026KPR0000041" | Saya mencari Loan ID "20102026KPR0000041" | Sistem menampilkan respons "SUKSES" beserta file respons core<br>AND status pengajuan "Disbursed" dan langkah "Finish" | Draft |
| AC-80.02 | Respons GAGAL | Saya seorang Admin Operasional<br>AND saya berada di halaman "Core Disbursement"<br>AND core mengirim respons "GAGAL" untuk "20102026KPR0000041" | Saya mencari Loan ID "20102026KPR0000041" | Sistem menampilkan respons "GAGAL" beserta alasan dari core<br>AND pengajuan masuk antrean "Recontest" | Draft |
| AC-80.03 | Respons untuk Loan ID yang tidak menunggu respons | Saya seorang Admin Operasional<br>AND saya berada di halaman "Core Disbursement"<br>AND core mengirim respons untuk pengajuan yang sudah Finish | Saya membuka daftar respons core | Sistem menampilkan respons tersebut dengan status "Ignored - application not waiting for core response" | Draft |
| AC-80.04 | Respons ganda untuk pengajuan yang sama | Saya seorang Admin Operasional<br>AND saya berada di halaman "Core Disbursement"<br>AND core mengirim respons "SUKSES" dua kali untuk pengajuan yang sama | Saya membuka daftar respons core | Sistem menampilkan respons kedua dengan status "Duplicate - ignored"<br>AND status pengajuan tetap "Disbursed" | Draft |

Catatan: AC-80.02 mengikuti Asumsi A-07.

## US-81: Melihat Dashboard Ringkasan Pengajuan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Kepala Cabang | melihat jumlah pengajuan per status dan per langkah proses serta total pencairan per regional | hambatan proses dan pencapaian penyaluran terlihat setiap saat |

### Acceptance Criteria US-81

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-81.01 | Melihat dashboard semua produk | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Dashboard" | Saya membuka halaman "Dashboard" | Sistem menampilkan Total Applications, kartu Save as Draft, Submitted, GO, NOT GO, grafik Disbursement per regional, dan daftar Application State dengan jumlahnya | Draft |
| AC-81.02 | Menyaring dashboard per produk | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Dashboard" | Saya memilih "KPR" di dropdown "All Products" | Sistem menampilkan seluruh angka dan grafik hanya untuk produk KPR | Draft |
| AC-81.03 | Membuka daftar pengajuan dari kartu status | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Dashboard" | Saya mengklik kartu "NOT GO" | Sistem menampilkan halaman "Application Inquiry" dengan filter status NOT GO | Draft |
| AC-81.04 | Belum ada pengajuan | Saya seorang Kepala Cabang company baru<br>AND saya berada di halaman "Dashboard"<br>AND belum ada pengajuan | Saya membuka halaman "Dashboard" | Sistem menampilkan angka 0 pada semua kartu dan pesan "No disbursement data yet" pada grafik | Draft |
| AC-81.05 | Data dibatasi sesuai unit kerja | Saya seorang Kepala Cabang Bandung<br>AND saya berada di halaman "Dashboard" | Saya membuka halaman "Dashboard" | Sistem hanya menghitung pengajuan cabang Bandung | Draft |
| AC-81.06 | Reset filter | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Dashboard"<br>AND filter produk KPR aktif | Saya mengklik tombol "Reset Filter" | Sistem menampilkan dashboard untuk semua produk | Draft |
| AC-81.07 | Pengguna tanpa akses dashboard | Saya seorang QA tanpa akses menu Dashboard<br>AND saya berada di halaman "Login" | Saya login | Sistem menampilkan halaman pertama yang saya punya aksesnya dan menu "Dashboard" tidak tampil | Draft |

## US-82: Mengekspor Laporan Pengajuan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Kepala Cabang | mengunduh daftar pengajuan ke Excel berdasarkan periode, status, dan langkah proses | laporan penyaluran disusun tanpa merekap data manual |

### Acceptance Criteria US-82

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-82.01 | Mengekspor laporan | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Dashboard" | Saya mengklik tombol "Export Option"<br>AND saya memilih periode "01-10-2026" s.d. "31-10-2026", status "On Progress", state "Approval"<br>AND saya mengklik tombol "Export" | Sistem mengunduh file Excel berisi pengajuan sesuai filter dengan kolom Loan ID, Nama, Produk, Limit, Status, State, Tanggal | Draft |
| AC-82.02 | Periode tidak valid | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Export Option" | Saya memilih periode "31-10-2026" s.d. "01-10-2026"<br>AND saya mengklik tombol "Export" | Sistem menampilkan pesan "End date must be on or after start date" | Draft |
| AC-82.03 | Hasil melebihi 50.000 baris | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Export Option" | Saya memilih filter yang menghasilkan 50.001 baris<br>AND saya mengklik tombol "Export" | Sistem menampilkan pesan "Export is limited to 50,000 rows. Please narrow the filter" | Draft |
| AC-82.04 | Tidak ada data sesuai filter | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Export Option" | Saya memilih filter yang tidak menghasilkan data<br>AND saya mengklik tombol "Export" | Sistem menampilkan pesan "No data matches the selected filter" | Draft |

## US-83: Mencari dan Menyaring Daftar Pengajuan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Pengguna LOS | mencari pengajuan berdasarkan Loan ID atau nama dan menyaringnya per status, langkah, produk, dan tanggal | status pengajuan nasabah bisa dijawab cepat |

### Acceptance Criteria US-83

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-83.01 | Mencari berdasarkan nama tanpa membedakan huruf besar dan kecil | Saya seorang Sales<br>AND saya berada di halaman "Application Inquiry" | Saya mengetik "rudi" di field "Search" | Sistem menampilkan pengajuan yang Loan ID atau namanya mengandung "rudi", termasuk "RUDI HARTONO" | Draft |
| AC-83.02 | Menyaring berdasarkan langkah proses | Saya seorang Sales<br>AND saya berada di halaman "Application Inquiry" | Saya membuka filter<br>AND saya memilih "Approval" di "State"<br>AND saya mengklik tombol "Apply" | Sistem menampilkan hanya pengajuan yang berada di langkah Approval | Draft |
| AC-83.03 | Mengurutkan kolom | Saya seorang Sales<br>AND saya berada di halaman "Application Inquiry" | Saya mengklik header kolom "Modified Date" | Sistem mengurutkan daftar dari tanggal terbaru dan klik kedua mengurutkan dari tanggal terlama | Draft |
| AC-83.04 | Pencarian tanpa hasil | Saya seorang Sales<br>AND saya berada di halaman "Application Inquiry" | Saya mengetik "zzzz" di field "Search" | Sistem menampilkan pesan "No applications found" | Draft |
| AC-83.05 | Paging 20 baris per halaman | Saya seorang Sales<br>AND saya berada di halaman "Application Inquiry"<br>AND terdapat 41 pengajuan | Saya mengklik halaman "3" di pagination | Sistem menampilkan 1 pengajuan dan teks "41 items" | Draft |
| AC-83.06 | Daftar diperbarui saat langkah pengajuan berubah | Saya seorang Sales<br>AND saya berada di halaman "Application Inquiry"<br>AND pengajuan "20102026KTA0000013" tampil dengan state "Dedup" | Saya tetap berada di halaman "Application Inquiry" sampai modul Dedup selesai | Sistem memperbarui state pengajuan menjadi langkah berikutnya tanpa saya memuat ulang halaman | Draft |
| AC-83.07 | Rentang tanggal filter tidak valid | Saya seorang Sales<br>AND saya berada di halaman "Application Inquiry" | Saya membuka filter<br>AND saya memilih "Submitted Date" dari "31-10-2026" sampai "01-10-2026"<br>AND saya mengklik tombol "Apply" | Sistem menampilkan pesan "End date must be on or after start date" | Draft |

## US-84: Melihat Detail Pengajuan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Pengguna LOS | melihat seluruh data pengajuan dalam tab Detail, Personal, Spouse, Occupation, Business, LKN, Collateral, Document, Emergency Contact, Approval, dan History | semua pihak bekerja dari data pengajuan yang sama |

### Acceptance Criteria US-84

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-84.01 | Membuka detail pengajuan | Saya seorang Sales<br>AND saya berada di halaman "Application Inquiry" | Saya mengklik Loan ID "20102026KPR0000041" | Sistem menampilkan ringkasan Loan Number, Application Type, Loan Amount, Tenor Approved dan tab detail dengan tab "Detail" terbuka | Draft |
| AC-84.02 | Melihat dan mengunduh dokumen | Saya seorang Sales<br>AND saya berada di halaman "Application Detail - Document" | Saya mengklik ikon "Download" pada dokumen "KTP" | Sistem mengunduh file KTP dalam format PDF | Draft |
| AC-84.03 | Tab yang tidak relevan tidak tampil | Saya seorang Sales<br>AND saya berada di halaman "Application Detail"<br>AND pengajuan KTA pemohon belum kawin dan karyawan | Saya melihat daftar tab | Sistem tidak menampilkan tab "Spouse", "Business", "LKN", dan "Collateral" | Draft |
| AC-84.04 | Pengajuan company lain tidak bisa dibuka | Saya seorang Sales company "001" | Saya mengetik alamat detail pengajuan milik company "007" di address bar browser | Sistem menampilkan pesan "Application not found" | Draft |
| AC-84.05 | Loan ID tidak ada | Saya seorang Sales | Saya mengetik alamat detail dengan Loan ID "TIDAKADA" di address bar browser | Sistem menampilkan pesan "Application not found" | Draft |

## US-85: Melihat Riwayat Proses Pengajuan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Pengguna LOS | melihat urutan langkah yang sudah dilalui pengajuan beserta waktu, pelaku, hasil, dan lama tiap langkah | posisi dan hambatan setiap pengajuan bisa ditelusuri |

### Acceptance Criteria US-85

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-85.01 | Melihat timeline proses | Saya seorang Sales<br>AND saya berada di halaman "Application Detail" | Saya mengklik tombol "Workflow" | Sistem menampilkan timeline langkah (Data Entry, Dedup, Dukcapil, Verification, Fraud, RAC, Scoring, SLIK, Decision, Approval, Epolis, dan seterusnya) dengan Start Date, End Date, Aging (hari), pelaku, dan hasil<br>AND diagram rute versi yang dipakai pengajuan tampil dengan langkah saat ini disorot | Draft |
| AC-85.02 | Langkah yang dilewati rute ditandai | Saya seorang Sales<br>AND saya berada di halaman "Application Workflow"<br>AND rute KTA tidak memakai Survey | Saya melihat timeline | Sistem menampilkan langkah "Survey" dengan status "Skipped - not in route" | Draft |
| AC-85.03 | Riwayat recontest | Saya seorang Sales<br>AND saya berada di halaman "Application Workflow"<br>AND pengajuan pernah di-recontest 1 kali | Saya memilih "Recontest 1" di dropdown "Process" | Sistem menampilkan timeline proses recontest 1, sedangkan proses awal tetap bisa dipilih | Draft |
| AC-85.04 | Aging dihitung dalam hari kalender | Saya seorang Sales<br>AND saya berada di halaman "Application Workflow"<br>AND langkah Approval dimulai 20-10-2026 16:00 dan selesai 22-10-2026 09:00 | Saya melihat baris langkah Approval | Sistem menampilkan Aging "2" | Draft |
| AC-85.05 | Pengajuan Draft belum punya riwayat proses | Saya seorang Sales<br>AND saya berada di halaman "Application Detail"<br>AND pengajuan berstatus Draft | Saya mengklik tombol "Workflow" | Sistem menampilkan pesan "Process has not started. Submit the application to start the process" | Draft |

## US-86: Memantau dan Memulihkan Proses yang Gagal

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Admin Operasional | melihat pengajuan yang tertahan karena error modul otomatis lalu mengulang atau menghentikannya | pengajuan tidak macet tanpa diketahui saat layanan eksternal bermasalah |

### Acceptance Criteria US-86

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-86.01 | Mengulang langkah yang error | Saya seorang Admin Operasional<br>AND saya berada di halaman "Process Monitoring"<br>AND pengajuan "20102026KTA0000013" error di langkah Dukcapil dan layanan Dukcapil sudah pulih | Saya mengklik tombol "View Detail" pada baris tersebut<br>AND saya mengklik tombol "Retry" | Sistem menampilkan pesan "Step retried"<br>AND langkah Dukcapil dijalankan ulang dan pengajuan hilang dari daftar error bila berhasil | Draft |
| AC-86.02 | Menghentikan proses | Saya seorang Admin Operasional<br>AND saya berada di halaman "Process Monitoring Detail" | Saya mengklik tombol "Finish"<br>AND saya mengisi "Reason" dengan "Data nasabah ganda, dibatalkan cabang"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Process finished"<br>AND status pengajuan menjadi "Finish" dengan alasan tersebut | Draft |
| AC-86.03 | Retry yang gagal lagi | Saya seorang Admin Operasional<br>AND saya berada di halaman "Process Monitoring Detail"<br>AND layanan Dukcapil masih tidak tersedia | Saya mengklik tombol "Retry" | Sistem menampilkan pesan "Step failed again: Dukcapil service timeout"<br>AND jumlah percobaan bertambah 1 | Draft |
| AC-86.04 | Menyaring pengajuan error | Saya seorang Admin Operasional<br>AND saya berada di halaman "Process Monitoring" | Saya memilih "Error" di filter "Status" | Sistem menampilkan hanya pengajuan yang langkah saat ininya berstatus Error beserta pesan error | Draft |

## US-87: Menerima Notifikasi Status Pengajuan

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Nasabah | menerima email saat pengajuan diterima, ditolak, dan dicairkan | nasabah mengetahui perkembangan pengajuannya tanpa harus menghubungi bank |

### Acceptance Criteria US-87

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-87.01 | Pemicu dan isi email nasabah sesuai matriks | Saya seorang Nasabah dengan email "rudi@contoh.com" pada pengajuan "20102026KTA0000013" | Saya membuka kotak masuk email setelah kejadian pada baris MRTM | Refer to MRTM Rows: TRM_NTF_001 through TRM_NTF_006 for comprehensive logic combinations. | Draft |

### MRTM US-87

| User Story ID | Acceptance Criteria ID | User | Test Case ID | Kejadian | Subjek Email | Kondisi Khusus | HASIL (EXPECTED RESULT) |
|---|---|---|---|---|---|---|---|
| US_87 | AC_87.01 | Nasabah | TRM_NTF_001 | Pengajuan disubmit | Your loan application 20102026KTA0000013 has been received | [-] | Email terkirim satu kali |
| US_87 | AC_87.01 | Nasabah | TRM_NTF_002 | Decision NotGo | Your loan application 20102026KTA0000013 could not be approved | [-] | Email terkirim satu kali |
| US_87 | AC_87.01 | Nasabah | TRM_NTF_003 | Approver Reject | Your loan application 20102026KTA0000013 could not be approved | [-] | Email terkirim satu kali |
| US_87 | AC_87.01 | Nasabah | TRM_NTF_004 | Respons core SUKSES | Your loan 20102026KTA0000013 has been disbursed | [-] | Email terkirim satu kali |
| US_87 | AC_87.01 | Nasabah | TRM_NTF_005 | Recontest dimulai | [-] | [-] | Tidak ada email |
| US_87 | AC_87.01 | Nasabah | TRM_NTF_006 | Pengajuan disubmit | [-] | Email nasabah kosong | Tidak ada email; riwayat mencatat "Notification skipped - no email" |

## US-88: Melihat Beranda Mobile

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | melihat ringkasan penjualan dan memilih kategori produk dari aplikasi mobile | sales langsung memulai pengajuan saat bertemu calon nasabah |

### Acceptance Criteria US-88

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-88.01 | Melihat beranda | Saya seorang Sales<br>AND saya berada di halaman "Home (mobile)" | Saya membuka aplikasi mobile setelah login | Sistem menampilkan Total Sales bulan berjalan, persentase dibanding bulan lalu, dan 4 tile kategori: Non Collateral Loan, Collateral Loan, Pension Credit, Syariah Compliant Finance | Draft |
| AC-88.02 | Memilih kategori produk | Saya seorang Sales<br>AND saya berada di halaman "Home (mobile)" | Saya mengetuk tile "Collateral Loan" | Sistem menampilkan daftar produk aktif kategori Collateral Loan yang sudah punya rute disetujui | Draft |
| AC-88.03 | Kategori tanpa produk | Saya seorang Sales<br>AND saya berada di halaman "Home (mobile)"<br>AND belum ada produk Syariah yang aktif | Saya mengetuk tile "Syariah Compliant Finance" | Sistem menampilkan pesan "No products available in this category" | Draft |
| AC-88.04 | Tanpa koneksi internet | Saya seorang Sales<br>AND saya berada di halaman "Home (mobile)"<br>AND perangkat tidak terhubung internet | Saya menarik layar ke bawah untuk memuat ulang | Sistem menampilkan pesan "No internet connection" dan data terakhir yang tersimpan | Draft |

Catatan: AC-88.01 mengikuti Asumsi A-25.

## US-89: Membuat Pengajuan dari Mobile

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | mengisi pengajuan per section di mobile dengan urutan section sesuai produk | data nasabah diinput di lokasi tanpa kembali ke kantor |

### Acceptance Criteria US-89

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-89.01 | Melengkapi section dan submit | Saya seorang Sales<br>AND saya berada di halaman "Loan Application (mobile)"<br>AND semua section bertanda centang hijau | Saya mengetuk tombol "Apply Loan Now"<br>AND saya mengetuk tombol "Yes" di konfirmasi | Sistem menampilkan pesan "Application submitted. Loan ID: 20102026KTA0000014"<br>AND pengajuan tampil di tab "On Progress" pada Loan List dengan channel "Mobile" | Draft |
| AC-89.02 | Tombol Apply nonaktif sebelum section lengkap | Saya seorang Sales<br>AND saya berada di halaman "Loan Application (mobile)"<br>AND section Document belum lengkap | Saya melihat tombol "Apply Loan Now" | Sistem menampilkan tombol "Apply Loan Now" dalam keadaan nonaktif | Draft |
| AC-89.03 | Section berikutnya terkunci sebelum section sebelumnya selesai | Saya seorang Sales<br>AND saya berada di halaman "Loan Application (mobile)"<br>AND section Personal belum disubmit | Saya mengetuk section "Occupation Details" | Sistem menampilkan pesan "Please complete Personal Details first" | Draft |
| AC-89.04 | Progres section tersimpan saat aplikasi ditutup | Saya seorang Sales<br>AND saya berada di halaman "Personal Details (mobile)"<br>AND saya sudah mengisi step 1 dari 3 | Saya menutup aplikasi<br>AND saya membuka kembali draft dari Loan List tab "Draft" | Sistem menampilkan section Personal Details pada step 2 dengan data step 1 terisi | Draft |
| AC-89.05 | Validasi field sama dengan web | Saya seorang Sales<br>AND saya berada di halaman "Personal Details (mobile)" | Saya mengisi "ID Card Number" dengan 15 digit<br>AND saya mengetuk tombol "Next" | Sistem menampilkan pesan "ID card number must be 16 digits" | Draft |

## US-90: Melihat Daftar Pengajuan Saya di Mobile

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | melihat pengajuan saya yang berstatus Draft, On Progress, dan Disburse | sales menindaklanjuti nasabah dan memantau pencapaiannya |

### Acceptance Criteria US-90

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-90.01 | Melihat tab On Progress | Saya seorang Sales<br>AND saya berada di halaman "Loan List (mobile)" | Saya mengetuk tab "On Progress" | Sistem menampilkan pengajuan saya yang sedang diproses dengan Loan ID, nama, limit, tenor, rate, dan langkah saat ini | Draft |
| AC-90.02 | Mencari pengajuan | Saya seorang Sales<br>AND saya berada di halaman "Loan List (mobile)" | Saya mengetik "rudi" di field pencarian | Sistem menampilkan pengajuan saya yang Loan ID atau namanya mengandung "rudi" | Draft |
| AC-90.03 | Tab kosong | Saya seorang Sales<br>AND saya berada di halaman "Loan List (mobile)"<br>AND belum ada pengajuan yang dicairkan | Saya mengetuk tab "Disburse" | Sistem menampilkan pesan "No disbursed applications yet" | Draft |
| AC-90.04 | Pengajuan On Progress tidak bisa diedit | Saya seorang Sales<br>AND saya berada di halaman "Loan List (mobile)" | Saya mengetuk pengajuan di tab "On Progress" | Sistem menampilkan detail pengajuan tanpa tombol edit | Draft |

## US-91: Mengisi Laporan Kunjungan dari Mobile

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Surveyor | mengisi LKN dan mengunggah foto survey langsung dari lokasi nasabah | hasil kunjungan tercatat saat itu juga lengkap dengan bukti foto |

### Acceptance Criteria US-91

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-91.01 | Submit LKN dari mobile | Saya seorang Surveyor<br>AND saya berada di halaman "List LKN (mobile)"<br>AND pengajuan "20102026KUR0000012" berstatus Need Survey | Saya mengetuk pengajuan tersebut<br>AND saya mengisi data kunjungan, usaha, dan rumah tangga<br>AND saya mengambil 3 foto dengan kamera<br>AND saya mengetuk tombol "Submit" | Sistem menampilkan pesan "Survey submitted"<br>AND pengajuan hilang dari List LKN | Draft |
| AC-91.02 | Foto melebihi 2 MB | Saya seorang Surveyor<br>AND saya berada di halaman "Detail LKN (mobile)" | Saya memilih foto 2,1 MB dari galeri | Sistem menampilkan pesan "File must not exceed 2 MB" | Draft |
| AC-91.03 | Lokasi foto tercatat | Saya seorang Surveyor<br>AND saya berada di halaman "Detail LKN (mobile)"<br>AND izin lokasi perangkat aktif | Saya mengambil foto survey | Sistem menyimpan koordinat dan waktu pengambilan pada foto tersebut | Draft |

Catatan: AC-91.02 mengikuti Asumsi A-17.

## US-92: Melihat Profil Pengguna di Mobile

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Sales | melihat data akun, mengganti password, dan logout dari aplikasi mobile | akun mobile terkelola mandiri dan aman saat perangkat dipakai bersama |

### Acceptance Criteria US-92

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-92.01 | Melihat profil | Saya seorang Sales<br>AND saya berada di halaman "Profile (mobile)" | Saya mengetuk ikon profil di bottom bar | Sistem menampilkan Full Name, Username, Role Name, Email, Phone Number serta menu Change Password, Help, dan Logout | Draft |
| AC-92.02 | Logout dari mobile | Saya seorang Sales<br>AND saya berada di halaman "Profile (mobile)" | Saya mengetuk menu "Logout"<br>AND saya mengetuk tombol "Yes" | Sistem menampilkan halaman Login mobile dan draft lokal yang belum tersimpan dihapus | Draft |
| AC-92.03 | Logout saat ada draft yang belum disimpan | Saya seorang Sales<br>AND saya berada di halaman "Profile (mobile)"<br>AND terdapat isian section yang belum disimpan ke server | Saya mengetuk menu "Logout" | Sistem menampilkan konfirmasi "You have unsaved application data. Log out anyway?" | Draft |
| AC-92.04 | Nomor telepon kosong | Saya seorang Sales tanpa nomor telepon di data user<br>AND saya berada di halaman "Profile (mobile)" | Saya mengetuk ikon profil | Sistem menampilkan "Phone Number" berisi "-" | Draft |

## US-93: Melihat Perangkat yang Dipakai Sales

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| Admin Sistem | melihat daftar perangkat mobile yang dipakai login beserta lokasi terakhirnya | penggunaan aplikasi di lapangan bisa diawasi dan perangkat hilang bisa dilacak |

### Acceptance Criteria US-93

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-93.01 | Melihat daftar perangkat | Saya seorang Admin Sistem<br>AND saya berada di halaman "Device Info" | Saya membuka halaman "Device Info" | Sistem menampilkan daftar perangkat dengan username, model perangkat, versi aplikasi, dan waktu login terakhir | Draft |
| AC-93.02 | Melihat lokasi perangkat | Saya seorang Admin Sistem<br>AND saya berada di halaman "Device Info" | Saya mengklik tombol "Location" pada salah satu perangkat | Sistem menampilkan nama lokasi dan koordinat terakhir perangkat | Draft |
| AC-93.03 | Perangkat tanpa data lokasi | Saya seorang Admin Sistem<br>AND saya berada di halaman "Device Info"<br>AND perangkat tidak mengizinkan akses lokasi | Saya mengklik tombol "Location" | Sistem menampilkan pesan "Location not available for this device" | Draft |
| AC-93.04 | Sales tidak bisa membuka Device Info | Saya seorang Sales<br>AND saya berada di halaman "Dashboard" | Saya mengetik alamat halaman "Device Info" di address bar browser | Sistem menampilkan pesan "You do not have access to this page" | Draft |
| AC-93.05 | Pencarian perangkat tanpa hasil | Saya seorang Admin Sistem<br>AND saya berada di halaman "Device Info" | Saya mengetik "tidak.ada" di field "Search" | Sistem menampilkan pesan "No devices found" | Draft |

## US-94: Mensimulasikan Respons Layanan Eksternal

| Persona | Aksi yang dilakukan | Hasil nilai bisnis |
|---|---|---|
| QA | mengatur respons tiruan Dukcapil, SLIK, SIKP, EDAPEM, asuransi, dan core banking di lingkungan uji | semua jalur proses bisa diuji tanpa bergantung pada sistem eksternal |

### Acceptance Criteria US-94

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status |
|---|---|---|---|---|---|
| AC-94.01 | Mengatur respons core tiruan | Saya seorang QA di lingkungan UAT<br>AND saya berada di halaman "Simulation - Core Response"<br>AND pengajuan "20102026KPR0000041" berada di langkah Waiting Core Response | Saya mengklik tombol "Generate" pada baris tersebut<br>AND saya memilih "No" di "Outcome" dan mengisi "Sequence" dengan "1"<br>AND saya mengklik tombol "Process" | Sistem menampilkan pesan "Simulated response processed"<br>AND pengajuan masuk antrean Recontest | Draft |
| AC-94.02 | Menambah data Dukcapil tiruan | Saya seorang QA di lingkungan UAT<br>AND saya berada di halaman "Simulation - Dukcapil Data" | Saya mengklik tombol "Add Data"<br>AND saya mengisi NIK, nama, tempat lahir, tanggal lahir, dan nama ibu<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "Data saved"<br>AND modul Dukcapil di UAT memakai data tersebut untuk NIK yang sama | Draft |
| AC-94.03 | Menu simulasi tidak tersedia di produksi | Saya seorang QA di lingkungan produksi<br>AND saya berada di halaman "Dashboard" | Saya mengetik alamat halaman "Simulation" di address bar browser | Sistem menampilkan pesan "Page not found" | Draft |
| AC-94.04 | Simulasi untuk pengajuan yang tidak menunggu respons | Saya seorang QA di lingkungan UAT<br>AND saya berada di halaman "Simulation - Core Response"<br>AND pengajuan sudah Finish | Saya mencari pengajuan tersebut | Sistem tidak menampilkan pengajuan tersebut di daftar | Draft |
| AC-94.05 | Sequence kosong ditolak | Saya seorang QA di lingkungan UAT<br>AND saya berada di halaman "Simulation - Core Response" | Saya mengklik tombol "Generate"<br>AND saya memilih "Yes" di "Outcome" tanpa mengisi "Sequence"<br>AND saya mengklik tombol "Process" | Sistem menampilkan pesan "Sequence is required" | Draft |

Catatan: AC-94.01 mengikuti Asumsi A-29, A-10. AC-94.03 mengikuti Asumsi A-29.

# Asumsi

Asumsi BA untuk pertanyaan konfirmasi yang belum dijawab. Nomor Q merujuk ke daftar pertanyaan di review US/AC LOS.

| ID | Pertanyaan | Topik | Asumsi |
|---|---|---|---|
| A-01 | Q-01, Q-02 | Cakupan channel | Web, Mobile, API mitra, dan Upload Excel semuanya ditulis US-nya. Penentuan fase rilis dilakukan saat prioritisasi backlog. |
| A-02 | Q-04 | Arti hasil Dedup | Match = data pemohon identik dengan nasabah yang sudah ada (duplikat terkonfirmasi), lanjut ke Verification tanpa Dukcapil. UnMatch = bukan duplikat, lanjut ke Dukcapil. Review = perlu keputusan manusia di Prescreen Dedup. Skip = data atribut tidak lengkap, diperlakukan sama dengan UnMatch. |
| A-03 | Q-05 | Model Dukcapil | Memakai skor berbobot dari dokumen teknis: DOB dan POB wajib sama persis, skor = nama x 0,60 + nama ibu x 0,40, Passed >= 0,90, Review 0,75 s.d. < 0,90, Failed < 0,75, Skip bila data wajib kosong. Bobot dan ambang menjadi parameter yang bisa diatur. |
| A-04 | Q-06 | Model Fraud | Memakai tabel Fraud Service: blacklist atau >3 pengajuan/hari dengan kecepatan IP tinggi = High Fraud Potential; VPN/proxy atau lokasi IP beda domisili = Suspicious; selain itu Clean. High Fraud Potential = pengajuan berhenti (Finish) dan data masuk blacklist. Suspicious = masuk antrean Prescreen Fraud. |
| A-05 | Q-07 | Produk yang wajib survey | Ditentukan oleh rute produk (modul Survey dinyalakan atau dimatikan per produk). |
| A-06 | Q-08 | Prescreen Dukcapil | Tetap ada dua tingkat: Verifikator memilih Pass, Fail, atau Review; Review diputuskan Supervisor. |
| A-07 | Q-09 | Recontest | Dilakukan Risk Manager. Berlaku untuk Decision NotGo dan respons core GAGAL. |
| A-08 | Q-10 | Epolis dan Disbursement | Dijalankan manual oleh Admin Operasional melalui antrean kerja. |
| A-09 | Q-11 | Kirim ke core FAST | Sistem membuat satu file JSON per pengajuan dengan nilai tetap buss_unit LB2, create_by LOS, obj_code HONVAR011. Mekanisme kirim (unduh, SFTP, API) diputuskan terpisah; AC memakai unduh file. |
| A-10 | Q-12 | Integrasi eksternal | Setiap integrasi punya implementasi nyata dan mock. AC ditulis terhadap perilaku bisnis, tidak bergantung pada sistem asli. |
| A-11 | Q-13 | User SSO baru | User SSO yang belum terdaftar dibuat otomatis tanpa role dan company, masuk ke halaman tanpa akses dengan pesan menunggu admin. |
| A-12 | Q-14 | Pembuatan company | Company hanya dibuat oleh Super User lewat Company Configuration. Regional, Branch, Sub Branch, dan Currency dikelola Maker dengan checker-maker. |
| A-13 | Q-15 | Hak akses | Hak akses per menu: View, Create, Update, Delete, Approve. |
| A-14 | Q-16, Q-17 | Pemisahan tugas | Maker tidak bisa menyetujui perubahannya sendiri. User yang menginput pengajuan tidak bisa menjadi approver pengajuan yang sama. |
| A-15 | Q-18 | Syarat Save as Draft | Minimal 7 field: Application Type, Identity Type, Identity Number, Product Category, Product, Full Name, Full Name ID. |
| A-16 | Q-19 | Field wajib Personal | Full Name, Full Name ID, Place of Birth, Date of Birth, Gender, Religion, Nationality, Education, Marital, Mother Maiden Name, ID Card Number, ID Date Issued; NPWP wajib bila Requested Limit > 50.000.000; Taspen Number wajib untuk produk Pension. |
| A-17 | Q-20 | Aturan upload | Semua produk: maksimal 2 MB per file, ekstensi png, jpg, jpeg, pdf, docx; disimpan sebagai PDF. |
| A-18 | Q-21 | Tanggal disbursement | Disbursement Date minimal H+1 dari hari validasi dan tidak boleh sebelum tanggal pengajuan e-polis. |
| A-19 | Q-22 | Batas SIKP | SIKP berjalan bila Requested Limit > batas SIKP (parameter, default 50.000.000) dan produk memakai modul SIKP di rutenya. |
| A-20 | Q-23 | Auto approval | Auto approval berlaku bila Requested Limit <= Limit Auto Approval produk dan Decision = Go. |
| A-21 | Q-24 | Return di approval | Approver bisa Return; pengajuan kembali ke Sales dengan status Draft dan komentar approver, rute diulang dari awal saat submit ulang. |
| A-22 | Q-25 | Kode cabang | Regional Code, Branch Code, Sub Branch Code: angka 2 s.d. 3 digit. |
| A-23 | Q-26 | Nilai IJK | Diisi Admin Operasional saat request e-polis (sesuai dokumen teknis). |
| A-24 | Q-27 | Format LoanID | ddMMyyyy + kode produk (1 s.d. 5 karakter huruf/angka) + 7 digit counter per produk per company. Dibuat saat Save as Draft pertama. |
| A-25 | Q-28 | Kategori produk | Collateral Loan, Non Collateral Loan, Pension, Syariah Compliant Finance. Flag IsKPR dan NeedSIKP digantikan rute produk. |
| A-26 | Q-29 | Kemampuan bayar | Dihitung di RAC memakai parameter produk DBR max dan Multiple Salary DBR. |
| A-27 | Q-32 | Bahasa aplikasi | Label UI dan pesan sistem berbahasa Inggris. |
| A-28 | Q-33 | Keamanan login | Link reset berlaku 10 menit. Akun terkunci 15 menit setelah 5 kali gagal login berturut-turut. Sesi berakhir setelah 30 menit tanpa aktivitas. |
| A-29 | Q-34 | Menu simulasi | Hanya aktif di lingkungan non-produksi dan hanya untuk role QA. |
| A-30 | - | Rute produk | Keputusan brainstorming 2026-10-19: rute per produk, admin menyalakan atau mematikan modul, urutan tetap, kondisi internal modul tetap di sistem, tampilan diagram bergaya React Flow. |
| A-31 | - | Data contoh | Data contoh di AC adalah data fiktif. |
