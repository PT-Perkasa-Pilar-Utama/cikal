# Cikal POC: Task Breakdown

**Version:** 0.4  
**Date:** 2026-10-23  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** POC  

## Cara memakai dokumen ini

- Satu kartu = satu potongan kerja yang bisa diverifikasi sendiri, dimiliki satu orang. Est dalam hari-developer.
- Kolom AC merujuk ke AC di `Docs/business/acceptance-criteria-breakdown/` (indeks `Docs/business/acceptance-criteria.md`).
- Kolom Docs merujuk ke kontrak endpoint di `Docs/api-specs/` dan keputusan teknis di `Docs/technical-specs/` (`api NN §x` = `Docs/api-specs/NN-*.md` bagian x; `tech NN §x` = `Docs/technical-specs/NN-*.md` bagian x).
- Kartu `TL-` ada di tabel Backend karena hanya Backend dan Frontend yang dihitung di Summary; beban per orang ada di tabel "Beban per orang". Beberapa kartu TL berisi API dan layar sekaligus (pemilik sama, tanpa kartu wiring terpisah).
- Kartu wiring menyambungkan frontend asli ke backend asli dan membuktikan AC end-to-end di server dev. Exit criterion-nya adalah uji end-to-end Playwright yang lulus.
- Ruang lingkup mengikuti "Keputusan POC" di `Docs/business/grooming/grooming-cikal-ba-v2.md` dengan ruang lingkup penuh dan timebox 12 minggu (sprint planning 2026-10-21). Sprint planning 2026-10-22 menambahkan layar konfigurasi yang ada di sprint POC `Docs/business/sprint-breakdown.md`: Role Access, checklist dokumen, Decision Matrix dan simulasi, Approval Hierarchy, format nomor dokumen, dan perubahan suku bunga oleh Approver.

## Komposisi tim

| Kode | Peran | Porsi kartu | Kapasitas per sprint |
|---|---|---|---|
| FS1 | Fullstack (backend dan frontend) | 100% | 10 hari |
| TL | Tech Lead | 50% (sisanya review, grooming, koordinasi) | 5 hari |

Sejak versi 0.2, kartu direncanakan hampir 100% kapasitas (cadangan total 1 hari). Bila sprint tergelincir, kartu yang paling aman ditunda ke backlog: FE-S4-03 (layar Decision Matrix), TL-S4-05 (layar simulasi angsuran), FE-S6-05 (layar format nomor).

## Model kerja

- 6 sprint x 2 minggu. Tidak ada Sprint 0 terpisah; scaffold TL ada di Sprint 1.
- Stack mengikuti `Docs/technical-specs/04-tech-stack.md`: Node.js 22, TypeScript strict, NestJS 11 + Fastify, Drizzle, Zod, React 19 + Vite, TanStack, PostgreSQL 17, pg-boss, Gotenberg, Docker Compose.
- Kontrak endpoint mengikuti `Docs/api-specs/`; status implementasi dicatat di Operation Status Tracker `Docs/api-specs/_index.md`.
- Konfigurasi tanpa layar di POC diisi lewat seed: user, role, menu, level approval, template akad, Dedup Matrix, aturan Dukcapil, Fraud Matrix, model awal scoring, konfigurasi integrasi.
- Integrasi memakai adapter simulasi, kecuali data wilayah Oksara (asli). Pencairan memakai mode MANUAL (Record Disbursement).
- Lisensi POC: CORE, M06, M07, M08, M09, M10, M11, M15. M14 E-Polis sengaja tidak dilisensikan.

## Sumber AC

Semua AC yang dikutip board ini tersedia dalam format Gherkin di `Docs/business/acceptance-criteria-breakdown/`. AC berikut belum ada di `Docs/ba/us-ac.md`; teksnya berasal dari dokumen grooming dan disetujui untuk POC:

| AC | Sumber |
|---|---|
| AC-12.07, AC-20.08, AC-27.04, AC-36.05, AC-40.08, AC-44.05, AC-50.07, AC-72.07, AC-84.06 | `grooming-cikal-ba-v1.md`, bagian "Rincian perubahan US/AC" |
| AC-31.08, AC-40.09, AC-40.10, AC-85.06 | `grooming-cikal-ba-v2.md`, bagian "Celah acceptance criteria" |
| AC-100.01 s.d. AC-100.03, AC-101.01 s.d. AC-101.05 | `grooming-cikal-ba-v2.md`, US-100 dan US-101 |
| AC-102.01 s.d. AC-102.08 | `grooming-cikal-ba-v3.md`, US-102 penomoran dokumen |
| AC-97.01 s.d. AC-97.04 (ditulis ulang), AC-76.06 | `grooming-poc-ac-tertunda.md` |

## AC Deferred di sprint POC

AC berikut ada di sprint 1 s.d. 6 `Docs/business/` dengan tanda Deferred dan tidak dikerjakan di POC (`Docs/business/grooming/grooming-poc-ac-tertunda.md`).

| AC | Alasan |
|---|---|
| AC-01.09, AC-01.10 | Verifikasi dua langkah dipindah ke backlog pasca-POC; kontrak TOTP di `Docs/api-specs/02-authentication.md` 2.6 |
| AC-76.03 | Berlaku bila M14 E-Polis berlisensi; POC memakai AC-76.06 |

---

## Sprint 1: Fondasi

Stories: US-01, US-06, US-09, US-12, US-14, US-20, US-97

Goal: Kerangka aplikasi berjalan di Docker, pengguna hasil seed bisa login dan hanya melihat menu sesuai hak aksesnya, hak akses role bisa diubah lewat layar, dan perubahan produk KTA beserta harganya melewati checker-maker generik.

