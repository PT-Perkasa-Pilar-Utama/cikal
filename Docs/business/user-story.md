# User Stories

Sumber: `Docs/ba/Doc_BA_Cikal_Versi 1.xlsx` (US-01 s.d. US-94) ditambah draft yang disetujui di `Docs/business/grooming/` (US-95 s.d. US-102, perubahan isi dari grooming v1, v2, dan v3). Bila grooming v1/v2 berbeda dengan dokumen BA commit 15e4791, isi mengikuti dokumen BA (grooming v3). `Docs/ba` tidak diubah.

### US-01 — Masuk dengan Username dan Password

- **Persona:** Pengguna LOS
- **Action:** masuk ke aplikasi memakai username dan password yang terdaftar
- **Business value:** hanya pengguna terdaftar yang mengakses data pengajuan sesuai perannya

### US-02 — Masuk dengan Akun SSO Perusahaan

- **Persona:** Pegawai bank dengan akun SSO
- **Action:** masuk ke aplikasi memakai akun SSO perusahaan tanpa password terpisah
- **Business value:** pegawai tidak mengelola password tambahan dan akses dikendalikan identitas perusahaan

### US-03 — Meminta Tautan Reset Password

- **Persona:** Pengguna LOS dengan akun lokal
- **Action:** meminta tautan reset password ke email terdaftar saat lupa password
- **Business value:** pengguna memulihkan akses secara mandiri tanpa menunggu administrator

### US-04 — Mengatur Ulang Password

- **Persona:** Pengguna LOS dengan akun lokal
- **Action:** membuat password baru melalui tautan reset dari email
- **Business value:** akses pulih dengan password yang memenuhi standar keamanan

### US-05 — Mengganti Password

- **Persona:** Pengguna LOS dengan akun lokal
- **Action:** mengganti password sendiri, termasuk mengganti password awal dari administrator saat pertama masuk
- **Business value:** password bawaan tidak dipakai terus dan akun tetap aman

### US-06 — Keluar dari Aplikasi

- **Persona:** Pengguna LOS
- **Action:** mengakhiri sesi aplikasi
- **Business value:** data pengajuan tidak bisa diakses orang lain dari perangkat yang sama

### US-07 — Mendaftarkan Pengguna Aplikasi

- **Persona:** Maker
- **Action:** mendaftarkan pengguna baru beserta role, company, dan unit kerjanya
- **Business value:** setiap pegawai hanya melihat data cabang dan fungsi sesuai tugasnya

### US-08 — Mengelola Role

- **Persona:** Maker
- **Action:** membuat, mengubah nama, dan menonaktifkan role
- **Business value:** struktur tugas bank tercermin di aplikasi tanpa perubahan program

### US-09 — Mengatur Hak Akses Menu per Role

- **Persona:** Maker
- **Action:** menentukan menu dan tindakan (View, Create, Update, Delete, Approve) yang boleh dipakai setiap role
- **Business value:** pegawai hanya menjalankan tindakan yang menjadi kewenangannya

### US-10 — Mengatur Hak Akses Khusus per Pengguna

- **Persona:** Maker
- **Action:** menambah atau mencabut akses menu untuk pengguna tertentu dalam periode tertentu
- **Business value:** kebutuhan sementara seperti pengganti cuti terpenuhi tanpa mengubah role

### US-11 — Mengelola Menu Aplikasi

- **Persona:** Super User
- **Action:** menambah, mengubah urutan, dan menonaktifkan menu serta sub menu
- **Business value:** navigasi aplikasi mengikuti kebutuhan operasional tanpa rilis ulang

### US-12 — Menyetujui atau Menolak Perubahan Master Data

- **Persona:** Checker
- **Action:** meninjau perbandingan data lama dan baru lalu menyetujui atau menolak perubahan yang diajukan Maker
- **Business value:** setiap perubahan konfigurasi diperiksa orang kedua sebelum berlaku

