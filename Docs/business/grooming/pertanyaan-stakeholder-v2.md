# Pertanyaan untuk Stakeholder (dari Grooming v2)

**Tanggal:** 2026-10-21  
**Sumber:** `grooming-cikal-ba-v2.md`  

Satu pesan per pemilik jawaban. Setiap pesan bisa dikirim apa adanya; ganti `[nama]` sebelum mengirim.

| No | Penerima | Pertanyaan grooming | Batas jawaban | Status 2026-10-21 |
|---|---|---|---|---|
| 1 | Product Owner / Sales | I-01, V-01, N-02 | Jumat, 23 Oktober 2026 | Sebagian: on-premise lebih dulu. Nama client dan paket modul belum. |
| 2 | BA (Fahrudin) | E-01, E-02 | Jumat, 23 Oktober 2026 | Ditunda ("tidak perlu dulu"); usulan default dipakai sebagai asumsi kerja. |
| 3 | Tim core banking FAST | E-03, R-12, R-07, R-13, v1 E-10 | Jumat, 23 Oktober 2026 | Tidak dikirim: Cikal tidak terhubung ke core FAST di Rilis 1. Dikirim saat integrasi core masuk rencana. |
| 4 | Pemilik kontrak Oksara | I-02 | Jumat, 23 Oktober 2026 | Selesai: credential tersedia. |
| 5 | Tim KUR | E-04, v1 E-21 | Sebelum perencanaan Rilis 3 | Belum dikirim. |
| 6 | Tim IT client on-premise | E-11, E-12, E-13 | Secepatnya; memblokir pemilihan tech stack | Baru, siap dikirim. |

---

## 1. Product Owner / Sales

**Subjek:** Cikal: client pertama dan paket modul

Halo [nama],

Tim engineering sedang menetapkan ruang lingkup Rilis 1 Cikal. Cikal dijual per modul (CORE dan M01 sampai M15), sehingga isi Rilis 1 bergantung pada modul yang dibeli client pertama.

1. Siapa client pertama Cikal, dan kapan target go-live-nya?
2. Modul apa saja yang dibeli client tersebut?
3. Apakah client tersebut memakai SaaS atau on-premise?
4. Apakah sudah ada calon client kedua dengan paket modul yang berbeda?

Bila belum ada kepastian, usulan kami: Rilis 1 untuk satu client SaaS dengan paket CORE, M06 Dedup, M07 Dukcapil, M08 Fraud, M09 Scoring & RAC, M10 SLIK, M11 Decision Engine, M14 E-Polis, dan M15 Pencairan & Core; produk KTA; mata uang IDR.

Mohon jawaban paling lambat Jumat, 23 Oktober 2026. Tanpa jawaban ini, estimasi Rilis 1 belum bisa dikunci.

Terima kasih.

---

## 2. BA (Fahrudin)

**Subjek:** Cikal: rumus struktur kredit dan penomoran dokumen

Halo Fahrudin,

Ada tiga hal di data dictionary yang dibutuhkan untuk Rilis 1 (approval, file core, dan akad).

1. **Rumus struktur kredit (DD-01).** Bagaimana menghitung biaya provisi dan nilai cair bersih (`initial_disburs`)? Komponen apa saja yang dipotong dari plafon: biaya admin, provisi, premi IJK, biaya sales? Mohon lampirkan satu contoh struktur kredit nyata dari LOS OS11 (plafon, tenor, suku bunga, setiap biaya, dan nilai cair). Data nasabah boleh disamarkan; contoh ini akan menjadi kasus uji.
2. **Penomoran dokumen.** Bagaimana format nomor SP3K (yang direset tiap bulan) dan nomor kontrak (`contractNumber`)? Mohon contoh nomor dari OS11.
3. **Token validasi pencairan** (`tokenNumber`, `tokenExpiredAt` di entity Disbursement). Siapa yang menerbitkan token ini, untuk apa dipakai, dan berapa lama berlaku? Bila di OS11 sudah tidak dipakai, apakah boleh dihapus?

Usulan kami bila belum ada kepastian:
- Provisi = plafon x persen provisi, dibulatkan ke rupiah terdekat.
- Nilai cair bersih = plafon dikurangi biaya admin, provisi, dan premi IJK. Biaya sales tidak dipotong dari nasabah.
- Format nomor dokumen mengikuti OS11, ditambah kode company agar unik antar bank.

Mohon jawaban paling lambat Jumat, 23 Oktober 2026.

Terima kasih.

---

## 3. Tim core banking FAST

**Subjek:** Cikal: file pencairan dan respons core

Halo [nama],

Cikal (pengganti LOS OutSystems) akan mengirim data pencairan ke core FAST dan menerima respons pencairan. Kami perlu konfirmasi berikut agar status pengajuan di Cikal selalu sesuai dengan kondisi di core.

1. **Respons dengan hasil campuran.** Satu file respons berisi beberapa jenis baris per pengajuan (LIMIT-INDUK, LIMIT-ANAK, LINK-JAMINAN, DETAIL-JAMINAN, PEMBIAYAAN), masing-masing SUKSES atau GAGAL. Baris mana yang menentukan dana benar-benar cair?
2. Bila PEMBIAYAAN GAGAL tetapi LIMIT-INDUK SUKSES, apakah limit di core harus dibatalkan manual sebelum pengajuan dikirim ulang? Siapa yang melakukannya?
3. **Batas tenor 24 bulan.** Apakah batas ini berlaku untuk semua produk, atau per kode objek (`obj_code`)? Produk KTA di Cikal punya tenor sampai 60 bulan.
4. **Endpoint respons.** Saat ini core mengirim file respons ke endpoint `ResponseDisburse` milik LOS. Apakah core bisa mengarahkan pengiriman ke endpoint Cikal dengan format file yang sama?
5. **Nilai tetap di file pencairan.** Apakah `buss_unit` "LB2", `create_by` "LOS", dan `obj_code` "HONVAR011" sama untuk semua bank, atau berbeda per bank dan per produk?
6. Bisakah dibagikan satu contoh jadwal angsuran bunga Flat dan satu bunga Effective yang dihasilkan core? Kami memakainya untuk menyamakan aturan pembulatan.