### Backend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
|---|---|---|---|---|---|---|
| TL-S1-01 | Siapkan kerangka monorepo | Monorepo pnpm + Turborepo: `apps/api` (NestJS + Fastify, folder modul CORE dan M06 s.d. M15), `apps/web` (React + Vite), `packages/contracts` (skema Zod bersama), Biome, Vitest, Testcontainers, CI build. Uji arsitektur larangan impor internal modul. | (enabler) | TL | 2d | tech 02 §2.4, tech 03, tech 04 |
| TL-S1-02 | Siapkan Docker dev, migrasi, seed, dan endpoint operasional | Docker Compose (api, worker, PostgreSQL, Gotenberg, S3 cadangan, Mailpit); runner migrasi per modul dan seed `dev`/`qa` idempoten; `GET /api/health/live`, `GET /api/health/ready`, `GET /api/metrics`; `POST /api/admin/reset-state` hanya terdaftar di non-production. Seed berisi company 001, user per role, produk KTA, rute, level approval, model scoring, matrix. | (enabler) | TL | 2d | tech 06 §6.12, tech 07 §7.8, tech 11 §11.3; api 27 |
| TL-S1-03 | Pasang konteks tenant, guard hak akses, dan konvensi API | Konteks tenant dari sesi (`SET LOCAL`, RLS); guard `@Requires(menuCode, action)` di setiap rute; guard lisensi; envelope sukses dan error; middleware `Idempotency-Key`; seed kode menu. | AC-09.02, AC-09.04 | TL | 1d | tech 07 §7.2, §7.3, tech 09 §9.4; api 01 §1.4 s.d. §1.11 |
| BE-S1-01 | Bangun login lokal dan sesi | `POST /auth/login`, `POST /auth/logout`, `GET /auth/session`. Pesan gagal seragam, kunci 15 menit setelah 5 gagal, user Inactive ditolak, sesi cookie HttpOnly + CSRF, idle 30 menit, satu sesi per channel. | AC-01.01 s.d. AC-01.08, AC-06.01 s.d. AC-06.05 | FS1 | 1.5d | api 02 §2.1 s.d. §2.5; tech 09 §9.2, tech 07 §7.1 |
| BE-S1-02 | Bangun audit log dan checker-maker generik | ChangeRequest dan AuditLog; `GET /change-requests`, `GET /change-requests/{id}` dengan diff, approve (terapkan dalam satu transaksi), reject; pembuat tidak boleh meninjau; satu permintaan terbuka per data; persetujuan bersamaan diproses sekali; paket impor diterapkan sekaligus. Audit `LOGIN`, `LOGIN_FAILED`, dan `LOGOUT` dengan IP dari login dan logout BE-S1-01 (api 02 §2.2, §2.3). | AC-12.01 s.d. AC-12.07, AC-14.05 | FS1 | 2d | api 07; tech 05 §5.6, §5.7, tech 06 §6.8 |
| BE-S1-03 | Bangun API produk dan harga lewat checker-maker | `GET/POST/PUT /products`, `GET/PUT /products/{id}/pricing`. Product dan SubProduct per periode berlaku tanpa tumpang tindih, biaya admin dan provisi, rentang suku bunga Approver yang mencakup suku bunga; validasi plafon, kode produk, limit auto approval, batas tenor `CORE_MAX_TENOR_MONTHS`. | AC-20.01 s.d. AC-20.07, AC-97.01 s.d. AC-97.03 | FS1 | 1.5d | api 08 §8.1 s.d. §8.6; tech 06 §6.7 |
| BE-S1-04 | Bangun API Role Access | `GET /roles`, `GET /menus`, `GET /role-access`, `POST` dan `PUT /role-access` lewat checker-maker; View wajib bila aksi lain diberikan; cache hak akses dibuang saat disetujui. | AC-09.01, AC-09.03 | FS1 | 0.5d | api 03 §3.1 s.d. §3.5 |

### Frontend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
|---|---|---|---|---|---|---|
| FE-S1-01 | Bangun halaman login dan kerangka layout | Halaman Login, layout sidebar, header nama/role/company, logout, menu dan tombol dari `GET /auth/session`, penanganan 401 (sesi habis, sesi diganti). | AC-01.01, AC-01.02, AC-01.04, AC-01.05, AC-06.01 s.d. AC-06.03, AC-06.05, AC-09.02 | FS1 | 1.5d | api 02 §2.4, §2.5; `Docs/design-system.md` |
| FE-S1-02 | Bangun layar produk dan Pending Product | Daftar dan form produk dengan tab Pricing; layar Pending generik dengan perbandingan Current dan Proposed; Approve dan Reject. Komponen Pending dipakai ulang semua data master. | AC-12.01 s.d. AC-12.05, AC-20.01 s.d. AC-20.07, AC-97.01 s.d. AC-97.03 | FS1 | 2d | api 07 §7.2 s.d. §7.5, api 08 §8.1 s.d. §8.6; `Docs/design-system.md` |
| FE-S1-03 | Sambungkan alur produk dan checker-maker end-to-end | Wiring: form produk ke API asli, error dari API, Pending dan Approve oleh user berbeda. Bergantung pada BE-S1-03 dan FE-S1-02; FE-S1-02 selesai terakhir, jadi FE yang memegang wiring. Exit: uji Playwright maker mengajukan, checker menyetujui, produk tampil. | AC-12.01, AC-12.04, AC-12.05, AC-20.01 | FS1 | 0.5d | api 07, api 08 |
| FE-S1-04 | Bangun layar Role Access dan sambungkan | Daftar Role Access, form New Role Access dengan toggle lima aksi, Pending Role Access memakai komponen Pending generik. Bergantung pada BE-S1-04; FE-S1-04 selesai terakhir, jadi wiring ada di kartu ini. Exit: uji Playwright hak baru berlaku setelah disetujui. | AC-09.01, AC-09.03 | FS1 | 0.5d | api 03 §3.1 s.d. §3.5 |

