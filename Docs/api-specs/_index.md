# Cikal API Specification

**Version:** 0.1  
**Date:** 2026-10-22  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** POC dan Rilis 1  

**Base URL:** `https://<host>/api/v1` (endpoint operasional di `/api/health/*`, `/api/metrics`, `/api/admin/reset-state`)  
**Protocol:** REST + JSON, OpenAPI 3.1 dibangkitkan dari skema Zod ([../technical-specs/04-tech-stack.md](../technical-specs/04-tech-stack.md) 4.2)  

Kontrak wire Cikal, diproyeksikan dari [../technical-specs/](../technical-specs/) (modul, data model, keamanan) dan [../business/](../business/) (US dan AC). Operasi untuk US Sprint POC 1 s.d. 6 ditulis lengkap; operasi backlog (Sprint 7 dan modul di luar POC) ditulis sebagai signature, akses, dan rujukan, dirinci saat dijadwalkan.

Keputusan bentuk kontrak (2026-10-22):

| Keputusan | Pilihan |
|---|---|
| Cakupan | POC penuh, backlog ringkas |
| Checker-maker | Maker menulis ke resource masing-masing (202 + ChangeRequest); Checker memakai `/change-requests` generik |
| Tugas manusia | `/tasks` hanya antrean (daftar, assign, release); tugas ditutup oleh operasi bisnis modul |
| Idempotensi | `Idempotency-Key` wajib di operasi kritis, opsional di operasi lain |

## Files in This Directory

| No | File | Isi | Modul |
|---|---|---|---|
| 1 | [01-conventions.md](01-conventions.md) | Transport, envelope, paging, idempotensi, checker-maker, kode status dan error, kode menu | Semua |
| 2 | [02-authentication.md](02-authentication.md) | Login, logout, sesi | CORE Identity |
| 3 | [03-access-control.md](03-access-control.md) | Role, menu, role access, user | CORE Identity |
| 4 | [04-tenancy-license.md](04-tenancy-license.md) | Lisensi, company | CORE Tenant & License |
| 5 | [05-organization.md](05-organization.md) | Regional, cabang, sub cabang | CORE Organization |
| 6 | [06-master-data.md](06-master-data.md) | General Parameter, asuransi, wilayah | CORE Master Data |
| 7 | [07-change-requests.md](07-change-requests.md) | Checker: daftar, detail, approve, reject | CORE Change Request |
| 8 | [08-products-routes.md](08-products-routes.md) | Produk, pricing, rute, checklist dokumen | CORE Product & Route |
| 9 | [09-calculation.md](09-calculation.md) | Simulasi angsuran, katalog variabel | CORE Calculation |
| 10 | [10-documents.md](10-documents.md) | Unduhan file, format nomor dokumen | CORE Document |
| 11 | [11-integrations.md](11-integrations.md) | Konfigurasi penyedia, uji koneksi, log, data masuk | CORE Integration Registry |
| 12 | [12-applications.md](12-applications.md) | Draft, section, dokumen, submit, detail | CORE Application |
| 13 | [13-processes.md](13-processes.md) | Timeline, Process Monitoring, retry, finish | CORE Orchestrator |
| 14 | [14-tasks.md](14-tasks.md) | Antrean tugas, assign, release | CORE Task Queue |
| 15 | [15-verification.md](15-verification.md) | Verifikasi dokumen | CORE Verification |
| 16 | [16-approvals.md](16-approvals.md) | Hierarki approver, keputusan, struktur kredit | CORE Approval |
| 17 | [17-reporting-audit.md](17-reporting-audit.md) | Inquiry, audit trail | CORE Reporting, Audit |
| 18 | [18-notifications.md](18-notifications.md) | Pemicu email (tanpa endpoint POC) | CORE Notification |
| 19 | [19-dedup.md](19-dedup.md) | Hasil Dedup | M06 |
| 20 | [20-dukcapil.md](20-dukcapil.md) | Hasil Dukcapil | M07 |
| 21 | [21-fraud.md](21-fraud.md) | Hasil Fraud | M08 |
| 22 | [22-scoring.md](22-scoring.md) | Model scoring dan RAC, uji, hasil | M09 |
| 23 | [23-credit-bureau.md](23-credit-bureau.md) | Unggah iDeb manual, hasil SLIK | M10 |
| 24 | [24-decision.md](24-decision.md) | Decision Matrix, simulasi, hasil | M11 |
| 25 | [25-disbursement.md](25-disbursement.md) | Validity Check, Print Akad, Record Disbursement | M15 |
| 26 | [26-other-modules.md](26-other-modules.md) | Modul backlog M01 s.d. M05, M12 s.d. M14, M16 | Backlog |
| 27 | [27-system.md](27-system.md) | Health, metrics, reset state | Platform |

