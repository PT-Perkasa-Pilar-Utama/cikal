# 8. Non-Functional Requirements

Angka di dokumen ini adalah target yang dirujuk dokumen lain dan dokumen khusus. Sumber utama: `Docs/cikal-tech-reference.md` bagian 13 (status [Usulan, perlu konfirmasi], TO-06) dan keputusan grill technical spec 2026-10-21.

## 8.1 Volume dan skala

| ID | Ukuran | Target | Sumber |
|---|---|---|---|
| NF-01 | Pengguna bersamaan per tenant | 50 | Tech ref 13 |
| NF-02 | Pengajuan per bulan per tenant | 10.000 (rata-rata sekitar 450 per hari kerja) | Tech ref 13 |
| NF-03 | Puncak submit | 10 per menit per tenant | Turunan NF-02 dengan faktor puncak 20x |
| NF-04 | Company per instalasi on-premise | 1 s.d. 5 | TN-04, grooming v2 |
| NF-05 | Baris upload massal per file | 500 | AC-52.04 |
| NF-06 | Baris ekspor | 50.000 | AC-82.03 |

## 8.2 Latensi

| ID | Operasi | Target p95 | Sumber |
|---|---|---|---|
| NF-10 | Halaman daftar dan detail | < 2 detik | Tech ref 13 |
| NF-11 | Submit pengajuan (respons ke pengguna) | < 3 detik; langkah otomatis berjalan di belakang | Tech ref 13, COM-02 |
| NF-12 | Langkah otomatis internal (Dedup, Fraud, RAC, Scoring, Decision) | < 2 detik per langkah | Turunan NF-11 |
| NF-13 | Panggilan pihak ketiga | Timeout default 30 detik per panggilan, retry 3 kali dengan jeda bertambah | COM-04, ER-03 |
| NF-14 | Evaluasi satu rumus | < 50 ms | 7.5 |
| NF-15 | Pembaruan daftar inquiry | Polling 30 detik | Grooming v2 E-30, AC-83.06 |
| NF-16 | Generate PDF akad | < 10 detik | Turunan Gotenberg |

## 8.3 Ketersediaan dan pemulihan

| ID | Ukuran | Target | Sumber |
|---|---|---|---|
| NF-20 | Ketersediaan | 99,5% per bulan di luar jadwal pemeliharaan | Tech ref 13 |
| NF-21 | RPO (kehilangan data maksimal) | 1 jam, lewat backup dasar harian + arsip WAL berkelanjutan | Grill 2026-10-21 (grooming v2 R-08) |
| NF-22 | RTO (waktu pulih) | 4 jam | Grill 2026-10-21 |
| NF-23 | Simpan backup | 30 hari; uji pemulihan tiap kuartal | Tech ref 13 |
| NF-24 | Ketahanan langkah | Proses mati di tengah langkah tidak menghilangkan job (pg-boss) atau event (outbox) | 2.5, 12 |

## 8.4 Retensi

| ID | Data | Retensi | Sumber |
|---|---|---|---|
| NF-30 | Log audit | 5 tahun | Tech ref 13 |
| NF-31 | Log panggilan integrasi | 1 tahun, PII disamarkan | Tech ref 13 |
| NF-32 | Data pengajuan dan dokumen kredit | 10 tahun sejak pengajuan selesai | DD-07 [Usulan BA] |
| NF-33 | Log eksekusi rumus | Mengikuti data pengajuan | FM-08 |

## 8.5 Observability

| ID | Kebutuhan | Implementasi |
|---|---|---|
| NF-40 | Log terstruktur | JSON pino dengan `tenantId`, `loanId`, `correlationId`, `stepCode` |
| NF-41 | Metrik | Endpoint `/api/metrics` (format Prometheus, jaringan internal): jumlah langkah per status, error per adapter, umur job tertua, latensi HTTP |
| NF-42 | Alert | Langkah `ERROR` melebihi ambang per jam; adapter gagal 5 kali dalam 15 menit; job tertua lebih dari 10 menit; disk database di atas 80% |
| NF-43 | Health | `05-module-definitions.md` 5.0.2 |

## 8.6 Kompatibilitas

| ID | Ukuran | Target | Sumber |
|---|---|---|---|
| NF-50 | Browser | Chrome dan Edge, dua versi terakhir | Tech ref 13 |
| NF-51 | Mobile | Android, versi minimum ditetapkan tim mobile | Tech ref 13 |
| NF-52 | Server | VM Linux x86-64 dengan Docker Engine 24+ dan Compose v2; minimum 4 vCPU, 8 GB RAM untuk VM aplikasi; 4 vCPU, 16 GB RAM untuk VM data | Asumsi 1.5 nomor 3 |