---

## Sprint 2: Rute dan orchestrator

Stories: US-31, US-39, US-58, US-85, US-86, US-100

Goal: Rute KTA bisa diubah lewat layar dengan checker-maker dan menghasilkan versi baru; orchestrator menjalankan langkah sesuai versi rute dan lisensi; tugas manual bisa diambil dan dilepas; langkah yang error bisa di-retry.

### Backend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
|---|---|---|---|---|---|---|
| TL-S2-01 | Bangun orchestrator rute | ProcessInstance dan StepExecution; tujuh hasil langkah; slot NAME_SCREENING; snapshot versi rute, rumus, dan parameter saat submit; alasan lewati (NOT_IN_ROUTE, NOT_LICENSED, CONDITION_NOT_MET) dan `isApplicable`; idempotensi; job pg-boss; `GET /applications/{id}/process`. Dikerjakan di awal sprint agar FE-S2-01 bisa disambungkan. | AC-31.03, AC-31.04, AC-85.02, AC-20.08 | TL | 3d | tech 12; api 13 §13.1, §13.2 |
| TL-S2-02 | Bangun lisensi bertanda tangan | CLI penerbit lisensi Ed25519; `GET /license`, `POST /license`; verifikasi saat start dan pemasangan; pemeriksaan di menu, API, editor rute, dan orchestrator. | AC-100.01 s.d. AC-100.03, AC-31.08, AC-85.06 | TL | 2d | api 04; tech 07 §7.6 |
| BE-S2-01 | Bangun API versi rute produk | `PUT /products/{id}/route` lewat ChangeRequest, `GET /products/{id}/route`, `GET /products/available`; modul wajib tidak bisa dimatikan; tanpa perubahan ditolak; produk tanpa rute ACTIVE tidak tersedia. | AC-31.01, AC-31.02, AC-31.05, AC-31.06, AC-20.06, AC-39.05 | FS1 | 2d | api 08 §8.7 s.d. §8.10 |
| BE-S2-02 | Bangun antrean tugas manual | `GET /tasks`, `POST /tasks/{id}/assign` (penguncian optimistis), `POST /tasks/{id}/release`; Supervisor melepas tugas orang lain; `taskQueue.close` meneruskan ke orchestrator. | AC-58.01 s.d. AC-58.06 | FS1 | 1.5d | api 14; tech 05 §5.12 |
| BE-S2-03 | Bangun API Process Monitoring dan registry adapter | `GET /process-monitoring`, retry sinkron (attempt bertambah), finish dengan alasan (FINISHED_CANCELLED); `IntegrationApi` internal dengan adapter simulasi per lingkungan, timeout, retry otomatis 3 kali, log panggilan. | AC-86.01 s.d. AC-86.04 | FS1 | 1.5d | api 13 §13.3 s.d. §13.5; tech 13 |

### Frontend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
|---|---|---|---|---|---|---|
| FE-S2-01 | Bangun layar rute produk | Daftar modul berurutan dengan status (aktif, bersyarat, mati), mode edit dengan toggle, keterangan modul wajib, Pending rute dengan perbandingan daftar. Tanpa diagram. | AC-31.01, AC-31.02, AC-31.05, AC-31.06 | FS1 | 2d | api 08 §8.9, §8.10; `Docs/design-system.md` |
| FE-S2-02 | Bangun layar Process Monitoring | Filter status Error, detail pesan error, tombol Retry, Finish dengan alasan. | AC-86.01 s.d. AC-86.04 | FS1 | 1d | api 13 §13.3 s.d. §13.5 |
| FE-S2-03 | Bangun komponen antrean generik | Tabel antrean dengan kolom Assigned To, Assign to Me, Release Me, Release oleh Supervisor dari `allowedActions`, pesan tugas sudah diambil. Dipakai ulang semua antrean. | AC-58.01 s.d. AC-58.06 | FS1 | 1d | api 14 §14.2 s.d. §14.4 |
| FE-S2-04 | Sambungkan perubahan rute end-to-end | Wiring: ubah rute lewat layar, setujui, lalu pengajuan uji (dibuat lewat API) memakai versi baru sedangkan pengajuan yang sudah berjalan tetap versi lama. Bergantung pada TL-S2-01 dan FE-S2-01; FE-S2-01 selesai terakhir, jadi FE yang memegang wiring. Exit: uji Playwright. | AC-31.01, AC-31.03 | FS1 | 0.5d | api 08 §8.9; tech 12 §12.1 |

---

## Sprint 3: Pengajuan web

Stories: US-23, US-25, US-40, US-44, US-47, US-48, US-49, US-50

Goal: Sales membuat pengajuan KTA di web dari draft sampai submit, dengan alamat dari data wilayah Oksara, dokumen sesuai checklist yang diatur lewat layar, Loan ID unik, email konfirmasi, dan proses otomatis mulai saat submit.

