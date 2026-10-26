# 16. Approvals

Hierarki approver, keputusan approval, auto approval, dan struktur kredit. Modul pemilik: CORE Approval ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.14). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.10 `APPROVAL_*`, `FINANCINGS`, `INSTALLMENTS`. Aturan: RM-05 (auto approval), RM-06 (rantai level), RM-07, RM-08 (struktur kredit).

Di POC, Approval Level (US-26) berasal dari seed; Approval Hierarchy dikelola lewat layar (US-27).

## 16.1 GET /approval-hierarchies

**Purpose:** Halaman "Approval Hierarchy".  
**Access:** `MST-APPROVAL` VIEW.

**Input (query):** `branchId`, `productId`, `jobLevel`, paging, `sort` (`branchCode`, `jobLevel`).

**Output 200**

```json
{ "data": [ { "id": "0192...", "branch": { "id": "...", "branchCode": "011" }, "product": { "id": "...", "productCode": "KPR" }, "jobLevel": 2, "subLevel": 1,
              "levelDescription": "Kepala Cabang", "upLevel": 1, "upSubLevel": 1,
              "approver": { "id": "...", "username": "rina.approver", "fullName": "Rina Kusuma", "status": "INACTIVE" },
              "approverInactive": true, "isActive": true, "hasPendingChange": false } ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 6, "totalPages": 1 } }
```

`approverInactive = true` dirender sebagai label "Inactive approver" (AC-27.03).

**Traceability:** US-27; AC-27.03.

## 16.2 POST /approval-hierarchies

**Purpose:** Maker menetapkan approver untuk satu level dan sub level (tombol "New Hierarchy").  
**Access:** `MST-APPROVAL` CREATE.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| branchId | uuid | ya | |
| productId | uuid | ya | |
| jobLevel | int | ya | harus ada di Approval Level cabang dan produk |
| subLevel | int | ya | >= 1 |
| approverUserId | uuid | ya | user aktif |
| upLevel, upSubLevel | int | tidak | level berikutnya dalam rantai (RM-06); diisi berpasangan atau dikosongkan berdua, selain itu `400` "Up Level and Up Sub Level must be filled together" (teks usulan engineering). `upLevel` juga harus ada di Approval Level cabang dan produk |

**Behavior**

1. Approval Level `(branchId, productId, jobLevel)` tidak ada: `422 APPROVAL_LEVEL_NOT_FOUND`.
2. Approver tanpa hak APPROVE efektif pada `OPS-APPROVAL`, atau user tidak aktif: `422 APPROVER_WITHOUT_ACCESS` (AC-27.02).
3. Kombinasi branch, product, level, sub level, approver sudah ada: `409 HIERARCHY_EXISTS`.
4. Buat ChangeRequest `APPROVAL_HIERARCHY`.

**Output 202:** `message` "Data submitted for approval" (AC-27.01).

**Errors**

| code | status | condition |
|---|---|---|
| `APPROVER_WITHOUT_ACCESS` | 422 | "Selected user does not have approval access" (AC-27.02) |
| `APPROVAL_LEVEL_NOT_FOUND` | 422 | "Approval level 2 is not set up for this branch and product" (teks usulan engineering) |
| `HIERARCHY_EXISTS` | 409 | "This approver is already assigned to this level" (teks usulan engineering) |

**Traceability:** US-27; AC-27.01, AC-27.02.

## 16.3 PUT /approval-hierarchies/{id}

**Purpose:** Ganti approver atau `upLevel` pada baris hierarki.  
**Access:** `MST-APPROVAL` UPDATE.  
**Input:** `approverUserId`, `upLevel`, `upSubLevel`, `isActive`.  
**Behavior:** Aturan 16.2 langkah 2; `01-conventions.md` 1.8. Setelah approver pengganti disetujui, langkah Approval yang `ERROR` karena tidak ada approver aktif bisa di-retry dari Process Monitoring (AC-27.04).  
**Output 202.**  
**Traceability:** US-27; AC-27.03, AC-27.04.

## 16.4 Perilaku langkah APPROVAL (tanpa endpoint)

StepHandler `APPROVAL` berjalan setelah DECISION `GO` (atau langsung bila M11 tidak berlisensi). Hasil Decision `NOTGO` membawa pengajuan ke Recontest dan langkah Approval tidak dijalankan (AC-74.04).

