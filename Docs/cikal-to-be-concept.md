# Cikal: Konsep TO-BE (tanpa memilih tech stack)

**Version:** 0.1  
**Date:** 2026-10-19  
**Author:** Fahrudin  
**Status:** Draft  

Dokumen ini menjelaskan apa yang berubah saat LOS dibangun ulang dari OutSystems 11 (AS-IS) ke high-code (TO-BE). Pembahasannya sengaja **tidak menyebut tech stack**: setiap konsep platform OutSystems diterjemahkan menjadi kebutuhan kemampuan yang bisa dipenuhi stack mana pun.

Dokumen terkait:
- `Docs/cikal-project-overview.md`: gambaran sistem AS-IS
- `Docs/design-system.md`: token dan pola UI
- `Docs/ba/Doc_BA_Cikal_Versi 1.xlsx`: US/AC TO-BE

---

## 1. Alasan rebuild

| Alasan | Penjelasan |
|---|---|
| Lisensi | Biaya lisensi OutSystems hilang. |
| Biaya perawatan | LOS OS11 butuh developer middle sampai senior yang paham OutSystems (BPT, site properties, forge, aggregate, Service Center). |
| Pengembangan dibantu AI | AI coding assistant paling efektif di stack populer yang kodenya berupa teks. Model visual OutSystems tidak bisa dibaca atau diubah AI dengan baik. |
| Ketersediaan orang | Stack yang dikenal banyak developer memudahkan rekrutmen dan pergantian anggota tim. |

**Kriteria sukses:** developer junior sampai middle, dibantu AI, bisa memahami dan mengubah satu modul tanpa harus memahami seluruh sistem.

---

## 2. Prinsip desain

| ID | Prinsip | Akibatnya |
|---|---|---|
| P-01 | Sederhana lebih penting dari canggih | Tidak memakai workflow engine berat. Alur proses cukup dengan konfigurasi rute dan modul yang jelas. |
| P-02 | Aturan bisnis yang sering berubah ada di konfigurasi, logika yang jarang berubah ada di kode | Rute produk, matrix, parameter, dan aturan scoring bisa diatur admin. Kondisi internal modul tetap di kode. |
| P-03 | Satu pola untuk satu masalah | Checker-maker, audit trail, antrean kerja, dan integrasi masing-masing punya satu mekanisme yang dipakai ulang di semua modul. |
| P-04 | Setiap integrasi eksternal punya pengganti tiruan (mock) | Dukcapil, SLIK, SIKP, EDAPEM, asuransi, dan core banking bisa diuji tanpa sistem aslinya. |
| P-05 | Konfigurasi yang salah tidak boleh merusak proses | Editor rute hanya mengizinkan kombinasi yang valid. Modul wajib tidak bisa dimatikan. |
| P-06 | Pemisahan tugas (segregation of duties) | Pembuat perubahan tidak boleh menyetujui perubahannya sendiri. Penginput pengajuan tidak boleh menyetujui pengajuan yang sama. |

---

## 3. Goals, non-goals, anti-goals

**Goals**
- Semua fungsi bisnis LOS OS11 yang masih dipakai tersedia di Cikal.
- Alur proses per produk diatur lewat rute modul (bagian 5).
- Inkonsistensi dan proses manual yang ditemukan di AS-IS diperbaiki (lihat `cikal-project-overview.md` bagian 13).

**Non-goals (fase ini)**
- Memilih tech stack, database, atau infrastruktur.
- Menambah produk atau fitur bisnis baru di luar yang tercatat di Doc BA Cikal.
- Migrasi data dari LOS OS11 (belum diputuskan, lihat bagian 7).

**Anti-goals (gagal walaupun secara teknis jalan)**
- Membangun ulang kompleksitas BPT dalam bentuk lain sehingga tetap butuh spesialis.
- Editor konfigurasi yang memungkinkan admin membuat rute atau aturan yang membuat pengajuan macet.
- Aturan scoring yang hanya bisa diubah orang yang paham SQL dan skema database.

---

## 4. Peta perubahan AS-IS ke TO-BE

Status: **Diputuskan** berarti sudah disepakati Fahrudin. **Usulan** berarti usulan BA yang masih perlu persetujuan.