### Backend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
|---|---|---|---|---|---|---|
| TL-S3-01 | Bangun sinkronisasi data wilayah Oksara | Adapter Oksara (asli) lewat `RegionDataPort`; `POST /regions/sync` sebagai job dan `GET /regions/sync/{syncId}`; data lama tetap bila gagal; pencarian dan dropdown berjenjang. Credential di file secret. | AC-23.01 s.d. AC-23.04 | TL | 2d | api 06 §6.3 |
| TL-S3-02 | Bangun penyimpanan dokumen | Port S3, metadata DocumentFile, validasi ukuran dan magic bytes, konversi ke PDF lewat Gotenberg, `GET /files/{fileId}/download-url` berumur 5 menit. | AC-47.02 s.d. AC-47.04 | TL | 1d | api 10 §10.1; tech 07 §7.7 |
| TL-S3-03 | Bangun pembentuk Loan ID | ddMMyyyy + kode produk + 7 digit; counter per produk per company dengan `UPDATE ... RETURNING`; batas counter. | AC-49.01, AC-49.03, AC-49.04 | TL | 1d | api 12 §12.2; tech 06 §6.9 |
| TL-S3-04 | Bangun API dan layar checklist dokumen | `POST/GET/PUT /document-checklists` lewat checker-maker; layar daftar, form centang dokumen, Pending memakai komponen generik. Tabel General Parameter dengan seed Occupation, Marital, dan Document, serta `GET /parameters/{paramType}/options` (dipindah dari BE-S3-02, sprint planning 2026-10-23). Satu pemilik, wiring di kartu ini. Exit: uji Playwright checklist diajukan, disetujui di Pending, lalu tampil di daftar Document Checklist; tampil di step Document diuji FE-S3-03. | AC-25.01 s.d. AC-25.03 | TL | 1.5d | api 08 §8.11, §8.12, api 06 §6.1 |
| TL-S3-05 | Bangun layanan kunci enkripsi tenant | Tabel `platform.tenant_keys`; kunci utama dari `MASTER_KEY_FILE`; data key `ENCRYPTION` dan `BLIND_INDEX` per company dibungkus kunci utama, dibuat saat company dibuat dan di seed; enkripsi dan dekripsi field AES-256-GCM dengan `key_version`; blind index HMAC-SHA256. Dikerjakan sebelum BE-S3-01 dan BE-S3-02. `platform.secrets` dan job re-enkripsi rotasi di luar kartu ini. | - | TL | 1d | tech 06 §6.3, DM-08; tech 07 §7.4; tech 11 |
| BE-S3-01 | Bangun API draft pengajuan | `POST /applications`, `GET /applications/drafts`, `GET /applications/{id}/form`; syarat minimal draft; draft hanya terlihat pemiliknya; lanjutkan dari step terakhir. Bergantung pada TL-S3-03 (Loan ID) dan TL-S3-05 (enkripsi NIK dan blind index). | AC-49.02, AC-49.05, AC-49.06 | FS1 | 1.5d | api 12 §12.2, §12.4, §12.5 |
| BE-S3-02 | Bangun validasi section pengajuan | `PUT /applications/{id}/sections/{section}` mode strict dan draft, serta aturan strict section Application pada `POST /applications` (`strict=true`); `GET /insurances` (`GET /parameters/{paramType}/options` dibangun TL-S3-04); aturan Application, Personal, Occupation (Pension, KUR), Emergency Contact; persetujuan pemohon dicatat; NIK dan field DM-08 disimpan lewat layanan kunci TL-S3-05. | AC-39.01 s.d. AC-39.03, AC-40.01 s.d. AC-40.10, AC-44.01 s.d. AC-44.05, AC-48.01 s.d. AC-48.04 | FS1 | 1.5d | api 12 §12.1, §12.3, api 06 §6.2 |
| BE-S3-03 | Bangun dokumen pengajuan dan submit | `GET /applications/{id}/documents`, `PUT /applications/{id}/documents/{documentType}`, `POST /applications/{id}/submit` (Idempotency-Key wajib); kelengkapan dokumen wajib; urutan step; kunci data; mulai orchestrator dengan langkah pertama sesuai rute. | AC-50.01 s.d. AC-50.04, AC-50.06, AC-50.07, AC-25.04, AC-25.05, AC-47.01, AC-47.05, AC-47.06 | FS1 | 1.5d | api 12 §12.6 s.d. §12.8 |
| BE-S3-04 | Bangun notifikasi email | `EmailPort` (SMTP, Mailpit di dev, memori di test), template `APP_RECEIVED` dan `APP_DISBURSED`, handler outbox `ApplicationSubmitted` dan `DisbursementCompleted`, log SENT/FAILED/SKIPPED. | AC-50.05 | FS1 | 0.5d | api 18; tech 05 §5.8 |

