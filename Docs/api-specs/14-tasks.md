# 14. Tasks

Antrean tugas manusia: daftar, ambil, dan lepas. Penutupan tugas tidak ada di sini; setiap modul menutup tugasnya lewat operasi bisnisnya (contoh `15-verification.md` 15.3, `16-approvals.md` 16.6), lalu memanggil `taskQueue.close` dan Orchestrator. Modul pemilik: CORE Task Queue ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.12). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.10 `HUMAN_TASKS`. Katalog antrean: data dictionary HumanTask.

## 14.1 Antrean dan menu

| queueCode | Menu | Assign to Me | Operasi penutup | Rilis |
|---|---|---|---|---|
| `VERIFICATION` | `OPS-VERIFICATION` | ya | `15-verification.md` 15.3 | POC |
| `CREDIT_REPORT_UPLOAD` | `OPS-CREDIT-REPORT` | ya | `23-credit-bureau.md` 23.2 | Backlog |
| `APPROVAL` | `OPS-APPROVAL` | tidak, ditugaskan per user | `16-approvals.md` 16.6 | POC |
| `VALIDITY_CHECK` | `OPS-VALIDITY` | ya | `25-disbursement.md` 25.2 | POC |
| `PRINT_AKAD` | `OPS-PRINT-AKAD` | ya | `25-disbursement.md` 25.3 | POC |
| `DISBURSEMENT` | `OPS-DISBURSEMENT` | ya | `25-disbursement.md` 25.4 (Record Disbursement, mode MANUAL) | POC |
| `PROCESS_ERROR` | `OPS-MONITORING` | ya | `13-processes.md` 13.4, 13.5 | POC |
| `PRESCREEN_DEDUP`, `PRESCREEN_DUKCAPIL_L1`, `PRESCREEN_FRAUD` | `OPS-PRESCREEN` | ya | file modul | Backlog |
| `PRESCREEN_DUKCAPIL_L2` | `OPS-PRESCREEN-L2` | ya | `20-dukcapil.md` | Backlog |
| `RECONTEST` | `OPS-RECONTEST` | ya | `13-processes.md` 13.6 | Backlog |
| `SURVEY_MIKRO`, `SURVEY_KPR`, `EPOLIS`, `SCREENING_REVIEW` | menu modul | sesuai katalog | `26-other-modules.md` | Backlog |

Di Rilis 1, langkah `DISBURSEMENT` berjalan dalam mode MANUAL (Record Disbursement, US-101) dan `WAIT_CORE` dilewati (grooming v2 N-05, grooming v3).

## 14.2 GET /tasks

**Purpose:** Daftar tugas satu antrean, contoh halaman "Verification" atau "Validity Check".  
**Access:** VIEW pada menu antrean (14.1).

**Input (query)**

| field | type | required | notes |
|---|---|---|---|
| queueCode | enum | ya | |
| status | enum | tidak | default `OPEN,ASSIGNED` |
| assignedToMe | boolean | tidak | |
| q | string | tidak | Loan ID atau nama |
| page, pageSize, sort | | tidak | `sort`: `createdAt` (default `createdAt,asc`), `loanId` |

**Behavior:** Tugas yang boleh dilihat user: role sama dengan `eligibleRoleId` dan unit kerja mencakup cabang tugas; antrean `APPROVAL` hanya tugas dengan `assignedUserId` = user sesi (`../technical-specs/09-authentication-authorization.md` 9.4). Supervisor dengan `OPS-PRESCREEN-L2` melihat tugas antrean cabangnya untuk dilepas.

**Output 200**

```json
{
  "data": [
    { "id": "0192...", "queueCode": "VERIFICATION", "applicationId": "0192...", "loanId": "20102026KTA0000013", "fullName": "Rudi Hartono", "productCode": "KTA", "branchCode": "011",
      "status": "ASSIGNED", "assignedTo": { "id": "...", "username": "veri.01" }, "assignedAt": "2026-10-21T02:00:00Z", "createdAt": "2026-10-21T01:58:00Z", "version": 2,
      "allowedActions": ["RELEASE", "PROCEED"] }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 5, "totalPages": 1 }
}
```