Usulan kami bila belum ada kepastian:
- Dana dianggap cair hanya bila baris PEMBIAYAAN SUKSES.
- Batas tenor dicatat per kode produk core dan divalidasi saat produk dibuat di Cikal.
- Nilai `buss_unit`, `create_by`, dan `obj_code` menjadi konfigurasi per bank dan per produk.
- Cikal menyediakan endpoint dengan format yang sama dengan LOS saat ini, ditambah unggah file manual sebagai cadangan.

Mohon jawaban paling lambat Jumat, 23 Oktober 2026.

Terima kasih.

---

## 4. Pemilik kontrak Oksara

**Subjek:** Cikal: layanan Oksara untuk data wilayah dan OCR KTP

Halo [nama],

Cikal memakai Oksara untuk data wilayah (provinsi sampai kode pos) dan pembacaan KTP (OCR). Data wilayah dibutuhkan sejak Rilis 1 karena alamat KTP pemohon wajib diisi.

1. Apakah PPU sudah punya kontrak dan API key Oksara untuk data wilayah dan OCR KTP? Berapa masa berlaku kontrak, kuota, dan biaya per panggilan?
2. Untuk layanan SaaS yang melayani banyak bank, apakah satu akun Oksara milik PPU dipakai untuk semua bank, atau setiap bank wajib punya akun sendiri?
3. Apakah Oksara menyediakan lingkungan uji (sandbox)?

Usulan kami bila belum ada kepastian: satu akun PPU untuk data wilayah (data publik yang dipakai bersama), dan akun per bank untuk OCR bila biaya per scan ditagihkan ke bank.

Mohon jawaban paling lambat Jumat, 23 Oktober 2026.

Terima kasih.

---

## 5. Tim KUR

**Subjek:** Cikal: aturan pengecekan dan pelaporan SIKP

Halo [nama],

Cikal memeriksa status pemohon KUR ke SIKP sebelum approval. Kami perlu konfirmasi aturan berikut. Tidak mendesak: jawaban dibutuhkan sebelum perencanaan Rilis 3 (produk KUR).

1. SIKP mengembalikan kode 07 (Data Not Found), 12 (Data Found), dan 15 (Data Found on Another Institution), serta sisa hari KUR aktif (DaysRemaining). Untuk setiap kode, kapan pengajuan boleh lanjut (GO) dan kapan ditolak (NOTGO)?
2. Selain pengecekan, apakah bank wajib mendaftarkan calon debitur dan melaporkan realisasi KUR ke SIKP setelah pencairan? Bila ya, kapan dan data apa yang dikirim?

Usulan kami untuk pertanyaan 1:
- 07: GO.
- 15 dengan DaysRemaining lebih dari 0: NOTGO (masih ada KUR aktif di lembaga lain).
- 15 dengan DaysRemaining 0: GO.
- 12: NOTGO dengan keterangan "Active KUR found in this bank".

Terima kasih.

---

## 6. Tim IT client on-premise

**Subjek:** Cikal: kebutuhan infrastruktur untuk instalasi on-premise

Halo [nama],

Cikal (Loan Origination System pengganti LOS OutSystems) akan dipasang di server Bapak/Ibu. Agar teknologi yang kami pilih bisa dipasang dan dirawat di lingkungan Bapak/Ibu, kami perlu informasi berikut.

1. **Server.** Sistem operasi apa yang dipakai? Apakah container (Docker atau sejenisnya) diizinkan?
2. **Database.** Apakah bank mewajibkan atau sudah melisensi database tertentu (PostgreSQL, Oracle, SQL Server, lainnya)?
3. **Jaringan.** Apakah server boleh mengakses layanan di internet (Oksara, Dukcapil, SLIK, SIKP, perusahaan asuransi)? Bila harus lewat proxy atau jaringan khusus, mohon jelaskan prosedurnya.
4. **Operasional.** Siapa yang menjalankan backup, pemantauan, dan ketersediaan tinggi: tim IT bank atau PPU?
5. **Instalasi dan upgrade.** Apakah tim IT bank yang memasang dan meng-upgrade aplikasi, atau PPU? Apakah PPU bisa mendapat akses jarak jauh saat instalasi atau saat ada insiden? Seberapa sering upgrade boleh dilakukan?
6. **Akses uji integrasi.** Kapan akses uji (sandbox) Dukcapil, SLIK, asuransi, dan sistem lain milik bank bisa diberikan ke tim PPU?

Usulan kami bila belum ada kebijakan khusus:
- Server Linux dengan container, database PostgreSQL.
- Akses keluar lewat proxy bank ke daftar alamat integrasi yang disepakati.
- Tim IT bank menjalankan backup dan pemantauan berdasarkan panduan dari PPU, dengan target kehilangan data maksimal 1 jam.
- PPU menyerahkan paket instalasi berversi; tim IT bank menjalankannya di jendela perubahan, didampingi PPU lewat akses jarak jauh sementara. Upgrade terjadwal paling sering sebulan sekali, ditambah perbaikan darurat.
- Akses uji integrasi tersedia sebelum UAT dimulai.

Mohon jawaban secepatnya: pemilihan teknologi menunggu informasi ini.

Terima kasih.