### Frontend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
|---|---|---|---|---|---|---|
| FE-S3-01 | Bangun stepper pengajuan: Application dan Personal | Stepper dari `steps[]`; section Application dengan suku bunga read-only; section Personal dengan alamat berjenjang, Same as ID Address, checkbox persetujuan; konfirmasi Back; blok identitas pemohon di step Application (field minimum draft); layar Application List (`GET /applications/drafts`) sebagai tujuan Back dan isi menu Data Entry. | AC-39.01 s.d. AC-39.04, AC-40.01 s.d. AC-40.08, AC-23.04, AC-97.04 | FS1 | 2d | api 12 §12.1 s.d. §12.4, api 06 §6.3.1, api 08 §8.7 |
| FE-S3-02 | Bangun section Occupation, Document, Emergency Contact | Occupation (pengecualian Pension, aturan KUR); slot unggah sesuai checklist dengan label Optional, penghitung kelengkapan, ganti file; Emergency Contact; Save as Draft dan Submit dengan konfirmasi. | AC-44.01 s.d. AC-44.04, AC-47.01 s.d. AC-47.06, AC-48.01 s.d. AC-48.04, AC-49.01, AC-50.01 s.d. AC-50.03 | FS1 | 2d | api 12 §12.3, §12.6 s.d. §12.8 |
| FE-S3-03 | Sambungkan pengajuan draft sampai submit end-to-end | Wiring: semua section ke API asli, error per field, draft dilanjutkan, submit memulai proses dengan langkah Dedup, email konfirmasi terlihat di Mailpit, checklist hasil TL-S3-04 tampil sebagai slot di step Document. Bergantung pada BE-S3-03, BE-S3-04, dan FE-S3-02; FE-S3-02 selesai terakhir, jadi FE yang memegang wiring. Exit: uji Playwright. | AC-49.01, AC-49.05, AC-50.01, AC-50.05, AC-50.07, AC-25.04 | FS1 | 0.5d | api 12 |

---

## Sprint 4: Penilaian otomatis

Stories: US-36, US-51, US-59, US-61, US-65, US-67, US-68, US-69

Goal: Pengajuan yang disubmit berjalan otomatis melewati Dedup, Dukcapil, Fraud, RAC, Scoring, SLIK, dan Decision, setiap hasil terlihat di timeline, Decision Matrix bisa diubah dan disimulasikan, dan Sales bisa menghitung simulasi angsuran.

Langkah Verification Document dimatikan di rute uji sprint ini dan dinyalakan di Sprint 5.

### Backend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
|---|---|---|---|---|---|---|
| TL-S4-01 | Bangun layanan perhitungan angsuran | Mesin rumus (jsep + evaluator daftar putih + decimal.js) dengan rumus default RM-07, RM-08, RM-19 tanpa editor; jadwal Flat dan Effective, sisa pokok terakhir 0. Dipakai RAC, approval, dan simulasi. | AC-51.01, AC-51.02, AC-51.04 | TL | 1.5d | tech 05 §5.16; api 09 §9.1 |
| TL-S4-02 | Bangun Decision Engine | Lookup Decision Matrix dengan ANY dan prioritas; tanpa baris = NotGo; langkah dilewati atau tak berlisensi = SKIP; NotGo ke RECONTEST; `GET /applications/{id}/decision`. | AC-69.01 s.d. AC-69.03, AC-36.03, AC-36.05 | TL | 1.5d | api 24 §24.1, §24.4 |
| TL-S4-03 | Bangun adapter simulasi Dukcapil, SLIK, dan reputasi IP | Adapter simulasi per port dengan respons per NIK dari data seed dan simulasi timeout; uji kontrak adapter bersama. | AC-61.02 | TL | 1d | tech 13 §13.2, §13.7 |
| TL-S4-04 | Bangun API Decision Matrix dan simulasi | `GET /decision-matrix`, `PUT` dan `POST /decision-matrix/rows` lewat checker-maker, `POST /decision-matrix/simulate` dengan matrix aktif atau pending. Dikerjakan sebelum FE-S4-03. | AC-36.01, AC-36.02, AC-36.04 | TL | 0.5d | api 24 §24.2, §24.3 |
| TL-S4-05 | Bangun API dan layar simulasi angsuran | `POST /calculations/installment-simulation` dan layar Calculate dengan tabel jadwal. Satu pemilik, wiring di kartu ini. Exit: uji Playwright baris TRM_INS_001 dan TRM_INS_002. | AC-51.01, AC-51.03, AC-51.04 | TL | 0.5d | api 09 §9.1 |
| BE-S4-01 | Bangun modul Dedup | Exact lewat blind index (TL-S3-05) dan fuzzy per DedupFieldSetting, Dedup Matrix hasil seed, NIK kosong = Skip, Duplicate In-Flight; hasil Review menjadi Error "Manual review is not available in POC"; `GET /applications/{id}/dedup`. | AC-59.01, AC-59.02 | FS1 | 2d | api 19; tech 06 §6.11 |
| BE-S4-02 | Bangun modul Dukcapil | Tanggal dan tempat lahir harus sama; skor berbobot; ambang Passed dan Review inklusif; Review menjadi Error POC; Failed mengakhiri pengajuan; `GET /applications/{id}/dukcapil`. | AC-61.01, AC-61.02 | FS1 | 1d | api 20 |
| BE-S4-03 | Bangun modul Fraud | Blacklist; FraudVelocityRule default (nama lebih dari 3 per hari = High Fraud Potential + blacklist); reputasi IP simulasi (Suspicious menjadi Error POC); tanpa IP = Not applicable; `GET /applications/{id}/fraud`. | AC-65.01, AC-65.02 | FS1 | 1.5d | api 21 |
| BE-S4-04 | Bangun modul SLIK, RAC, dan Scoring | Credit Bureau (adapter simulasi SYNC) dengan CreditBureauOutcomeMapping default dan agregasi kolektibilitas terburuk; eksekusi model RAC dan Scoring hasil seed; `GET /applications/{id}/credit-bureau`, `GET /applications/{id}/scoring`. | AC-68.01, AC-68.02, AC-67.01 s.d. AC-67.04 | FS1 | 2d | api 22 §22.6, api 23 §23.1, §23.3 |

