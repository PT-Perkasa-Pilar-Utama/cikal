# 5. Organization

Regional, Branch, Sub Branch, Currency, dan kurs. Modul pemilik: CORE Organization ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.3). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.5.

Di POC, struktur organisasi berasal dari seed. Yang dibutuhkan layar lain hanya daftar unit aktif.

## 5.1 GET /branches

**Purpose:** Daftar cabang aktif untuk dropdown (Approval Hierarchy, filter inquiry, filter monitoring).  
**Access:** Sesi aktif dengan hak View pada salah satu menu yang memakai dropdown cabang (`MST-APPROVAL`, `APP-INQUIRY`, `OPS-MONITORING`, `MST-ORG`).

**Input (query):** `regionalId` (uuid), `q` (kode atau nama), `includeInactive` (boolean, default `false`; hanya untuk `MST-ORG`), `page`, `pageSize` (maks 100), `sort` (`branchCode`, `branchName`).

**Behavior:** Hanya unit aktif kecuali `includeInactive` (AC-17.06). Dibatasi lingkup data user: role cabang hanya melihat cabangnya (TN-02).

**Output 200**

```json
{ "data": [ { "id": "0192...", "branchCode": "011", "branchName": "Bandung", "regional": { "id": "...", "regionalCode": "01", "regionalName": "Jawa Barat" }, "isActive": true } ], "meta": { "page": 1, "pageSize": 100, "totalItems": 12, "totalPages": 1 } }
```

**Traceability:** US-17 (AC-17.06); dipakai US-27, US-83, US-86.

## 5.2 GET /regionals, GET /branches/{id}/sub-branches

**Purpose:** Dropdown berjenjang regional dan sub cabang.  
**Access:** sama dengan 5.1.  
**Output:** bentuk sama dengan 5.1 (`regionalCode`/`regionalName`, `subBranchCode`/`subBranchName`).  
**Errors:** cabang di luar tenant atau lingkup data user: `404 NOT_FOUND`.  
**Traceability:** US-17 (AC-17.06).

## 5.3 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `POST /regionals`, `PUT /regionals/{id}` | Kelola regional lewat checker-maker | `MST-ORG` | US-17 |
| `POST /branches`, `PUT /branches/{id}` | Kelola cabang; nonaktif ditolak bila masih ada pengajuan berjalan; kode unik per regional | `MST-ORG` | US-17; AC-17.04, AC-17.05 |
| `POST /branches/{id}/sub-branches`, `PUT /sub-branches/{id}` | Kelola sub cabang | `MST-ORG` | US-17 |
| `GET /currencies`, `POST /currencies`, `PUT /currencies/{id}` | Mata uang company (ISO 4217) | `MST-ORG` | US-18 |
| `GET /currencies/{id}/rates`, `POST /currencies/{id}/rates` | Kurs; pengajuan memakai kurs saat submit | `MST-ORG` | US-19; AC-19.04 |