### US-13 — Meminta dan Mengerjakan Revisi Perubahan

- **Persona:** Checker dan Maker
- **Action:** mengembalikan perubahan ke Maker dengan alasan, lalu Maker memperbaiki dan mengajukan ulang
- **Business value:** perubahan yang hampir benar tidak perlu dibuat ulang dari awal

### US-14 — Melihat Jejak Audit Perubahan

- **Persona:** Auditor
- **Action:** melihat siapa mengubah data apa, kapan, beserta nilai sebelum dan sesudah perubahan
- **Business value:** bank memenuhi kebutuhan audit internal dan regulator

### US-15 — Mendaftarkan Company Baru

- **Persona:** Super User
- **Action:** mendaftarkan bank baru beserta mata uang utama serta akun admin dan checker awalnya
- **Business value:** bank baru mulai memakai LOS tanpa bantuan developer

### US-16 — Menyalin Konfigurasi dari Company Lain

- **Persona:** Super User
- **Action:** menyalin general parameter, document checklist, rute produk, dan matrix keputusan dari company sumber ke company tujuan
- **Business value:** bank baru siap beroperasi dalam hitungan menit dengan konfigurasi standar

### US-17 — Mengelola Struktur Organisasi Company

- **Persona:** Maker
- **Action:** menambah dan mengubah Regional, Branch, dan Sub Branch milik company
- **Business value:** pengajuan dan approval dikelompokkan sesuai unit kerja bank

### US-18 — Mengelola Mata Uang Company

- **Persona:** Maker
- **Action:** menambah dan mengubah mata uang yang dipakai company
- **Business value:** produk dalam mata uang selain rupiah tercatat dengan kode yang benar

### US-19 — Mengelola Kurs Mata Uang

- **Persona:** Maker
- **Action:** mencatat kurs mata uang terhadap rupiah beserta waktu berlakunya
- **Business value:** nilai pinjaman valas dikonversi dengan kurs yang disetujui

### US-20 — Mengelola Produk Kredit

- **Persona:** Maker
- **Action:** membuat dan mengubah produk kredit beserta batas plafon, tenor, usia, biaya, dan limit auto approval
- **Business value:** bisnis meluncurkan atau menyesuaikan produk tanpa perubahan program

### US-21 — Mengelola General Parameter

- **Persona:** Maker
- **Action:** menambah dan mengubah nilai pilihan yang dipakai di dropdown aplikasi beserta kode BI-nya
- **Business value:** pilihan data nasabah seragam dan sesuai kode pelaporan regulator

### US-22 — Mengimpor dan Mengekspor General Parameter

- **Persona:** Maker
- **Action:** mengunduh template, mengunggah banyak parameter sekaligus, dan mengekspor parameter ke Excel
- **Business value:** penyiapan ratusan nilai parameter tidak diinput satu per satu

### US-23 — Memperbarui Data Wilayah

- **Persona:** Maker
- **Action:** memperbarui data provinsi sampai kode pos dari sumber data wilayah resmi dan mencari datanya
- **Business value:** alamat nasabah dan agunan tercatat sesuai wilayah administratif terbaru

### US-24 — Mengelola Template Dokumen

- **Persona:** Maker
- **Action:** mengunggah dan mengganti template dokumen keluaran seperti akad kredit, SP3K, dan surat pengajuan
- **Business value:** isi dokumen resmi mengikuti format terbaru bank tanpa perubahan program

### US-25 — Mengatur Dokumen Wajib Pengajuan

- **Persona:** Maker
- **Action:** menentukan dokumen yang wajib diunggah berdasarkan produk, pekerjaan, dan status perkawinan
- **Business value:** kelengkapan dokumen setiap pengajuan sesuai kebijakan kredit

### US-26 — Mengatur Level Approval

- **Persona:** Maker
- **Action:** menentukan level approval per produk dan cabang beserta rentang nominal dan aksi yang diizinkan tiap level
- **Business value:** pengajuan disetujui pejabat yang sesuai kewenangan nominalnya