### Frontend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
|---|---|---|---|---|---|---|
| FE-S4-01 | Bangun timeline proses dan panel hasil | Timeline langkah dengan waktu, aging, pelaku, hasil, label lewati; pilihan proses; panel Dedup, Dukcapil, Fraud, RAC/Scoring, SLIK, dan Decision. | AC-85.01 s.d. AC-85.05, AC-67.01, AC-67.02, AC-69.01 | FS1 | 2d | api 13 §13.1, §13.2, api 19 s.d. 24 |
| FE-S4-02 | Sambungkan alur penilaian otomatis end-to-end | Wiring: pengajuan KTA yang disubmit berjalan dari Dedup sampai Decision dengan adapter simulasi, hasil tiap langkah tampil di timeline; satu kasus GO dan satu NotGo. Bergantung pada BE-S4-04 dan FE-S4-01; BE-S4-04 selesai terakhir, pemiliknya FS1. Exit: uji Playwright. | AC-69.01, AC-69.02, AC-85.01 | FS1 | 0.5d | api 13 §13.2, api 24 §24.4 |
| FE-S4-03 | Bangun layar Decision Matrix dan simulasi | Tabel baris matrix dengan edit, Pending Decision Matrix, dialog Simulate dengan pilihan hasil enam modul. Bergantung pada TL-S4-04; FE-S4-03 selesai terakhir, jadi FE memegang wiring. Exit: uji Playwright perubahan disetujui lalu simulasi memakai baris baru. | AC-36.01, AC-36.02, AC-36.04 | FS1 | 1d | api 24 §24.2, §24.3 |

---

## Sprint 5: Keputusan manusia

Stories: US-27, US-37, US-64, US-72, US-73, US-74, US-83, US-84

Goal: Verifikator memeriksa dokumen, approver menyetujui, menolak, atau mengembalikan sesuai kewenangan (dengan auto approval untuk nominal kecil), hierarki approver dan kriteria scoring diubah lewat layar, dan semua pengguna bisa mencari dan membuka detail pengajuan.

### Backend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
|---|---|---|---|---|---|---|
| TL-S5-01 | Bangun routing approval dan struktur kredit | Level dari rentang nominal dan rantai upLevel/upSubLevel sampai isFinalApprover, sub level berurutan, Error tanpa level, tanpa setup, atau tanpa approver aktif, auto approval, Financing dan jadwal angsuran, perubahan suku bunga dalam rentang Approver; `GET /applications/{id}/approval`, `GET /applications/{id}/financing`. | AC-72.03, AC-72.05, AC-72.06, AC-74.01 s.d. AC-74.05, AC-27.04, AC-97.05, AC-97.06 | TL | 3d | api 16 §16.4, §16.5, §16.7; tech 05 §5.14 |
| TL-S5-02 | Tulis draf panduan menambah modul langkah | Panduan developer dengan contoh modul langkah dummy: kontrak StepHandler, registrasi di rute, lisensi, uji. Bahan uji K-08. | (enabler) | TL | 1d | tech 12 §12.2, tech 13 |
| TL-S5-03 | Sambungkan approval end-to-end | Wiring: pengajuan GO masuk antrean approver sesuai nominal, approve, reject, atau return lewat layar, auto approval di bawah batas. Bergantung pada TL-S5-01 dan FE-S5-02; TL-S5-01 selesai terakhir, jadi TL yang memegang wiring. Exit: uji Playwright. | AC-72.01, AC-73.01, AC-73.02, AC-74.01, AC-74.03 | TL | 0.5d | api 16 §16.5, §16.6 |
| TL-S5-04 | Bangun API Approval Hierarchy | `GET/POST/PUT /approval-hierarchies` lewat checker-maker; approver wajib punya hak Approve; tanda approver nonaktif; `GET /users?withAccess=`, `GET /branches`, `GET /regionals`. Dikerjakan sebelum FE-S5-06. | AC-27.01 s.d. AC-27.03 | TL | 0.5d | api 16 §16.1 s.d. §16.3, api 03 §3.6, api 05 |
| BE-S5-01 | Bangun langkah verifikasi dokumen | `GET/PUT /applications/{id}/verification`, `POST .../verification/submit`; Match atau Not Match per dokumen, remarks wajib untuk Not Match, simpan sebagian, Not Match mengembalikan pengajuan ke Draft dengan catatan. | AC-64.01 s.d. AC-64.04 | FS1 | 1.5d | api 15 |
| BE-S5-02 | Bangun API keputusan approver | `POST /applications/{id}/approval/decision`: Approve, Reject, Return dengan komentar wajib maks 1.000, aksi sesuai flag level, menunggu level bawah, keputusan bersamaan diproses sekali, Reject mengakhiri pengajuan, Return ke Draft. | AC-72.01, AC-72.02, AC-72.04, AC-72.07, AC-73.01 s.d. AC-73.05 | FS1 | 1d | api 16 §16.6 |
| BE-S5-03 | Bangun API editor model scoring | `GET /formula-variables`; draft model dan kriteria (`/scoring-models`), validasi tipe nilai dan bobot, `POST /scoring-models/{id}/submit` lewat checker-maker; model aktif lama tetap dipakai sampai disetujui. | AC-37.01 s.d. AC-37.05 | FS1 | 1d | api 22 §22.1 s.d. §22.4, api 09 §9.2 |