| Kondisi | Hasil | Rujukan |
|---|---|---|
| `limitAutoApproval > 0` dan `requestedLimit <= limitAutoApproval` | Keputusan `AUTO_APPROVED` oleh System; struktur kredit dibangun (`approvalType` `AUTO`); `CONTINUE` dengan `outcomeCode` `AUTO_APPROVED`, atau `FINISH APPROVED` bila tidak ada langkah sesudah APPROVAL | AC-74.01, AC-74.02, AC-74.05, RM-05 |
| Selain itu | Rantai dibentuk sekali per ProcessInstance: mulai dari sub level terkecil level terendah (nomor level terbesar), naik lewat `upLevel`/`upSubLevel` sampai level yang rentangnya mencakup nominal (batas mengikuti `APPROVAL_RANGE_BOUNDARY`) atau sampai level `isFinalApprover`. Tiap posisi rantai mendapat approver aktif pertama menurut urutan pembuatan baris hierarki. Tugas `APPROVAL` `ASSIGNED` ke approver posisi pertama; `WAIT_HUMAN` | AC-72.06 (TRM_APV_001 s.d. 003), AC-74.03, RM-06, grooming v1 A-37 |
| Cabang dan produk tanpa Approval Level atau Approval Hierarchy | `ERROR` `BUSINESS_SETUP` "No approval setup for branch 012 and product KPR" | TRM_APV_005 |
| Tidak ada level yang mencakup nominal | `ERROR` `BUSINESS_SETUP` "No approval level covers this amount" | TRM_APV_004 |
| Satu posisi rantai tanpa approver aktif (baris hierarki nonaktif atau user tidak ACTIVE), termasuk `upLevel` yang menunjuk posisi tanpa baris | `ERROR` `BUSINESS_SETUP` "No active approver for level 2"; Retry dari Process Monitoring merouting ulang | AC-27.04 |
| Pengajuan tanpa cabang (dibuat role pusat) | `ERROR` `BUSINESS_SETUP` "The application has no branch for approval routing" (teks usulan engineering) | api-specs 12 §12.2 langkah 5 |

Semua ERROR di atas tanpa retry otomatis (`retryable: false`). Error rumus struktur kredit auto approval menjadi `ERROR` `FORMULA` tanpa baris `AUTO_APPROVED` (FM-09). Cabang pengajuan adalah cabang unit kerja pembuat draft, atau cabang induk sub cabangnya.

## 16.5 GET /applications/{id}/approval

**Purpose:** Halaman "Approval Detail": rantai approval, struktur kredit usulan, dan tombol yang boleh dipakai.  
**Access:** `OPS-APPROVAL` VIEW untuk approver yang ada di rantai pengajuan; `APP-INQUIRY` VIEW membaca tanpa aksi (`myLevel` `null`). Rute memakai `@Authenticated()` dan use case memeriksa kedua menu; tanpa keduanya `403 ACCESS_DENIED`. Rantai yang dibaca adalah rantai ProcessInstance terbaru yang sudah sampai langkah APPROVAL. `allowedActions` hanya terisi selama langkah APPROVAL `WAITING_HUMAN`.

**Output 200**

```json
{
  "data": {
    "applicationId": "0192...", "loanId": "20102026KPR0000041", "requestedLimit": "600000000.00", "tenorProposed": 120,
    "interestRate": "14.0000", "approverRateMin": "11.0000", "approverRateMax": "15.0000", "rateEditable": true,
    "chain": [
      { "jobLevel": 2, "subLevel": 1, "description": "Kepala Cabang", "approver": { "username": "rina.approver" }, "decision": "APPROVE", "comment": "Agunan memadai", "decidedAt": "2026-10-21T03:00:00Z" },
      { "jobLevel": 1, "subLevel": 1, "description": "Kepala Wilayah", "approver": { "username": "budi.wilayah" }, "decision": "PENDING", "comment": null, "decidedAt": null }
    ],
    "myLevel": { "jobLevel": 1, "subLevel": 1, "isFinalApprover": true },
    "allowedActions": ["APPROVE", "REJECT", "RETURN"],
    "blockedReason": null
  }
}
```