### US-27 — Menetapkan Approver per Level

- **Persona:** Maker
- **Action:** menetapkan pengguna yang menjadi approver di setiap level dan sub level approval
- **Business value:** antrean approval selalu sampai ke orang yang tepat

### US-28 — Mengimpor Setup Approval

- **Persona:** Maker
- **Action:** mengunggah level approval dan approver sekaligus dari Excel
- **Business value:** penyiapan approval puluhan cabang selesai dalam satu kali unggah

### US-29 — Mengelola Data Perusahaan Asuransi

- **Persona:** Maker
- **Action:** mencatat perusahaan asuransi rekanan beserta tabel tarif premi per usia debitur dan tahun tenor
- **Business value:** nilai premi e-polis dihitung dari tarif yang disetujui

### US-30 — Mengatur Parameter Sistem

- **Persona:** Maker
- **Action:** mengubah parameter operasional seperti batas SIKP, ambang Dukcapil, masa berlaku tautan, dan batas upload
- **Business value:** aturan operasional disesuaikan tanpa rilis ulang aplikasi

### US-31 — Mengatur Rute Modul per Produk

- **Persona:** Maker
- **Action:** memilih modul proses yang dilewati pengajuan untuk setiap produk
- **Business value:** alur pengajuan tiap produk menyesuaikan kebijakan tanpa perubahan program

### US-32 — Melihat Diagram Rute Produk

- **Persona:** Maker, Checker, dan Risk Manager
- **Action:** melihat rute modul setiap produk dalam bentuk diagram alur
- **Business value:** semua pihak memahami tahapan pengajuan suatu produk tanpa membaca dokumen teknis

### US-33 — Mengatur Dedup Matrix

- **Persona:** Maker
- **Action:** menentukan hasil pengecekan duplikasi untuk setiap kombinasi kecocokan NIK, nama, tanggal lahir, tempat lahir, dan nama ibu kandung
- **Business value:** kebijakan deteksi pengajuan ganda bisa diperketat atau dilonggarkan oleh bisnis

### US-34 — Mengatur Aturan Verifikasi Dukcapil

- **Persona:** Maker
- **Action:** mengatur bobot kecocokan nama dan nama ibu serta ambang hasil Passed, Review, dan Failed
- **Business value:** tingkat kehati-hatian verifikasi identitas sesuai selera risiko bank

### US-35 — Mengatur Fraud Matrix

- **Persona:** Maker
- **Action:** menentukan hasil fraud check untuk kombinasi kondisi nama pemohon dan alamat IP pengajuan
- **Business value:** pengajuan berisiko penipuan tertahan sejak awal proses

### US-36 — Mengatur Decision Matrix

- **Persona:** Maker
- **Action:** menentukan keputusan Go atau NotGo untuk kombinasi hasil Dedup, Dukcapil, Fraud, RAC, Scoring, dan SLIK
- **Business value:** keputusan awal kredit konsisten dan mengikuti kebijakan risiko

### US-37 — Menyusun Model Scoring dan RAC

- **Persona:** Maker
- **Action:** menyusun model penilaian berisi kriteria berbasis data pengajuan, bobot, nilai konstanta, dan batas lulus tanpa menulis kode
- **Business value:** tim risiko menyesuaikan kriteria kelayakan kredit tanpa bergantung pada developer

### US-38 — Menguji Model Scoring Sebelum Berlaku

- **Persona:** Maker
- **Action:** menjalankan model scoring terhadap pengajuan contoh dan melihat rincian nilai tiap kriteria
- **Business value:** kesalahan kriteria terdeteksi sebelum memengaruhi keputusan kredit nasabah

### US-39 — Memulai Pengajuan Kredit Baru

