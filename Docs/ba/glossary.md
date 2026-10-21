# Cikal: Business Glossary

**Version:** 0.1  
**Date:** 2026-10-21  
**Author:** Fahrudin  
**Status:** Draft  

Istilah bisnis yang dipakai di Doc BA, referensi teknis, dan data dictionary Cikal. Urut abjad.

| Istilah | Definisi | Sinonim | Konteks | Lihat juga |
|---|---|---|---|---|
| Agunan | Barang jaminan pinjaman: kendaraan (BPKB), properti (sertifikat), atau SK pensiun | Collateral, Jaminan, Object (AS-IS) | ApplicationCollateral, tab Collateral | BPKB, SK Pensiun |
| Akad | Perjanjian kredit yang ditandatangani nasabah dan bank sebelum pencairan | Contract, Print Akad | M15, AkadPrint | Jenis Akad |
| Angsuran | Pembayaran bulanan pokok + bunga | Installment | Financing, Installment | Credit Simulation |
| Appraisal | Penilaian nilai pasar dan nilai likuidasi properti agunan KPR | Penilaian | M05, Appraisal | LKN KPR |
| Approval | Persetujuan pengajuan berjenjang sesuai nominal dan job level | Persetujuan | CORE Approval | Job Level, Auto Approval |
| Auto Approval | Persetujuan otomatis bila nominal <= limitAutoApproval produk | | Product, ApplicationApproval | Approval |
| BI Code | Kode pelaporan regulator untuk nilai General Parameter | | GeneralParameter | |
| Blacklist | Daftar nama, NIK, atau IP yang ditolak Fraud | Daftar hitam | M08 | Fraud |
| BPKB | Buku Pemilik Kendaraan Bermotor; dokumen agunan kendaraan | | ApplicationCollateral | Agunan |
| BPT | Business Process Technology, mesin workflow bawaan OutSystems; diganti rute produk | | AS-IS | Rute Produk |
| Branch | Kantor cabang di bawah Regional | Cabang | Organization | Regional, Sub Branch |
| ChangeRequest | Usulan perubahan master data yang menunggu persetujuan checker | Temp table (AS-IS) | CORE | Checker-Maker |
| Checker-Maker | Pola dua orang: maker mengusulkan, checker menyetujui; tidak boleh orang yang sama | Maker-Checker | Semua master data | ChangeRequest |
| CIF | Customer Information File; nomor nasabah di core banking | | Application, CoreResponse | Core Banking |
| Company | Bank atau lembaga keuangan pengguna Cikal; satu company = satu tenant | Tenant, Perusahaan | CORE Tenant | Tenant |
| Core Banking | Sistem inti bank penerima data pencairan | Core | M15 | CoreResponse |
| CoreResponse | File balasan core berisi SUKSES atau GAGAL per jenis baris | Core Disbursement (AS-IS) | M15 | Disbursement |
| DBR | Debt Burden Ratio; rasio angsuran terhadap penghasilan | DSR (mirip) | Product, RAC | RAC |
| Decision | Keputusan GO atau NOTGO dari kombinasi hasil Dedup, Dukcapil, Fraud, RAC, Scoring, SLIK | Decision Engine | M11 | Decision Matrix |
| Decision Matrix | Tabel kombinasi hasil pemeriksaan menuju keputusan | | M11 | Decision |
| Dedup | Pemeriksaan pengajuan ganda berdasar NIK, nama, tanggal dan tempat lahir, nama ibu | Deduplication | M06 | Prescreen Dedup |
| Disbursement | Pencairan dana ke rekening nasabah | Pencairan | M15 | Validity Check |
| DOH | Days on Hand; jumlah hari perputaran persediaan, piutang, utang di analisis LKN | | SurveyMikro | LKN |
| Draft | Pengajuan yang disimpan belum disubmit, atau dikembalikan ke Sales | | Application | Return |
| Dukcapil | Direktorat Kependudukan; layanan verifikasi data KTP | | M07 | Verifikator |
| E-Polis | Penerbitan polis asuransi jiwa kredit secara elektronik | Polis | M14 | IJK |
| EDAPEM | Data pensiunan Taspen (rekening dan manfaat) | | M13 | Taspen |
| FAST | Format file JSON pencairan ke core (`upload_om_trn_appl_*`) | | M15 DisbursementFile | Core Banking |
| Fraud | Pemeriksaan potensi kecurangan: frekuensi nama, IP, blacklist | | M08 | Blacklist |
| Fuzzy | Pencocokan teks berbasis kemiripan, bukan persis sama | | Dedup | Dedup |
| General Parameter | Master pilihan dropdown, dikelompokkan per ParamType | GP | CORE Master Data | ParamType |
| GO / NOTGO | Hasil keputusan lanjut atau tidak lanjut | Go, NotGo | Decision, SIKP | Recontest |
| Human Task | Tugas manual di antrean yang diambil user | Task, Queue item | CORE Task | Orchestrator |
| IJK | Imbal Jasa Kafalah / premi asuransi kredit | Premi | M14, Financing | E-Polis |
| Job Level | Tingkat jabatan approver; 1 = tertinggi (Head Office) | | Approval | Sub Level |
| KPR | Kredit Pemilikan Rumah; alur dengan survey dan appraisal | | Product, M05 | Appraisal |
| KUR | Kredit Usaha Rakyat; wajib cek SIKP | | M12 | SIKP |
| License | Hak pakai modul untuk satu company, SaaS atau on-premise | Lisensi | CORE Tenant | Module Entitlement |
| LKN | Laporan Kunjungan Nasabah; hasil survey lapangan | Survey | M05 | SurveyMikro, SurveyKpr |
| Loan ID | Nomor pengajuan ddMMyyyy + kode produk + 7 digit | Nomor aplikasi | Application | LoanIdCounter |
| Modul | Unit fungsi yang dijual terpisah (CORE, M01 s.d. M15) | Module | Referensi teknis | Rute Produk |
| Mitra | Pihak ketiga yang mengirim pengajuan via API | Partner | M02 | API Key |
| NIK | Nomor Induk Kependudukan, 16 digit di KTP | ID Card Number | ApplicationPersonal | Dukcapil |
| OCR | Pembacaan otomatis teks dari foto KTP | | M04 | |
| Orchestrator | Komponen yang menjalankan langkah sesuai rute produk | | CORE | Rute Produk |
| ParamType | Kelompok nilai General Parameter | | GeneralParameter | General Parameter |
| Pension | Kredit pensiunan dengan agunan SK pensiun | Kredit Pensiun | M13 | Taspen |
| Plafon | Jumlah pinjaman | Plafond, Loan Amount | Product, Application | Tenor |
| Prescreen | Tinjauan manual atas hasil REVIEW Dedup atau Fraud | | M06, M08 | Human Task |
| Process Instance | Satu jalannya proses pengajuan; recontest membuat instance baru | Proses | CORE Orchestrator | Recontest |
| RAC | Risk Acceptance Criteria; kriteria wajib penerimaan risiko | | M09 | Scoring |
| Recontest | Pengajuan ulang setelah NOTGO dengan data yang diperbaiki, maks 3 kali | | M11 | Decision |
| Regional | Wilayah di bawah company, membawahi cabang | Wilayah | Organization | Branch |
| Return | Pengembalian pengajuan ke Draft oleh verifikator, validity, atau approver | Kembalikan | Application | Draft |
| Rute Produk | Daftar langkah modul aktif per produk, berversi, disetujui checker | Product Route | CORE | Orchestrator |
| Scoring | Penilaian berbobot atas data pengajuan dengan cut off | Credit Scoring | M09 | RAC |
| SIKP | Sistem Informasi Kredit Program (Kemenkeu); cek KUR aktif di lembaga lain | | M12 | KUR |
| SK Pensiun | Surat Keputusan pensiun; agunan kredit pensiun | Decree | ApplicationCollateral | Pension |
| SLIK | Sistem Layanan Informasi Keuangan (OJK); riwayat kolektibilitas | | M10 | Kolektibilitas |
| Kolektibilitas | Kualitas kredit 1 (lancar) s.d. 5 (macet) | Collectibility | SlikResult | SLIK |
| SP3K | Surat Penegasan Persetujuan Penyediaan Kredit; nomor reset bulanan | | GeneratedDocument | Akad |
| Sub Branch | Kantor di bawah cabang | Sub Cabang | Organization | Branch |
| Sub Product | Periode suku bunga produk | | Product | Interest Type |
| Taspen | Lembaga pengelola dana pensiun ASN | | M13 | EDAPEM |
| Tenant | Satu company dengan data terpisah | Company | Semua entity | Company |
| Tenor | Jangka waktu pinjaman dalam bulan | Jangka Waktu | Product, Application | Plafon |
| Ujroh | Imbalan jasa pada akad syariah | Margin Ujroh | SurveyMikro | Jenis Akad |
| Validity Check | Pemeriksaan kesiapan pencairan: tanggal, token, rekening | | M15 | Disbursement |
| Verifikator | Petugas pemeriksa kecocokan dokumen dan hasil Dukcapil | Verifier | CORE Verification, M07 | |
