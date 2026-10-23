# Cikal Technical Specification

**Version:** 0.1  
**Date:** 2026-10-21  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** POC dan Rilis 1  

Spesifikasi teknis Cikal (rebuild LOS). Diturunkan dari `Docs/business/` (user story, AC, sprint breakdown) dan dokumen BA (`Docs/cikal-tech-reference.md`, `Docs/ba/data-dictionary.md`). Semua keputusan teknis di set ini diputuskan saat grill technical spec 2026-10-21.

## Daftar isi

| No | Dokumen | Isi |
|---|---|---|
| 1 | [01-overview.md](01-overview.md) | Tujuan, ruang lingkup per modul, pengguna, alur bisnis, asumsi |
| 2 | [02-system-architecture.md](02-system-architecture.md) | Modular monolith, perakitan paket per lisensi, diagram, batas modul |
| 3 | [03-repository-structure.md](03-repository-structure.md) | Struktur monorepo dan modul |
| 4 | [04-tech-stack.md](04-tech-stack.md) | Teknologi per lapisan, yang tidak dipakai, kebijakan versi |
| 5 | [05-module-definitions.md](05-module-definitions.md) | Antarmuka setiap modul CORE dan M01 s.d. M16, endpoint operasional |
| 6 | [06-data-model.md](06-data-model.md) | ERD, tabel, migrasi dan seed, state machine |
| 7 | [07-security.md](07-security.md) | Sesi, otorisasi, isolasi tenant, enkripsi, lisensi, endpoint operasional |
| 8 | [08-non-functional-requirements.md](08-non-functional-requirements.md) | Volume, latensi, ketersediaan, retensi, observability |
| 9 | [09-authentication-authorization.md](09-authentication-authorization.md) | Mekanisme per kanal, matriks role, kode error |
| 10 | [10-integration-points.md](10-integration-points.md) | Daftar integrasi, kegagalan, cadangan |
| 11 | [11-environment-configuration.md](11-environment-configuration.md) | Environment variable per lingkungan |
| 12 | [12-orchestrator-step-contract.md](12-orchestrator-step-contract.md) | Dokumen khusus: orchestrator dan kontrak langkah |
| 13 | [13-integration-adapter-pattern.md](13-integration-adapter-pattern.md) | Dokumen khusus: pola adapter integrasi |

## Dokumen pendamping

| Dokumen | Lokasi | Keterangan |
|---|---|---|
| User story | [../business/user-story.md](../business/user-story.md) | US-01 s.d. US-102 |
| Sprint breakdown | [../business/sprint-breakdown.md](../business/sprint-breakdown.md) | Sprint POC 1 s.d. 6 dan backlog |
| Acceptance criteria | [../business/acceptance-criteria.md](../business/acceptance-criteria.md) | Indeks; isi Gherkin per sprint di `acceptance-criteria-breakdown/` |
| Grooming | [../business/grooming/](../business/grooming/) | Keputusan v1, v2, v3 |
| Referensi teknis BA | [../cikal-tech-reference.md](../cikal-tech-reference.md) | Aturan bisnis dan teknis BA |
| Konsep TO-BE | [../cikal-to-be-concept.md](../cikal-to-be-concept.md) | Rute modul dan prinsip desain |
| Data dictionary | [../ba/data-dictionary.md](../ba/data-dictionary.md) | Entity dan atribut |
| Glossary | [../ba/glossary.md](../ba/glossary.md) | Istilah bisnis |
| Design system | [../design-system.md](../design-system.md) | Token dan pola UI |
| Task breakdown | [../TASK_BREAKDOWN.md](../TASK_BREAKDOWN.md) | Kartu sprint POC |
| API specs | [../api-specs/_index.md](../api-specs/_index.md) | Kontrak REST `/api/v1`, 27 file |
| Coding standard | [../CODING_STANDARD.md](../CODING_STANDARD.md) | Dibuat kemudian |
| Deployment plan | [../DEPLOYMENT_PLAN.md](../DEPLOYMENT_PLAN.md) | Dibuat kemudian |

## Catatan ADR

| ADR | Keputusan | Dokumen |
|---|---|---|
| ADR-001 | Satu modular monolith dengan perakitan paket per lisensi, menyimpang dari default BA TO-02 ([Usulan]) | `02-system-architecture.md` 2.2, 2.4 |
| ADR-002 | Stack: Node.js 22, TypeScript, NestJS 11 + Fastify, Drizzle, Zod, React 19 SPA, PostgreSQL 17, pg-boss | `04-tech-stack.md` |
| ADR-003 | Isolasi tenant: `tenant_id` + Row-Level Security | `06-data-model.md` 6.1, `07-security.md` 7.3 |
| ADR-004 | Mesin rumus: jsep + evaluator daftar putih + decimal.js | `05-module-definitions.md` 5.16 |
| ADR-005 | File di object storage dienkripsi oleh storage (SeaweedFS `-filer.encryptVolumeData` atau default encryption penyedia), tanpa enkripsi isi file di aplikasi, agar URL bertanda tangan tetap bisa menyajikan file (issue #103) | `07-security.md` 7.7 |