- **Persona:** Sales
- **Action:** memulai pengajuan dengan memilih produk dan mengisi jenis pemohon, tenor, serta limit yang diminta
- **Business value:** data calon nasabah mulai tercatat sejak pertemuan pertama

### US-40 — Mengisi Data Pribadi Pemohon

- **Persona:** Sales
- **Action:** mengisi identitas, kontak, alamat KTP, dan alamat domisili pemohon
- **Business value:** identitas pemohon tercatat lengkap sebagai dasar verifikasi dan pelaporan

### US-41 — Mengisi Data Pribadi dari Foto KTP

- **Persona:** Sales
- **Action:** memotret atau mengunggah KTP lalu memakai hasil bacaannya untuk mengisi data pribadi
- **Business value:** input data lebih cepat dan salah ketik NIK serta nama berkurang

### US-42 — Memverifikasi Data Pensiun Pemohon

- **Persona:** Sales
- **Action:** memeriksa Nomor Taspen pemohon kredit pensiun ke data EDAPEM
- **Business value:** kredit pensiun hanya diberikan kepada pensiunan dengan data manfaat pensiun yang valid

### US-43 — Mengisi Data Pasangan Pemohon

- **Persona:** Sales
- **Action:** mengisi identitas dan pekerjaan pasangan untuk pemohon berstatus kawin
- **Business value:** kemampuan bayar rumah tangga dan persetujuan pasangan dinilai lengkap

### US-44 — Mengisi Data Pekerjaan Pemohon

- **Persona:** Sales
- **Action:** mengisi sumber penghasilan, pekerjaan, lama bekerja, penghasilan bulanan, dan data perusahaan pemohon
- **Business value:** sumber dan besar penghasilan pemohon bisa diverifikasi

### US-45 — Mengisi Data Usaha Pemohon

- **Persona:** Sales
- **Action:** mengisi profil usaha, omzet, lama usaha, dan alamat usaha untuk pemohon wiraswasta
- **Business value:** kelayakan usaha sebagai sumber pembayaran bisa dinilai

### US-46 — Mengisi Data Agunan

- **Persona:** Sales
- **Action:** mencatat agunan berupa kendaraan, sertifikat tanah dan bangunan, atau SK pensiun sesuai produk
- **Business value:** nilai dan legalitas jaminan pinjaman tercatat sebagai dasar penilaian kredit

### US-47 — Mengunggah Dokumen Pendukung

- **Persona:** Sales
- **Action:** mengunggah dokumen pendukung sesuai daftar dokumen wajib produk
- **Business value:** kelengkapan administrasi terpenuhi sebelum pengajuan diproses

### US-48 — Mengisi Kontak Darurat

- **Persona:** Sales
- **Action:** mengisi kontak darurat pemohon yang tidak tinggal serumah
- **Business value:** bank punya jalur komunikasi alternatif saat pemohon sulit dihubungi

### US-49 — Menyimpan Pengajuan sebagai Draft

- **Persona:** Sales
- **Action:** menyimpan pengajuan yang belum lengkap dan melanjutkannya di lain waktu
- **Business value:** data yang sudah diisi tidak hilang saat dokumen nasabah belum lengkap

### US-50 — Mengirim Pengajuan untuk Diproses

- **Persona:** Sales
- **Action:** mengirim pengajuan yang sudah lengkap ke proses verifikasi
- **Business value:** pengajuan masuk tahap penilaian sesuai rute produknya tanpa jeda manual

### US-51 — Menghitung Simulasi Angsuran

- **Persona:** Sales
- **Action:** menghitung angsuran bulanan berdasarkan pokok, tenor, suku bunga, dan jenis bunga
- **Business value:** calon nasabah mendapat gambaran angsuran sebelum mengajukan

### US-52 — Mengunggah Pengajuan Massal

- **Persona:** Sales
- **Action:** mengunggah banyak pengajuan sekaligus melalui template Excel
- **Business value:** pengajuan dari program kemitraan atau payroll diproses tanpa input satu per satu

