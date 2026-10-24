# 18. Notifications

Email ke pemohon dan pengguna. Modul pemilik: CORE Notification ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.8). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.8 `EMAIL_TEMPLATES`, `NOTIFICATION_LOGS`.

Notification tidak punya endpoint di POC. Email dikirim oleh handler event outbox, bukan oleh klien.

## 18.1 Pemicu (tanpa endpoint)

| Event | Template | Penerima | Rujukan |
|---|---|---|---|
| `ApplicationSubmitted` | `APP_RECEIVED`, subjek "Pengajuan kredit <Loan ID> telah kami terima" | Email pemohon | AC-50.05 |
| `ApplicationRejected` | `APP_REJECTED` | Email pemohon | US-87 |
| `DisbursementCompleted` | `APP_DISBURSED`, subjek "Kredit <Loan ID> telah dicairkan" | Email pemohon | AC-101.01 |

| Aturan | Rujukan |
|---|---|
| Email pemohon kosong: log `SKIPPED` dengan pesan "Notification skipped - no email" | TRM_NTF_006 |
| Gagal kirim: log `FAILED`, proses pengajuan tidak berhenti | 5.8 |
| Handler idempotent terhadap event yang dikirim ulang: satu log per event per template | 5.0.1 |
| Template tidak ada untuk company: log `FAILED` "Email template <code> is not configured" | 5.8 |
| Event `DisbursementCompleted` dipublikasikan langkah Record Disbursement (kartu BE-S6-03); handler sudah terpasang | AC-101.01 |

## 18.2 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /email-templates`, `PUT /email-templates/{code}` | Ubah subjek dan isi template lewat checker-maker | `MST-TEMPLATE` | US-87 |
| `GET /applications/{id}/notifications` | Riwayat notifikasi pengajuan | `APP-INQUIRY` VIEW | US-87 |