| Field | Aturan |
|---|---|
| `allowedActions` | Dari flag level (`isApprove`, `isReject`, `isReturn`); `RETURN` tidak ada bila level tidak mencentang "Is Return" (AC-73.03) |
| `blockedReason` | "Waiting for level 2 approval" bila level bawah belum memutuskan (AC-72.03); "You cannot approve an application you submitted" bila user sesi adalah penginput (AC-72.05). Bila terisi, `allowedActions` kosong |
| `rateEditable` | `true` bila SubProduct punya rentang Approver (AC-97.05, AC-97.06) |

**Errors:** `APPLICATION_NOT_FOUND` 404 (pengajuan tidak ada, atau approver tanpa `APP-INQUIRY` yang tidak ada di rantainya); `NOT_FOUND` 404 bila langkah APPROVAL belum membentuk rantai.

**Traceability:** US-72 (AC-72.03, AC-72.05); US-73 (AC-73.03); US-97 (AC-97.05, AC-97.06).

## 16.6 POST /applications/{id}/approval/decision

**Purpose:** Approver memutuskan Approve, Reject, atau Return.  
**Access:** `OPS-APPROVAL` APPROVE; tugas `APPROVAL` level ini ditugaskan ke user sesi (`14-tasks.md` 14.5).  
**Idempotency:** wajib.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| decision | enum | ya | `APPROVE`, `REJECT`, `RETURN` |
| comment | string | ya | 1 s.d. 1.000 karakter |
| interestRate | percent | tidak | hanya `APPROVE`; harus dalam rentang Approver |
| tenorApproved | int | tidak | hanya `APPROVE`; dalam batas produk |
| loanAmount | money | tidak | hanya `APPROVE`; <= `requestedLimit` |

**Behavior**

1. Kunci rantai `application_approvals` ProcessInstance terbaru. User sesi tidak punya posisi di rantai: `403 TASK_NOT_ASSIGNED_TO_YOU` "This task is assigned to another user". Posisinya sudah diputuskan atau langkah APPROVAL tidak lagi `WAITING_HUMAN`: `409 ALREADY_PROCESSED` "This application has already been processed" (AC-72.07). Satu posisi rantai punya satu approver (keputusan TL 2026-10-26), jadi AC-72.07 dibuktikan dengan dua keputusan bersamaan pada posisi yang sama: yang pertama menang dan keputusan tercatat sekali.
2. User sesi = penginput pengajuan: `403 SUBMITTER_CANNOT_APPROVE` (AC-72.05).
3. Level bawah belum memutuskan: `409 WAITING_LOWER_LEVEL` (AC-72.03).
4. `decision` tidak ada di flag level: `403 ACTION_DENIED` (AC-73.03).
5. Komentar kosong: `422 COMMENT_REQUIRED`; lebih dari 1.000: `422 COMMENT_TOO_LONG` (AC-72.04, AC-73.04, AC-73.05).
6. `interestRate` di luar rentang: `422 RATE_OUT_OF_RANGE` (AC-97.05); SubProduct tanpa rentang Approver: `403 ACTION_DENIED`. `loanAmount` di atas `requestedLimit` atau tenor di luar batas produk: `400 VALIDATION_FAILED` dengan detail "Loan amount must not exceed the requested limit" atau "Tenor must be between 6 and 60 months" (teks usulan engineering). Setiap keputusan dicatat di Audit Trail modul `Approval` (`APPROVE`, `REJECT`, `REVISE` untuk Return); perubahan suku bunga mengisi `oldData` dan `newData` (AC-97.06).
7. `APPROVE` di level bukan final: Task Queue menutup tugas user sesi dan membuat tugas `APPROVAL` `ASSIGNED` untuk approver posisi berikutnya pada StepExecution yang sama; langkah tetap `WAITING_HUMAN`; rantai menandai posisi ini `APPROVE` (AC-72.02). `APPROVE` di level final: `buildFinancing` (RM-07, RM-08, jadwal angsuran dengan sisa pokok baris terakhir 0) dengan `interestRate`, `tenorApproved`, dan `loanAmount` bila diisi; SP3K untuk KPR dibentuk BE-S6-05 (AC-102.02); tugas ditutup lewat `taskQueue.close`, StepResult `CONTINUE` atau `FINISH APPROVED` bila tidak ada langkah sesudah APPROVAL (AC-72.01). Struktur kredit di keputusan lain diabaikan.
8. `REJECT`: StepResult `FINISH` dengan `FINISHED_REJECTED`; email penolakan lewat event (AC-73.01).
9. `RETURN`: StepResult `BACK_TO_DRAFT` dengan `returnNote` = komentar; pengajuan kembali ke Draft Sales (AC-73.02).