### US-53 — Memantau Hasil Upload Massal

- **Persona:** Sales
- **Action:** melihat status pemrosesan file upload dan mengunduh baris yang gagal beserta alasannya
- **Business value:** pengajuan yang gagal diunggah bisa segera diperbaiki dan diunggah ulang

### US-54 — Mengirim Pengajuan melalui API Mitra

- **Persona:** Tim IT mitra penyalur
- **Action:** mendaftarkan aplikasi mitra, memperoleh token, dan mengirim data pengajuan nasabah ke LOS
- **Business value:** pengajuan dari kanal mitra masuk ke LOS tanpa input ulang oleh Sales

### US-55 — Mencatat Pembayaran Biaya Appraisal

- **Persona:** Customer Service
- **Action:** mengunggah bukti bayar dan mencatat nominal biaya appraisal pengajuan KPR
- **Business value:** appraiser hanya mengerjakan pengajuan yang biaya appraisal-nya sudah dibayar

### US-56 — Mengisi Laporan Kunjungan Nasabah Mikro

- **Persona:** Surveyor
- **Action:** mencatat hasil kunjungan, kondisi usaha, keuangan rumah tangga, dan foto survey untuk pengajuan mikro
- **Business value:** data faktual calon nasabah tervalidasi sebelum penilaian kredit

### US-57 — Mengisi Laporan Kunjungan dan Appraisal KPR

- **Persona:** Surveyor
- **Action:** mencatat hasil kunjungan dan penilaian properti agunan untuk pengajuan KPR
- **Business value:** nilai agunan properti diketahui sebelum keputusan kredit

### US-58 — Mengambil dan Melepas Tugas dari Antrean

- **Persona:** Pengguna dengan langkah kerja manual
- **Action:** mengambil tugas pengajuan dari antrean sebelum mengerjakannya dan melepasnya bila batal
- **Business value:** satu pengajuan tidak dikerjakan dua orang sekaligus

### US-59 — Mendapatkan Hasil Pengecekan Duplikasi Otomatis

- **Persona:** Risk Manager
- **Action:** mendapatkan hasil pengecekan duplikasi setiap pengajuan terhadap data nasabah yang sudah ada
- **Business value:** pengajuan ganda teridentifikasi sejak awal proses

### US-60 — Meninjau Hasil Duplikasi

- **Persona:** Verifikator
- **Action:** membandingkan pengajuan baru dengan data nasabah yang mirip lalu memutuskan Match atau UnMatch
- **Business value:** keputusan duplikasi yang meragukan diambil manusia, bukan ditebak sistem

### US-61 — Mendapatkan Hasil Verifikasi Dukcapil Otomatis

- **Persona:** Risk Manager
- **Action:** mendapatkan hasil pencocokan identitas pemohon dengan data kependudukan
- **Business value:** identitas palsu atau salah ketik terdeteksi sebelum penilaian kredit

### US-62 — Meninjau Hasil Dukcapil

- **Persona:** Verifikator
- **Action:** memutuskan Pass, Fail, atau meneruskan ke Supervisor untuk hasil Dukcapil yang perlu ditinjau
- **Business value:** data kependudukan yang meragukan diputuskan secara terkontrol

### US-63 — Memutuskan Review Dukcapil Tingkat Supervisor

- **Persona:** Supervisor
- **Action:** memberi keputusan akhir untuk hasil Dukcapil yang diteruskan Verifikator
- **Business value:** kasus identitas yang sulit diputuskan pejabat berwenang

### US-64 — Memverifikasi Dokumen Pengajuan

- **Persona:** Verifikator
- **Action:** mencocokkan setiap dokumen yang diunggah dengan data pengajuan
- **Business value:** keputusan kredit tidak didasarkan pada dokumen yang tidak sesuai

### US-65 — Mendapatkan Hasil Fraud Check Otomatis