## Operation Status Tracker

Legend: `OK` diimplementasikan dan diuji, `WIP` sedang dikerjakan, `TODO` belum dimulai, `SCAFFOLD` stub Tech Lead yang mengembalikan data tiruan.

### Authentication

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `POST /auth/login` | 02 §2.2 | POC | OK |
| `POST /auth/logout` | 02 §2.3 | POC | OK |
| `GET /auth/session` | 02 §2.4 | POC | OK |
| `POST /auth/mfa/verify` | 02 §2.6 | Backlog | TODO |
| `GET /auth/sso/{companyCode}/start`, `GET /auth/sso/callback` | 02 §2.6 | Backlog | TODO |
| `POST /auth/password/forgot`, `/reset`, `/change` | 02 §2.6 | Backlog | TODO |
| `POST /auth/mobile/token`, `/refresh` | 02 §2.6 | Backlog | TODO |

### Access control

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /roles` | 03 §3.1 | POC | OK |
| `GET /menus` | 03 §3.2 | POC | OK |
| `GET /role-access` | 03 §3.3 | POC | OK |
| `POST /role-access` | 03 §3.4 | POC | OK |
| `PUT /role-access/{id}` | 03 §3.5 | POC | OK |
| `GET /users` | 03 §3.6 | POC | OK |
| Users, roles, user access, menus (tulis), devices | 03 §3.7 | Backlog | TODO |

### Tenancy and license

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /license` | 04 §4.1 | POC | OK |
| `POST /license` | 04 §4.2 | POC | OK |
| Companies, copy configuration, licenses SaaS | 04 §4.3 | Backlog | TODO |

### Organization

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /branches` | 05 §5.1 | POC | OK |
| `GET /regionals`, `GET /branches/{id}/sub-branches` | 05 §5.2 | POC | OK |
| Regional, branch, sub branch, currency (tulis) | 05 §5.3 | Backlog | TODO |

### Master data

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /parameters/{paramType}/options` | 06 §6.1 | POC | OK |
| `GET /insurances` | 06 §6.2 | POC | OK |
| `GET /regions/provinces`, `/cities`, `/districts`, `/sub-districts` | 06 §6.3.1 | POC | OK |
| `GET /regions/search` | 06 §6.3.2 | POC | OK |
| `POST /regions/sync` | 06 §6.3.3 | POC | OK |
| `GET /regions/sync/{syncId}` | 06 §6.3.4 | POC | OK |
| General Parameter, import/export, insurance, system parameter (tulis) | 06 §6.4 | Backlog | TODO |

### Change requests

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /change-requests` | 07 §7.2 | POC | OK |
| `GET /change-requests/{id}` | 07 §7.3 | POC | OK |
| `POST /change-requests/{id}/approve` | 07 §7.4 | POC | OK |
| `POST /change-requests/{id}/reject` | 07 §7.5 | POC | OK |
| `POST /change-requests/{id}/revise`, `/resubmit` | 07 §7.6 | Backlog | TODO |

### Products and routes

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /products` | 08 §8.1 | POC | OK |
| `GET /products/{id}` | 08 §8.2 | POC | OK |
| `POST /products` | 08 §8.3 | POC | OK |
| `PUT /products/{id}` | 08 §8.4 | POC | OK |
| `GET /products/{id}/pricing` | 08 §8.5 | POC | OK |
| `PUT /products/{id}/pricing` | 08 §8.6 | POC | OK |
| `GET /products/available` | 08 §8.7 | POC | OK |
| `PUT /products/{id}/route` | 08 §8.9 | POC | WIP (langkah 3 IN-09 di BE-S2-03) |
| `GET /products/{id}/route` | 08 §8.10 | POC | OK |
| `POST /document-checklists` | 08 §8.11 | POC | OK |
| `GET /document-checklists`, `PUT /document-checklists/{id}` | 08 §8.12 | POC | OK |
| `GET /products/{id}/route/versions` | 08 §8.13 | Backlog | TODO |

### Calculation

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `POST /calculations/installment-simulation` | 09 §9.1 | POC | OK |
| `GET /formula-variables` | 09 §9.2 | POC | OK |
| Formulas, versions, validate, tests, holidays | 09 §9.3 | Backlog | TODO |

