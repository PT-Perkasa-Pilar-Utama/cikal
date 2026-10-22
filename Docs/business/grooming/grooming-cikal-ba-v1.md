# Grooming Cikal: Doc BA Versi 1

**Versi:** 1  
**Tanggal:** 2026-10-21  
**Sumber:** `Docs/ba/us-ac.md` (US-01 s.d. US-94, MRTM, Asumsi A-01 s.d. A-31), `Docs/BPMN LOS.png`, `Docs/Flow Process LOS.png`  
**BA:** Fahrudin  
**Mode:** Blast (daftar pertanyaan untuk sesi refinement)  
**Status:** Dijawab 2026-10-21; perubahan US/AC dirinci di dokumen ini saja, `Docs/ba/` tidak diubah  
**Diganti sebagian:** `grooming-cikal-ba-v3.md` (2026-10-21). Bila keputusan di dokumen ini berbeda dengan dokumen BA commit 15e4791, dokumen BA yang berlaku; lihat tabel "Keputusan v1 dan v2 yang diganti" di v3.  

## Cara memakai dokumen ini

Setiap pertanyaan memuat empat bagian:

- **Pertanyaan**: yang perlu dijawab BA/PO.
- **Kenapa penting**: dampaknya ke estimasi, risiko, atau perilaku sistem.
- **Rekomendasi**: default yang akan engineering pakai bila harus diputuskan hari ini, beserta konsekuensi alternatifnya.
- **Jawaban BA**: kosong, diisi saat meeting. "Setuju" berarti rekomendasi diterima.

Prioritas: **P0** memblokir estimasi, **P1** mengubah ukuran pekerjaan secara signifikan, **P2** detail yang bisa ditutup saat sprint planning.

## Konteks dari repositori

- Repo `PT-Perkasa-Pilar-Utama/cikal` baru berisi dokumen, belum ada kode. Product Overview menyebut stack "belum ditentukan".
- Dokumen yang dirujuk tidak ada di repo: `Docs/cikal-to-be-concept.md`, `Docs/cikal-project-overview.md`, daftar pertanyaan review Q-01 s.d. Q-34, dan aturan rute produk R-02 s.d. R-09 (dirujuk di catatan AC-20.06, AC-31.01 s.d. AC-31.04, AC-32.01, AC-39.05). `.gitignore` sengaja menyimpan dokumen tersebut secara lokal, jadi tim engineering tidak bisa membacanya dari repo. Mohon BA membagikan aturan R-xx dan konsep TO-BE, atau memindahkan isinya ke dokumen yang di-push.
- Belum ada sprint breakdown atau prioritas. A-01 menunda penentuan fase rilis.
- Sheet "BA Approval" berstatus Draft, peer review "Belum", dan seluruh isi ditandai hasil AI yang wajib direview BA.

## Ringkasan: 10 hal yang harus tertutup sebelum estimasi

| # | ID | Topik |
|---|---|---|
| 1 | N-01 | Ruang lingkup rilis 1 (produk, channel, company) |
| 2 | I-01 | Migrasi dan cutover dari LOS OS11 tidak punya story |
| 3 | E-02 | Model multi-company: satu instance banyak bank atau satu deployment per bank |
| 4 | E-03 | Loan ID bisa bentrok antar company (TRM_LID_004) |
| 5 | E-04 | Company baru tidak punya Checker: semua setup user macet |
| 6 | E-07 | Suku bunga dan biaya pengajuan tidak didefinisikan di produk maupun form |
| 7 | E-06 | Matriks visibilitas data per role belum ada |
| 8 | I-02 | Status akses 11 layanan eksternal |
| 9 | V-01, V-02 | Fraud check berbasis IP dan nama berisiko tidak bernilai atau salah blacklist |
| 10 | E-09 | Contoh level approval saling bertentangan (AC-26.03 vs AC-72.06) |

## Hasil refinement 2026-10-21

Seluruh pertanyaan dijawab sesuai rekomendasi engineering, dengan jawaban eksplisit berikut:

| ID | Keputusan |
|---|---|
| I-01 | Pengajuan baru di Cikal, in-flight selesai di OS11, migrasi master data dan data historis sebagai epic terpisah |
| I-02 | Adapter mock-first, koneksi asli per layanan setelah sandbox ada (lihat catatan A-10 di I-02) |
| I-03 | Rilis 1: respons core diunggah manual oleh Admin Operasional |
| I-04 | Seed konfigurasi diizinkan |
| I-05 | Toggle channel per company sebagai System Parameter |
| N-01 | Rilis 1: web, satu company, KTA end-to-end |
| N-02 | Syariah keluar dari Rilis 1 |
| N-03 | IDR saja |
| N-04 | Flat dan Effective |
| N-05 | Katalog field tetap |
| N-06 | Hasil Dedup dipisah: Existing Customer dan Duplicate In-Flight |