- **Persona:** Risk Manager
- **Action:** mendapatkan hasil fraud check setiap pengajuan berdasarkan daftar hitam, alamat IP, dan frekuensi pengajuan
- **Business value:** pengajuan penipuan tertahan dan pelakunya tercatat

### US-66 — Meninjau Pengajuan Mencurigakan

- **Persona:** Verifikator
- **Action:** meninjau pengajuan berstatus Suspicious lalu meloloskan atau menolaknya
- **Business value:** pengajuan sah tidak tertolak hanya karena sinyal teknis seperti VPN

### US-67 — Mendapatkan Hasil RAC dan Scoring Otomatis

- **Persona:** Risk Manager
- **Action:** mendapatkan hasil kriteria penerimaan risiko dan skor kredit setiap pengajuan beserta rinciannya
- **Business value:** penilaian kelayakan kredit objektif dan bisa dijelaskan

### US-68 — Mendapatkan Hasil Kolektibilitas SLIK

- **Persona:** Risk Manager
- **Action:** mendapatkan kolektibilitas kredit pemohon di lembaga keuangan lain
- **Business value:** riwayat tunggakan pemohon ikut menentukan keputusan kredit

### US-69 — Mendapatkan Keputusan Awal Go atau NotGo

- **Persona:** Risk Manager
- **Action:** mendapatkan keputusan awal pengajuan dari gabungan hasil seluruh modul penilaian
- **Business value:** pengajuan yang tidak layak berhenti sebelum memakan waktu approver

### US-70 — Mendapatkan Hasil Pengecekan SIKP

- **Persona:** Risk Manager
- **Action:** mendapatkan status pemohon KUR di Sistem Informasi Kredit Program
- **Business value:** KUR disalurkan tepat sasaran dan tidak tumpang tindih dengan KUR di bank lain

### US-71 — Memproses Ulang Pengajuan yang Ditolak

- **Persona:** Risk Manager
- **Action:** memproses ulang pengajuan NotGo atau gagal pencairan setelah profil diperbaiki, atau mengakhirinya
- **Business value:** pengajuan yang layak setelah perbaikan tidak perlu dibuat ulang dari awal

### US-72 — Menyetujui Pengajuan Sesuai Kewenangan

- **Persona:** Approver
- **Action:** meninjau dan menyetujui pengajuan yang masuk antrean sesuai level kewenangan nominal
- **Business value:** keputusan kredit diambil pejabat yang berwenang secara berjenjang

### US-73 — Menolak atau Mengembalikan Pengajuan

- **Persona:** Approver
- **Action:** menolak pengajuan atau mengembalikannya ke Sales untuk diperbaiki dengan alasan
- **Business value:** pengajuan yang tidak layak berhenti dan yang kurang lengkap diperbaiki tanpa dibuat ulang

### US-74 — Menyetujui Otomatis Pengajuan Bernilai Kecil

- **Persona:** Approver
- **Action:** tidak menerima pengajuan Go dengan limit sampai batas auto approval produk karena pengajuan tersebut disetujui otomatis
- **Business value:** approver fokus pada pengajuan besar dan pengajuan berisiko rendah cair lebih cepat

### US-75 — Mengajukan E-Polis Asuransi Kredit

- **Persona:** Admin Operasional
- **Action:** mengajukan polis asuransi untuk pengajuan yang sudah disetujui dengan nilai premi yang dihitung dari tarif
- **Business value:** pinjaman terlindungi asuransi sebelum dana dicairkan

### US-76 — Memvalidasi Data Pencairan

- **Persona:** Admin Operasional
- **Action:** memeriksa detail pencairan lalu menetapkan tanggal pencairan dan tanggal angsuran pertama
- **Business value:** data yang dikirim ke core banking benar sebelum dana dicairkan

### US-77 — Mencetak Akad Kredit

- **Persona:** Admin Operasional
- **Action:** mencetak dokumen perjanjian kredit untuk ditandatangani nasabah
- **Business value:** perikatan kredit sah sebelum dana dicairkan

