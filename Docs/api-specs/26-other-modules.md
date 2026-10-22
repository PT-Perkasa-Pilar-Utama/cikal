# 26. Other Modules (backlog)

Modul tambahan di luar ruang lingkup POC. Kontrak dirinci saat US-nya dijadwalkan; tabel di bawah memuat signature, akses, dan AC/US yang menjadi dasar. Modul pemilik dan port: [../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.18. Semua rute mengembalikan `403 MODULE_NOT_LICENSED` bila modulnya tidak berlisensi.

## 26.1 M01 Mobile Sales

Base path `/api/v1/mobile`; autentikasi Bearer JWT channel `MOBILE` (`02-authentication.md` 2.6).

| Operasi | Purpose | Traceability |
|---|---|---|
| `GET /mobile/home` | Ringkasan beranda Sales | US-88 |
| `POST /mobile/applications`, `PUT /mobile/applications/{id}/sections/{section}`, `POST /mobile/applications/{id}/submit` | Pengajuan dari mobile; draft per section di server; aturan sama dengan `12-applications.md` | US-89 |
| `GET /mobile/applications` | Daftar pengajuan milik Sales | US-90 |
| `PUT /mobile/applications/{id}/survey` | Laporan kunjungan dari mobile (M05) | US-91 |
| `GET /mobile/profile` | Profil pengguna | US-92 |
| `POST /mobile/devices` | Daftarkan perangkat | US-93 |

## 26.2 M02 API Mitra

Base path `/api/v1/partner`; JWT Ed25519 30 menit dengan klaim `tenantId` dan `partnerId`; rate limit 60 per menit per mitra.

| Operasi | Purpose | Traceability |
|---|---|---|
| `POST /partner/token` | Tukar API key mitra dengan token | AU-07 |
| `POST /partner/applications` | Kirim pengajuan; idempoten terhadap `partnerReference` | US-54; AC-54.05 |
| `GET /partner/applications/{partnerReference}` | Status pengajuan | US-54 |
| `GET /partner-clients`, `POST /partner-clients`, `POST /partner-clients/{id}/rotate-key` | Kelola aplikasi mitra (menu `MST-INTEGRATION`) | US-96 |

## 26.3 M03 Bulk Upload

| Operasi | Purpose | Traceability |
|---|---|---|
| `GET /bulk-uploads/template` | Unduh template Excel | US-52 |
| `POST /bulk-uploads` | Unggah maksimal 500 baris; validasi per baris lewat skema Application; job | US-52; AC-52.04 |
| `GET /bulk-uploads`, `GET /bulk-uploads/{id}/rows` | Hasil per baris dan file gagal | US-53 |

## 26.4 M04 OCR KTP, M13 Kredit Pensiun

| Operasi | Purpose | Traceability |
|---|---|---|
| `POST /applications/{id}/ocr-ktp` | Baca foto KTP lewat `OcrPort`; isi field bertanda `ocrFields` | US-41 |
| `POST /applications/{id}/pension-verification` | Verifikasi Taspen/EDAPEM lewat `PensionPort` | US-42 |

## 26.5 M05 Survey & Appraisal

| Operasi | Purpose | Traceability |
|---|---|---|
| `POST /applications/{id}/appraisal-payment` | Customer Service mencatat pembayaran appraisal (antrean `SURVEY_KPR`) | US-55 |
| `PUT /applications/{id}/survey-mikro`, `POST .../submit` | LKN Mikro (antrean `SURVEY_MIKRO`) | US-56 |
| `PUT /applications/{id}/survey-kpr`, `POST .../submit` | LKN dan appraisal KPR; rumus RM-09, RM-10 | US-57 |
| `POST /applications/{id}/survey-photos` | Foto kunjungan | US-56, US-57 |

## 26.6 M12 SIKP, M14 E-Polis, M16 Name Screening

| Operasi | Purpose | Traceability |
|---|---|---|
| `GET /applications/{id}/sikp` | Hasil SIKP; langkah bersyarat `requestedLimit > SIKP_MIN_LIMIT` | US-70 |
| `GET /sikp-outcome-rules`, `PUT /sikp-outcome-rules` | Aturan hasil SIKP | US-70 |
| `POST /applications/{id}/epolis` | Ajukan e-polis lewat `InsurancePort` (antrean `EPOLIS`) | US-75 |
| `GET /applications/{id}/screening`, `POST /applications/{id}/screening/review` | Hasil DTTOT/DPPSPM dan review Compliance Officer (antrean `SCREENING_REVIEW`) | Tech ref 10.4 |
| `GET /screening-lists`, `POST /screening-lists/{id}/entries/import` | Kelola daftar screening | Tech ref 10.4 |

## 26.7 Migrasi OS11

| Operasi | Purpose | Traceability |
|---|---|---|
| Alat baris perintah `tools/migrate-os11`, bukan endpoint HTTP | Migrasi data LOS OS11 | US-98 |
