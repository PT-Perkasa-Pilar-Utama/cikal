# 3. Access Control

User, role, menu, dan hak akses. Modul pemilik: CORE Identity & Access ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.1). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.4. Model otorisasi: [../technical-specs/09-authentication-authorization.md](../technical-specs/09-authentication-authorization.md) 9.4.

Di POC, user dan role berasal dari seed; layar yang dibangun adalah Role Access (US-09) dan daftar pilihan yang dibutuhkan layar lain.

## 3.1 GET /roles

**Purpose:** Daftar role aktif untuk dropdown "Role" di Role Access dan User.  
**Access:** `IAM-ROLE-ACCESS` VIEW atau `IAM-ROLE` VIEW.

**Input (query):** `isActive` (boolean, default `true`), `q` (string, nama role), `page`, `pageSize`, `sort` (`roleName`).

**Behavior:** Membaca `iam.roles` tenant aktif.

**Output 200**

```json
{ "data": [ { "id": "0192...", "roleName": "Checker", "isActive": true } ], "meta": { "page": 1, "pageSize": 20, "totalItems": 16, "totalPages": 1 } }
```

**Errors:** standar (`01-conventions.md` 1.10).

**Traceability:** US-09 (AC-09.01 dropdown Role).

## 3.2 GET /menus

**Purpose:** Pohon menu dan sub menu untuk dropdown "Menu" dan "Sub Menu" di Role Access.  
**Access:** `IAM-ROLE-ACCESS` VIEW.

**Input (query):** `includeInactive` (boolean, default `false`).

**Behavior:** Membaca `iam.menus` [instalasi]; menu modul yang tidak berlisensi tidak dikembalikan (LC-04).

**Output 200**

```json
{
  "data": [
    { "id": "0192...", "menuCode": "MST", "menuName": "Master Data", "menuIndex": 3, "moduleCode": "CORE",
      "children": [ { "id": "0192...", "menuCode": "MST-PRODUCT", "menuName": "Product", "menuIndex": 1, "link": "/master/products", "moduleCode": "CORE", "children": [] } ] }
  ]
}
```

**Errors:** standar.

**Traceability:** US-09 (AC-09.01); AC-100.03.

## 3.3 GET /role-access

**Purpose:** Daftar hak akses aktif per role di halaman "Role Access".  
**Access:** `IAM-ROLE-ACCESS` VIEW.

**Input (query)**

| field | type | required | notes |
|---|---|---|---|
| roleId | uuid | tidak | |
| menuId | uuid | tidak | |
| page, pageSize, sort | | tidak | `sort`: `roleName`, `menuName` |

**Output 200**

```json
{
  "data": [
    { "id": "0192...", "role": { "id": "...", "roleName": "Checker" }, "menu": { "id": "...", "menuCode": "MST-PRODUCT", "menuName": "Product", "parentMenuName": "Master Data" },
      "canView": true, "canCreate": false, "canUpdate": false, "canDelete": false, "canApprove": true, "hasPendingChange": false }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 64, "totalPages": 4 }
}
```

`hasPendingChange` = ada ChangeRequest terbuka untuk baris ini; klien menonaktifkan ikon edit.

**Traceability:** US-09.

## 3.4 POST /role-access

**Purpose:** Maker memberi akses menu ke role (tombol "New Role Access").  
**Access:** `IAM-ROLE-ACCESS` CREATE.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| roleId | uuid | ya | role aktif |
| menuId | uuid | ya | menu atau sub menu aktif |
| canView | boolean | ya | wajib `true` bila salah satu aksi lain `true` |
| canCreate, canUpdate, canDelete, canApprove | boolean | ya | |

**Behavior**

1. Validasi skema; role dan menu harus aktif di tenant (menu: instalasi). Role nonaktif, menu nonaktif, dan menu modul tak berlisensi dijawab `404 NOT_FOUND` karena tidak bisa dipilih di dropdown.
2. Bila salah satu `canCreate/canUpdate/canDelete/canApprove` bernilai `true` dan `canView = false`: `422 VIEW_ACCESS_REQUIRED` (AC-09.03).
3. Kombinasi `roleId + menuId` sudah ada (aktif atau sedang diajukan): `409 ROLE_ACCESS_EXISTS`.
4. Buat ChangeRequest `entityType = ROLE_ACCESS`, `action = CREATE` (`01-conventions.md` 1.8).
5. Setelah checker menyetujui, sesi aktif memakai hak baru pada request berikutnya: hak menu dibaca dari database di setiap request, tanpa cache yang perlu dibuang.