### US-78 — Mencetak Ulang Akad Kredit

- **Persona:** Admin Operasional
- **Action:** mencetak ulang akad yang sudah pernah dicetak dengan data yang sama
- **Business value:** dokumen yang hilang atau rusak bisa diganti tanpa mengubah perjanjian

### US-79 — Mengirim Data Pencairan ke Core Banking

- **Persona:** Admin Operasional
- **Action:** membuat file data pencairan per pengajuan dalam format core banking
- **Business value:** pencairan dieksekusi core banking tanpa penyuntingan file manual

### US-80 — Mencatat Respons Pencairan dari Core Banking

- **Persona:** Admin Operasional
- **Action:** melihat hasil pencairan yang dikirim core banking dan status akhir pengajuan
- **Business value:** status pengajuan selalu sesuai hasil pencairan sebenarnya

### US-81 — Melihat Dashboard Ringkasan Pengajuan

- **Persona:** Kepala Cabang
- **Action:** melihat jumlah pengajuan per status dan per langkah proses serta total pencairan per regional
- **Business value:** hambatan proses dan pencapaian penyaluran terlihat setiap saat

### US-82 — Mengekspor Laporan Pengajuan

- **Persona:** Kepala Cabang
- **Action:** mengunduh daftar pengajuan ke Excel berdasarkan periode, status, dan langkah proses
- **Business value:** laporan penyaluran disusun tanpa merekap data manual

### US-83 — Mencari dan Menyaring Daftar Pengajuan

- **Persona:** Pengguna LOS
- **Action:** mencari pengajuan berdasarkan Loan ID atau nama dan menyaringnya per status, langkah, produk, dan tanggal
- **Business value:** status pengajuan nasabah bisa dijawab cepat

### US-84 — Melihat Detail Pengajuan

- **Persona:** Pengguna LOS
- **Action:** melihat seluruh data pengajuan dalam tab Detail, Personal, Spouse, Occupation, Business, LKN, Collateral, Document, Emergency Contact, Approval, dan History
- **Business value:** semua pihak bekerja dari data pengajuan yang sama

### US-85 — Melihat Riwayat Proses Pengajuan

- **Persona:** Pengguna LOS
- **Action:** melihat urutan langkah yang sudah dilalui pengajuan beserta waktu, pelaku, hasil, dan lama tiap langkah
- **Business value:** posisi dan hambatan setiap pengajuan bisa ditelusuri

### US-86 — Memantau dan Memulihkan Proses yang Gagal

- **Persona:** Admin Operasional
- **Action:** melihat pengajuan yang tertahan karena error modul otomatis lalu mengulang atau menghentikannya
- **Business value:** pengajuan tidak macet tanpa diketahui saat layanan eksternal bermasalah

### US-87 — Menerima Notifikasi Status Pengajuan

- **Persona:** Nasabah
- **Action:** menerima email saat pengajuan diterima, ditolak, dan dicairkan
- **Business value:** nasabah mengetahui perkembangan pengajuannya tanpa harus menghubungi bank

### US-88 — Melihat Beranda Mobile

- **Persona:** Sales
- **Action:** melihat ringkasan penjualan dan memilih kategori produk dari aplikasi mobile
- **Business value:** sales langsung memulai pengajuan saat bertemu calon nasabah

### US-89 — Membuat Pengajuan dari Mobile

- **Persona:** Sales
- **Action:** mengisi pengajuan per section di mobile dengan urutan section sesuai produk
- **Business value:** data nasabah diinput di lokasi tanpa kembali ke kantor

### US-90 — Melihat Daftar Pengajuan Saya di Mobile

- **Persona:** Sales
- **Action:** melihat pengajuan saya yang berstatus Draft, On Progress, dan Disburse
- **Business value:** sales menindaklanjuti nasabah dan memantau pencapaiannya