| Area | AS-IS (OS11) | TO-BE (tanpa stack) | Status |
|---|---|---|---|
| Alur proses | BPT `BankLoanOrigination_Dynamics` dengan 24 state, callback OnReady/OnClose | **Rute modul per produk** (bagian 5) dan pengatur rute sederhana yang memanggil modul berikutnya | Diputuskan |
| Variasi alur | Workflow Matrix global (satu kombinasi aktif untuk semua produk) dan flag produk (IsKPR, NeedSIKP) | Digantikan rute per produk | Diputuskan |
| Tampilan alur | Diagram proses bawaan BPT (BAM) | Diagram rute bergaya React Flow, read-only, dengan toggle modul | Diputuskan |
| Antrean kerja manusia | Human activity BPT + Assign To Me di `LOSActivityLoan` | Satu mekanisme antrean kerja (ambil tugas, lepas tugas, tutup tugas) yang dipakai semua langkah manual | Usulan |
| Error proses otomatis | Aktivitas `WaitErrorClicked<Step>` + BPT Monitoring | Langkah otomatis yang gagal ditandai Error dengan pesan; admin bisa retry atau menghentikan dari layar Process Monitoring | Usulan |
| Riwayat dan aging | `ApplicationHistory` per state | Riwayat langkah per pengajuan dengan waktu mulai, selesai, aging, dan pelaku | Usulan |
| Checker-maker | Tabel `*Temp` untuk setiap entity master (sekitar 15 tabel) | **Satu mekanisme permintaan perubahan**: data usulan disimpan sebagai perbandingan data lama dan baru, status Waiting Approval/Revise/Approved/Rejected | Usulan |
| Audit trail | JSON lama/baru per server action | Satu log audit untuk semua perubahan data dan aksi penting (siapa, kapan, apa, data lama, data baru) | Usulan |
| Konfigurasi sistem | Site Properties di Service Center (contoh: `SIKPFilterLoanAmount`, `OksaraKey`, `DedupMatrixSetup`) | Parameter sistem per company yang bisa diubah lewat layar (dengan checker-maker); rahasia (API key) disimpan di penyimpanan rahasia, bukan di database biasa | Usulan |
| Identitas user | User management bawaan OutSystems + OIDC forge | Login lokal dan SSO (OIDC); user SSO baru dibuat tanpa akses sampai admin menetapkan role | Usulan |
| Otorisasi | Role Menu, User Menu, `GetRoleScreen` per layar | Hak akses per role dan per user (View, Create, Update, Delete, Approve) dicek di setiap layar dan setiap API | Usulan |
| Multi-company | Filter `CompanyCode` + `CurrencyCode` di setiap query | Semua data terikat ke company; user hanya melihat data company-nya | Usulan |
| Scoring dan RAC | Aplikasi DynamicScoring terpisah, kriteria berupa SQL mentah | **Rule builder terstruktur**: kriteria = field + operator + nilai, bobot per model, constant dan cut-off, ada fitur uji model sebelum aktif | Usulan |
| Matrix (Dedup, Dukcapil, Fraud, Decision) | Entity matrix + checker-maker | Tetap sebagai tabel keputusan yang bisa diatur, dengan checker-maker dan simulasi | Usulan |
| Generate dokumen | MSWordUtils (template Word, replace text) | Template dokumen dengan placeholder, hasil PDF | Usulan |
| Excel import/export | Forge Advanced Excel | Library spreadsheet; template unduhan berisi dropdown dari parameter | Usulan |
| Realtime refresh | SSE forge | Push notifikasi ke browser atau polling berkala | Usulan |
| Penyimpanan file | Binary di entity `DocumentCustomer` | Penyimpanan objek terpisah; database hanya menyimpan metadata | Usulan |
| Job terjadwal | Timer OutSystems (contoh: hapus counter SP3K, sinkron wilayah) | Scheduler job | Usulan |
| Integrasi eksternal | Banyak service dummy di dalam aplikasi | Adapter per integrasi dengan implementasi nyata dan mock yang bisa dipilih per lingkungan | Usulan |
| Kirim ke core FAST | File `.txt` berisi array, user memecah manual per aplikasi | Sistem membuat satu file JSON per aplikasi dengan nilai tetap yang benar; cara kirim (unduh, SFTP, API) diputuskan nanti | Usulan |
| Aplikasi mobile | OutSystems mobile, stepper di local storage | Aplikasi mobile yang memakai API yang sama dengan web | Usulan |
| Menu simulasi | Tercampur dengan menu operasional | Dipisah, hanya aktif di lingkungan non-produksi dan untuk role QA | Usulan |

---

## 5. Rute modul per produk

### 5.1 Konsep

Setiap produk punya **rute**: daftar modul yang dilewati sebuah pengajuan dari submit sampai selesai. Admin memilih modul mana yang dipakai untuk produk tersebut. Contoh:

| Modul | KPR | Kredit Agunan | KUR Kecil | KTA | Pension |
|---|---|---|---|---|---|
| Survey / LKN | Ya | Ya | Ya | Tidak | Tidak |
| Dedup | Ya | Ya | Ya | Ya | Ya |
| Dukcapil | Ya | Ya | Ya | Ya | Ya |
| Verification Document | Ya | Ya | Ya | Ya | Ya |
| Fraud | Ya | Ya | Ya | Ya | Ya |
| RAC | Ya | Ya | Ya | Ya | Ya |
| Scoring | Ya | Ya | Ya | Ya | Ya |
| SLIK | Ya | Ya | Ya | Ya | Ya |
| SIKP | Tidak | Tidak | Ya | Tidak | Tidak |
| Approval | Ya | Ya | Ya | Ya | Ya |

Tabel di atas hanya ilustrasi. Isi sebenarnya ditetapkan bisnis lewat layar konfigurasi.

### 5.2 Aturan

| ID | Aturan | Status |
|---|---|---|
| R-01 | Setiap produk punya rute sendiri. Mengubah rute satu produk tidak memengaruhi produk lain. | Diputuskan |
| R-02 | Admin hanya menyalakan atau mematikan modul. Admin tidak menggambar cabang (pilihan A dari sesi brainstorming). | Diputuskan |
| R-03 | Kondisi di dalam modul tetap di kode atau parameter modul, bukan di rute. Contoh: SIKP hanya berjalan jika limit di atas batas SIKP; Prescreen Dedup hanya muncul jika hasil Dedup Review. | Diputuskan |
| R-04 | Rute ditampilkan sebagai diagram bergaya React Flow. | Diputuskan |
| R-05 | Urutan modul tetap (ditentukan sistem), tidak bisa diubah admin. | Usulan |
| R-06 | Modul wajib tidak bisa dimatikan: Data Entry, Decision, Approval, Validity Check, Print Akad, Disbursement. | Usulan |
| R-07 | Perubahan rute melalui checker-maker dan menghasilkan versi baru. | Usulan |
| R-08 | Pengajuan memakai versi rute yang berlaku saat pengajuan disubmit. Perubahan rute tidak memengaruhi pengajuan yang sedang berjalan. | Usulan |
| R-09 | Produk tidak bisa dipakai untuk pengajuan baru sebelum punya rute yang disetujui. | Usulan |

### 5.3 Kontrak modul (sudut pandang bisnis)

Setiap modul menerima satu pengajuan dan mengembalikan salah satu hasil berikut:

| Hasil | Arti | Contoh |
|---|---|---|
| Lanjut | Pengajuan diteruskan ke modul berikutnya di rute | Fraud = Clean |
| Tunggu user | Pengajuan masuk antrean kerja manusia | Dedup = Review, masuk Prescreen Dedup |
| Kembali ke Draft | Pengajuan dikembalikan ke penginput untuk diperbaiki | Verification = ada dokumen Not Match |
| Recontest | Pengajuan ditolak sistem tapi bisa diproses ulang | Decision = NotGo |
| Selesai | Proses berakhir | Approval ditolak, respons core SUKSES |
| Error | Modul gagal teknis; bisa di-retry atau dihentikan | Layanan Dukcapil tidak merespons |

Dengan kontrak ini, developer cukup memahami satu modul dan pengatur rute untuk mengubah atau menambah modul.

---

## 6. Dampak ke Doc BA

Doc BA Cikal (`Docs/ba/Doc_BA_Cikal_Versi 1.xlsx`) menggantikan Doc BA LOS Versi 1 sebagai acuan TO-BE. Perubahan utama:

- Workflow Matrix global diganti US rute produk.
- Checker-maker ditulis sekali sebagai US umum, tidak diulang di setiap master.
- Menambah US untuk fitur yang sebelumnya tidak punya US (mobile, dashboard, upload massal, API mitra, OCR, Prescreen Dukcapil, recontest, respons core, monitoring proses, audit trail, simulasi angsuran).
- Pertanyaan konfirmasi yang belum dijawab dicatat di sheet "Asumsi" dan ditandai di kolom catatan AC terkait.

---

## 7. Hal yang belum diputuskan

| ID | Pertanyaan |
|---|---|
| O-01 | Tech stack (sengaja ditunda). |
| O-02 | Model deployment: satu instance untuk banyak bank (multi-tenant) atau satu instance per bank. |
| O-03 | Apakah data LOS OS11 dimigrasi ke Cikal. |
| O-04 | Integrasi mana yang nyata di fase 1 dan mana yang memakai mock. |
| O-05 | Apakah aplikasi mobile masuk fase 1. |
| O-06 | Cara pengiriman data pencairan ke core FAST. |
