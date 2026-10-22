---
name: Kartu kerja
about: Satu kartu dari Docs/TASK_BREAKDOWN.md (backend, frontend, atau TL)
title: "<ID-kartu> <judul kartu>"
labels: ["type:feature"]
---

## Kartu

- **ID kartu:** <!-- contoh BE-S1-03 -->
- **Sprint:** <!-- 1 s.d. 6 -->
- **Peran pemilik:** <!-- FS1 atau TL -->
- **Estimasi:** <!-- hari-developer -->

## Deskripsi

<!-- Salin Task Description kartu dari Docs/TASK_BREAKDOWN.md. -->

## Acceptance criteria

<!-- ID AC dari Docs/business/acceptance-criteria.md, satu per baris. -->
- AC-

## Rujukan

<!-- Bagian api-specs dan technical-specs dari kolom Docs kartu. -->
- 

## Definition of Done

- [ ] Setiap AC di atas punya test yang menyebut ID AC (CODING_STANDARD §9.2)
- [ ] Setiap kode error endpoint punya test (CODING_STANDARD §9.3)
- [ ] Kartu wiring: spec Playwright lulus terhadap stack dengan seed `qa` (CODING_STANDARD §9.4)
- [ ] Status operasi di `Docs/api-specs/_index.md` diperbarui ke `OK`
- [ ] Migrasi dan seed jalan bersih di database kosong dan lewat `reset-state`
- [ ] Review oleh TL (kartu TL direview FS1) dan CI hijau