### Frontend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
|---|---|---|---|---|---|---|
| FE-S5-01 | Bangun antrean dan detail verifikasi dokumen | Antrean memakai komponen generik, detail dengan pratinjau dokumen, Match atau Not Match, remarks, Save, Submit. | AC-64.01 s.d. AC-64.05 | FS1 | 1.5d | api 15, api 10 §10.1 |
| FE-S5-02 | Bangun antrean dan detail approval | Antrean approver, detail dengan rantai approval, struktur kredit, jadwal angsuran, field suku bunga dalam rentang, Approve, Reject, Return sesuai `allowedActions`, keterangan menunggu level bawah. | AC-72.01 s.d. AC-72.04, AC-73.01 s.d. AC-73.05, AC-97.05, AC-97.06 | FS1 | 1d | api 16 §16.5 s.d. §16.7 |
| FE-S5-03 | Bangun editor model scoring | Daftar kriteria, tambah dan ubah kriteria dari katalog variabel, ajukan model; persetujuan memakai layar Pending generik. | AC-37.01 s.d. AC-37.05 | FS1 | 1d | api 22 §22.1 s.d. §22.4 |
| FE-S5-04 | Bangun API dan layar Application Inquiry dan detail | `GET /applications` (pencarian `pg_trgm`, filter State dan tanggal, urut, paging 20), `GET /applications/{id}` dan `by-loan-id` dengan audit akses; layar inquiry dengan polling 30 detik dan detail dengan tab yang relevan. | AC-83.01 s.d. AC-83.07, AC-84.01 s.d. AC-84.06 | FS1 | 1.5d | api 17 §17.1, api 12 §12.9, §12.10 |
| FE-S5-05 | Sambungkan verifikasi dan editor scoring end-to-end | Wiring: verifikasi Not Match mengembalikan pengajuan ke Sales; perubahan kriteria scoring yang disetujui mengubah hasil scoring pengajuan berikutnya (K-05). Bergantung pada BE-S5-01, BE-S5-03, FE-S5-01, FE-S5-03; FE-S5-03 selesai terakhir. Exit: uji Playwright. | AC-64.02, AC-37.05 | FS1 | 0.5d | api 15 §15.3, api 22 §22.4 |
| FE-S5-06 | Bangun layar Approval Hierarchy dan sambungkan | Daftar hierarki dengan label "Inactive approver", form New Hierarchy dengan dropdown cabang, produk, level, dan approver ber-hak Approve; Pending memakai komponen generik. Bergantung pada TL-S5-04; FE-S5-06 selesai terakhir, jadi wiring di kartu ini. Exit: uji Playwright. | AC-27.01 s.d. AC-27.03 | FS1 | 0.5d | api 16 §16.1 s.d. §16.3 |

---

## Sprint 6: Pasca-approval dan paket on-premise

Stories: US-38, US-76, US-77, US-101, US-102

Goal: Pengajuan yang disetujui melewati Validity Check, Print Akad dengan nomor kontrak dari format aktif, dan Record Disbursement sampai status Disbursed; format nomor dokumen diatur lewat layar; paket on-premise dirakit per lisensi; semua kriteria sukses POC K-01 s.d. K-08 terbukti.

### Backend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
|---|---|---|---|---|---|---|
| TL-S6-01 | Bangun perakitan paket per lisensi | Build hanya menyertakan modul berlisensi; container migrate one-shot saat instalasi dan upgrade; uji pasang di VM Linux bersih. Panduan instalasi ditulis di `DEPLOYMENT_PLAN.md`, bukan kartu ini. | AC-100.01, AC-100.03 | TL | 2.5d | tech 02 §2.4, tech 06 §6.12, tech 07 §7.6 |
| TL-S6-02 | Bangun generator dokumen akad | Template .docx dengan placeholder diisi data pengajuan (docxtemplater), dikonversi ke PDF lewat Gotenberg; template tidak tersedia menghasilkan pesan error. | AC-77.01, AC-77.03 | TL | 1d | tech 05 §5.9; api 25 §25.3 |
| TL-S6-03 | Verifikasi kriteria sukses POC | Jalankan dan catat bukti K-01 s.d. K-08; uji K-08 dengan developer yang tidak ikut membangun memakai panduan TL-S5-02. | AC-100.02, AC-85.06 | TL | 1.5d | grooming v2 "Kriteria sukses" |
| BE-S6-01 | Bangun langkah Validity Check | `GET /applications/{id}/disbursement`, `POST /applications/{id}/validity-check`: tanggal pencairan minimal H+1, tanggal angsuran pertama menggeser jatuh tempo, Not Valid ke Draft. Aturan tanggal e-polis tidak aktif dan tanggal e-polis tidak ditampilkan karena M14 tidak berlisensi. | AC-76.01, AC-76.02, AC-76.04 s.d. AC-76.06 | FS1 | 1d | api 25 §25.1, §25.2 |
| BE-S6-02 | Bangun langkah Print Akad | `POST /applications/{id}/akad/print`: field cetak wajib, nomor kontrak dari BE-S6-05, generator akad, GeneratedDocument dan AkadPrint, lanjut ke Record Disbursement. | AC-77.01, AC-77.02 | FS1 | 1d | api 25 §25.3 |
| BE-S6-03 | Bangun langkah Record Disbursement | `POST /applications/{id}/disbursement/record` dengan mode MANUAL `CoreBankingPort`: Disbursed (tanggal cair, nomor pinjaman core) atau Failed (alasan) dengan validasi; status DISBURSED atau RECONTEST; email lewat BE-S3-04. | AC-101.01 s.d. AC-101.05 | FS1 | 1d | api 25 §25.4; grooming v2 N-05 |
| BE-S6-04 | Bangun uji model scoring | `POST /scoring-models/{id}/test` terhadap Loan ID contoh: skor, konstanta, cut off, hasil, dan rincian kriteria. | AC-38.01 s.d. AC-38.04 | FS1 | 0.5d | api 22 §22.5 |
| BE-S6-05 | Bangun layanan dan API penomoran dokumen | DocumentNumberFormat dan DocumentNumberCounter: token, periode reset, cakupan counter, aman bersamaan, nomor habis menghentikan pembentukan; nomor SP3K saat approval final KPR; `GET /document-number-formats`, `POST .../preview`, `PUT .../{documentType}` lewat checker-maker. Dipakai BE-S6-02. | AC-102.01 s.d. AC-102.08 | FS1 | 1.5d | api 10 §10.2 s.d. §10.6 |