`allowedActions` dihitung server untuk user sesi: `ASSIGN` (tugas `OPEN`, antrean dengan Assign to Me), `PROCEED` dan `RELEASE` (pemilik), `RELEASE_OTHER` (Supervisor). Tugas milik orang lain tidak punya `ASSIGN` dan `PROCEED` (AC-58.02, AC-58.06).

**Traceability:** US-58; AC-58.01, AC-58.02, AC-58.06.

## 14.3 POST /tasks/{id}/assign

**Purpose:** Ambil tugas ("Assign to Me").  
**Access:** UPDATE pada menu antrean; user memenuhi aturan 14.2.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| version | int | ya | dari 14.2; penguncian optimistis |

**Behavior**

1. Antrean tanpa Assign to Me: `409 INVALID_STATE`.
2. `UPDATE ... SET assigned_user_id = :me, status = 'ASSIGNED', version = version + 1 WHERE id = :id AND status = 'OPEN' AND version = :version`. Nol baris: `409 TASK_ALREADY_ASSIGNED` dengan username pengambil di pesan (AC-58.04).
3. Catat audit `TASK_ASSIGNED`.

**Output 200:** `{"data":{"id":"0192...","status":"ASSIGNED","assignedTo":{"username":"veri.02"},"version":3}}` (AC-58.01).

**Errors**

| code | status | condition |
|---|---|---|
| `TASK_ALREADY_ASSIGNED` | 409 | "This task has already been assigned to veri.01" (AC-58.04) |
| `INVALID_STATE` | 409 | Tugas `CLOSED` atau antrean tanpa Assign to Me |
| `NOT_FOUND` | 404 | Di luar antrean yang boleh dilihat user |

**Traceability:** US-58; AC-58.01, AC-58.04.

## 14.4 POST /tasks/{id}/release

**Purpose:** Lepas tugas ("Release Me" oleh pemilik, atau "Release" oleh Supervisor untuk tugas orang lain).  
**Access:** pemilik dengan UPDATE pada menu antrean; atau `OPS-PRESCREEN-L2` UPDATE untuk tugas orang lain di cabangnya.

**Input (body):** `version` (int, wajib).

**Behavior**

1. Bukan pemilik dan tanpa hak Supervisor: `403 ACTION_DENIED` (AC-58.06).
2. Kosongkan `assignedUserId`, status `OPEN`, `version + 1`; progres yang tersimpan (contoh verifikasi sebagian) tetap ada.
3. Catat audit `TASK_RELEASED` beserta pelepas (AC-58.05).

**Output 200:** `{"data":{"id":"0192...","status":"OPEN","assignedTo":null,"version":4}}` (AC-58.03, AC-58.05).

**Errors:** `ACTION_DENIED` 403, `INVALID_STATE` 409 (tugas tidak `ASSIGNED`), `TASK_VERSION_CONFLICT` 409 "This task has changed. Please refresh" (teks usulan engineering).

**Traceability:** US-58; AC-58.03, AC-58.05, AC-58.06.

## 14.5 Aturan bersama untuk operasi penutup

Setiap operasi penutup di file modul menegakkan aturan ini sebelum logika modulnya:

| Aturan | Error |
|---|---|
| Tugas langkah ini ada dan `ASSIGNED` ke user sesi (untuk `APPROVAL`: `assignedUserId` = user sesi) | `403 TASK_NOT_ASSIGNED_TO_YOU` "This task is assigned to another user" (AC-58.02) |
| Tugas sudah `CLOSED` | `409 ALREADY_PROCESSED` dengan teks AC modul |
| Penutupan dan `orchestrator.completeHumanStep` dalam satu transaksi | |