### Documents

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /files/{fileId}/download-url` | 10 §10.1 | POC | OK |
| `GET /document-number-formats` | 10 §10.3 | POC | TODO |
| `POST /document-number-formats/preview` | 10 §10.4 | POC | TODO |
| `PUT /document-number-formats/{documentType}` | 10 §10.5 | POC | TODO |
| Document templates | 10 §10.7 | Backlog | TODO |

### Integrations

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /integrations/providers` | 11 §11.1 | Backlog | TODO |
| `GET /integrations/configs` | 11 §11.2 | Backlog | TODO |
| `PUT /integrations/configs/{moduleCode}` | 11 §11.3 | Backlog (POC memakai seed) | TODO |
| `POST /integrations/test-connection` | 11 §11.4 | Backlog | TODO |
| `GET /integrations/call-logs` | 11 §11.5 | Backlog | TODO |
| `POST /integrations/inbound/{companyCode}/{providerCode}` | 11 §11.6 | Backlog | TODO |
| Simulation responses | 11 §11.7 | Backlog | TODO |

### Applications

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `POST /applications` | 12 §12.2 | POC | OK |
| `PUT /applications/{id}/sections/{section}` | 12 §12.3 | POC | OK |
| `GET /applications/drafts` | 12 §12.4 | POC | OK |
| `GET /applications/{id}/form` | 12 §12.5 | POC | OK |
| `GET /applications/{id}/documents` | 12 §12.6 | POC | OK |
| `PUT /applications/{id}/documents/{documentType}` | 12 §12.7 | POC | OK |
| `POST /applications/{id}/submit` | 12 §12.8 | POC | OK |
| `GET /applications/{id}` | 12 §12.9 | POC | TODO |
| `GET /applications/by-loan-id/{loanId}` | 12 §12.10 | POC | TODO |
| Sections spouse, business, collateral; OCR; pension | 12 §12.11 | Backlog | TODO |

### Processes

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /applications/{id}/process` | 13 §13.2 | POC | OK |
| `GET /process-monitoring` | 13 §13.3 | POC | OK |
| `POST /processes/{processInstanceId}/steps/{stepExecutionId}/retry` | 13 §13.4 | POC | OK |
| `POST /processes/{processInstanceId}/finish` | 13 §13.5 | POC | OK |
| `POST /applications/{id}/recontest`, `/recontest/finish` | 13 §13.6 | Backlog | TODO |

### Tasks

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /tasks` | 14 §14.2 | POC | OK |
| `POST /tasks/{id}/assign` | 14 §14.3 | POC | OK |
| `POST /tasks/{id}/release` | 14 §14.4 | POC | OK |

### Verification

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /applications/{id}/verification` | 15 §15.1 | POC | OK |
| `PUT /applications/{id}/verification` | 15 §15.2 | POC | OK |
| `POST /applications/{id}/verification/submit` | 15 §15.3 | POC | OK |

### Approvals

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /approval-hierarchies` | 16 §16.1 | POC | OK |
| `POST /approval-hierarchies` | 16 §16.2 | POC | OK |
| `PUT /approval-hierarchies/{id}` | 16 §16.3 | POC | OK |
| `GET /applications/{id}/approval` | 16 §16.5 | POC | OK |
| `POST /applications/{id}/approval/decision` | 16 §16.6 | POC | OK |
| `GET /applications/{id}/financing` | 16 §16.7 | POC | OK |
| Approval levels, import setup | 16 §16.8 | Backlog | TODO |