**Output 202:** `{"data":{"changeRequestId":"...","entityType":"ROLE_ACCESS","entityId":null,"status":"WAITING_APPROVAL"},"message":"Data submitted for approval"}` (AC-09.01). Baris tampil di "Pending Role Access" lewat `GET /change-requests?entityType=ROLE_ACCESS`.

**Errors**

| code | status | condition |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Field wajib kosong |
| `VIEW_ACCESS_REQUIRED` | 422 | "View access is required when other access is granted" (AC-09.03) |
| `ROLE_ACCESS_EXISTS` | 409 | "Access for this role and menu already exists" (teks usulan engineering) |
| `NOT_FOUND` | 404 | Role atau menu tidak ada |

**Traceability:** US-09; AC-09.01, AC-09.03.

## 3.5 PUT /role-access/{id}

**Purpose:** Maker mengubah toggle aksi pada hak akses yang sudah ada.  
**Access:** `IAM-ROLE-ACCESS` UPDATE.

**Input:** path `id`; body `canView`, `canCreate`, `canUpdate`, `canDelete`, `canApprove` (boolean, wajib). Mencabut seluruh akses = semua `false`.

**Behavior:** Aturan 3.4 langkah 2; permintaan terbuka untuk baris yang sama: `409 PENDING_CHANGE_REQUEST` (AC-12.06); tanpa perubahan dibanding data aktif: `422 NO_CHANGES` "No changes to submit". Membuat ChangeRequest `UPDATE` dengan `oldData` dari data aktif.

**Output 202:** sama dengan 3.4.

**Errors:** `VIEW_ACCESS_REQUIRED` 422, `PENDING_CHANGE_REQUEST` 409, `NO_CHANGES` 422, `NOT_FOUND` 404.

**Traceability:** US-09; AC-09.03, AC-12.06.

## 3.6 GET /users

**Purpose:** Daftar user untuk dropdown pilihan user di layar lain: "Approver" di Approval Hierarchy (AC-27.01, AC-27.02) dan "Risk Manager" di Print Akad dengan `withAccess=OPS-RECONTEST:UPDATE` (AC-77.01).  
**Access:** `IAM-USER` VIEW, `MST-APPROVAL` VIEW, atau `OPS-PRINT-AKAD` UPDATE (keputusan 2026-10-29: Admin Operasional memilih Risk Manager tanpa hak menu User).

**Input (query)**

| field | type | required | notes |
|---|---|---|---|
| q | string | tidak | username atau nama lengkap |
| status | enum | tidak | `ACTIVE` (default), `INACTIVE`, `NO_ROLE`, `LOCKED` |
| branchId | uuid | tidak | |
| withAccess | string | tidak | `<menuCode>:<action>`, contoh `OPS-APPROVAL:APPROVE`; hanya user yang hak efektifnya mencakup aksi itu hari ini |
| page, pageSize, sort | | tidak | `sort`: `username`, `fullName` |

**Output 200**

```json
{ "data": [ { "id": "0192...", "username": "rina.approver", "fullName": "Rina Kusuma", "roleName": "Approver", "branchCode": "011", "status": "ACTIVE" } ], "meta": { "page": 1, "pageSize": 20, "totalItems": 3, "totalPages": 1 } }
```

Email dan nomor telepon tidak dikembalikan di daftar ini.

**Traceability:** US-27 (AC-27.01, AC-27.02); US-77 (AC-77.01); US-07 (backlog).

## 3.7 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /users/{id}`, `POST /users`, `PUT /users/{id}` | Daftarkan dan ubah user lewat checker-maker; nonaktif mencabut sesi dan melepas tugas | `IAM-USER` | US-07; AC-07.05 |
| `POST /users/{id}/unlock` | Buka kunci akun sebelum `lockedUntil` | `IAM-USER` UPDATE | US-07 |
| `POST /roles`, `PUT /roles/{id}` | Kelola role; nonaktif ditolak bila dipakai user aktif | `IAM-ROLE` | US-08; AC-08.04 |
| `GET /user-access`, `POST /user-access`, `PUT /user-access/{id}` | Akses khusus per user dengan `validFrom` s.d. `validTo` inklusif | `IAM-USER-ACCESS` | US-10; AC-10.02 s.d. AC-10.04 |
| `POST /menus`, `PUT /menus/{id}` | Kelola menu instalasi | `SYS-MENU` | US-11 |
| `GET /devices` | Perangkat yang dipakai Sales (M01) | `IAM-USER` VIEW | US-93 |
