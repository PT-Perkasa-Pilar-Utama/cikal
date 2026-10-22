# 10. Integration Points

Ringkasan setiap sistem eksternal. Pola adapter, aturan IN-01 s.d. IN-15, dan kontrak kanonik lengkap ada di `13-integration-adapter-pattern.md`; dokumen ini tidak mengulangnya.

## 10.1 Daftar integrasi

| Sistem | Modul | Arah | Mode | Adapter rilis pertama | Kegagalan | Cadangan |
|---|---|---|---|---|---|---|
| IdP SSO (Keycloak atau IdP bank) | CORE Identity | Keluar | SYNC | OIDC generik | IdP tidak bisa dijangkau: pesan error di halaman Login | Login lokal tetap tersedia untuk akun LOCAL |
| SMTP | CORE Notification | Keluar | SYNC lewat antrean | SMTP generik | Gagal kirim: `FAILED` di NotificationLog, retry 3 kali | Proses pengajuan tidak terhenti |
| Data wilayah Oksara | CORE Master Data | Keluar | Job terjadwal | Oksara | Sinkron gagal: data lama tetap (AC-23.02) | Data lokal hasil sinkron terakhir |
| OCR KTP Oksara | M04 | Keluar | SYNC | Oksara, simulasi | Pesan "ID card reading is unavailable" (AC-41.04) | Input manual |
| Dukcapil | M07 | Keluar | SYNC | Format AS-IS, simulasi | `ERROR` setelah retry; Process Monitoring | Retry manual |
| Reputasi IP | M08 | Keluar | SYNC | Simulasi | Tanpa penyedia: "Not applicable" (AC-65.02) | Fraud tetap berjalan dengan blacklist dan velocity |
| SLIK / biro kredit | M10 | Keluar | SYNC, ASYNC, MANUAL | MANUAL (unggah iDeb), simulasi | MANUAL: tugas terlambat ditandai setelah `CREDIT_BUREAU_MANUAL_DEADLINE_HOURS` | Mode MANUAL |
| SIKP | M12 | Keluar | SYNC | Format AS-IS, simulasi | `ERROR` setelah retry | Retry manual |
| EDAPEM / Taspen | M13 | Keluar | SYNC atau data impor | Impor file EDAPEM, simulasi | "Taspen number not found in EDAPEM" | Impor file ulang |
| Asuransi (e-polis) | M14 | Keluar | SYNC atau ASYNC | Simulasi | Pesan "Insurance service is unavailable" (AC-75.04) | Langkah tetap di antrean Epolis |
| Core banking (kirim) | M15 | Keluar | ASYNC | FAST JSON, simulasi | `ERROR`; Process Monitoring | Record Disbursement mode MANUAL (US-101) |
| Core banking (respons) | M15 | Masuk | Callback, file, polling | FAST respons file | Respons tidak cocok: `IGNORED_NOT_WAITING` atau `DUPLICATE` (AC-80.03, AC-80.04) | Record Disbursement mode MANUAL |
| Daftar DTTOT/DPPSPM | M16 | Impor file | Batch | Daftar internal | Impor gagal: daftar lama tetap | Daftar lama |
| Sistem mitra | M02 | Masuk | SYNC | Bukan adapter; API publik Cikal | 400 dengan daftar error (AC-54.04) | Mitra mengirim ulang dengan `partnerReference` yang sama |

## 10.2 Aturan cache dan pemakaian ulang

| Data | Cache | Invalidasi |
|---|---|---|
| Hasil Dukcapil, SLIK, SIKP, EDAPEM | Dipakai ulang hanya bila `resultReuseDays > 0` di IntegrationConfig dan NIK sama di tenant sama (IN-10); default 0 | Rentang hari lewat |
| Konfigurasi penyedia aktif | Cache memori per proses | `NOTIFY integration_config_changed` saat checker menyetujui |
| Data wilayah | Tabel lokal | Sinkron berikutnya |
| Token akses penyedia (bila penyedia memakai token) | Memori per proses sampai kedaluwarsa | Kedaluwarsa atau respons `AUTH` |

## 10.3 Data masuk

Endpoint data masuk: `POST /api/v1/integrations/inbound/{companyCode}/{providerCode}`. Autentikasi sesuai `settingsSchema` adapter (API key, token, atau mTLS di Nginx). Diproses idempotent berdasarkan rujukan penyedia; dicatat di IntegrationCallLog `INBOUND` dengan `matchStatus` (IN-15).

## 10.4 Yang menunggu client

Penyedia nyata untuk client pertama belum ditetapkan (TO-16). Adapter rilis pertama mengikuti tech ref 10.5. Akses sandbox milik bank dibutuhkan sebelum UAT (grooming v2 E-13).