### Frontend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
|---|---|---|---|---|---|---|
| FE-S6-01 | Bangun layar Validity Check, Print Akad, Record Disbursement | Tiga layar antrean dan form memakai komponen antrean generik; unduh PDF akad dari URL bertanda tangan. | AC-76.01, AC-76.02, AC-76.04 s.d. AC-76.06, AC-77.01, AC-77.02, AC-101.01 s.d. AC-101.05 | FS1 | 2d | api 25 |
| FE-S6-02 | Bangun API dan halaman Audit Trail | `GET /audit-logs` (periode maksimal 366 hari, filter modul dan jenis kejadian) dan `GET /audit-logs/{id}`; halaman pencarian dan detail sebelum dan sesudah tanpa tombol ubah atau hapus. | AC-14.01 s.d. AC-14.06 | FS1 | 1.5d | api 17 §17.2, §17.3 |
| FE-S6-03 | Bangun halaman uji model scoring | Input Loan ID contoh, tampilkan hasil dan rincian kriteria. | AC-38.01 s.d. AC-38.04 | FS1 | 0.5d | api 22 §22.5 |
| FE-S6-04 | Sambungkan alur pasca-approval end-to-end | Wiring: pengajuan yang disetujui melewati Validity Check, Print Akad (PDF terunduh dengan nomor kontrak), Record Disbursement sampai Disbursed; ini alur demo K-02. Bergantung pada BE-S6-03 dan FE-S6-01; FE-S6-01 selesai terakhir. Exit: uji Playwright dari draft sampai Disbursed. | AC-76.01, AC-77.01, AC-101.01, AC-102.08 | FS1 | 0.5d | api 25; grooming v2 K-02 |
| FE-S6-05 | Bangun layar format nomor dokumen | Daftar format SP3K dan CONTRACT, form pola dengan pratinjau langsung, Pending memakai komponen generik. Bergantung pada BE-S6-05; FE-S6-05 selesai terakhir, jadi wiring di kartu ini. Exit: uji Playwright. | AC-102.01, AC-102.04, AC-102.05 | FS1 | 0.5d | api 10 §10.3 s.d. §10.5 |

---

## Definition of Done (per card)

- Semua AC yang dikutip kartu lulus, termasuk baris MRTM terkait, sebagai test otomatis (unit atau integrasi untuk backend, komponen atau Playwright untuk frontend).
- Endpoint mengikuti kontrak `Docs/api-specs/` (path, input, output, kode error, pesan persis AC); status operasi di Operation Status Tracker `Docs/api-specs/_index.md` diperbarui ke `OK`.
- Kartu wiring: uji Playwright end-to-end lulus terhadap server dev yang berjalan dengan seed `qa`.
- Aksi yang wajib diaudit tercatat di AuditLog.
- Pemeriksaan hak akses, lingkup data, dan lisensi berlaku di API, bukan hanya di UI; suite isolasi tenant lulus.
- Migrasi skema dan seed berjalan bersih di database kosong dan lewat `reset-state`.
- Code review oleh TL (kartu TL direview FS1) dan CI hijau.
- Didemokan di sprint review.

## Summary

| Sprint | Focus | BE cards | FE cards | BE Est | FE Est |
| ------ | ----- | -------- | -------- | ------ | ------ |
| S1 | Fondasi | 7 | 4 | 10.5d | 4.5d |
| S2 | Rute dan orchestrator | 5 | 4 | 10d | 4.5d |
| S3 | Pengajuan web | 9 | 3 | 11.5d | 4.5d |
| S4 | Penilaian otomatis | 9 | 3 | 11.5d | 3.5d |
| S5 | Keputusan manusia | 7 | 6 | 8.5d | 6d |
| S6 | Pasca-approval dan paket on-premise | 8 | 5 | 10d | 5d |

Kolom BE termasuk kartu `TL-`. Total semua kartu: 90d.

## Beban per orang

| Sprint | FS1 (kapasitas 10d) | TL (kapasitas 5d) | Catatan |
|---|---|---|---|
| S1 | 10d | 5d | Ditambah Role Access dan endpoint operasional. |
| S2 | 9.5d | 5d | TL penuh: orchestrator dan lisensi sama-sama kritis; review TL di sprint ini dikurangi. |
| S3 | 9.5d | 6.5d | Ditambah checklist dokumen dan notifikasi email. TL lebih 1.5d: TL-S3-05 (layanan kunci enkripsi, issue #103) dan General Parameter yang dipindah dari BE-S3-02 ke TL-S3-04; diambil dari porsi review TL. |
| S4 | 10d | 5d | Ditambah Decision Matrix dan simulasi angsuran; kandidat tunda pertama bila tergelincir. |
| S5 | 9.5d | 5d | Ditambah Approval Hierarchy dan perubahan suku bunga Approver. |
| S6 | 10d | 5d | Ditambah layar format nomor dan API audit; stabilisasi sebelum demo memakai cadangan. |
| Total | 58.5d | 31.5d | Kapasitas 60d dan 30d; cadangan FS1 1.5d, TL lebih 1.5d di S3. |