**Output 200**

```json
{ "data": { "decision": "APPROVE", "jobLevel": 1, "isFinal": true, "applicationStatus": "ON_PROGRESS", "nextStep": "VALIDITY_CHECK" },
  "message": "Loan application is successfully approved" }
```

| decision | message |
|---|---|
| `APPROVE` | "Loan application is successfully approved" (AC-72.01, AC-72.02, AC-97.06) |
| `REJECT` | "Loan application has been rejected" (AC-73.01) |
| `RETURN` | "Application returned to sales" (AC-73.02) |

**Errors**

| code | status | condition |
|---|---|---|
| `COMMENT_REQUIRED` | 422 | "Approval comments are required" (AC-72.04, AC-73.04) |
| `COMMENT_TOO_LONG` | 422 | "Approval comments must not exceed 1000 characters" (AC-73.05) |
| `RATE_OUT_OF_RANGE` | 422 | "Interest rate must be between 11% and 15%" (AC-97.05) |
| `SUBMITTER_CANNOT_APPROVE` | 403 | "You cannot approve an application you submitted" (AC-72.05) |
| `WAITING_LOWER_LEVEL` | 409 | "Waiting for level 2 approval" (AC-72.03) |
| `ALREADY_PROCESSED` | 409 | "This application has already been processed" (AC-72.07) |
| `ACTION_DENIED` | 403 | Aksi tidak diizinkan level (AC-73.03) |
| `DOCUMENT_NUMBER_EXHAUSTED` | 422 | Nomor SP3K habis (AC-102.06) |
| `FORMULA_ERROR` | 422 | Rumus struktur kredit gagal (FM-09) |

**Traceability:** US-72 (AC-72.01 s.d. AC-72.07), US-73 (AC-73.01 s.d. AC-73.05), US-97 (AC-97.05, AC-97.06), US-102 (AC-102.02, AC-102.06).

## 16.7 GET /applications/{id}/financing

**Purpose:** Tab "Approval": struktur kredit dan jadwal angsuran setelah disetujui (manual atau otomatis).  
**Access:** `APP-INQUIRY` VIEW; lingkup data.

**Output 200**

```json
{
  "data": {
    "loanAmount": "20000000.00", "tenor": 36, "interestType": "EFFECTIVE", "interestRate": "13.0000", "monthlyInstallment": "673879.00",
    "adminFee": "250000.00", "provisionFee": "200000.00", "insuranceValue": "150000.00", "netDisbursement": "19400000.00",
    "dbrRatio": "8.4200", "dsrRatio": null, "firstInstallmentDate": "2026-11-21", "approvalType": "MANUAL", "sp3kNumber": null,
    "schedule": [ { "installmentNo": 1, "dueDate": "2026-11-21", "principalAmount": "457212.00", "interestAmount": "216667.00", "outstandingAmount": "19542788.00" } ]
  }
}
```

`approvalType` = `AUTO` untuk auto approval (AC-74.01). `dbrRatio` dan `dsrRatio` dalam persen (rumus `DBR_RATIO`, `DSR_RATIO` RM-08); `dbrRatio` `null` bila penghasilan kosong, `dsrRatio` `null` karena angsuran berjalan belum menjadi data pengajuan di POC. `insuranceValue` 0 sampai e-polis menghitung ulang. Tanggal angsuran pertama = tanggal bisnis persetujuan + 1 bulan. `sp3kNumber` `null` sampai BE-S6-05 membentuk nomor SP3K (AC-102.02). Belum disetujui: `404 NOT_FOUND` "Financing is not available yet"; pengajuan tidak ada: `404 APPLICATION_NOT_FOUND`.

**Traceability:** US-72 (AC-72.01), US-74 (AC-74.01), US-97 (AC-97.06), US-76 (AC-76.05).

## 16.8 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /approval-levels`, `POST /approval-levels`, `PUT /approval-levels/{id}` | Level, rentang nominal tanpa tumpang tindih, flag aksi | `MST-APPROVAL` | US-26 |
| `POST /approval-setup/import` | Impor level dan hierarki dari Excel sebagai satu paket | `MST-APPROVAL` CREATE | US-28 |