Hal yang ditunda tercatat di [Register rilis berikutnya](#register-rilis-berikutnya). Hal yang masih menunggu tindakan tercatat di [Tindak lanjut terbuka](#tindak-lanjut-terbuka).

---

## I: Independent

*Bisakah story dibangun, diuji, dan dirilis sendiri?*

### I-01 (P0) Migrasi dan cutover dari LOS OS11
**US:** semua, terutama US-59, US-81, US-85  
**Pertanyaan:** Bagaimana Cikal menggantikan LOS OS11: big-bang, bertahap per company/cabang, atau pengajuan baru masuk Cikal sementara OS11 menyelesaikan pengajuan yang sedang berjalan? Data apa yang dipindahkan (user, master data, nasabah, pengajuan historis, pengajuan in-flight)?  
**Kenapa penting:** Tidak ada satu pun story migrasi. Dedup (US-59) membandingkan dengan "data nasabah yang sudah ada", yang kosong di hari pertama bila data OS11 tidak dimigrasi. Memetakan pengajuan in-flight dari state BPT OS11 ke rute Cikal adalah pekerjaan besar yang tidak terlihat di backlog.  
**Rekomendasi:** Pengajuan baru masuk Cikal sejak go-live, pengajuan in-flight diselesaikan di OS11 (run-off). Migrasikan user, master data, dan data nasabah/pengajuan historis sebagai data read-only untuk Dedup dan laporan. Buat epic migrasi tersendiri. Alternatif memigrasi in-flight menambah pemetaan state dan rekonsiliasi, setidaknya satu sprint tambahan per produk.  
**Jawaban BA:** Sesuai rekomendasi.  
**Tindak lanjut:** BA menulis US-98 (migrasi OS11) sebagai epic terpisah, berjalan paralel sejak increment 1b.

### I-02 (P0) Status akses layanan eksternal
**US:** US-02, US-23, US-41, US-42, US-54, US-61, US-65, US-68, US-70, US-75, US-79, US-80, US-87  
**Pertanyaan:** Untuk tiap layanan berikut, apakah sudah ada perjanjian kerja sama, akses sandbox, dokumen API, dan PIC: SSO perusahaan, Dukcapil, SLIK OJK, SIKP, EDAPEM/Taspen, OCR KTP, layanan deteksi IP/VPN (untuk fraud), perusahaan asuransi, core FAST, sumber data wilayah, layanan email?  
**Kenapa penting:** Sebelas integrasi, masing-masing bisa memblokir modul otomatis bila akses belum ada. Tanpa jawaban ini, story modul otomatis tidak bisa diberi angka.  
**Rekomendasi:** Ikuti A-10: semua adapter dibangun mock-first dengan kontrak internal Cikal, sehingga alur bisnis selesai dan diuji tanpa vendor. Koneksi ke sistem asli dijadikan story terpisah per layanan dan baru masuk sprint setelah sandbox tersedia. Alternatifnya, story modul menunggu vendor dan estimasi sprint tidak bisa dikunci.  
**Jawaban BA:** Ikuti asumsi: semua adapter mock-first, koneksi asli sebagai story terpisah per layanan.  
**Catatan:** Jawaban tertulis "ikuti A-19", sedangkan A-19 mengatur batas SIKP. Dicatat sebagai A-10 (integrasi mock-first) sesuai rekomendasi; mohon BA mengonfirmasi.  
**Tindak lanjut:** BA mengumpulkan status perjanjian, sandbox, dokumen API, dan PIC untuk tiap layanan.

### I-03 (P1) Respons core banking masuk lewat apa
**US:** US-79, US-80, A-09  
**Pertanyaan:** A-09 menetapkan file pencairan diunduh manual oleh Admin Operasional, tetapi US-80 mengasumsikan core "mengirim respons" ke Cikal. Bagaimana respons core sampai ke Cikal: Admin mengunggah file respons, Cikal membaca folder SFTP, atau core memanggil API Cikal?  
**Kenapa penting:** Jalur keluar manual dan jalur masuk otomatis tidak simetris. Jalur API butuh kontrak dengan tim core, yaitu dependensi lintas tim.  
**Rekomendasi:** Rilis 1: Admin Operasional mengunggah file respons core di halaman "Core Disbursement", Cikal memproses dan menerapkan aturan AC-80.01 s.d. AC-80.04. Otomasi SFTP/API menjadi story terpisah. Alternatif API membuat US-80 bergantung pada jadwal tim core.  
**Jawaban BA:** Rilis 1: Admin Operasional mengunggah file respons core secara manual.  
**Rilis berikutnya:** Otomasi respons core lewat SFTP atau API (butuh kontrak dengan tim core).

### I-04 (P1) Konfigurasi awal sebelum layar admin selesai
**US:** US-07 s.d. US-38 terhadap US-39 s.d. US-50  
**Pertanyaan:** Bolehkah sprint awal memakai konfigurasi hasil seed (produk KTA, rute, checklist dokumen, general parameter, wilayah, setup approval, model scoring, matrix) agar alur pengajuan bisa dibangun dan diuji sebelum seluruh layar konfigurasi selesai?  
**Kenapa penting:** Satu pengajuan tidak bisa disubmit sebelum sekitar 15 jenis konfigurasi ada. Tanpa seed, sekitar 30 story konfigurasi menjadi prasyarat keras untuk semua story pengajuan.  
**Rekomendasi:** Ya. Seed lewat script migrasi data per lingkungan; layar konfigurasi menyusul. Alternatifnya, nilai bisnis pertama baru terlihat setelah semua layar admin selesai.  
**Jawaban BA:** Ya.

### I-05 (P2) Toggle channel per company
**US:** US-52, US-54, US-88 s.d. US-93  
**Pertanyaan:** Perlukah setiap channel (Mobile, API mitra, Upload Excel) bisa dinyalakan per company?  
**Kenapa penting:** Memungkinkan channel dirilis terpisah dari alur inti tanpa menunggu semua channel siap.  
**Rekomendasi:** Ya, sebagai System Parameter per company (US-30). Alternatifnya, channel yang belum siap harus disembunyikan lewat rilis kode.  
**Jawaban BA:** Ya.

---

## N: Negotiable

*Apakah tujuan cukup jelas untuk menimbang trade-off, tanpa mengunci solusi?*

### N-01 (P0) Ruang lingkup rilis 1
**US:** semua, A-01  
**Pertanyaan:** Produk, channel, dan jumlah company apa yang wajib ada saat go-live pertama?  
**Kenapa penting:** 94 story tanpa prioritas tidak bisa diestimasi sebagai satu rilis, dan bisnis baru mendapat nilai setelah semuanya selesai.  
**Rekomendasi:** Rilis 1 = web, satu company, produk KTA (Non Collateral, tanpa Survey) end-to-end dari input sampai respons core. Produk beragunan, KUR, pensiun, channel Mobile/API/Excel, dan onboarding multi-company menyusul (lihat usulan slicing di bagian Verdict). Alternatif semua 94 story dalam satu rilis menunda seluruh nilai sampai akhir proyek.  
**Jawaban BA:** Rilis 1: web, satu company, produk KTA end-to-end.

### N-02 (P0) Pembiayaan syariah
**US:** US-15 (Platform "Syariah"), US-88 (tile "Syariah Compliant Finance"), A-25  
**Pertanyaan:** Apakah pembiayaan syariah masuk ruang lingkup? Bila ya, akad apa (murabahah, ijarah, musyarakah) dan bagaimana margin/ujrah dihitung?  
**Kenapa penting:** Semua AC perhitungan memakai bunga (US-51). Syariah butuh perhitungan margin, dokumen akad, dan istilah yang berbeda. Tidak ada AC untuk itu.  
**Rekomendasi:** Keluarkan dari rilis 1 dan sembunyikan tile Syariah. Buat epic terpisah setelah BA syariah menulis US/AC-nya. Alternatif memasukkannya sekarang tidak bisa diestimasi karena AC belum ada.  
**Jawaban BA:** Sesuai rekomendasi: keluar dari Rilis 1, tile Syariah disembunyikan.  
**Rilis berikutnya:** Epic Syariah setelah BA syariah menulis US/AC (akad, margin/ujrah, dokumen).

### N-03 (P1) Kredit valas
**US:** US-18, US-19, AC-19.04  
**Pertanyaan:** Apakah ada bank pengguna yang benar-benar menyalurkan kredit konsumer atau mikro dalam mata uang asing?  
**Kenapa penting:** Valas berarti setiap nominal (plafon, rentang approval, limit auto approval, batas SIKP, DBR) butuh aturan konversi dan kurs snapshot.  
**Rekomendasi:** Rilis 1 hanya IDR (kode 360). Master currency tetap ada, kurs dan konversi ditunda. Alternatifnya, semua validasi nominal harus sadar mata uang.  
**Jawaban BA:** IDR saja.  
**Rilis berikutnya:** Kurs dan konversi valas (US-19, AC-19.04) serta pengelolaan mata uang selain IDR (US-18).

### N-04 (P1) Jenis bunga yang dipakai produk aktif
**US:** US-51, MRTM TRM_INS_001 s.d. TRM_INS_007  
**Pertanyaan:** Produk yang aktif saat ini memakai jenis bunga apa? Untuk Floating dan Capped, dari mana suku bunga dasar diambil dan siapa yang memperbaruinya?  
**Kenapa penting:** Lima jenis bunga berarti lima mesin perhitungan jadwal angsuran yang juga dipakai saat approval (AC-72.01) dan pencairan (AC-79.03), bukan hanya simulasi.  
**Rekomendasi:** Flat dan Effective di rilis 1. Floating, Hybrid, Capped menjadi story terpisah setelah sumber suku bunga dasar ditetapkan. Alternatifnya, US-51 menjadi salah satu story terbesar dan butuh master suku bunga dasar yang belum ada.  
**Jawaban BA:** Flat dan Effective.  
**Rilis berikutnya:** Floating, Hybrid, dan Capped (TRM_INS_003 s.d. TRM_INS_007), menunggu master suku bunga dasar.

### N-05 (P1) Batas fleksibilitas scoring tanpa kode
**US:** US-37, US-38, A-26  
**Pertanyaan:** Apakah cukup bila kriteria dibuat dari katalog field yang sudah ditentukan dengan operator dasar (sama dengan, salah satu dari, kurang/lebih dari, di antara), dan field turunan seperti "Installment to Income Ratio" disediakan sistem? Atau tim risiko butuh menulis rumus bebas?  
**Kenapa penting:** Katalog field tetap bisa diestimasi. Rumus bebas berarti expression engine dengan sandbox, validasi, dan pengujian yang jauh lebih besar.  
**Rekomendasi:** Katalog field tetap; field turunan baru ditambahkan developer atas permintaan tim risiko. Alternatif rumus bebas butuh spike satu sprint sebelum diberi angka.  
**Jawaban BA:** Katalog field tetap.  
**Rilis berikutnya:** Rumus bebas hanya bila tim risiko membutuhkannya; spike satu sprint sebelum diestimasi.

### N-06 (P1) Arti hasil Dedup "Match"
**US:** US-59, US-60, A-02, TRM_DDP_001  
**Pertanyaan:** A-02 menyebut Match = "duplikat terkonfirmasi", tetapi pengajuan justru lanjut ke Verification Document. Apakah Match berarti nasabah lama yang mengajukan lagi (boleh lanjut), atau pengajuan ganda yang harus dihentikan? Apakah pengajuan lain dengan NIK sama yang sedang On Progress di cabang lain juga harus terdeteksi?  
**Kenapa penting:** Dua makna ini menghasilkan aturan berbeda. Pengajuan ganda in-flight adalah risiko kredit nyata yang saat ini tidak tertangkap AC mana pun.  
**Rekomendasi:** Pisahkan dua hasil: "Existing Customer" (lanjut, Dukcapil boleh dilewati) dan "Duplicate In-Flight" (pengajuan lain dengan NIK sama masih On Progress di company yang sama, masuk Prescreen Dedup). Alternatifnya, dua pengajuan dengan NIK sama bisa cair bersamaan.  
**Jawaban BA:** Sesuai rekomendasi: hasil "Existing Customer" dan "Duplicate In-Flight" dipisah.

### N-07 (P1) Checker-maker per baris atau per pengajuan perubahan
**US:** US-12, US-13, US-22, US-28, US-33 s.d. US-36  
**Pertanyaan:** Untuk impor 1.000 general parameter (AC-22.01) atau perubahan banyak baris Dedup/Decision Matrix, apakah Checker menyetujui satu per satu atau satu kali untuk satu paket perubahan?  
**Kenapa penting:** Persetujuan per baris membuat Checker mengklik ratusan kali dan memperbesar desain layar Pending.  
**Rekomendasi:** Satu mekanisme checker-maker generik di mana satu kali Submit (satu form, satu file impor, satu sesi edit matrix) = satu paket yang disetujui atau ditolak utuh. Alternatif per baris tetap bisa, tetapi layar Pending butuh pilih-banyak dan aksi massal.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### N-08 (P2) Diagram rute bergaya React Flow
**US:** US-32, A-30  
**Pertanyaan:** Apakah diagram interaktif dan perbandingan dua versi berdampingan (AC-32.03) wajib di rilis 1, atau cukup daftar modul berurutan dengan status (aktif, bersyarat, mati) dan penanda perubahan?  
**Kenapa penting:** Diagram interaktif dengan perbandingan versi adalah pekerjaan front-end tersendiri, sementara nilai bisnisnya (memahami rute) sudah tercapai dengan daftar.  
**Rekomendasi:** Daftar berurutan di rilis 1, diagram menyusul. Alternatifnya, US-32 menjadi story front-end berukuran besar di rilis pertama.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Rilis berikutnya:** Diagram rute interaktif dan perbandingan dua versi (AC-32.03) di Rilis 5.

---

## V: Valuable

*Apakah story menghasilkan nilai yang terlihat, dan bisa dibuktikan setelah live?*

### V-01 (P0) Fraud check berbasis IP pada pengajuan yang diinput pegawai
**US:** US-35, US-65, US-66, AC-65.02, TRM_FRD_004, TRM_FRD_005  
**Pertanyaan:** Pengajuan web dan mobile diinput oleh Sales, sehingga IP yang terlihat adalah IP perangkat Sales atau jaringan bank, bukan pemohon. Pengajuan API mitra membawa IP server mitra. IP siapa yang dimaksud "alamat IP pengajuan"?  
**Kenapa penting:** Untuk channel yang diinput pegawai, cek VPN dan "lokasi IP beda domisili KTP" hanya mengukur lokasi Sales, sehingga Sales yang bekerja di luar kota akan memicu Suspicious terus-menerus. Fitur ini juga butuh layanan IP intelligence berbayar yang belum ada di daftar integrasi.  
**Rekomendasi:** Cek IP berstatus "Not applicable" untuk Web, Mobile, dan Upload Excel (perluas AC-65.02). Rilis 1 fraud hanya memakai blacklist dan frekuensi. Cek IP dipertimbangkan bila kelak ada channel self-service nasabah. Alternatifnya, bank membayar layanan IP tanpa nilai deteksi dan antrean Prescreen Fraud penuh false positive.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Rilis berikutnya:** Cek IP dipertimbangkan bila ada channel self-service nasabah.

### V-02 (P0) Frekuensi pengajuan dihitung dari nama
**US:** US-35, US-65, TRM_FRD_002, A-04  
**Pertanyaan:** TRM_FRD_002 menetapkan 4 pengajuan per hari dengan nama sama = High Fraud Potential, pengajuan berhenti, dan pemohon otomatis masuk blacklist. Dihitung berdasarkan nama atau NIK? Lingkupnya satu company atau semua company?  
**Kenapa penting:** Nama umum seperti "MUHAMMAD RIZKY" bisa diajukan 4 kali sehari oleh orang berbeda di bank besar, sehingga pemohon tidak bersalah ter-blacklist otomatis tanpa review manusia. A-04 juga mensyaratkan "kecepatan IP tinggi", sementara MRTM tidak, jadi keduanya bertentangan.  
**Rekomendasi:** Hitung berdasarkan NIK per company. Melebihi batas menghasilkan Suspicious (masuk Prescreen Fraud), bukan blacklist otomatis. Blacklist hanya lewat keputusan Verifikator (AC-66.02). Alternatifnya, bank berisiko menolak dan mem-blacklist nasabah sah tanpa jejak keputusan manusia.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### V-03 (P1) Email penolakan terkirim padahal pengajuan masih bisa di-recontest
**US:** US-69, US-71, US-87, AC-69.02, TRM_NTF_002, TRM_NTF_005  
**Pertanyaan:** Saat Decision NotGo, pengajuan masuk antrean Recontest dan email "could not be approved" langsung terkirim. Bila Risk Manager kemudian melakukan recontest dan pengajuan disetujui, nasabah sudah menerima email penolakan. Kapan email penolakan seharusnya dikirim?  
**Kenapa penting:** Nasabah menerima pesan yang bertentangan dan menghubungi bank, persis yang ingin dihindari US-87.  
**Rekomendasi:** Email penolakan hanya dikirim saat pengajuan benar-benar berakhir: Risk Manager memilih Finish (AC-71.02), Approver Reject (AC-73.01), Dukcapil/Fraud berakhir Finish, atau Admin Operasional menghentikan proses (AC-86.02). Masuk Recontest tidak mengirim email. Alternatifnya, perlu email ketiga "pengajuan Anda ditinjau ulang".  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### V-04 (P1) Baseline dan target metrik bisnis
**US:** sheet "Business Value"  
**Pertanyaan:** Siapa menyediakan baseline dari LOS OS11 dan target untuk Time to Decision, Straight Through Processing, dan Error Reduction?  
**Kenapa penting:** Semua metrik tertulis "perlu ditetapkan". Tanpa baseline, keberhasilan rebuild tidak bisa dibuktikan, dan engineering tidak tahu data apa yang wajib dicatat sejak hari pertama.  
**Rekomendasi:** Tetapkan tiga metrik yang dihitung dari riwayat langkah (US-85): median waktu Submit sampai Decision, persentase Auto Approved, persentase pengajuan yang dikembalikan Verifikator/Approver. Tampilkan di Dashboard (US-81). Baseline diambil dari data OS11 saat migrasi (I-01). Alternatifnya, metrik dihitung manual setelah go-live dan data awal mungkin tidak tercatat.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** BA/PO menyiapkan baseline dari data OS11 bersamaan dengan migrasi (I-01).

### V-05 (P1) Siapa yang tahu saat layanan eksternal gangguan
**US:** US-86, AC-59.02, AC-61.02  
**Pertanyaan:** Selain halaman Process Monitoring, siapa yang harus diberi tahu (dan lewat apa) saat Dukcapil, SLIK, atau asuransi gagal berulang?  
**Kenapa penting:** Bila tidak ada yang membuka Process Monitoring, pengajuan macet berjam-jam tanpa diketahui, kebalikan dari nilai US-86.  
**Rekomendasi:** Alert ke tim operasional TI (email atau kanal chat) bila satu adapter gagal 5 kali dalam 15 menit; setiap log membawa Loan ID. Process Monitoring tetap untuk tindakan Retry/Finish. Alternatifnya, deteksi bergantung pada keluhan cabang.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

---

## E: Estimable

*Apakah informasinya cukup untuk menaksir ukuran dengan yakin?*

### E-01 (P0) Hosting dan lokasi data
**US:** semua  
**Pertanyaan:** Di mana Cikal di-host: cloud publik, data center PPU, atau data center masing-masing bank? Apakah ada kebijakan bank atau ketentuan OJK tentang lokasi pusat data yang harus dipenuhi?  
**Kenapa penting:** Hosting menentukan arsitektur multi-company (E-02), layanan yang boleh dipakai (OCR cloud, email), dan pekerjaan infrastruktur. Pemilihan stack sendiri adalah keputusan engineering di technical spec, tetapi butuh jawaban ini dari bisnis.  
**Rekomendasi:** BA mengonfirmasi kebijakan hosting dari tiap bank target sebelum technical spec ditulis. Alternatifnya, engineering memilih asumsi yang bisa batal setelah audit TI bank.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** BA mengonfirmasi kebijakan hosting tiap bank target sebelum technical spec ditulis. Masih terbuka.

### E-02 (P0) Satu instance untuk banyak bank, atau satu deployment per bank
**US:** US-15, US-16, AC-53.04, AC-84.04  
**Pertanyaan:** Apakah Cikal dijalankan PPU sebagai satu aplikasi yang melayani banyak bank sekaligus, atau dipasang terpisah untuk tiap bank? Siapa Super User: pegawai PPU atau pegawai bank?  
**Kenapa penting:** US-15 dan US-16 mengasumsikan banyak bank dalam satu aplikasi. Isolasi data antar bank adalah keputusan arsitektur yang menyentuh setiap tabel dan setiap query; salah memilih berarti pengerjaan ulang menyeluruh.  
**Rekomendasi:** Satu aplikasi multi-company dengan isolasi data per company di setiap akses data; Super User adalah pegawai PPU dan satu-satunya role lintas company. Alternatif satu deployment per bank menghapus kebutuhan US-15/US-16 dan menyederhanakan isolasi, tetapi menambah biaya operasional per bank.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### E-03 (P0) Loan ID bisa bentrok antar company
**US:** US-49, A-24, TRM_LID_004, AC-79.01, AC-84.04  
**Pertanyaan:** TRM_LID_004 memberi company 007 Loan ID `20102026KTA0000001`, sementara company 001 bisa punya Loan ID yang sama persis. Apakah Loan ID harus unik di seluruh Cikal?  
**Kenapa penting:** Loan ID dipakai sebagai nama file ke core (AC-79.01), alamat halaman detail, dan respons API mitra. Dua Loan ID identik di dua bank membuat file core, pencarian, dan log tertukar.  
**Rekomendasi:** Tambahkan kode company 3 digit ke format: `ddMMyyyy` + kode company + kode produk + counter 7 digit (contoh `20102026007KTA0000001`). Counter yang terpakai oleh draft yang ditinggalkan tidak diisi ulang (nomor boleh lompat). Alternatif counter global per kode produk tetap unik, tetapi bank bisa menebak volume bank lain.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### E-04 (P0) Company baru tidak punya Checker
**US:** US-07, US-08, US-09, US-12, US-15, A-14, TRM_ACC_004  
**Pertanyaan:** US-15 hanya membuat satu akun "admin.007". Semua pembuatan user, role, dan hak akses butuh persetujuan Checker, dan pembuat tidak boleh menyetujui perubahannya sendiri. Siapa yang menyetujui user pertama di company baru?  
**Kenapa penting:** Tanpa jawaban, company baru macet di hari pertama, dan nilai US-15 ("bank baru mulai memakai LOS tanpa bantuan developer") tidak tercapai.  
**Rekomendasi:** US-15 membuat dua akun awal: satu Maker-Admin dan satu Checker-Admin. Alternatif: Super User boleh bertindak sebagai Checker untuk company yang belum punya Checker aktif, dengan catatan khusus di audit trail.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### E-05 (P0) Perilaku sistem terikat ke nama role atau ke hak akses menu
**US:** US-08, US-09, AC-55.04, US-63, US-71, A-29  
**Pertanyaan:** Role bisa dibuat dan dinamai bebas (US-08), tetapi beberapa AC mengikat perilaku ke nama role: hanya "Customer Service" yang mencatat bayar appraisal (AC-55.04), hanya "Supervisor" yang membuka Supervisor Review, hanya "QA" yang membuka Simulation. Apakah semua perilaku ini cukup diatur lewat hak akses menu (View, Create, Update, Delete, Approve), sehingga nama role tidak berpengaruh?  
**Kenapa penting:** Bila logika bergantung pada nama role, role baru buatan bank tidak akan bekerja tanpa perubahan program, bertentangan dengan nilai US-08.  
**Rekomendasi:** Setiap antrean dan aksi kerja menjadi menu atau sub menu dengan hak akses. Tidak ada logika berdasarkan nama role. Role bawaan (Sales, Verifikator, Supervisor, dan seterusnya) hanya template awal. Alternatifnya, daftar role menjadi tetap dan US-08 kehilangan nilainya.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### E-06 (P0) Siapa melihat pengajuan siapa
**US:** US-49, US-58, US-81, US-83, US-84, US-90  
**Pertanyaan:** Isi tabel berikut untuk setiap role: lingkup data yang dilihat di Application Inquiry, Dashboard, dan antrean kerja (milik sendiri, Sub Branch, Branch, Regional, seluruh company, lintas company).  
**Kenapa penting:** AC hanya menyebut tiga potong aturan: Sales hanya melihat draft sendiri (AC-49.06), Kepala Cabang hanya cabangnya (AC-81.05), dan company terisolasi (AC-84.04). Aturan untuk Verifikator, Approver, Risk Manager, Auditor, dan kepala regional tidak ada, padahal aturan ini menyentuh setiap query daftar.  
**Rekomendasi:** Lingkup diturunkan dari unit kerja user: Sales melihat pengajuannya sendiri; Kepala Cabang melihat Branch dan Sub Branch di bawahnya; kepala Regional melihat regionalnya; Verifikator, Risk Manager, Admin Operasional, dan Auditor melihat seluruh company; Approver melihat pengajuan yang dirutekan ke levelnya. BA mengonfirmasi atau mengoreksi per role. Alternatifnya, engineering menebak dan risiko kebocoran data antar cabang.  
**Jawaban BA:** Setuju (sesuai rekomendasi). Tabel diisi dengan default rekomendasi.

| Role | Application Inquiry | Dashboard | Antrean kerja |
|---|---|---|---|
| Sales | Pengajuan milik sendiri | Pengajuan milik sendiri | Draft dan pengajuan yang dikembalikan milik sendiri |
| Customer Service | Branch dan Sub Branch di bawahnya | Tidak ada | Pembayaran appraisal di Branch sendiri |
| Surveyor | Branch dan Sub Branch di bawahnya | Tidak ada | Antrean LKN di Branch sendiri |
| Verifikator | Seluruh company | Tidak ada | Prescreen Dedup, Dukcapil, Fraud, Verification Document seluruh company |
| Supervisor | Seluruh company | Tidak ada | Supervisor Review seluruh company |
| Approver | Pengajuan yang dirutekan ke levelnya | Tidak ada | Antrean approval levelnya |
| Risk Manager | Seluruh company | Seluruh company | Recontest seluruh company |
| Admin Operasional | Seluruh company | Tidak ada | Epolis, Validity Check, Print Akad, Disbursement, Process Monitoring seluruh company |
| Kepala Cabang | Branch dan Sub Branch di bawahnya | Branch dan Sub Branch di bawahnya | Tidak ada |
| Auditor | Seluruh company, hanya baca | Seluruh company | Tidak ada |

### E-07 (P0) Suku bunga dan biaya pengajuan
**US:** US-20, US-39, US-51, AC-72.01, AC-75.01, AC-79.01  
**Pertanyaan:** Produk (AC-20.01) hanya punya Interest Type, tanpa besaran suku bunga. Form pengajuan (AC-39.01) tidak punya field suku bunga. US-20 menyebut "biaya" tetapi tidak ada field biaya. Dari mana suku bunga dan biaya (provisi, administrasi, asuransi) sebuah pengajuan berasal? Apakah bisa dinegosiasikan per pengajuan, dan oleh siapa?  
**Kenapa penting:** Struktur kredit dan jadwal angsuran terbentuk saat approval (AC-72.01) dan dikirim ke core (AC-79.01). RAC kemampuan bayar (AC-67.02) juga butuh angsuran. Tanpa sumber suku bunga, tidak satu pun angka itu bisa dihitung.  
**Rekomendasi:** Suku bunga dan biaya menjadi atribut produk (boleh berbeda per rentang tenor), tampil read-only di pengajuan, dan Approver final boleh mengubah suku bunga dalam rentang minimum-maksimum produk dengan komentar wajib. Tambahkan story baru (lihat usulan US-97). Alternatif suku bunga diisi bebas oleh Sales membuka risiko pricing tanpa kontrol.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** BA menulis US-97, termasuk rentang suku bunga yang boleh diubah Approver final.

### E-08 (P0) Ketentuan SLIK
**US:** US-68, US-36, TRM_SLK_001 s.d. TRM_SLK_006  
**Pertanyaan:**
1. Apakah SLIK diakses real-time lewat API, atau lewat proses iDeb yang dijalankan petugas?
2. Di mana persetujuan nasabah untuk pemeriksaan SLIK dicatat?
3. Bila pemohon punya beberapa fasilitas, kolektibilitas mana yang dipakai?
4. MRTM memetakan kolektibilitas 3 dan 5 ke "Poor" dan tidak menyebut 4. Apakah keputusan memang hanya butuh tiga kelompok, bukan lima kelas OJK (Lancar, Dalam Perhatian Khusus, Kurang Lancar, Diragukan, Macet)?
5. Bila pengajuan di-recontest atau dikembalikan, apakah SLIK diperiksa ulang?

**Kenapa penting:** Jalur manual dan jalur API adalah dua desain yang berbeda. Setiap inquiry SLIK punya biaya dan meninggalkan jejak pada riwayat nasabah, sehingga pemeriksaan ulang yang tidak perlu merugikan bank dan nasabah.  
**Rekomendasi:** Simpan dan tampilkan lima kelas OJK, pakai kolektibilitas terburuk dari seluruh fasilitas, tambahkan checkbox persetujuan SLIK di step Personal, dan pakai ulang hasil SLIK yang umurnya kurang dari 30 hari saat recontest atau submit ulang. Jalur iDeb manual menjadi fallback bila API tidak tersedia. Alternatifnya, setiap recontest menambah biaya inquiry.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** Konfirmasi SLIK lewat API atau iDeb manual masuk daftar I-02.

### E-09 (P1) Level approval: contoh saling bertentangan
**US:** US-26, US-27, US-72, AC-26.01, AC-26.03, AC-72.06, TRM_APV_001 s.d. TRM_APV_005  
**Pertanyaan:**
1. AC-26.03 memakai level 1 = 0 s.d. 100.000.000 (level 1 terendah). AC-72.06 memakai level 2 = 0 s.d. 500.000.000 dan level 1 = 500.000.001 s.d. 2.000.000.000 (level 1 tertinggi). Mana yang benar?
2. TRM_APV_002 menetapkan pengajuan 500.000.001 melewati level 2 lalu level 1. Apakah pengajuan selalu melewati semua level di bawah level yang mencakup nominalnya?
3. Sub Level (AC-27.01): bila satu sub level punya beberapa approver, cukup salah satu menyetujui, atau semuanya? Apakah sub level dijalankan berurutan?

**Kenapa penting:** Ini inti routing approval. Dua contoh yang bertentangan menghasilkan dua implementasi berbeda, dan test case MRTM tidak bisa ditulis sampai semantik terkunci.  
**Rekomendasi:** Level 1 = kewenangan tertinggi. Pengajuan berjalan dari level terendah naik sampai level yang rentangnya mencakup nominal. Dalam satu sub level, approver mana pun boleh memutuskan (antrean bersama dengan Assign to Me, US-58). Sub level berurutan. Contoh di AC-26.01 dan AC-26.03 disesuaikan. Alternatif "semua approver dalam sub level wajib setuju" menambah aturan voting dan penanganan approver yang tidak merespons.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### E-10 (P1) Pembulatan dan perhitungan jadwal angsuran
**US:** US-51, US-76, MRTM TRM_INS_001, AC-76.05  
**Pertanyaan:** Flat 100.000.000 selama 12 bulan menghasilkan pokok 8.333.333 per bulan, total 99.999.996, selisih Rp4. Ke mana selisih pembulatan ditaruh? Pembulatan ke rupiah atau ratusan rupiah, ke atas, ke bawah, atau terdekat? Bila tanggal angsuran pertama digeser (AC-76.05) sehingga periode pertama lebih dari satu bulan, apakah bunga periode pertama dihitung harian? Basis hari apa yang dipakai (30/360 atau aktual)?  
**Kenapa penting:** Jadwal angsuran Cikal dikirim ke core FAST (AC-79.03). Selisih satu rupiah antara Cikal dan core memicu rekonsiliasi manual.  
**Rekomendasi:** Ikuti aturan pembulatan core FAST. BA meminta satu contoh jadwal angsuran nyata dari core untuk tiap jenis bunga sebagai acuan uji. Default bila belum ada: bulatkan ke rupiah terdekat, selisih ditaruh di angsuran terakhir, basis 30/360. Alternatifnya, angka Cikal dan core berbeda dan baru ketahuan di UAT.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** BA meminta contoh jadwal angsuran Flat dan Effective dari core FAST sebagai acuan uji.

### E-11 (P1) Cara skor Dukcapil dihitung
**US:** US-34, US-61, A-03, TRM_DKC_001 s.d. TRM_DKC_008  
**Pertanyaan:** Apakah layanan Dukcapil yang dipakai bank mengembalikan data kependudukan lengkap atau hanya hasil cocok/tidak per field? Bila Cikal yang menghitung skor nama, aturan normalisasi apa yang berlaku (gelar, tanda baca, spasi ganda, singkatan)?  
**Kenapa penting:** Model skor berbobot di A-03 hanya bisa dijalankan bila Cikal menerima nilai nama dari Dukcapil. Bila layanan hanya mengembalikan cocok/tidak, model skor harus diganti.  
**Rekomendasi:** Spike dengan respons sandbox Dukcapil sebelum US-61 diestimasi. Bila Cikal menghitung, pakai algoritma kemiripan string standar setelah normalisasi huruf besar, buang gelar, dan rapikan spasi. Alternatifnya, angka story US-61 bisa berlipat setelah sandbox tersedia.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** Spike dengan respons sandbox Dukcapil sebelum US-61 diestimasi.

### E-12 (P1) Sumber dan volume data pembanding Dedup
**US:** US-33, US-59, US-60, AC-33.04  
**Pertanyaan:** Dedup membandingkan pengajuan dengan apa: pengajuan di Cikal saja, data migrasi OS11, atau data nasabah (CIF) di core banking? Lingkupnya satu company? Berapa jumlah data pembanding yang diperkirakan dalam 3 tahun?  
**Kenapa penting:** Pencocokan fuzzy terhadap ratusan ribu nama butuh strategi indeks khusus. Mengambil CIF dari core adalah integrasi ke-12.  
**Rekomendasi:** Pembanding = data nasabah dan pengajuan di Cikal plus hasil migrasi OS11, per company. Kandidat disaring dulu lewat NIK atau tanggal lahir, lalu fuzzy hanya pada kandidat. Alternatif CIF core butuh kontrak dengan tim core.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### E-13 (P1) Ukuran matrix keputusan dan wildcard
**US:** US-33, US-35, US-36  
**Pertanyaan:** Decision Matrix menggabungkan 6 hasil modul, Dedup Matrix 5 atribut dengan 3 sampai 4 nilai per atribut. Tanpa wildcard, jumlah kombinasi mencapai ratusan sampai ribuan baris. Apakah baris matrix boleh memakai "[ANY]" dan dievaluasi berdasarkan urutan prioritas? Siapa menyediakan isi awal ketiga matrix?  
**Kenapa penting:** Matrix kombinasi penuh tidak bisa dikelola Maker lewat layar, dan isi awal harus ada sebelum modul otomatis bisa diuji.  
**Rekomendasi:** Dukung "[ANY]" dan urutan prioritas; baris pertama yang cocok dipakai; tanpa baris cocok = NotGo (AC-36.03). BA menyerahkan isi awal ketiga matrix dalam format Excel sebelum sprint modul otomatis. Alternatifnya, layar matrix harus menampilkan ribuan baris.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** BA menyerahkan isi awal Dedup, Fraud, dan Decision Matrix dalam Excel sebelum sprint modul otomatis.

### E-14 (P1) Snapshot aturan saat pengajuan berjalan
**US:** US-20, US-31, US-36, US-37, AC-31.03, AC-19.04  
**Pertanyaan:** Rute sudah ber-versi: pengajuan in-flight memakai versi lama (AC-31.03). Bagaimana dengan parameter produk (plafon, usia, DBR), model scoring, dan matrix yang diubah saat pengajuan sedang berjalan?  
**Kenapa penting:** Tanpa aturan, pengajuan bisa lolos RAC dengan DBR lama lalu dinilai ulang dengan DBR baru saat recontest, dan hasilnya tidak bisa dijelaskan ke auditor.  
**Rekomendasi:** Semua aturan (produk, rute, model scoring, ketiga matrix, kurs) di-snapshot saat Submit. Recontest dan submit ulang setelah Return mengambil snapshot baru. Alternatif "selalu aturan terbaru" lebih sederhana tetapi hasil penilaian bisa berubah di tengah proses.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### E-15 (P1) Pemeriksaan ulang layanan eksternal saat recontest atau Return
**US:** US-71, US-73, A-21  
**Pertanyaan:** A-21 dan AC-71.01 mengulang rute dari awal. Apakah Dukcapil, SLIK, SIKP, dan EDAPEM dipanggil lagi, meskipun data identitas tidak berubah?  
**Kenapa penting:** Setiap panggilan berbiaya dan memperlambat proses. Bisnis perlu memilih antara data terbaru dan biaya.  
**Rekomendasi:** Pakai ulang hasil yang umurnya kurang dari 30 hari bila NIK, nama, tanggal lahir, dan nama ibu tidak berubah; tampilkan "Reused from <tanggal>" di riwayat. Alternatifnya, setiap pengulangan menambah biaya inquiry.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### E-16 (P1) Aplikasi mobile: platform dan offline
**US:** US-88 s.d. US-93, AC-88.04, AC-89.04, AC-92.02  
**Pertanyaan:** Android saja atau juga iOS? Apakah Sales harus bisa mengisi pengajuan tanpa sinyal sama sekali, atau cukup tahan saat koneksi putus sebentar?  
**Kenapa penting:** Offline penuh berarti sinkronisasi, penyelesaian konflik, dan penyimpanan data pribadi terenkripsi di perangkat. Loan ID juga dibentuk server saat Save as Draft (A-24), jadi tidak bisa dibuat offline.  
**Rekomendasi:** Android saja, wajib online, dengan isian section disimpan sementara di perangkat (terenkripsi) sampai berhasil terkirim. Alternatif offline penuh kira-kira menggandakan ukuran epic mobile.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Rilis berikutnya:** Aplikasi iOS dan mode offline penuh.

### E-17 (P1) Perlindungan data pribadi
**US:** US-40, US-41, US-47, US-82, US-91, US-93  
**Pertanyaan:** Sesuai UU Pelindungan Data Pribadi dan kebijakan bank:
1. Berapa lama data pengajuan yang ditolak atau selesai disimpan, lalu dihapus atau dianonimkan?
2. Apakah NIK dan nomor rekening harus disamarkan di daftar dan ekspor Excel (AC-82.01)?
3. Apakah akses membuka detail pengajuan harus tercatat di audit trail?
4. Di mana persetujuan nasabah atas pemrosesan datanya dicatat?
5. Apakah pegawai harus menyetujui pelacakan lokasi perangkat (US-93) dan foto ber-koordinat (AC-91.03)?

**Kenapa penting:** KTP, nama ibu kandung, penghasilan, dan lokasi termasuk data pribadi. Retensi, penyamaran, dan audit akses adalah pekerjaan lintas modul yang harus didesain sejak awal.  
**Rekomendasi:** Enkripsi dokumen dan field sensitif saat disimpan, samarkan NIK di daftar dan ekspor (tampil penuh hanya di detail), catat akses detail di audit trail, consent nasabah sebagai checkbox wajib di step Personal. BA mengonfirmasi angka retensi dengan tim kepatuhan bank. Alternatif menambahkannya setelah go-live menyentuh ulang semua layar daftar dan ekspor.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** BA mengonfirmasi angka retensi dengan tim kepatuhan bank. Masih terbuka.

### E-18 (P1) Nilai premi asuransi: dihitung atau diinput
**US:** US-29, US-75, A-23, AC-75.01  
**Pertanyaan:** US-29 menyebut "nilai premi e-polis dihitung dari tarif yang disetujui", tetapi US-75 dan A-23 meminta Admin Operasional mengetik IJK Value. Mana yang benar? Berapa perusahaan asuransi yang harus terintegrasi, dan apakah API-nya berbeda-beda?  
**Kenapa penting:** Bila diinput manual, tarif di US-29 tidak dipakai. Setiap perusahaan asuransi dengan API berbeda adalah adapter tersendiri.  
**Rekomendasi:** Premi dihitung otomatis (plafon x tarif produk) dan tampil read-only. Rilis 1 satu perusahaan asuransi via API; perusahaan lain lewat unggah polis manual. Alternatif input manual membuat US-29 hanya berisi data referensi.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Rilis berikutnya:** Integrasi API untuk perusahaan asuransi tambahan.

### E-19 (P1) Batasan core FAST harus dicek di awal, bukan di akhir
**US:** US-20, US-79, AC-79.01, AC-79.02  
**Pertanyaan:** AC-79.02 menolak tenor di atas 24 bulan saat pencairan, padahal produk KTA mengizinkan 60 bulan (AC-20.01). Apakah batas core berlaku per produk? Apakah nilai tetap `buss_unit LB2`, `create_by LOS`, `obj_code HONVAR011` sama untuk semua company dan produk?  
**Kenapa penting:** Pengajuan yang sudah disetujui, diasuransikan, dan dicetak akadnya bisa gagal di langkah terakhir. Nilai tetap tidak cocok untuk banyak bank.  
**Rekomendasi:** Batas core menjadi atribut produk dan divalidasi saat produk disimpan (Maximum Tenor tidak boleh melebihi batas core). Nilai mapping core menjadi konfigurasi per company dan produk. Alternatifnya, kegagalan baru ketahuan setelah nasabah menandatangani akad.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### E-20 (P1) SSO: penyedia, protokol, dan penautan akun
**US:** US-02, A-11, AC-02.02, AC-02.05  
**Pertanyaan:** Penyedia identitas apa yang dipakai (Microsoft Entra ID, Keycloak, ADFS, lainnya)? Satu penyedia per bank? AC-02.05 menautkan akun SSO ke user lokal hanya berdasarkan kesamaan email: apakah email di penyedia identitas dijamin terverifikasi dan berdomain bank? User SSO baru (AC-02.02) masuk company mana?  
**Kenapa penting:** Penautan otomatis berdasarkan email yang tidak terverifikasi membuka jalan pengambilalihan akun. Pada aplikasi multi-bank, user SSO baru harus tahu company-nya.  
**Rekomendasi:** OpenID Connect, satu penyedia per company yang didaftarkan Super User. Penautan otomatis hanya bila domain email sesuai domain yang terdaftar untuk company tersebut; selain itu admin menautkan manual. User SSO baru otomatis masuk company pemilik penyedia identitas. Alternatifnya, AC-02.05 menjadi celah keamanan.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### E-21 (P1) Kewajiban KUR di luar pengecekan SIKP
**US:** US-70, A-19  
**Pertanyaan:** Selain mengecek status pemohon di SIKP, apakah Cikal wajib mendaftarkan calon debitur dan melaporkan realisasi KUR ke SIKP? Apa arti "Days Remaining" secara tepat (sisa hari fasilitas KUR aktif di bank lain)?  
**Kenapa penting:** Bila bank wajib mengirim data ke SIKP, itu adalah alur integrasi tambahan setelah approval dan pencairan yang tidak ada di backlog.  
**Rekomendasi:** BA mengonfirmasi dengan tim KUR bank. Bila wajib, tambahkan story pelaporan SIKP setelah respons core SUKSES. Alternatifnya, bank memenuhi kewajiban itu secara manual di luar Cikal.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** BA mengonfirmasi ke tim KUR. Bila wajib, story pelaporan SIKP masuk Rilis 3 bersama produk KUR.

### E-22 (P1) API mitra: siapa mendaftarkan mitra dan siapa pemilik pengajuannya
**US:** US-54  
**Pertanyaan:** US-54 menyebut "mendaftarkan aplikasi mitra", tetapi tidak ada AC untuk itu. Siapa mendaftarkan mitra dan menerbitkan atau mencabut API key? Pengajuan dari API masuk ke cabang dan Sales mana (penting untuk antrean, lingkup dashboard, dan aturan "penginput tidak boleh menyetujui" AC-72.05)? Bagaimana mitra mengirim dokumen? Berapa batas jumlah request per menit?  
**Kenapa penting:** Tanpa pemilik cabang, pengajuan API tidak masuk antrean approval mana pun (TRM_APV_005). Tanpa dokumen, pengajuan tidak lolos syarat submit (AC-50.02).  
**Rekomendasi:** Admin company mendaftarkan mitra (nama, cabang tujuan, produk yang boleh dikirim), menerbitkan dan mencabut API key. Pengajuan API dimiliki user sistem "partner.<kode>" di cabang tujuan. Dokumen dikirim lewat endpoint unggah terpisah sebelum submit. Batas 60 request per menit per mitra. Tambahkan story baru (usulan US-96).  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** BA menulis US-96 untuk Rilis 4.

### E-23 (P1) Upload Excel massal tanpa dokumen
**US:** US-52, US-53, AC-50.02  
**Pertanyaan:** File Excel tidak membawa dokumen, sementara submit mewajibkan semua dokumen checklist. Apakah hasil upload massal menjadi Draft yang dilengkapi Sales, atau produk program kemitraan/payroll dibebaskan dari checklist dokumen?  
**Kenapa penting:** AC-52.02 tidak menyebut status hasil upload. Jawaban menentukan apakah upload massal benar-benar menghemat waktu Sales.  
**Rekomendasi:** Hasil upload menjadi Draft milik Sales pengunggah; Sales mengunggah dokumen lalu submit. Alternatif pengecualian checklist butuh konfigurasi per produk atau per program.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### E-24 (P1) Kebutuhan non-fungsional
**US:** semua  
**Pertanyaan:** Berapa jumlah bank, cabang, user aktif, dan pengajuan per hari yang diharapkan pada tahun pertama dan ketiga? Berapa target waktu respons layar, waktu dari Submit sampai Decision (di luar antrean manual), ketersediaan sistem, serta toleransi kehilangan data dan waktu pemulihan bila terjadi bencana?  
**Kenapa penting:** Angka ini menentukan ukuran infrastruktur, strategi antrean modul otomatis, dan rencana backup. Tanpa angka, desain bisa terlalu kecil atau terlalu mahal.  
**Rekomendasi (default bila belum ada angka):** 5 bank, 1.000 pengajuan per hari per bank, 300 user bersamaan; 95% layar terbuka di bawah 2 detik; modul otomatis Submit sampai Decision di bawah 5 menit bila layanan eksternal normal; ketersediaan 99,5% pada jam kerja; kehilangan data maksimal 1 jam, pulih dalam 4 jam. BA mengoreksi.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Catatan:** Angka default dipakai untuk desain sampai BA mengoreksinya.

### E-25 (P1) Kebijakan keamanan login
**US:** US-01 s.d. US-06, US-15, A-28  
**Pertanyaan:** Apakah kebijakan TI bank mewajibkan verifikasi dua langkah untuk role tertentu, masa berlaku password, larangan memakai ulang password lama, atau larangan login di dua perangkat bersamaan? Tautan pembuatan password admin baru (AC-15.01) berlaku berapa lama?  
**Kenapa penting:** Persyaratan ini sering muncul saat audit TI bank dan lebih mahal ditambahkan belakangan. Tautan 10 menit (A-28) terlalu singkat untuk admin baru yang belum siap saat email datang.  
**Rekomendasi:** Verifikasi dua langkah (aplikasi authenticator) untuk Super User, Admin, Checker, dan Approver; larang 5 password terakhir; satu sesi aktif per user per channel; tautan pembuatan password admin baru berlaku 24 jam, tautan reset tetap 10 menit. Alternatifnya, audit TI bank bisa menahan go-live.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### E-26 (P2) EDAPEM dan Taspen
**US:** US-42  
**Pertanyaan:** Apakah bank sudah punya akses layanan EDAPEM? Data apa yang dikembalikan (rekening, nominal pensiun, tanggal)? Apakah ada kewajiban lain seperti pemotongan gaji pensiun yang harus didaftarkan?  
**Kenapa penting:** Produk Pension tidak bisa diuji tanpa layanan ini atau mock-nya.  
**Rekomendasi:** Mock-first, story integrasi asli dipisah. Produk Pension di rilis 3.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Catatan:** Produk Pension masuk Rilis 3.

### E-27 (P2) Sumber data wilayah
**US:** US-23  
**Pertanyaan:** "Sumber data wilayah resmi" yang dimaksud apa? Apakah bersedia memakai unggah file kode wilayah Kemendagri dan kode pos, alih-alih sinkronisasi API?  
**Kenapa penting:** Tidak ada API resmi yang stabil yang diketahui engineering; tombol "Sync Region Data" mengasumsikan ada.  
**Rekomendasi:** Ganti "Sync" dengan unggah file sumber resmi oleh Maker; hasil penambahan dan perubahan tampil seperti AC-23.01. Alternatifnya, perlu riset dan perjanjian penyedia data.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Rilis berikutnya:** Sinkronisasi API data wilayah bila kelak ada sumber resmi yang stabil.

### E-28 (P2) Template dokumen dan katalog placeholder
**US:** US-24, US-77, AC-24.03, AC-72.01, A-17  
**Pertanyaan:** Siapa yang memelihara daftar placeholder yang sah (AC-24.03)? Template apa saja yang dibutuhkan per produk (Akad, SP3K, surat pengajuan)? Bisakah BA menyerahkan contoh template dari OS11?  
**Kenapa penting:** Pembuatan PDF dari .docx dengan placeholder butuh katalog yang dibekukan; setiap placeholder baru adalah perubahan program.  
**Rekomendasi:** Developer memelihara katalog placeholder (tampil di layar Document Template sebagai referensi); BA menyerahkan template OS11 untuk tiap produk rilis 1.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** BA menyerahkan template Akad dan SP3K KTA dari OS11 sebelum increment 1b.

### E-29 (P2) Cakupan dan retensi audit trail
**US:** US-14, AC-58.05, AC-78.01  
**Pertanyaan:** US-14 hanya membahas perubahan master data, tetapi AC lain mencatat pelepasan tugas dan cetak ulang akad. Apakah audit trail juga mencakup aksi pada pengajuan, login dan gagal login, serta akses data pribadi? Berapa lama disimpan?  
**Kenapa penting:** Satu audit trail untuk semua jenis kejadian lebih murah dibangun sekali di awal daripada ditambah per modul.  
**Rekomendasi:** Satu audit trail untuk master data, aksi pengajuan, autentikasi, dan akses detail pengajuan; retensi mengikuti kebijakan bank (BA konfirmasi angka). Halaman Audit Trail punya filter jenis kejadian.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** Angka retensi mengikuti jawaban E-17.

### E-30 (P2) Pembaruan daftar tanpa muat ulang
**US:** AC-83.06  
**Pertanyaan:** Seberapa cepat state baru harus muncul di Application Inquiry tanpa muat ulang?  
**Kenapa penting:** Pembaruan instan butuh koneksi push; pembaruan berkala jauh lebih sederhana.  
**Rekomendasi:** Daftar menyegarkan otomatis setiap 30 detik. Alternatif push instan menambah komponen infrastruktur.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Rilis berikutnya:** Pembaruan instan lewat push bila polling 30 detik tidak cukup.

---

## S: Small

*Apakah pekerjaan muat nyaman dalam satu sprint?*

### S-01 (P0) Backlog perlu dipecah menjadi rilis
**US:** semua  
**Pertanyaan:** Setujukah BA dengan usulan pembagian rilis di bagian Verdict?  
**Kenapa penting:** Lihat N-01. Pembagian rilis adalah prasyarat sprint breakdown.  
**Rekomendasi:** Setujui usulan atau koreksi urutannya.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Catatan:** Pembagian rilis direvisi agar Rilis 1 bisa go-live tanpa pengajuan macet; lihat Verdict.

### S-02 (P1) Story yang terlalu besar untuk satu sprint
**US:** US-12, US-31, US-37, US-51, US-54, US-84, US-89  
**Pertanyaan:** Bolehkah story berikut dipecah seperti usulan di bagian Verdict?  
- US-12/US-13: mesin checker-maker generik dipakai sekitar 20 jenis data.
- US-31: mesin rute ber-versi dengan modul bersyarat, Retry (US-86), dan restart (US-71, A-21).
- US-37: pembuat model scoring dan RAC.
- US-51: lima jenis bunga.
- US-54: autentikasi, pengajuan, dokumen, dan pengelolaan mitra.
- US-84: sebelas tab detail.
- US-89: seluruh form pengajuan di mobile.

**Kenapa penting:** Story yang melebihi satu sprint tidak bisa diterima utuh di akhir sprint dan menyembunyikan risiko.  
**Rekomendasi:** Setujui pemecahan; ID baru diberikan setelah meeting.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Rilis berikutnya:** Potongan lanjutan tiap story besar dicatat di Register rilis berikutnya.

### S-03 (P1) Pekerjaan tersembunyi yang belum punya story
**US:** tidak ada  
**Pertanyaan:** Bolehkah story enabler berikut masuk backlog dan menggunakan kapasitas sprint: migrasi data (I-01), lingkungan dan pipeline rilis, seed konfigurasi (I-04), adapter dan mock untuk 11 layanan (I-02), penyimpanan dokumen dan konversi ke PDF (A-17), template email nasabah, rencana cutover dan rollback?  
**Kenapa penting:** Pekerjaan ini nyata dan besar. Bila tidak tercatat, velocity terlihat rendah dan estimasi terlewat.  
**Rekomendasi:** Ya, sebagai story teknis yang dimiliki Tech Lead, terlihat di board yang sama.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### S-04 (P1) Story yang hilang
**US:** tidak ada  
**Pertanyaan:** Setujukah BA menulis story baru berikut (rinci di bagian Usulan perubahan): pengelolaan blacklist, pengelolaan aplikasi mitra API, suku bunga dan biaya produk, migrasi data OS11?  
**Kenapa penting:** AC yang ada merujuk ke perilaku ini (blacklist di AC-66.02, mitra di US-54, angsuran di AC-67.02) tanpa ada tempat untuk mengelolanya.  
**Rekomendasi:** Ya.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** BA menulis US-95 s.d. US-98.

---

## T: Testable

*Bisakah setiap AC diverifikasi?*

### T-01 (P1) Daftar field tidak lengkap
**US:** US-44, US-45, US-46, US-56, US-57, US-91  
**Pertanyaan:** Bisakah BA menyerahkan kamus field (nama, tipe, wajib atau tidak, panjang maksimal, sumber dropdown) untuk: data perusahaan pemohon (AC-44.01 "data perusahaan"), LKN mikro (AC-56.01 "data lokasi usaha, pendapatan usaha, biaya usaha..."), LKN KPR dan appraisal (AC-57.01), agunan kendaraan dan sertifikat (AC-46.01, AC-46.02), dan alamat usaha (AC-45.01)?  
**Kenapa penting:** Validasi field tidak bisa diuji bila daftar field tidak ada. LKN adalah form terbesar di sistem.  
**Rekomendasi:** BA menyusun sheet "Field Dictionary" dari Figma dan OS11 sebelum sprint yang memuat story tersebut. Story LKN dan agunan tidak diestimasi sampai sheet ada.  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Tindak lanjut:** BA menyusun Field Dictionary. Untuk Rilis 1 cukup section Personal dan Occupation (AC-44.01); LKN, agunan, dan usaha menyusul sebelum Rilis 3.

### T-02 (P1) Jalur pintas saat field wajib kosong
**US:** US-59, US-61, TRM_DDP_005, TRM_DKC_008, A-16  
**Pertanyaan:** NIK dan tanggal lahir wajib (A-16), tetapi MRTM membuat Dedup dan Dukcapil "Skip" lalu lanjut bila keduanya kosong. Lewat API atau Excel, data kosong bisa masuk. Apakah Skip memang boleh meloloskan pengajuan?  
**Kenapa penting:** Mengosongkan NIK menjadi cara menghindari pengecekan identitas.  
**Rekomendasi:** Validasi field wajib di server untuk semua channel saat submit, sehingga Skip karena data kosong tidak bisa terjadi. Skip hanya karena modul dimatikan di rute. Bila tetap terjadi, hasilnya Review, bukan lanjut.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### T-03 (P1) Antrean approver yang dinonaktifkan
**US:** US-27, AC-27.03, AC-07.05  
**Pertanyaan:** AC-27.03 hanya memberi label "Inactive approver". Apa yang terjadi pada pengajuan yang menunggu di level yang semua approver-nya nonaktif?  
**Kenapa penting:** Pengajuan bisa diam di antrean tanpa pemilik.  
**Rekomendasi:** Langkah Approval berstatus Error dengan pesan "No active approver for level <n>" dan tampil di Process Monitoring; setelah approver baru disetujui, Admin Operasional menekan Retry.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### T-04 (P2) Tugas yang diambil lalu ditinggalkan
**US:** US-58, AC-58.05  
**Pertanyaan:** Apakah tugas yang sudah di-Assign to Me harus dilepas otomatis setelah waktu tertentu?  
**Kenapa penting:** Saat ini hanya Supervisor yang bisa melepas, dan hanya bila ia tahu.  
**Rekomendasi:** Tidak ada pelepasan otomatis di rilis 1; Process Monitoring menampilkan filter "Assigned more than 1 day".  
**Jawaban BA:** Setuju (sesuai rekomendasi).  
**Rilis berikutnya:** Pelepasan tugas otomatis setelah batas waktu tertentu.

### T-05 (P2) Bahasa email nasabah
**US:** US-87, A-27  
**Pertanyaan:** A-27 menetapkan label dan pesan dalam bahasa Inggris. Apakah email ke nasabah juga berbahasa Inggris?  
**Kenapa penting:** Sebagian besar nasabah kredit mikro dan konsumer di Indonesia lebih nyaman membaca bahasa Indonesia. Subjek email di MRTM NTF sudah berbahasa Inggris.  
**Rekomendasi:** UI pegawai berbahasa Inggris, email nasabah berbahasa Indonesia; subjek di TRM_NTF diganti.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

### T-06 (P2) Definition of Done
**US:** semua  
**Pertanyaan:** Apa yang harus terpenuhi agar sebuah story dinyatakan selesai: sign-off UAT oleh BA per story, atau per rilis?  
**Kenapa penting:** Menentukan apakah QA dan UAT masuk kapasitas sprint.  
**Rekomendasi:** Story selesai bila: seluruh AC dan baris MRTM terkait menjadi test otomatis yang lulus; kejadian yang wajib diaudit tercatat; diuji di lingkungan uji dengan adapter mock; BA menyetujui demo di sprint review. UAT dengan sistem asli dilakukan per rilis.  
**Jawaban BA:** Setuju (sesuai rekomendasi).

---

## Verdict

### INVEST scorecard

Penilaian untuk Rilis 1 setelah refinement 2026-10-21. Penilaian sebelum meeting: I WARN, N WARN, V WARN, E FAIL, S FAIL, T WARN.

| Huruf | Hasil | Celah terbesar |
|---|---|---|
| I: Independent | PASS | Adapter mock-first (I-02) dan seed konfigurasi (I-04) melepas ketergantungan pada vendor dan layar admin. |
| N: Negotiable | PASS | Solusi yang mahal sudah ditukar dengan versi sederhana (I-03, N-05, N-08, V-01). |
| V: Valuable | WARN | Baseline metrik menunggu data OS11 (V-04). |
| E: Estimable | WARN | Kebijakan hosting (E-01) dan angka retensi (E-17) masih terbuka; sisanya terjawab. |
| S: Small | PASS | Pembagian rilis dan pemecahan story besar disetujui (S-01, S-02). |
| T: Testable | WARN | Perubahan AC sudah dirinci di bagian "Rincian perubahan US/AC", tetapi `Docs/ba/us-ac.md` belum memuatnya; Field Dictionary Personal dan Occupation belum ada (T-01). |

### Siap estimasi?

**Siap untuk estimasi relatif (story point) Rilis 1**, dengan syarat tim mengestimasi dari `Docs/ba/us-ac.md` bersama bagian "Rincian perubahan US/AC" di dokumen ini, karena `us-ac.md` belum memuat perubahan tersebut. Blocker yang harus ditutup sebelum komitmen sprint: **kebijakan hosting (E-01)**, karena menentukan stack, pekerjaan infrastruktur, dan layanan pihak ketiga yang boleh dipakai.

### Usulan slicing rilis

Setiap rilis menghasilkan alur yang bisa dipakai end-to-end. Rilis 1 adalah go-live (N-01) dan terdiri dari tiga increment.

**Revisi setelah meeting:** usulan awal menaruh antrean keputusan manusia (Prescreen, Supervisor Review, Recontest) setelah KTA end-to-end. Tanpa antrean itu, pengajuan dengan hasil Review, Suspicious, atau NotGo berhenti tanpa pemilik di produksi. Antrean tersebut, notifikasi nasabah, dan pengelolaan blacklist dipindah ke Rilis 1 (increment 1c). Mohon BA mengonfirmasi revisi ini.

| Rilis | Isi | Story |
|---|---|---|
| Rilis 1, increment 1a: Fondasi | Login lokal, user, role, hak akses, checker-maker generik, audit trail, struktur organisasi, produk dengan suku bunga dan biaya, general parameter, checklist dokumen, parameter sistem, rute produk (daftar, tanpa diagram), adapter mock | US-01, US-03 s.d. US-09, US-12 s.d. US-14, US-17, US-20, US-21, US-25, US-30, US-31, US-97 (baru), US-94 (sebagian) |
| Rilis 1, increment 1b: KTA end-to-end | Form web KTA, draft, submit, Dedup, Dukcapil, verifikasi dokumen, fraud (blacklist dan frekuensi NIK), RAC dan scoring dengan model hasil seed, SLIK, Decision, setup dan proses approval, e-polis, validity check, cetak akad dengan template seed, file pencairan, unggah respons core, inquiry, detail, riwayat, monitoring | US-39, US-40, US-44, US-47 s.d. US-50, US-58, US-59, US-61, US-64, US-65, US-67 s.d. US-69, US-26, US-27, US-29, US-72, US-73, US-75 s.d. US-80, US-83 s.d. US-86 |
| Rilis 1, increment 1c: Keputusan manusia | Prescreen Dedup, Prescreen Dukcapil, Supervisor Review, Prescreen Fraud, Recontest dan Finish, notifikasi email nasabah, pengelolaan blacklist | US-60, US-62, US-63, US-66, US-71, US-87, US-95 (baru) |
| Rilis 2: Kontrol dan otomasi | Auto approval, dashboard, ekspor, layar Dedup/Fraud/Decision Matrix, pembuat dan penguji model scoring, layar simulasi angsuran Flat/Effective | US-74, US-81, US-82, US-33 s.d. US-38, US-51 (Flat dan Effective) |
| Rilis 3: Produk beragunan dan program | Pasangan, usaha, agunan, bayar appraisal, LKN mikro dan KPR, pensiun dengan EDAPEM, KUR dengan SIKP | US-43, US-45, US-46, US-55 s.d. US-57, US-42, US-70 |
| Rilis 4: Channel | Mobile Android, upload Excel massal, API mitra, OCR KTP, SSO | US-88 s.d. US-93, US-52, US-53, US-54, US-96 (baru), US-41, US-02 |
| Rilis 5: Multi-company dan administrasi lanjutan | Pendaftaran company, salin konfigurasi, impor parameter dan approval, data wilayah, template dokumen, menu, diagram rute | US-15, US-16, US-22, US-23, US-24, US-28, US-11, US-32 |
| Terpisah | Migrasi OS11 (US-98 baru) berjalan paralel sejak increment 1b | US-98 |

Mesin perhitungan Flat dan Effective dibangun di increment 1b karena dibutuhkan approval (AC-72.01) dan file pencairan (AC-79.03); Rilis 2 hanya menambah layar simulasi untuk Sales.

Pemecahan story besar:

- **US-12/US-13**: (a) Submit dan Approve/Reject untuk satu jenis data (Product); (b) perbandingan Current vs Proposed; (c) Revise dan Resubmit; (d) penerapan ke jenis data lain, satu story per kelompok data.
- **US-31**: (a) eksekusi rute tetap dengan modul nyala/mati; (b) modul bersyarat (SIKP); (c) versi rute dan snapshot saat Submit; (d) layar edit rute dengan checker-maker.
- **US-37**: (a) kriteria scoring dari katalog field dengan operator dasar; (b) kriteria RAC wajib dan field turunan; (c) pengajuan model untuk persetujuan dan pergantian model aktif.
- **US-51**: (a) Flat dan Effective; (b) Floating; (c) Hybrid; (d) Capped.
- **US-54**: (a) autentikasi token; (b) kirim pengajuan dengan idempotensi reference number; (c) unggah dokumen; (d) pengelolaan mitra (US-96).
- **US-84**: (a) ringkasan dan tab data pemohon (Detail, Personal, Spouse, Occupation, Business, Emergency Contact); (b) tab Collateral, LKN, Document; (c) tab Approval dan History.
- **US-89**: satu story per section mobile, dengan urutan section dan aturan kunci (AC-89.03) sebagai story pertama.

### Celah acceptance criteria

| AC | Masalah | Usulan perbaikan |
|---|---|---|
| AC-26.01, AC-26.03 vs AC-72.06 | Arti nomor level bertentangan | Samakan dengan jawaban E-09. Contoh bila level 1 tertinggi: AC-26.03 GIVEN "level 2 KPR Bandung memakai rentang 0 s.d. 500.000.000", WHEN "Amount Begin 500.000.000 untuk level 1", THEN "Amount range overlaps with level 2". |
| TRM_LID_004 | Loan ID bentrok antar company | HASIL "Loan ID 20102026007KTA0000001" (format mengikuti jawaban E-03). |
| TRM_FRD_002 | Nama sebagai kunci, blacklist otomatis | Kolom "Jumlah Pengajuan NIK yang Sama"; HASIL "Suspicious; masuk antrean Prescreen Fraud". |
| TRM_SLK_003, TRM_SLK_004 | Kelas 3 dan 5 sama-sama "Poor", kelas 4 hilang | Lima baris: 1 Lancar, 2 Dalam Perhatian Khusus, 3 Kurang Lancar, 4 Diragukan, 5 Macet; tambah baris "beberapa fasilitas, terburuk 3" dengan HASIL "Collectibility 3". |
| AC-69.02, TRM_NTF_002 | Email penolakan saat masih bisa di-recontest | THEN "pengajuan masuk antrean Recontest AND tidak ada email yang dikirim"; tambah baris NTF "Risk Manager memilih Finish" dengan subjek penolakan. |
| AC-02.05 | Penautan akun hanya berdasarkan email | GIVEN tambah "AND domain email terdaftar untuk company 001"; tambah AC: email di luar domain terdaftar menampilkan "Your SSO account cannot be linked. Please contact your administrator". |
| AC-15.01 | Hanya satu admin; tautan membuat password tanpa masa berlaku | THEN "user admin.007 (Maker) dan checker.007 (Checker) terbentuk AND masing-masing menerima email berisi tautan pembuatan password yang berlaku 24 jam". |
| AC-27.03 | Hanya label, tanpa akibat pada antrean | Tambah AC: GIVEN "semua approver level 2 KPR Bandung nonaktif AND pengajuan menunggu di level 2", THEN "langkah Approval berstatus Error dengan pesan No active approver for level 2". |
| AC-52.02 | Status hasil upload tidak disebut | THEN tambah "AND setelah selesai, baris yang berhasil tampil di Application List berstatus Draft milik saya". |
| AC-56.01, AC-57.01, AC-44.01, AC-45.01, AC-46.01 | Field disebut kelompoknya saja | Rujuk ke sheet Field Dictionary (T-01) dan tambah satu AC "field wajib kosong" per section. |
| AC-72.01, AC-74.01 | "Struktur kredit dan jadwal angsuran terbentuk" tidak bisa diverifikasi | THEN "tab Approval menampilkan Plafond, Tenor, Interest Rate, Installment, dan jadwal angsuran N baris dengan sisa pokok baris terakhir Rp0". |
| AC-81.01 | Kartu dan grafik tanpa angka uji | GIVEN berisi data contoh (mis. 3 Draft, 5 Submitted, 2 GO, 1 NOT GO), THEN angka yang tampil persis. |
| AC-88.01 | "Total Sales" dan "persentase dibanding bulan lalu" tidak didefinisikan | Definisikan: total plafon berstatus Disbursed milik saya pada bulan berjalan; persentase = (bulan ini dikurangi bulan lalu) dibagi bulan lalu, tampil "-" bila bulan lalu 0. |
| AC-83.06 | Tidak ada batas waktu | THEN "dalam 30 detik setelah modul Dedup selesai". |
| AC-85.04 | Cara menghitung aging tidak eksplisit | Tulis "Aging = selisih tanggal kalender End Date dan Start Date". |
| AC-01.08 | Uji keamanan berbentuk AC fungsional | Pindahkan ke daftar uji keamanan non-fungsional (uji injeksi di semua input), bukan hanya field Username. |
| Tidak ada | Submit ganda | Tambah AC-50.07: GIVEN "pengajuan lengkap", WHEN "saya mengklik Submit dua kali dengan cepat", THEN "hanya satu proses yang berjalan AND riwayat hanya berisi satu Data Entry". |
| Tidak ada | Dua approver satu sub level | Tambah AC-72.07: GIVEN "Approver lain sudah menyetujui pengajuan yang sama di sub level saya saat detail masih terbuka", WHEN "saya mengklik Approve dan Yes", THEN "This application has already been processed". |
| Tidak ada | Batas tenor core divalidasi di produk | Tambah AC-20.07: WHEN "Maximum Tenor 36 untuk core dengan batas 24", THEN "Maximum tenor must not exceed core banking limit (24 months)". |

### Perubahan US/AC yang disetujui

Disetujui pada refinement 2026-10-21 (S-04 dan "semua sesuai rekomendasi"). Ringkasan di bawah; teks lengkap siap salin ada di bagian "Rincian perubahan US/AC". Dokumen `Docs/ba/us-ac.md`, `ac.tsv`, MRTM, dan sheet Asumsi sengaja tidak diubah.

**Add**

- **US-95: Mengelola Blacklist.** Persona: Risk Manager. Aksi: melihat, menambah, dan mencabut data pemohon di blacklist beserta alasannya. Nilai: pemohon yang salah tercatat bisa dipulihkan secara terkontrol. Dasar: V-02, AC-66.02.
- **US-96: Mengelola Aplikasi Mitra API.** Persona: Maker. Aksi: mendaftarkan mitra, menentukan cabang dan produk yang boleh dikirim, menerbitkan dan mencabut API key. Nilai: kanal mitra dikendalikan bank tanpa developer. Dasar: E-22.
- **US-97: Mengatur Suku Bunga dan Biaya Produk.** Persona: Maker. Aksi: menetapkan suku bunga per rentang tenor, biaya provisi dan administrasi, serta rentang yang boleh diubah Approver. Nilai: harga kredit konsisten dan terkontrol. Dasar: E-07.
- **US-98: Memigrasikan Data LOS OS11 (enabler).** Persona: Admin Sistem. Aksi: memindahkan user, master data, dan data nasabah historis dengan laporan rekonsiliasi. Nilai: Dedup dan laporan bekerja sejak hari pertama. Dasar: I-01.
- **AC-50.07, AC-72.07, AC-20.07, AC tambahan US-27 dan US-02**: lihat tabel celah AC di atas.

**Edit**

- **US-74**: persona "Kepala Cabang" untuk perilaku otomatis sistem. Ubah persona menjadi Approver: "pengajuan Go bernilai kecil tidak masuk antrean saya", nilai: approver fokus pada pengajuan besar. Dasar: kejelasan pemilik nilai.
- **AC-26.01, AC-26.03, TRM_APV_001 s.d. TRM_APV_005**: samakan semantik level. Dasar: E-09.
- **TRM_LID_001 s.d. TRM_LID_006, A-24**: format Loan ID dengan kode company. Dasar: E-03.
- **TRM_FRD_002, A-04**: NIK, tanpa blacklist otomatis. Dasar: V-02.
- **TRM_FRD_004, TRM_FRD_005, AC-65.02**: cek IP "Not applicable" untuk channel yang diinput pegawai. Dasar: V-01.
- **TRM_SLK_001 s.d. TRM_SLK_006**: lima kelas OJK dan aturan fasilitas terburuk. Dasar: E-08.
- **AC-69.02, TRM_NTF_002**: email penolakan hanya saat Finish. Dasar: V-03.
- **AC-15.01**: dua admin awal dan masa berlaku tautan 24 jam. Dasar: E-04, E-25.
- **AC-02.05**: penautan berdasarkan domain terdaftar. Dasar: E-20.
- **US-29 atau US-75, A-23**: pilih satu sumber nilai premi. Dasar: E-18.
- **US-23**: "Sync" menjadi unggah file sumber resmi. Dasar: E-27.

**Defer (keluarkan dari rilis 1, bukan hapus)**

- Tile "Syariah Compliant Finance" (AC-88.01) dan Platform "Syariah" (AC-15.01). AC-88.03 tidak ditunda; contohnya diganti ke kategori Pension Credit agar skenario kategori kosong tetap teruji. Dasar: N-02.
- US-18, US-19 (valas). Dasar: N-03.
- TRM_INS_003 s.d. TRM_INS_007 (Floating, Hybrid, Capped). Dasar: N-04.
- AC-32.03 (perbandingan diagram dua versi). Dasar: N-08.

## Rincian perubahan US/AC (draft, belum diterapkan)

Teks siap salin untuk setiap perubahan yang disetujui. Sesuai keputusan 2026-10-21, perubahan hanya dicatat di dokumen ini; `Docs/ba/us-ac.md`, `us.tsv`, `ac.tsv`, MRTM, sheet Asumsi, dan xlsx belum diubah. Saat diterapkan, xlsx adalah sumber: `us-ac.md` dan seluruh TSV terbukti bisa dibentuk ulang persis dari xlsx.

Kolom "Dasar" merujuk ke pertanyaan grooming. Kolom "Catatan" adalah isi kolom Catatan di sheet Acceptance Criteria.

### Perubahan global

| ID | Perubahan | Dasar |
|---|---|---|
| G-1 | Semua contoh Loan ID diberi kode company 3 digit setelah tanggal: `20102026KTA0000013` menjadi `20102026001KTA0000013`, `15122025KTA0000013` menjadi `15122025001KTA0000013`, dan seterusnya untuk KTA, KPR, KUR. Pengecualian: TRM_LID_004 (company 007), lihat MRTM. | E-03 |
| G-2 | Status AC baru "Deferred" untuk AC yang ditunda ke rilis berikutnya. AC lain tetap "Draft". | N-02, N-03, N-04, N-08 |
| G-3 | Intro `us-ac.md` ditambah satu butir: "Hasil refinement 2026-10-21: AC berstatus Deferred ditunda ke rilis berikutnya; asumsi A-32 s.d. A-49 berasal dari grooming." | Semua |

### User story yang diubah

| US | Kolom | Teks baru | Dasar |
|---|---|---|---|
| US-15 | Aksi | mendaftarkan bank baru beserta mata uang utama serta akun admin dan checker awalnya | E-04 |
| US-23 | Aksi | memperbarui data provinsi sampai kode pos dengan mengunggah file data wilayah resmi dan mencari datanya | E-27 |
| US-35 | Aksi | menentukan hasil fraud check untuk kombinasi status blacklist dan frekuensi pengajuan per NIK | V-01, V-02 |
| US-65 | Aksi | mendapatkan hasil fraud check setiap pengajuan berdasarkan daftar hitam dan frekuensi pengajuan per NIK | V-01, V-02 |
| US-66 | Hasil nilai bisnis | pengajuan sah tidak tertolak hanya karena sinyal teknis seperti frekuensi pengajuan yang tinggi | V-02 |
| US-74 | Persona | Approver | Edit US-74 |
| US-74 | Aksi | tidak menerima pengajuan Go dengan limit sampai batas auto approval produk karena pengajuan tersebut disetujui otomatis | Edit US-74 |
| US-74 | Hasil nilai bisnis | approver fokus pada pengajuan besar dan pengajuan berisiko rendah cair lebih cepat | Edit US-74 |
| US-75 | Aksi | mengajukan polis asuransi untuk pengajuan yang sudah disetujui dengan nilai premi yang dihitung dari tarif | E-18 |
| US-80 | Aksi | mengunggah file respons pencairan dari core banking dan melihat status akhir pengajuan | I-03 |

### User story baru

| US-ID | Judul | Persona | Aksi yang dilakukan | Hasil nilai bisnis | Rilis | Dasar |
|---|---|---|---|---|---|---|
| US-95 | Mengelola Blacklist | Risk Manager | melihat, menambah, dan mencabut data pemohon di blacklist beserta alasannya | pemohon yang salah tercatat bisa dipulihkan secara terkontrol dan blacklist tetap akurat | 1 (1c) | V-02, S-04 |
| US-96 | Mengelola Aplikasi Mitra API | Maker | mendaftarkan mitra, menentukan cabang dan produk yang boleh dikirim, serta menerbitkan dan mencabut API key | kanal mitra dikendalikan bank tanpa bantuan developer | 4 | E-22 |
| US-97 | Mengatur Suku Bunga dan Biaya Produk | Maker | menetapkan suku bunga per rentang tenor, biaya provisi dan administrasi, serta rentang suku bunga yang boleh diubah Approver | harga kredit konsisten dan perubahannya terkontrol | 1 (1a) | E-07 |
| US-98 | Memigrasikan Data LOS OS11 | Admin Sistem | memindahkan user, master data, serta data nasabah dan pengajuan historis dari LOS OS11 dengan laporan rekonsiliasi | Dedup, laporan, dan akses pengguna bekerja sejak hari pertama tanpa input ulang | Paralel sejak 1b | I-01 |

### Acceptance criteria: autentikasi dan akses (US-01 s.d. US-14)

| AC-ID | Perubahan | Skenario | GIVEN | WHEN | THEN | Status | Catatan | Dasar |
|---|---|---|---|---|---|---|---|---|
| AC-01.09 | Add | Verifikasi dua langkah untuk role berwenang tinggi | Saya seorang Checker dengan username "checker.001"<br>AND saya berada di halaman "Login"<br>AND aplikasi authenticator saya sudah terdaftar | Saya mengetik username dan password yang benar<br>AND saya mengklik tombol "Login" | Sistem menampilkan halaman "Verification Code"<br>AND halaman "Dashboard" baru tampil setelah saya mengisi kode 6 digit yang benar dari aplikasi authenticator | Draft | Asumsi A-28 | E-25 |
| AC-01.10 | Add | Kode verifikasi salah | Saya seorang Checker<br>AND saya berada di halaman "Verification Code" | Saya mengisi kode 6 digit yang salah<br>AND saya mengklik tombol "Verify" | Sistem menampilkan pesan "Invalid verification code"<br>AND saya tetap di halaman "Verification Code" | Draft | Asumsi A-28 | E-25 |
| AC-02.02 | Edit THEN | (tetap) | (tetap) | (tetap) | Ganti "AND user "budi.baru" tercatat di daftar User Application dengan status "No Role"" menjadi "AND user "budi.baru" tercatat di daftar User Application company pemilik penyedia SSO dengan status "No Role"" | Draft | Asumsi A-11 | E-20 |
| AC-02.05 | Edit GIVEN | (tetap) | Tambah baris terakhir: "AND domain "contoh.co.id" terdaftar untuk company "001"" | (tetap) | (tetap) | Draft | Asumsi A-11 | E-20 |
| AC-02.06 | Add | Email SSO di luar domain terdaftar tidak ditautkan | Saya seorang pegawai dengan akun SSO beremail "sari@pribadi.com"<br>AND saya berada di halaman "Login"<br>AND user lokal "sales.bdg01" memakai email "sari@pribadi.com"<br>AND domain "pribadi.com" tidak terdaftar untuk company mana pun | Saya mengklik tombol "Login with SSO"<br>AND saya menyelesaikan login di halaman SSO perusahaan | Sistem menampilkan halaman "Login" dengan pesan "Your SSO account cannot be linked. Please contact your administrator"<br>AND akun SSO tidak tertaut ke "sales.bdg01" | Draft | Asumsi A-11 | E-20 |
| AC-05.05 | Add | Password baru sama dengan salah satu dari 5 password terakhir | Saya seorang pengguna lokal yang sudah login<br>AND saya berada di halaman "Change Password"<br>AND "Cikal@2024" adalah password saya 3 penggantian yang lalu | Saya mengetik password saat ini di field "Current Password"<br>AND saya mengetik "Cikal@2024" di field "New Password" dan "Confirm New Password"<br>AND saya mengklik tombol "Save" | Sistem menampilkan pesan "New password must not match your last 5 passwords" | Draft | Asumsi A-28 | E-25 |
| AC-06.05 | Add | Login di browser lain mengakhiri sesi sebelumnya | Saya seorang Sales yang sudah login di browser laptop<br>AND saya berada di halaman "Application Inquiry"<br>AND saya login lagi di browser lain dengan akun yang sama | Saya mengklik salah satu baris pengajuan di browser laptop | Sistem menampilkan halaman "Login" dengan pesan "Your session was ended because you logged in from another browser" | Draft | Asumsi A-28 | E-25 |
| AC-12.02 | Edit penuh | Melihat perbandingan data lama dan baru | Saya seorang Checker<br>AND saya berada di halaman "Pending Product"<br>AND terdapat perubahan "Limit Auto Approval" produk KTA dari 10.000.000 menjadi 15.000.000 | Saya mengklik tombol "Detail" pada baris KTA | Sistem menampilkan dua kolom "Current Data" dan "Proposed Data" dengan field yang berubah ditandai, "Limit Auto Approval" 10.000.000 dan 15.000.000 | Draft | | N-03 (contoh kurs valas ditunda) |
| AC-12.07 | Add | Menyetujui paket impor sekaligus | Saya seorang Checker<br>AND saya berada di halaman "Pending General Parameter"<br>AND terdapat satu paket impor berisi 50 parameter yang diajukan "maker.01" | Saya mengklik tombol "Detail" pada paket tersebut<br>AND saya mengklik tombol "Approve"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Data approved"<br>AND ke-50 parameter berlaku sekaligus<br>AND paket hilang dari "Pending General Parameter" | Draft | Asumsi A-33 | N-07 |
| AC-14.06 | Add | Menyaring jejak audit berdasarkan jenis kejadian | Saya seorang Auditor<br>AND saya berada di halaman "Audit Trail" | Saya memilih "Authentication" di dropdown "Event Type"<br>AND saya memilih periode "01-10-2026" s.d. "31-10-2026"<br>AND saya mengklik tombol "Search" | Sistem menampilkan login berhasil, login gagal, dan logout pada periode tersebut dengan kolom Date Time, User, Action, IP Address<br>AND pilihan "Event Type" berisi Master Data, Application Action, Authentication, dan Data Access | Draft | Asumsi A-38 | E-29 |

### Acceptance criteria: master data dan konfigurasi (US-15 s.d. US-38)

| AC-ID | Perubahan | Skenario | GIVEN | WHEN | THEN | Status | Catatan | Dasar |
|---|---|---|---|---|---|---|---|---|
| AC-15.01 | Edit WHEN dan THEN | (tetap) | (tetap) | Ganti "Bank Contoh Syariah" menjadi "Bank Contoh Tujuh" dan Platform "Syariah" menjadi "Konvensional"<br>AND tambah baris "AND saya mengisi "Checker Full Name", "Checker Username" "checker.007", dan "Checker Email" "checker007@contoh.co.id"" sebelum klik "Submit" | Ganti baris terakhir menjadi "AND user "admin.007" dengan role "Admin" dan user "checker.007" dengan role "Checker" terbentuk<br>AND masing-masing menerima email berisi tautan pembuatan password yang berlaku 24 jam" | Draft | Asumsi A-12, A-28 | E-04, E-25, N-02 |
| AC-15.06 | Add | Admin dan Checker awal tidak boleh user yang sama | Saya seorang Super User<br>AND saya berada di halaman "Create New Company" | Saya mengisi "Admin Username" dan "Checker Username" dengan "admin.007"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Admin and checker must be different users" | Draft | Asumsi A-12 | E-04 |
| AC-18.01 s.d. AC-18.04 | Status | (tetap) | (tetap) | (tetap) | (tetap) | Deferred | Asumsi A-45 | N-03 |
| AC-19.01 s.d. AC-19.04 | Status | (tetap) | (tetap) | (tetap) | (tetap) | Deferred | Asumsi A-45 | N-03 |
| AC-20.07 | Add | Maximum Tenor melebihi batas produk core banking | Saya seorang Maker<br>AND saya berada di halaman "New Product"<br>AND produk core banking "HONVAR011" menerima tenor maksimal 24 bulan | Saya memilih "HONVAR011" di "Core Product Code"<br>AND saya mengisi "Maximum Tenor" dengan "36" dan field lain dengan data valid<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Maximum tenor must not exceed the core banking product limit (24 months)" | Draft | Asumsi A-09 | E-19 |
| AC-20.08 | Add | Perubahan produk tidak memengaruhi pengajuan yang sudah disubmit | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND pengajuan KTA "20102026001KTA0000013" disubmit saat DBR Max produk 40<br>AND perubahan DBR Max KTA menjadi 35 disetujui setelahnya | Saya mengklik langkah "RAC" di timeline pengajuan tersebut | Sistem menampilkan RAC dihitung dengan DBR Max 40 | Draft | Asumsi A-36 | E-14 |
| AC-22.01 | Edit THEN | (tetap) | (tetap) | (tetap) | Sistem menampilkan pesan "50 rows submitted for approval as 1 submission"<br>AND satu paket berisi 50 parameter tampil di "Pending General Parameter" | Draft | Asumsi A-33 | N-07 |
| AC-23.01 | Edit penuh | Mengunggah data wilayah resmi | Saya seorang Maker<br>AND saya berada di halaman "Master Geography" | Saya mengklik tombol "Upload Region Data"<br>AND saya memilih file "wilayah-2026.xlsx" sesuai template data wilayah<br>AND saya mengklik tombol "Upload"<br>AND saya mengklik tombol "Yes" di konfirmasi | Sistem menampilkan pesan "Region data imported: 12 added, 3 updated"<br>AND kolom "Last Update" berisi waktu unggah | Draft | Asumsi A-47 | E-27 |
| AC-23.02 | Edit penuh | File data wilayah tidak sesuai template | Saya seorang Maker<br>AND saya berada di halaman "Upload Region Data" | Saya memilih file dengan kolom berbeda dari template data wilayah<br>AND saya mengklik tombol "Upload" | Sistem menampilkan pesan "File does not match the region data template. Existing data is unchanged"<br>AND data wilayah tidak berubah | Draft | Asumsi A-47 | E-27 |
| AC-24.05 | Add | Melihat daftar placeholder yang tersedia | Saya seorang Maker<br>AND saya berada di halaman "Add Document Template" | Saya mengklik tautan "Available Placeholders" | Sistem menampilkan daftar placeholder beserta keterangannya, misalnya "{{nama_ibu_kandung}}: Mother Maiden Name pemohon" | Draft | | E-28 |
| AC-26.01 | Edit WHEN | (tetap) | (tetap) | Ganti "Amount Begin "100.000.001"" menjadi "Amount Begin "0"" | (tetap) | Draft | Asumsi A-21, A-37 | E-09 |
| AC-26.03 | Edit GIVEN, WHEN, THEN | (tetap) | Ganti "level 1 KPR Bandung memakai rentang 0 s.d. 100.000.000" menjadi "level 2 KPR Bandung memakai rentang 0 s.d. 500.000.000" | Ganti "Amount Begin "100.000.000" untuk level 2 KPR Bandung" menjadi "Amount Begin "500.000.000" untuk level 1 KPR Bandung" | Sistem menampilkan pesan "Amount range overlaps with level 2" | Draft | Asumsi A-37 | E-09 |
| AC-27.04 | Add | Semua approver satu level nonaktif | Saya seorang Admin Operasional<br>AND saya berada di halaman "Process Monitoring"<br>AND semua approver level 2 KPR Bandung nonaktif<br>AND pengajuan "20102026001KPR0000041" menunggu di level 2 | Saya mencari Loan ID "20102026001KPR0000041" | Sistem menampilkan langkah "Approval" berstatus "Error" dengan pesan "No active approver for level 2"<br>AND tombol "Retry" menjalankan ulang routing setelah approver baru disetujui | Draft | Asumsi A-37 | T-03 |
| AC-28.01 | Edit THEN | (tetap) | (tetap) | (tetap) | Sistem menampilkan pesan "40 rows submitted for approval as 1 submission"<br>AND satu paket berisi 40 baris tampil di "Pending Approval Setup" | Draft | Asumsi A-33 | N-07 |
| AC-30.05 | Add | Menonaktifkan channel untuk company | Saya seorang Maker<br>AND saya berada di halaman "System Parameter"<br>AND parameter "Channel Mobile Enabled" company "001" bernilai "Yes" | Saya mengubah nilai menjadi "No"<br>AND saya mengklik tombol "Submit"<br>AND Checker menyetujui perubahan | Sales company "001" yang login dari aplikasi mobile melihat pesan "Mobile channel is not enabled for your company" | Draft | Asumsi A-46 | I-05 |
| AC-32.03 | Status | (tetap) | (tetap) | (tetap) | (tetap) | Deferred | Grooming N-08 | N-08 |
| AC-35.01 | Edit GIVEN | (tetap) | Ganti "kombinasi Nama Normal dan IP VPN/Proxy ber-outcome Suspicious" menjadi "kombinasi Blacklist "Tidak" dan Frekuensi "Di atas batas" ber-outcome Suspicious" | (tetap) | (tetap) | Draft | Asumsi A-04 | V-01, V-02 |
| AC-35.03 | Edit WHEN | (tetap) | (tetap) | Ganti "Max Applications per Name per Day" menjadi "Max Applications per NIK per Day" | (tetap) | Draft | Asumsi A-04 | V-02 |
| AC-36.05 | Add | Baris matrix dengan [ANY] dipakai sesuai prioritas | Saya seorang Maker<br>AND saya berada di halaman "Decision Matrix Simulation"<br>AND baris prioritas 1 berisi SLIK "Collect 5" dan modul lain "[ANY]" dengan keputusan NotGo<br>AND baris prioritas 2 berisi Scoring "Pass" dan modul lain "[ANY]" dengan keputusan Go | Saya memilih Scoring "Pass", SLIK "Collect 5", dan hasil lain apa pun<br>AND saya mengklik tombol "Run" | Sistem menampilkan hasil "NotGo" beserta baris prioritas 1 yang dipakai | Draft | Asumsi A-41 | E-13 |

### Acceptance criteria: pengajuan dan channel input (US-39 s.d. US-58)

| AC-ID | Perubahan | Skenario | GIVEN | WHEN | THEN | Status | Catatan | Dasar |
|---|---|---|---|---|---|---|---|---|
| AC-40.08 | Add | Persetujuan pemohon belum dicentang | Saya seorang Sales<br>AND saya berada di halaman "New Application - Personal"<br>AND semua field wajib sudah terisi | Saya membiarkan checkbox "Applicant consents to credit checking (SLIK) and personal data processing" kosong<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "Applicant consent is required"<br>AND saya tetap di step "Personal" | Draft | Asumsi A-38 | E-08, E-17 |
| AC-44.01 | Catatan | (tetap) | (tetap) | (tetap) | (tetap) | Draft | Field Dictionary (Grooming T-01) | T-01 |
| AC-44.05 | Add | Field wajib Occupation kosong | Saya seorang Sales<br>AND saya berada di halaman "New Application - Occupation"<br>AND produk KTA | Saya membiarkan "Occupation" dan "Company Name" kosong<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong<br>AND saya tetap di step "Occupation" | Draft | Field Dictionary (Grooming T-01) | T-01 |
| AC-45.01, AC-46.01 | Catatan | (tetap) | (tetap) | (tetap) | (tetap) | Draft | Field Dictionary (Grooming T-01) | T-01 |
| AC-45.05 | Add | Field wajib Business kosong | Saya seorang Sales<br>AND saya berada di halaman "New Application - Business"<br>AND Occupation pemohon "Wiraswasta" | Saya membiarkan "Business Name" dan "Business Field" kosong<br>AND saya mengklik tombol "Next" | Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong<br>AND saya tetap di step "Business" | Draft | Field Dictionary (Grooming T-01) | T-01 |
| AC-49.06 | Catatan | (tetap) | (tetap) | (tetap) | (tetap) | Draft | Asumsi A-34 | E-06 |
| AC-50.05 | Edit THEN | (tetap) | (tetap) | (tetap) | Ganti subjek menjadi "Pengajuan kredit 20102026001KTA0000013 telah kami terima" | Draft | Asumsi A-27 | T-05 |
| AC-50.07 | Add | Tombol Submit diklik dua kali | Saya seorang Sales<br>AND saya berada di halaman "New Application - Emergency Contact"<br>AND semua step wajib dan dokumen sudah lengkap | Saya mengklik tombol "Submit" dua kali dengan cepat<br>AND saya mengklik tombol "Yes" di konfirmasi | Sistem hanya menjalankan satu proses untuk pengajuan tersebut<br>AND riwayat proses hanya berisi satu langkah "Data Entry" | Draft | | AC gap |
| AC-51.02 | Edit THEN | (tetap) | (tetap) | (tetap) | Refer to MRTM Rows: TRM_INS_001 through TRM_INS_002 for comprehensive logic combinations. TRM_INS_003 through TRM_INS_007 berstatus Deferred (Floating, Hybrid, Capped). | Draft | Asumsi A-40, A-45 | N-04, E-10 |
| AC-52.02 | Edit THEN | (tetap) | (tetap) | (tetap) | Tambah baris terakhir: "AND setelah selesai diproses, baris yang berhasil tampil di "Application List" berstatus "Draft" milik saya" | Draft | Asumsi A-43 | E-23 |
| AC-54.02 | Edit GIVEN | (tetap) | Tambah baris terakhir: "AND dokumen wajib pengajuan sudah diunggah lewat endpoint dokumen" | (tetap) | (tetap) | Draft | Asumsi A-43 | E-22 |
| AC-55.04, AC-57.02 | Edit THEN | (tetap) | (tetap) | (tetap) | Ganti kalimat "Only Customer Service can record the payment" menjadi "Only users with appraisal payment access can record the payment" | Draft | Asumsi A-32 | E-05 |
| AC-56.01, AC-57.01 | Catatan | (tetap) | (tetap) | (tetap) | (tetap) | Draft | Field Dictionary (Grooming T-01) | T-01 |
| AC-57.05 | Add | Field wajib appraisal kosong | Saya seorang Surveyor<br>AND saya berada di halaman "Appraisal" | Saya membiarkan "Appraiser Name" dan "Market Value" kosong<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "This field is required" di bawah setiap field wajib yang kosong | Draft | Field Dictionary (Grooming T-01) | T-01 |

### Acceptance criteria: penilaian otomatis dan keputusan (US-59 s.d. US-74)

| AC-ID | Perubahan | Skenario | GIVEN | WHEN | THEN | Status | Catatan | Dasar |
|---|---|---|---|---|---|---|---|---|
| AC-59.01 | Edit THEN | (tetap) | (tetap) | (tetap) | Refer to MRTM Rows: TRM_DDP_001 through TRM_DDP_007 for comprehensive logic combinations. | Draft | Asumsi A-02 | N-06 |
| AC-60.06 | Add | Menghentikan pengajuan ganda yang sedang berjalan | Saya seorang Verifikator<br>AND saya berada di halaman "Prescreen Dedup Detail"<br>AND pengajuan "20102026001KTA0000015" ber-hasil Dedup "Duplicate In-Flight" terhadap pengajuan "20102026001KTA0000013" yang masih On Progress | Saya memilih "Duplicate - Finish" di dropdown "Final Outcome"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Review submitted"<br>AND pengajuan "20102026001KTA0000015" berstatus "Finish" dengan alasan "Duplicate in-flight application"<br>AND pengajuan "20102026001KTA0000013" tidak berubah | Draft | Asumsi A-02 | N-06 |
| AC-65.01 | Edit THEN | (tetap) | (tetap) | (tetap) | Refer to MRTM Rows: TRM_FRD_001 through TRM_FRD_003 and TRM_FRD_006 for comprehensive logic combinations. TRM_FRD_004 and TRM_FRD_005 berstatus Deferred (cek IP). | Draft | Asumsi A-04 | V-01 |
| AC-65.02 | Edit penuh | Cek IP tidak berlaku untuk channel yang ada | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND pengajuan masuk melalui Web, Mobile, Upload Excel, atau API mitra | Saya membuka riwayat proses modul Fraud | Sistem menampilkan pengecekan IP dengan status "Not applicable" dan hasil hanya dari blacklist serta frekuensi pengajuan per NIK | Draft | Asumsi A-04 | V-01 |
| AC-66.01 | Edit GIVEN dan WHEN | (tetap) | Ganti "hasil Fraud Suspicious karena VPN" menjadi "hasil Fraud Suspicious karena 4 pengajuan dengan NIK yang sama hari ini" | Ganti Notes menjadi "Pengajuan ulang setelah data diperbaiki, terverifikasi via telepon" | (tetap) | Draft | Asumsi A-04 | V-01, V-02 |
| AC-68.01 | Edit THEN | (tetap) | (tetap) | (tetap) | Sistem menampilkan "Collectibility 1 - Current" | Draft | Asumsi A-38 | E-08 |
| AC-68.02 | Edit THEN | (tetap) | (tetap) | (tetap) | Refer to MRTM Rows: TRM_SLK_001 through TRM_SLK_008 for comprehensive logic combinations. | Draft | Asumsi A-38 | E-08 |
| AC-69.02 | Edit THEN | (tetap) | (tetap) | (tetap) | Sistem menampilkan "NotGo"<br>AND pengajuan masuk antrean "Recontest"<br>AND tidak ada email yang dikirim ke pemohon | Draft | Asumsi A-07 | V-03 |
| AC-71.02 | Edit THEN | (tetap) | (tetap) | (tetap) | Tambah baris terakhir: "AND email penolakan terkirim ke pemohon" | Draft | Asumsi A-07 | V-03 |
| AC-71.06 | Add | Recontest memakai ulang hasil layanan eksternal yang masih berlaku | Saya seorang Risk Manager<br>AND saya berada di halaman "Recontest"<br>AND hasil SLIK dan Dukcapil pengajuan tertanggal 10-10-2026<br>AND hari ini 20-10-2026<br>AND NIK, nama, tanggal lahir, dan nama ibu tidak berubah | Saya mengklik tombol "Recontest"<br>AND saya mengisi "Reason"<br>AND saya mengklik tombol "Submit" | Sistem tidak memanggil ulang layanan SLIK dan Dukcapil<br>AND riwayat proses menampilkan langkah SLIK dan Dukcapil dengan keterangan "Reused from 10-10-2026" | Draft | Asumsi A-39 | E-15 |
| AC-71.07 | Add | Hasil layanan eksternal berumur lebih dari 30 hari dipanggil ulang | Saya seorang Risk Manager<br>AND saya berada di halaman "Recontest"<br>AND hasil SLIK pengajuan tertanggal 19-09-2026<br>AND hari ini 20-10-2026 | Saya mengklik tombol "Recontest"<br>AND saya mengisi "Reason"<br>AND saya mengklik tombol "Submit" | Sistem memanggil ulang layanan SLIK<br>AND riwayat proses menampilkan hasil SLIK baru tertanggal 20-10-2026 | Draft | Asumsi A-39 | E-15 |
| AC-72.01 | Edit THEN | (tetap) | (tetap) | (tetap) | Ganti "AND struktur kredit dan jadwal angsuran terbentuk" menjadi "AND tab "Approval" menampilkan Plafond, Tenor, Interest Rate, Installment, dan jadwal angsuran dengan sisa pokok baris terakhir Rp0" | Draft | | AC gap |
| AC-72.06 | Edit GIVEN | (tetap) | Ganti "level 2 untuk 0 s.d. 500.000.000 (final), level 1 untuk 500.000.001 s.d. 2.000.000.000 (final)" menjadi "level 2 untuk 0 s.d. 500.000.000, level 1 (tertinggi) untuk 500.000.001 s.d. 2.000.000.000" | (tetap) | (tetap) | Draft | Asumsi A-37 | E-09 |
| AC-72.07 | Add | Dua approver satu sub level memproses pengajuan yang sama | Saya seorang Approver level 2<br>AND saya berada di halaman "Approval Detail"<br>AND Approver lain di sub level yang sama sudah menyetujui pengajuan ini saat detail masih terbuka di layar saya | Saya mengisi "Approval Comments"<br>AND saya mengklik tombol "Approve"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "This application has already been processed"<br>AND keputusan tidak dicatat dua kali | Draft | Asumsi A-37 | E-09 |
| AC-74.01 s.d. AC-74.05 | Edit GIVEN | (tetap) | Ganti "Saya seorang Kepala Cabang" menjadi "Saya seorang Approver" | (tetap) | (tetap) | Draft | (tetap) | Edit US-74 |
| AC-74.01 | Edit THEN | (tetap) | (tetap) | (tetap) | Ganti "AND struktur kredit dan jadwal angsuran terbentuk" menjadi "AND tab "Approval" menampilkan Plafond, Tenor, Interest Rate, Installment, dan jadwal angsuran dengan sisa pokok baris terakhir Rp0" | Draft | Asumsi A-20 | AC gap |

### Acceptance criteria: pasca-approval, monitoring, dan mobile (US-75 s.d. US-94)

| AC-ID | Perubahan | Skenario | GIVEN | WHEN | THEN | Status | Catatan | Dasar |
|---|---|---|---|---|---|---|---|---|
| AC-75.01 | Edit penuh | Mengajukan e-polis dengan premi terhitung | Saya seorang Admin Operasional<br>AND saya berada di halaman "Request Epolis"<br>AND saya sudah mengambil tugas "20102026001KPR0000041" yang disetujui dengan plafon 850.000.000<br>AND tarif premi KPR "Asuransi Contoh" 0,85% | Saya mengklik tombol "Request Epolis"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan "IJK Value" 7.225.000 hasil hitung plafon x tarif premi<br>AND sistem menampilkan pesan "Epolis issued. Policy number: POL-2026-000123"<br>AND struktur kredit dihitung ulang dengan nilai asuransi 7.225.000<br>AND langkah saat ini menjadi "Validity Check" | Draft | Asumsi A-08, A-23 | E-18 |
| AC-75.02 | Edit penuh | Tarif premi belum tersedia | Saya seorang Admin Operasional<br>AND saya berada di halaman "Request Epolis Form"<br>AND produk KPR belum punya tarif premi yang disetujui untuk "Asuransi Contoh" | Saya mengklik tombol "Submit" | Sistem menampilkan pesan "No approved premium rate for product KPR and insurer Asuransi Contoh"<br>AND pengajuan tetap di antrean Request Epolis | Draft | Asumsi A-23 | E-18 |
| AC-75.03 | Edit penuh | Nilai IJK tidak bisa diubah | Saya seorang Admin Operasional<br>AND saya berada di halaman "Request Epolis Form" | Saya mengklik field "IJK Value" | Sistem menampilkan field "IJK Value" dalam keadaan tidak bisa diedit | Draft | Asumsi A-23 | E-18 |
| AC-80.01 | Edit penuh | Respons SUKSES | Saya seorang Admin Operasional<br>AND saya berada di halaman "Core Disbursement"<br>AND pengajuan "20102026001KPR0000041" berada di langkah "Waiting Core Response" | Saya mengklik tombol "Upload Core Response"<br>AND saya memilih file respons core berisi "SUKSES" untuk "20102026001KPR0000041"<br>AND saya mengklik tombol "Upload" | Sistem menampilkan respons "SUKSES" beserta file respons core<br>AND status pengajuan "Disbursed" dan langkah "Finish" | Draft | Asumsi A-09 | I-03 |
| AC-80.02 | Edit penuh | Respons GAGAL | Saya seorang Admin Operasional<br>AND saya berada di halaman "Core Disbursement"<br>AND pengajuan "20102026001KPR0000041" berada di langkah "Waiting Core Response" | Saya mengklik tombol "Upload Core Response"<br>AND saya memilih file respons core berisi "GAGAL" untuk "20102026001KPR0000041"<br>AND saya mengklik tombol "Upload" | Sistem menampilkan respons "GAGAL" beserta alasan dari core<br>AND pengajuan masuk antrean "Recontest" | Draft | Asumsi A-07, A-09 | I-03 |
| AC-80.03 | Edit penuh | Respons untuk Loan ID yang tidak menunggu respons | Saya seorang Admin Operasional<br>AND saya berada di halaman "Core Disbursement"<br>AND pengajuan "20102026001KPR0000041" sudah berstatus Finish | Saya mengunggah file respons core untuk "20102026001KPR0000041" | Sistem menampilkan respons tersebut dengan status "Ignored - application not waiting for core response" | Draft | Asumsi A-09 | I-03 |
| AC-80.04 | Edit penuh | Respons ganda untuk pengajuan yang sama | Saya seorang Admin Operasional<br>AND saya berada di halaman "Core Disbursement"<br>AND respons "SUKSES" untuk "20102026001KPR0000041" sudah diproses | Saya mengunggah file respons "SUKSES" yang sama untuk pengajuan tersebut | Sistem menampilkan respons kedua dengan status "Duplicate - ignored"<br>AND status pengajuan tetap "Disbursed" | Draft | Asumsi A-09 | I-03 |
| AC-80.05 | Add | File respons core tidak bisa dibaca | Saya seorang Admin Operasional<br>AND saya berada di halaman "Core Disbursement" | Saya mengunggah file respons yang rusak<br>AND saya mengklik tombol "Upload" | Sistem menampilkan pesan "Core response file could not be read"<br>AND tidak ada status pengajuan yang berubah | Draft | Asumsi A-09 | I-03 |
| AC-81.01 | Edit GIVEN dan THEN | (tetap) | Tambah baris terakhir: "AND cabang saya punya 3 pengajuan Draft, 5 Submitted, 2 GO, dan 1 NOT GO" | (tetap) | Sistem menampilkan kartu Save as Draft 3, Submitted 5, GO 2, NOT GO 1, dan Total Applications 11 (setiap pengajuan dihitung di satu kartu sesuai status terakhirnya), grafik Disbursement per regional, dan daftar Application State dengan jumlahnya | Draft | | AC gap |
| AC-81.05 | Catatan | (tetap) | (tetap) | (tetap) | (tetap) | Draft | Asumsi A-34 | E-06 |
| AC-81.08 | Add | Melihat metrik kinerja proses | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Dashboard" | Saya membuka panel "Process Metrics" untuk bulan berjalan | Sistem menampilkan median waktu Submit sampai Decision, persentase pengajuan Auto Approved, dan persentase pengajuan yang dikembalikan Verifikator atau Approver | Draft | | V-04 |
| AC-82.05 | Add | NIK disamarkan di file ekspor | Saya seorang Kepala Cabang<br>AND saya berada di halaman "Export Option"<br>AND pengajuan pemohon ber-NIK "3273011402900001" termasuk dalam filter | Saya mengklik tombol "Export" | Sistem mengunduh file dengan kolom NIK berisi "327301********01" | Draft | Asumsi A-38 | E-17 |
| AC-83.06 | Edit THEN | (tetap) | (tetap) | (tetap) | Sistem memperbarui state pengajuan menjadi langkah berikutnya tanpa saya memuat ulang halaman dalam 30 detik setelah modul Dedup selesai | Draft | Asumsi A-44 | E-30 |
| AC-84.04 | Catatan | (tetap) | (tetap) | (tetap) | (tetap) | Draft | Asumsi A-35 | E-02 |
| AC-84.06 | Add | Membuka detail pengajuan tercatat di audit trail | Saya seorang Sales<br>AND saya berada di halaman "Application Inquiry" | Saya mengklik Loan ID "20102026001KPR0000041" | Sistem menampilkan detail pengajuan<br>AND audit trail mencatat akses saya dengan Event Type "Data Access", waktu, dan Loan ID | Draft | Asumsi A-38 | E-17 |
| AC-85.01 | Edit THEN | (tetap) | (tetap) | (tetap) | Ganti "AND diagram rute versi yang dipakai pengajuan tampil" menjadi "AND daftar modul rute versi yang dipakai pengajuan tampil" | Draft | | N-08 |
| AC-85.04 | Edit THEN | (tetap) | (tetap) | (tetap) | Sistem menampilkan Aging "2" (selisih tanggal kalender End Date dan Start Date) | Draft | | AC gap |
| AC-87.01 | Edit THEN | (tetap) | (tetap) | (tetap) | Refer to MRTM Rows: TRM_NTF_001 through TRM_NTF_008 for comprehensive logic combinations. | Draft | Asumsi A-07, A-27 | V-03, T-05 |
| AC-88.01 | Edit THEN | (tetap) | (tetap) | (tetap) | Sistem menampilkan Total Sales bulan berjalan (total plafon pengajuan saya yang berstatus Disbursed), persentase dibanding bulan lalu ((bulan ini dikurangi bulan lalu) dibagi bulan lalu, "-" bila bulan lalu 0), dan 3 tile kategori: Non Collateral Loan, Collateral Loan, Pension Credit | Draft | Asumsi A-25 | N-02, AC gap |
| AC-88.03 | Edit GIVEN dan WHEN | (tetap) | Ganti "belum ada produk Syariah yang aktif" menjadi "belum ada produk Pension Credit yang aktif" | Ganti tile "Syariah Compliant Finance" menjadi "Pension Credit" | (tetap) | Draft | | N-02 |

AC-01.08 (uji injeksi) tetap di tempatnya sampai ada dokumen uji keamanan non-fungsional; saat dokumen itu dibuat, AC-01.08 dipindahkan ke sana.

### Acceptance criteria untuk user story baru

| AC-ID | Skenario | GIVEN | WHEN | THEN | Status | Catatan |
|---|---|---|---|---|---|---|
| AC-95.01 | Menambah data blacklist | Saya seorang Risk Manager<br>AND saya berada di halaman "Blacklist" | Saya mengklik tombol "New Blacklist"<br>AND saya mengisi "ID Card Number" dengan "3273011402900009" dan "Full Name ID" dengan "BUDI SANTOSO"<br>AND saya mengisi "Reason" dengan "Dokumen palsu terkonfirmasi"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND data tampil di "Pending Blacklist" dengan status "Waiting Approval" | Draft | Asumsi A-04 |
| AC-95.02 | Mencabut data blacklist | Saya seorang Risk Manager<br>AND saya berada di halaman "Blacklist"<br>AND NIK "3273011402900009" ada di blacklist | Saya mengklik ikon cabut pada baris tersebut<br>AND saya mengisi "Reason" dengan "Salah input, terverifikasi Dukcapil"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND setelah Checker menyetujui, pengajuan baru dengan NIK tersebut tidak lagi ber-hasil High Fraud Potential | Draft | Asumsi A-04 |
| AC-95.03 | Tanpa alasan | Saya seorang Risk Manager<br>AND saya berada di halaman "New Blacklist" | Saya mengisi "ID Card Number" tanpa mengisi "Reason"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Reason is required" | Draft | |
| AC-95.04 | NIK sudah di blacklist | Saya seorang Risk Manager<br>AND saya berada di halaman "New Blacklist"<br>AND NIK "3273011402900009" sudah ada di blacklist | Saya mengisi "ID Card Number" dengan "3273011402900009"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "ID card number is already blacklisted" | Draft | |
| AC-95.05 | Asal data dari keputusan Verifikator | Saya seorang Risk Manager<br>AND saya berada di halaman "Blacklist"<br>AND Verifikator memilih "Reject and Blacklist" untuk pemohon NIK "3273011402900010" | Saya mengetik "3273011402900010" di field "Search" | Sistem menampilkan data dengan Source "Prescreen Fraud", Loan ID asal, nama Verifikator, dan catatannya | Draft | Asumsi A-04 |
| AC-96.01 | Mendaftarkan mitra | Saya seorang Maker<br>AND saya berada di halaman "Partner Application" | Saya mengklik tombol "New Partner"<br>AND saya mengisi "Partner Code" "MTR01" dan "Partner Name" "Koperasi Contoh"<br>AND saya memilih Branch "011 - Bandung" dan Product "KTA"<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND setelah Checker menyetujui, user sistem "partner.MTR01" terbentuk di Branch "011 - Bandung" | Draft | Asumsi A-43 |
| AC-96.02 | Menerbitkan API key | Saya seorang Maker<br>AND saya berada di halaman "Partner Application"<br>AND mitra "MTR01" aktif | Saya mengklik tombol "Generate API Key" pada mitra "MTR01"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan API key satu kali dengan keterangan "Copy this key now. It will not be shown again" | Draft | Asumsi A-43 |
| AC-96.03 | Mencabut API key | Saya seorang Maker<br>AND saya berada di halaman "Partner Application"<br>AND mitra "MTR01" punya API key aktif | Saya mengklik tombol "Revoke" pada API key tersebut<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "API key revoked"<br>AND permintaan token dengan key tersebut ditolak dengan kode 401 | Draft | Asumsi A-43 |
| AC-96.04 | Produk di luar izin mitra | Saya seorang Tim IT mitra "MTR01" dengan token valid<br>AND mitra hanya diizinkan mengirim produk KTA | Saya mengirim pengajuan produk KPR | Sistem menolak permintaan dengan kode 403 dan pesan "Product KPR is not allowed for this partner" | Draft | Asumsi A-43 |
| AC-96.05 | Batas jumlah permintaan | Saya seorang Tim IT mitra dengan token valid<br>AND saya sudah mengirim 60 permintaan dalam 1 menit terakhir | Saya mengirim permintaan ke-61 | Sistem menolak permintaan dengan kode 429 dan pesan "Rate limit exceeded. Try again later" | Draft | Asumsi A-43 |
| AC-96.06 | Pengajuan tanpa dokumen wajib | Saya seorang Tim IT mitra dengan token valid<br>AND pengajuan dengan reference number "MTR-0002" belum punya dokumen KTP | Saya mengirim pengajuan "MTR-0002" ke endpoint insert customer | Sistem menolak permintaan dengan kode 400 dan pesan "Required documents missing: KTP"<br>AND tidak ada pengajuan yang dibuat | Draft | Asumsi A-43 |
| AC-97.01 | Mengatur pricing produk | Saya seorang Maker<br>AND saya berada di halaman "Product"<br>AND produk "KTA" bertenor 6 s.d. 60 bulan | Saya membuka tab "Pricing" pada produk "KTA"<br>AND saya menambah baris Tenor 6 s.d. 24 bulan dengan Interest Rate 12% p.a. dan Tenor 25 s.d. 60 bulan dengan Interest Rate 14% p.a.<br>AND saya mengisi "Provision Fee (%)" "1" dan "Admin Fee" "250.000"<br>AND saya mengisi "Approver Rate Range" 11% s.d. 15%<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Data submitted for approval"<br>AND perubahan pricing tampil di "Pending Product" | Draft | Asumsi A-48 |
| AC-97.02 | Rentang tenor tumpang tindih | Saya seorang Maker<br>AND saya berada di tab "Pricing" produk "KTA" | Saya menambah baris Tenor 6 s.d. 24 bulan dan Tenor 24 s.d. 60 bulan<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Tenor ranges must not overlap" | Draft | Asumsi A-48 |
| AC-97.03 | Rentang tenor tidak mencakup tenor produk | Saya seorang Maker<br>AND saya berada di tab "Pricing" produk "KTA" bertenor 6 s.d. 60 bulan | Saya menambah baris Tenor 6 s.d. 24 bulan dan Tenor 30 s.d. 60 bulan<br>AND saya mengklik tombol "Submit" | Sistem menampilkan pesan "Tenor ranges must cover 6 to 60 months" | Draft | Asumsi A-48 |
| AC-97.04 | Suku bunga tampil read-only di pengajuan | Saya seorang Sales<br>AND saya berada di halaman "New Application - Application"<br>AND pricing KTA sudah disetujui | Saya memilih Product "KTA"<br>AND saya memilih "36" di "Tenor Proposed" | Sistem menampilkan "Interest Rate" 14% p.a. dalam keadaan tidak bisa diedit | Draft | Asumsi A-48 |
| AC-97.05 | Approver mengubah suku bunga di luar rentang | Saya seorang Approver level 1<br>AND saya berada di halaman "Approval Detail"<br>AND pengajuan KTA tenor 36 dengan Interest Rate 14% dan Approver Rate Range 11% s.d. 15% | Saya mengubah "Interest Rate" menjadi "16"<br>AND saya mengisi "Approval Comments"<br>AND saya mengklik tombol "Approve" | Sistem menampilkan pesan "Interest rate must be between 11% and 15%" | Draft | Asumsi A-48 |
| AC-97.06 | Approver mengubah suku bunga dalam rentang | Saya seorang Approver level 1<br>AND saya berada di halaman "Approval Detail"<br>AND pengajuan KTA tenor 36 dengan Interest Rate 14% dan Approver Rate Range 11% s.d. 15% | Saya mengubah "Interest Rate" menjadi "13"<br>AND saya mengisi "Approval Comments" dengan "Nasabah payroll"<br>AND saya mengklik tombol "Approve"<br>AND saya mengklik tombol "Yes" | Sistem menampilkan pesan "Loan application is successfully approved"<br>AND jadwal angsuran dihitung dengan 13% p.a.<br>AND riwayat mencatat perubahan Interest Rate dari 14% menjadi 13% | Draft | Asumsi A-48 |
| AC-98.01 | Migrasi dengan laporan rekonsiliasi | Saya seorang Admin Sistem di lingkungan migrasi<br>AND file ekstrak OS11 berisi 1.200 user, 15.000 nasabah, dan 40.000 pengajuan historis | Saya menjalankan proses migrasi | Sistem menampilkan laporan rekonsiliasi dengan jumlah sumber, berhasil, dan gagal per jenis data<br>AND jumlah berhasil ditambah gagal sama dengan jumlah sumber | Draft | Asumsi A-49 |
| AC-98.02 | Baris gagal tidak menghentikan migrasi | Saya seorang Admin Sistem di lingkungan migrasi<br>AND file ekstrak berisi 3 user tanpa email | Saya menjalankan proses migrasi | Sistem menampilkan 3 baris gagal dengan alasan "Email is required"<br>AND baris lain tetap termigrasi | Draft | Asumsi A-49 |
| AC-98.03 | Pengajuan in-flight tidak dimigrasi | Saya seorang Admin Sistem di lingkungan migrasi<br>AND file ekstrak berisi pengajuan OS11 berstatus On Progress | Saya menjalankan proses migrasi | Sistem tidak memigrasikan pengajuan tersebut<br>AND laporan menampilkannya di kategori "Skipped - in-flight, completed in OS11" | Draft | Asumsi A-49 |
| AC-98.04 | Pengajuan historis hanya bisa dibaca | Saya seorang Sales<br>AND saya berada di halaman "Application Inquiry"<br>AND terdapat pengajuan hasil migrasi dari OS11 | Saya membuka detail pengajuan tersebut | Sistem menampilkan label "Migrated from OS11" tanpa tombol edit dan tanpa langkah proses yang bisa dijalankan | Draft | Asumsi A-49 |
| AC-98.05 | Dedup membandingkan dengan data hasil migrasi | Saya seorang Risk Manager<br>AND saya berada di halaman "Application Detail - Workflow"<br>AND nasabah hasil migrasi ber-NIK "3273011402900001" | Saya membuka riwayat proses pengajuan baru dengan NIK "3273011402900001" yang baru melewati modul Dedup | Sistem menampilkan hasil Dedup "Match" dengan data pembanding nasabah hasil migrasi | Draft | Asumsi A-02, A-49 |

### Perubahan MRTM

| MRTM | Baris | Perubahan | Dasar |
|---|---|---|---|
| TRM_LID | 001 s.d. 006 | Kolom HASIL memakai format G-1. TRM_LID_004 menjadi "Loan ID 20102026007KTA0000001" dengan Kondisi Khusus "Counter terpisah per company; kode company membuat Loan ID unik". TRM_LID_006 menjadi "0000013 dan 0000014" dengan prefiks 20102026001KTA. | E-03 |
| TRM_APV | 001 s.d. 005 | Tidak berubah; sudah memakai level 1 sebagai level tertinggi. | E-09 |
| TRM_DDP | 005 | Kondisi Khusus "NIK kosong (seharusnya ditolak validasi submit)"; HASIL "Dedup = Review; masuk antrean Prescreen Dedup". | T-02 |
| TRM_DDP | 007 (baru) | US_59, AC_59.01, Risk Manager, NIK "Match", atribut lain [ANY], Kondisi Khusus "NIK sama dengan pengajuan lain berstatus On Progress di company yang sama", HASIL "Dedup = Duplicate In-Flight; masuk antrean Prescreen Dedup". | N-06 |
| TRM_DKC | 008 | Kondisi Khusus "Tanggal lahir kosong (seharusnya ditolak validasi submit)"; HASIL "Review; masuk antrean Prescreen Dukcapil". | T-02 |
| TRM_FRD | Header | "Jumlah Pengajuan Nama yang Sama" menjadi "Jumlah Pengajuan NIK yang Sama per Hari". | V-02 |
| TRM_FRD | 002 | HASIL "Suspicious; masuk antrean Prescreen Fraud" (tanpa blacklist otomatis). | V-02 |
| TRM_FRD | 004, 005 | Kondisi Khusus diawali "[Deferred]". | V-01 |
| TRM_INS | 001 | HASIL "Angsuran Rp9.333.333 per bulan untuk angsuran ke-1 s.d. ke-11 (pokok 8.333.333 + bunga 1.000.000); angsuran ke-12 Rp9.333.337 karena selisih pembulatan pokok Rp4 ditaruh di angsuran terakhir". | E-10 |
| TRM_INS | 003 s.d. 007 | Kondisi Khusus diawali "[Deferred]". | N-04 |
| TRM_SLK | 001 s.d. 008 | Ganti seluruh baris: 001 nilai 1 "Collectibility 1 - Current"; 002 nilai 2 "Collectibility 2 - Special Mention"; 003 nilai 3 "Collectibility 3 - Substandard"; 004 nilai 4 "Collectibility 4 - Doubtful"; 005 nilai 5, Kondisi "Nilai tertinggi", "Collectibility 5 - Loss"; 006 nilai [-], Kondisi "Tidak ada riwayat kredit", "No credit history"; 007 nilai 6, Kondisi "Nilai di luar rentang dari layanan", HASIL "Langkah SLIK berstatus "Error" dengan pesan "Invalid collectibility value: 6""; 008 nilai "1, 3, 2", Kondisi "Beberapa fasilitas; kolektibilitas terburuk dipakai", "Collectibility 3 - Substandard". | E-08 |
| TRM_NTF | 001 | Subjek "Pengajuan kredit 20102026001KTA0000013 telah kami terima". | T-05 |
| TRM_NTF | 002 | Subjek [-]; Kondisi "Pengajuan masuk antrean Recontest"; HASIL "Tidak ada email". | V-03 |
| TRM_NTF | 003 | Subjek "Pengajuan kredit 20102026001KTA0000013 belum dapat disetujui". | T-05 |
| TRM_NTF | 004 | Subjek "Kredit 20102026001KTA0000013 telah dicairkan". | T-05 |
| TRM_NTF | 007 (baru) | Kejadian "Risk Manager memilih Finish di Recontest"; Subjek "Pengajuan kredit 20102026001KTA0000013 belum dapat disetujui"; HASIL "Email terkirim satu kali". | V-03 |
| TRM_NTF | 008 (baru) | Kejadian "Dukcapil Failed (pengajuan Finish)"; Subjek "Pengajuan kredit 20102026001KTA0000013 belum dapat disetujui"; HASIL "Email terkirim satu kali". | V-03 |

### Perubahan asumsi: yang sudah ada

Teks pengganti penuh untuk kolom "Asumsi BA" di sheet Asumsi.

| ID | Teks baru | Dasar |
|---|---|---|
| A-01 | Web, Mobile, API mitra, dan Upload Excel semuanya ditulis US-nya. Fase rilis ditetapkan di refinement 2026-10-21: Rilis 1 web; Mobile, API mitra, dan Upload Excel di Rilis 4. | N-01 |
| A-02 | Match = pemohon adalah nasabah yang sudah ada (Existing Customer), boleh lanjut ke Verification tanpa Dukcapil. Duplicate In-Flight = NIK sama dengan pengajuan lain yang masih On Progress di company yang sama, masuk Prescreen Dedup. UnMatch = bukan nasabah yang sudah ada, lanjut ke Dukcapil. Review = perlu keputusan manusia di Prescreen Dedup. Data pembanding: nasabah dan pengajuan di Cikal plus data migrasi OS11, per company. Field identitas wajib divalidasi saat submit di semua channel; bila tetap kosong, hasil = Review. | N-06, E-12, T-02 |
| A-03 | Memakai skor berbobot dari dokumen teknis: DOB dan POB wajib sama persis, skor = nama x 0,60 + nama ibu x 0,40, Passed >= 0,90, Review 0,75 s.d. < 0,90, Failed < 0,75, Review bila data wajib kosong. Bobot dan ambang menjadi parameter yang bisa diatur. Cara skor nama dihitung dikonfirmasi lewat spike sandbox Dukcapil. | T-02, E-11 |
| A-04 | Fraud check memakai blacklist dan frekuensi pengajuan per NIK per company. Pemohon di blacklist = High Fraud Potential, pengajuan berhenti (Finish). Frekuensi melebihi batas harian (default 3) = Suspicious, masuk antrean Prescreen Fraud; blacklist hanya lewat keputusan Verifikator atau US-95. Cek IP (VPN/proxy, lokasi IP) berstatus Not applicable untuk Web, Mobile, Upload Excel, dan API mitra karena IP milik pegawai atau server mitra; ditunda sampai ada channel self-service. | V-01, V-02 |
| A-07 | Dilakukan Risk Manager. Berlaku untuk Decision NotGo dan respons core GAGAL. Email penolakan dikirim hanya saat pengajuan berakhir (Finish), bukan saat masuk Recontest. | V-03 |
| A-09 | Sistem membuat satu file JSON per pengajuan; nilai buss_unit, create_by, dan obj_code diambil dari konfigurasi per company dan produk (contoh LB2, LOS, HONVAR011). Batas tenor tiap produk core divalidasi saat produk disimpan. Rilis 1: file pencairan diunduh dan file respons core diunggah manual oleh Admin Operasional; otomasi SFTP/API ditunda. | I-03, E-19 |
| A-10 | Setiap integrasi punya implementasi nyata dan mock. AC ditulis terhadap perilaku bisnis, tidak bergantung pada sistem asli. Koneksi ke sistem asli menjadi story terpisah per layanan setelah sandbox tersedia. | I-02 |
| A-11 | Satu penyedia identitas (OpenID Connect) per company, didaftarkan Super User. User SSO yang belum terdaftar dibuat otomatis tanpa role di company pemilik penyedia identitas, masuk ke halaman tanpa akses dengan pesan menunggu admin. Akun SSO tertaut ke user lokal hanya bila domain email terdaftar untuk company tersebut. | E-20 |
| A-12 | Company hanya dibuat oleh Super User lewat Company Configuration, dengan dua akun awal: Admin (Maker) dan Checker, agar checker-maker berjalan sejak hari pertama. Regional, Branch, Sub Branch, dan Currency dikelola Maker dengan checker-maker. | E-04 |
| A-23 | Nilai IJK (premi) dihitung otomatis = plafon x tarif premi produk dari master asuransi (US-29) dan tidak bisa diubah. Rilis 1 satu perusahaan asuransi via API. | E-18 |
| A-24 | Format Loan ID: ddMMyyyy + kode company 3 digit + kode produk (1 s.d. 5 karakter huruf/angka) + 7 digit counter per produk per company. Dibuat saat Save as Draft pertama. Nomor yang terpakai draft yang ditinggalkan tidak dipakai ulang. | E-03 |
| A-25 | Kategori produk: Collateral Loan, Non Collateral Loan, Pension. Syariah Compliant Finance ditunda sampai ada US/AC pembiayaan syariah. Flag IsKPR dan NeedSIKP digantikan rute produk. | N-02 |
| A-27 | Label UI dan pesan sistem berbahasa Inggris. Email ke nasabah berbahasa Indonesia. | T-05 |
| A-28 | Link reset berlaku 10 menit; tautan pembuatan password admin baru berlaku 24 jam. Akun terkunci 15 menit setelah 5 kali gagal login berturut-turut. Sesi berakhir setelah 30 menit tanpa aktivitas; satu sesi aktif per user per channel. Verifikasi dua langkah (aplikasi authenticator) wajib untuk Super User, Admin, Checker, dan Approver. Password baru tidak boleh sama dengan 5 password terakhir. | E-25 |
| A-30 | Keputusan brainstorming 2026-10-19: rute per produk, admin menyalakan atau mematikan modul, urutan tetap, kondisi internal modul tetap di sistem. Rilis 1 menampilkan rute sebagai daftar modul; diagram bergaya React Flow dan perbandingan versi di Rilis 5. | N-08 |

### Perubahan asumsi: baru

Kolom "Pertanyaan Terkait" di sheet Asumsi diisi ID pertanyaan grooming.

| ID | Pertanyaan Terkait | Topik | Asumsi |
|---|---|---|---|
| A-32 | Grooming E-05 | Perilaku terikat hak akses | Setiap antrean dan aksi kerja adalah menu atau sub menu dengan hak akses View, Create, Update, Delete, Approve. Tidak ada logika berdasarkan nama role; role bawaan hanya template awal. |
| A-33 | Grooming N-07 | Paket checker-maker | Satu kali Submit (satu form, satu file impor, satu sesi edit matrix) menjadi satu paket yang disetujui atau ditolak utuh oleh Checker. |
| A-34 | Grooming E-06 | Visibilitas data | Sales melihat pengajuan sendiri; Customer Service, Surveyor, dan Kepala Cabang melihat Branch dan Sub Branch di bawahnya; Verifikator, Supervisor, Risk Manager, Admin Operasional, dan Auditor melihat seluruh company; Approver melihat pengajuan yang dirutekan ke levelnya. Rincian per layar di tabel E-06. |
| A-35 | Grooming E-02 | Multi-company | Satu aplikasi melayani banyak company dengan isolasi data per company di setiap akses data. Super User adalah pegawai PPU dan satu-satunya role lintas company. |
| A-36 | Grooming E-14 | Snapshot aturan | Parameter produk, pricing, rute, model scoring, Dedup/Fraud/Decision Matrix, dan kurs di-snapshot saat Submit. Recontest dan submit ulang setelah Return atau Not Valid mengambil snapshot baru. |
| A-37 | Grooming E-09, T-03 | Level approval | Level 1 = kewenangan tertinggi. Pengajuan berjalan dari level terendah naik sampai level yang rentangnya mencakup nominal. Dalam satu sub level, approver mana pun boleh memutuskan lewat antrean bersama; sub level berurutan. Bila semua approver satu level nonaktif, langkah Approval berstatus Error. |
| A-38 | Grooming E-08, E-17, E-29 | SLIK dan data pribadi | Persetujuan pemohon untuk pemeriksaan SLIK dan pemrosesan data pribadi wajib dicentang di step Personal. SLIK menampilkan lima kelas OJK dan memakai kolektibilitas terburuk dari seluruh fasilitas. NIK disamarkan di ekspor; akses detail pengajuan tercatat di audit trail dengan Event Type "Data Access". Angka retensi menunggu tim kepatuhan bank. |
| A-39 | Grooming E-15 | Pemakaian ulang hasil layanan eksternal | Hasil Dukcapil, SLIK, SIKP, dan EDAPEM berumur 30 hari atau kurang dipakai ulang saat recontest atau submit ulang bila NIK, nama, tanggal lahir, dan nama ibu tidak berubah. |
| A-40 | Grooming E-10 | Pembulatan angsuran | Angsuran dibulatkan ke rupiah terdekat, selisih pembulatan ditaruh di angsuran terakhir, basis 30/360. Dikonfirmasi ulang dengan contoh jadwal dari core FAST. |
| A-41 | Grooming E-13 | Wildcard matrix | Baris Dedup, Fraud, dan Decision Matrix boleh memakai [ANY] dan dievaluasi berdasarkan urutan prioritas; baris pertama yang cocok dipakai; tanpa baris cocok = NotGo. |
| A-42 | Grooming E-16 | Aplikasi mobile | Android saja, wajib online. Isian section disimpan sementara di perangkat (terenkripsi) sampai berhasil terkirim. iOS dan offline penuh ditunda. |
| A-43 | Grooming E-22, E-23 | API mitra dan upload massal | Mitra didaftarkan per company dengan cabang tujuan dan produk yang diizinkan; pengajuan API dimiliki user sistem "partner.<kode>"; dokumen dikirim lewat endpoint terpisah sebelum submit; batas 60 permintaan per menit per mitra. Hasil Upload Excel menjadi Draft milik Sales pengunggah. |
| A-44 | Grooming E-24, E-30, V-05 | Kebutuhan non-fungsional (default) | 5 bank, 1.000 pengajuan per hari per bank, 300 user bersamaan; 95% layar terbuka di bawah 2 detik; Submit sampai Decision di bawah 5 menit bila layanan eksternal normal; ketersediaan 99,5% jam kerja; kehilangan data maksimal 1 jam, pulih dalam 4 jam. Daftar inquiry menyegarkan otomatis tiap 30 detik. Alert ke tim operasional TI bila satu adapter gagal 5 kali dalam 15 menit. |
| A-45 | Grooming N-01 s.d. N-04 | Ruang lingkup Rilis 1 | Rilis 1: web, satu company, produk KTA end-to-end, mata uang IDR, bunga Flat dan Effective. Syariah, valas, serta bunga Floating, Hybrid, dan Capped ditunda; AC terkait berstatus "Deferred". |
| A-46 | Grooming I-05 | Toggle channel | Channel Mobile, API mitra, dan Upload Excel bisa dinyalakan atau dimatikan per company lewat System Parameter. |
| A-47 | Grooming E-27 | Data wilayah | Data wilayah diperbarui dengan mengunggah file kode wilayah Kemendagri dan kode pos; sinkronisasi API ditunda. |
| A-48 | Grooming E-07 | Pricing produk | Suku bunga dan biaya (provisi, administrasi) adalah atribut produk per rentang tenor, tampil read-only di pengajuan. Approver final boleh mengubah suku bunga dalam rentang produk dengan komentar wajib. |
| A-49 | Grooming I-01 | Migrasi OS11 | Pengajuan baru masuk Cikal sejak go-live; pengajuan in-flight diselesaikan di OS11 (run-off). User, master data, serta data nasabah dan pengajuan historis dimigrasikan; data historis hanya bisa dibaca. |

## Tindak lanjut terbuka

Jawaban "sesuai rekomendasi" untuk butir berikut masih menyisakan tindakan sebelum story terkait bisa dikerjakan.

| ID | Tindakan | Pemilik | Dibutuhkan sebelum |
|---|---|---|---|
| I-02 | Konfirmasi bahwa "A-19" maksudnya A-10 (integrasi mock-first) | BA | Sprint 1 |
| E-01 | Kebijakan hosting dan lokasi data tiap bank target | BA | Technical spec |
| I-02, E-08 | Status perjanjian, sandbox, dokumen API, PIC untuk 11 layanan; SLIK lewat API atau iDeb | BA | Story integrasi asli per layanan |
| T-01 | Field Dictionary section Personal dan Occupation | BA | Increment 1b |
| E-28 | Template Akad dan SP3K KTA dari OS11 | BA | Increment 1b |
| E-13 | Isi awal Dedup, Fraud, dan Decision Matrix (Excel) | BA | Sprint modul otomatis (1b) |
| E-10 | Contoh jadwal angsuran Flat dan Effective dari core FAST | BA | Increment 1b |
| E-11 | Spike respons sandbox Dukcapil | Tech Lead | Estimasi US-61 |
| S-04 | Tulis US-95 (blacklist), US-96 (mitra API), US-97 (suku bunga dan biaya), US-98 (migrasi) | BA | US-97 sebelum increment 1a; lainnya sebelum rilisnya |
| S-01 | Konfirmasi revisi Rilis 1 (antrean keputusan manusia masuk increment 1c) | BA | Sprint planning |
| E-17, E-29 | Angka retensi data pengajuan dan audit trail | BA dan tim kepatuhan bank | Go-live Rilis 1 |
| E-21 | Kewajiban pelaporan calon debitur dan realisasi ke SIKP | BA dan tim KUR bank | Rilis 3 |
| V-04 | Baseline metrik dari data OS11 | BA/PO | Go-live Rilis 1 |
| E-24 | Koreksi angka non-fungsional (default dipakai sampai dikoreksi) | BA | Technical spec |
| Semua | Putuskan kapan "Rincian perubahan US/AC" dipindahkan ke `Docs/ba/` (xlsx sebagai sumber, lalu `us-ac.md` dan TSV dibentuk ulang) | BA | Sebelum sprint pertama Rilis 1 |

## Register rilis berikutnya

Semua yang sengaja ditunda pada refinement ini, agar bisa diambil lagi tanpa membuka ulang diskusi. Kolom "Syarat mulai" berisi hal yang harus ada sebelum butir masuk grooming.

| # | Butir | Asal | Rencana | Syarat mulai |
|---|---|---|---|---|
| 1 | Pembiayaan syariah: akad, margin/ujrah, dokumen, tile "Syariah Compliant Finance", Platform "Syariah" | N-02, AC-15.01, AC-88.01 | Epic terpisah | US/AC dari BA syariah |
| 2 | Valas: mata uang selain IDR, kurs, konversi nominal | N-03, US-18, US-19, AC-19.04 | Setelah Rilis 5 | Ada produk valas aktif di bank pengguna |
| 3 | Jenis bunga Floating, Hybrid, Capped | N-04, US-51, TRM_INS_003 s.d. TRM_INS_007 | Setelah Rilis 2 | Master suku bunga dasar dan pemiliknya |
| 4 | Rumus bebas pada model scoring dan RAC | N-05, US-37 | Bila diminta tim risiko | Spike expression engine satu sprint |
| 5 | Otomasi respons core lewat SFTP atau API | I-03, US-80 | Setelah Rilis 1 | Kontrak dengan tim core FAST |
| 6 | Pengiriman file pencairan otomatis ke core (bukan unduh) | A-09, US-79 | Bersama butir 5 | Kontrak dengan tim core FAST |
| 7 | Koneksi asli ke layanan eksternal, satu story per layanan | I-02 | Per layanan, saat sandbox tersedia | Perjanjian dan sandbox |
| 8 | Cek IP pada fraud check | V-01, TRM_FRD_004, TRM_FRD_005 | Bila ada channel self-service nasabah | Layanan IP intelligence |
| 9 | Diagram rute interaktif dan perbandingan dua versi | N-08, US-32, AC-32.03 | Rilis 5 | Tidak ada |
| 10 | Aplikasi iOS | E-16 | Setelah Rilis 4 | Data proporsi perangkat Sales |
| 11 | Mode offline penuh di mobile | E-16, AC-88.04, AC-89.04 | Setelah Rilis 4 | Kebutuhan area tanpa sinyal terbukti |
| 12 | Integrasi API perusahaan asuransi tambahan | E-18, US-75 | Per perusahaan | Dokumen API tiap perusahaan |
| 13 | Pelaporan calon debitur dan realisasi KUR ke SIKP | E-21, US-70 | Rilis 3 bila wajib | Konfirmasi tim KUR |
| 14 | Sinkronisasi API data wilayah | E-27, US-23 | Bila ada sumber resmi stabil | Sumber data |
| 15 | Pembaruan daftar instan lewat push | E-30, AC-83.06 | Bila polling 30 detik dikeluhkan | Tidak ada |
| 16 | Pelepasan otomatis tugas yang diambil terlalu lama | T-04, US-58 | Setelah Rilis 2 | Batas waktu dari BA |
| 17 | Migrasi pengajuan in-flight OS11 (tidak dikerjakan; OS11 run-off) | I-01 | Hanya bila run-off dibatalkan | Pemetaan state BPT OS11 ke rute Cikal |
| 18 | Potongan lanjutan story besar: US-12/US-13 (d), US-31 (d), US-37 (c), US-54 (a) s.d. (d), US-84 (b) dan (c), US-89 | S-02 | Mengikuti rilis masing-masing | Potongan sebelumnya selesai |
| 19 | Integrasi core banking FAST: file pencairan (US-79), respons core (US-80), simulasi respons core (AC-94.01), batas tenor dan nilai tetap file core | Keputusan Product Owner 2026-10-21 (grooming v2 N-05) | Setelah Rilis 1; Rilis 1 memakai pencatatan hasil pencairan manual (usulan US-101) | Kontrak dengan tim core; pertanyaan pesan 3 di `pertanyaan-stakeholder-v2.md` |

### Langkah berikutnya

Estimasi Rilis 1 memakai `Docs/ba/us-ac.md` bersama bagian "Rincian perubahan US/AC" di dokumen ini. Tutup butir "Dibutuhkan sebelum: Increment 1a/1b" di Tindak lanjut terbuka sebelum sprint pertama. Saat BA memutuskan memindahkan perubahan ke `Docs/ba/`, ubah xlsx terlebih dahulu, lalu bentuk ulang `us-ac.md` dan seluruh TSV dari xlsx.