### Reporting and audit

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /applications` | 17 §17.1 | POC | TODO |
| `GET /audit-logs` | 17 §17.2 | POC | TODO |
| `GET /audit-logs/{id}` | 17 §17.3 | POC | TODO |
| Dashboard, export | 17 §17.4 | Backlog | TODO |
| Email templates, notification history | 18 §18.2 | Backlog | TODO |

### Modul langkah (M06 s.d. M11, M15)

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /applications/{id}/dedup` | 19 §19.2 | POC | OK |
| `GET /applications/{id}/dukcapil` | 20 §20.2 | POC | OK |
| `GET /applications/{id}/fraud` | 21 §21.2 | POC | OK |
| `GET /scoring-models` | 22 §22.1 | POC | OK |
| `GET /scoring-models/{id}` | 22 §22.2 | POC | OK |
| `POST /scoring-models`, `POST /scoring-models/{id}/new-version`, `PUT /scoring-models/{id}` | 22 §22.3 | POC | OK |
| `POST`, `PUT`, `DELETE /scoring-models/{id}/criteria[/{criterionId}]` | 22 §22.3 | POC | OK |
| `POST /scoring-models/{id}/submit` | 22 §22.4 | POC | OK |
| `POST /scoring-models/{id}/test` | 22 §22.5 | POC | TODO |
| `GET /applications/{id}/scoring` | 22 §22.6 | POC | OK |
| `POST /applications/{id}/credit-report` | 23 §23.2 | Backlog | TODO |
| `GET /applications/{id}/credit-bureau` | 23 §23.3 | POC | OK |
| `GET /decision-matrix`, `PUT /decision-matrix/rows/{id}`, `POST /decision-matrix/rows` | 24 §24.2 | POC | OK |
| `POST /decision-matrix/simulate` | 24 §24.3 | POC | OK |
| `GET /applications/{id}/decision` | 24 §24.4 | POC | OK |
| `GET /applications/{id}/disbursement` | 25 §25.1 | POC | TODO |
| `POST /applications/{id}/validity-check` | 25 §25.2 | POC | TODO |
| `POST /applications/{id}/akad/print` | 25 §25.3 | POC | TODO |
| `POST /applications/{id}/disbursement/record` | 25 §25.4 | POC | TODO |
| Dedup, Dukcapil, Fraud: matrix, rules, review, blacklist | 19 §19.3, 20 §20.3, 21 §21.3 | Backlog | TODO |
| Credit bureau mappings | 23 §23.4 | Backlog | TODO |
| Reprint akad, send to core | 25 §25.5 | Backlog | TODO |
| M01 to M05, M12 to M14, M16 | 26 | Backlog | TODO |

### System

| Operasi | Spec | Rilis | Status |
|---|---|---|---|
| `GET /api/health/live` | 27 §27.1 | POC | TODO |
| `GET /api/health/ready` | 27 §27.2 | POC | TODO |
| `GET /api/metrics` | 27 §27.3 | POC | TODO |
| `POST /api/admin/reset-state` (non-production saja) | 27 §27.4 | POC | TODO |

## Temuan untuk BA dan Product Owner

Celah yang ditemukan saat menurunkan kontrak. Kontrak memakai pilihan di kolom "Dipakai sekarang" sampai dijawab.

| No | Temuan | Dipakai sekarang | File |
|---|---|---|---|
| 1 | API-03 meminta Bearer untuk semua klien; tech spec memilih cookie sesi untuk web | Cookie + CSRF untuk web, Bearer untuk mobile, mitra, monitoring | 01 §1.3 |
| 2 | Kode menu belum ada di data dictionary | Daftar usulan engineering untuk seed | 01 §1.11 |
| 3 | AC-01.09, AC-01.10 (verifikasi dua langkah) tidak ada di tech spec | Ditutup: AC Deferred ke backlog (`grooming-poc-ac-tertunda.md`); kontrak TOTP backlog | 02 §2.6 |
| 4 | AC-97.01 s.d. AC-97.03 memakai rentang tenor; data model memakai SubProduct per periode (R-19) | Ditutup: AC ditulis ulang per periode (`grooming-poc-ac-tertunda.md`) | 08 §8.6 |
| 5 | Grooming v2 menyebut langkah `RECORD_DISBURSEMENT`; tech spec memakai `DISBURSEMENT` mode MANUAL | `DISBURSEMENT` mode MANUAL, antrean `DISBURSEMENT` | 25 |
| 6 | Layar unggah iDeb (mode MANUAL M10) belum punya AC | Kontrak dari data dictionary CreditBureauResult; POC memakai adapter simulasi | 23 §23.2 |
| 7 | Beberapa pesan error belum punya teks AC | Teks bertanda "teks usulan engineering" di setiap file | 01 s.d. 25 |

## Companion Documents

| Dokumen | Lokasi | Keterangan |
|---|---|---|
| Technical specs | [../technical-specs/_index.md](../technical-specs/_index.md) | Arsitektur, modul, data model, keamanan |
| User story | [../business/user-story.md](../business/user-story.md) | US-01 s.d. US-102 |
| Acceptance criteria | [../business/acceptance-criteria.md](../business/acceptance-criteria.md) | Indeks AC per sprint |
| Sprint breakdown | [../business/sprint-breakdown.md](../business/sprint-breakdown.md) | Sprint POC 1 s.d. 6 dan backlog |
| Task breakdown | [../TASK_BREAKDOWN.md](../TASK_BREAKDOWN.md) | Kartu sprint POC |
| Data dictionary | [../ba/data-dictionary.md](../ba/data-dictionary.md) | Entity dan atribut |
| Glossary | [../ba/glossary.md](../ba/glossary.md) | Istilah bisnis |