### US-91 — Mengisi Laporan Kunjungan dari Mobile

- **Persona:** Surveyor
- **Action:** mengisi LKN dan mengunggah foto survey langsung dari lokasi nasabah
- **Business value:** hasil kunjungan tercatat saat itu juga lengkap dengan bukti foto

### US-92 — Melihat Profil Pengguna di Mobile

- **Persona:** Sales
- **Action:** melihat data akun, mengganti password, dan logout dari aplikasi mobile
- **Business value:** akun mobile terkelola mandiri dan aman saat perangkat dipakai bersama

### US-93 — Melihat Perangkat yang Dipakai Sales

- **Persona:** Admin Sistem
- **Action:** melihat daftar perangkat mobile yang dipakai login beserta lokasi terakhirnya
- **Business value:** penggunaan aplikasi di lapangan bisa diawasi dan perangkat hilang bisa dilacak

### US-94 — Mensimulasikan Respons Layanan Eksternal

- **Persona:** QA
- **Action:** mengatur respons tiruan Dukcapil, SLIK, SIKP, EDAPEM, asuransi, dan core banking di lingkungan uji
- **Business value:** semua jalur proses bisa diuji tanpa bergantung pada sistem eksternal

### US-95 — Mengelola Blacklist

- **Persona:** Risk Manager
- **Action:** melihat, menambah, dan mencabut data pemohon di blacklist beserta alasannya
- **Business value:** pemohon yang salah tercatat bisa dipulihkan secara terkontrol dan blacklist tetap akurat

### US-96 — Mengelola Aplikasi Mitra API

- **Persona:** Maker
- **Action:** mendaftarkan mitra, menentukan cabang dan produk yang boleh dikirim, serta menerbitkan dan mencabut API key
- **Business value:** kanal mitra dikendalikan bank tanpa bantuan developer

### US-97 — Mengatur Suku Bunga dan Biaya Produk

- **Persona:** Maker
- **Action:** menetapkan suku bunga per periode berlaku (SubProduct), biaya admin, provisi, dan sales, serta rentang suku bunga yang boleh diubah Approver
- **Business value:** harga kredit konsisten dan perubahannya terkontrol

### US-98 — Memigrasikan Data LOS OS11

- **Persona:** Admin Sistem
- **Action:** memindahkan user, master data, serta data nasabah dan pengajuan historis dari LOS OS11 dengan laporan rekonsiliasi
- **Business value:** Dedup, laporan, dan akses pengguna bekerja sejak hari pertama tanpa input ulang

### US-99 — Mengelola Lisensi Modul

- **Persona:** Tim internal PPU
- **Action:** menerbitkan, mengubah masa berlaku, dan mencabut lisensi modul per company dengan validasi ketergantungan modul
- **Business value:** client hanya memakai modul yang dibelinya tanpa versi kode khusus

### US-100 — Menerbitkan File Lisensi On-Premise

- **Persona:** Tim internal PPU
- **Action:** menerbitkan file lisensi bertanda tangan berisi company, daftar modul, dan masa berlaku untuk satu instalasi client
- **Business value:** client on-premise hanya bisa memakai modul yang dibelinya dan lisensi tidak bisa diubah sepihak

### US-101 — Mencatat Hasil Pencairan Manual

- **Persona:** Admin Operasional
- **Action:** mencatat hasil pencairan yang dilakukan di core banking (berhasil atau gagal) untuk pengajuan yang akadnya sudah dicetak
- **Business value:** status pengajuan, dashboard, dan notifikasi nasabah sesuai kondisi pencairan walau Cikal belum terhubung ke core

### US-102 — Mengatur Format Penomoran Dokumen

- **Persona:** Maker
- **Action:** mengatur pola nomor, periode reset, dan cakupan counter untuk dokumen keluaran seperti SP3K dan surat perjanjian kredit
- **Business value:** format nomor dokumen mengikuti kebijakan tiap bank tanpa perubahan program
