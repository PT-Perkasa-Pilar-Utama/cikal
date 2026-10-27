# 15. Verification

Verifikasi dokumen pengajuan oleh Verifikator. Modul pemilik: CORE Verification ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.13). StepHandler `VERIFICATION` membuat tugas antrean `VERIFICATION`; operasi di file ini menutupnya. Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.9 `APPLICATION_DOCUMENTS`, 6.10 `DOCUMENT_VERIFICATIONS`.

## 15.1 GET /applications/{id}/verification

**Purpose:** Layar verifikasi ("Proceed to Verification"): daftar dokumen dengan status dan remarks tersimpan.  
**Access:** `OPS-VERIFICATION` VIEW; pemilik tugas untuk mengubah, user lain dengan VIEW hanya membaca.

**Output 200**

```json
{
  "data": {
    "applicationId": "0192...", "loanId": "20102026KTA0000013", "taskId": "0192...", "editable": true,
    "documents": [
      { "documentType": "KTP", "label": "KTP", "isMandatory": true, "fileId": "0192...", "verificationStatus": "MATCH", "remarks": null },
      { "documentType": "NPWP", "label": "NPWP", "isMandatory": true, "fileId": "0192...", "verificationStatus": "PENDING", "remarks": null }
    ],
    "applicantSummary": { "fullName": "Rudi Hartono", "idCardNumber": "3273011402900001", "dateOfBirth": "1990-02-14" }
  }
}
```

Pratinjau file memakai `10-documents.md` 10.1 (AC-64.05): pemilik tugas `VERIFICATION` yang `ASSIGNED` boleh melihat file dokumen pengajuan itu. `editable = false` bila tugas bukan milik user sesi. `documents` hanya dokumen yang sudah diunggah, urut checklist; `isMandatory` dari item checklist pengajuan. Tugas `VERIFICATION` dibuat di cabang pengajuan, atau tanpa cabang bila pengajuan tidak punya cabang.

**Errors:** `APPLICATION_NOT_FOUND` 404; `INVALID_STATE` 409 bila langkah saat ini bukan `VERIFICATION`.

**Traceability:** US-64; AC-64.04, AC-64.05.

## 15.2 PUT /applications/{id}/verification

**Purpose:** Simpan verifikasi sebagian (tombol "Save").  
**Access:** `OPS-VERIFICATION` UPDATE; pemilik tugas (14.5).

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| documents[] | array | ya | boleh sebagian dokumen |
| documents[].documentType | string | ya | |
| documents[].verificationStatus | enum | ya | `PENDING`, `MATCH`, `NOT_MATCH` |
| documents[].remarks | string | tidak | maks 500 |

**Behavior:** Simpan status per dokumen tanpa menutup tugas; `DOCUMENT_VERIFICATIONS.result = IN_PROGRESS`. Remarks belum diwajibkan saat simpan sebagian. Dokumen yang tidak dikirim dan `remarks` yang tidak dikirim tetap; `remarks` kosong menghapusnya. `savedCount` = dokumen yang statusnya bukan `PENDING`. Dokumen yang tidak diunggah: `400 VALIDATION_FAILED` dengan detail "Document BPJS is not uploaded" (teks usulan engineering). Langkah VERIFICATION tidak lagi menunggu: `409 ALREADY_PROCESSED`.

**Output 200:** `{"data":{"savedCount":4,"pendingCount":3},"message":"Verification saved"}` (AC-64.04).

**Errors:** `TASK_NOT_ASSIGNED_TO_YOU` 403, `VALIDATION_FAILED` 400.

**Traceability:** US-64; AC-64.04.

## 15.3 POST /applications/{id}/verification/submit

**Purpose:** Selesaikan verifikasi (tombol "Submit").  
**Access:** `OPS-VERIFICATION` UPDATE; pemilik tugas.  
**Idempotency:** wajib.

**Input (body):** `documents[]` seperti 15.2; setelah digabung dengan data tersimpan, semua dokumen terunggah wajib berstatus `MATCH` atau `NOT_MATCH`.

**Behavior**

1. Ada dokumen masih `PENDING`: `422 VERIFICATION_INCOMPLETE`.
2. Ada `NOT_MATCH` tanpa remarks: `422 REMARKS_REQUIRED`, `details` per dokumen (AC-64.03).
3. Semua `MATCH`: `result = ALL_MATCH`; tutup tugas; StepResult `CONTINUE` outcome `ALL_MATCH` (AC-64.01).
4. Ada `NOT_MATCH`: `result = HAS_NOT_MATCH`; tutup tugas; StepResult `BACK_TO_DRAFT` dengan `returnNote` berisi satu baris `<label dokumen>: <remarks>` per dokumen Not Match, contoh "NPWP: Nama di NPWP tidak sesuai KTP"; pengajuan kembali ke Draft milik Sales (AC-64.02). Status dan remarks tetap di dokumennya; unggahan ulang mengembalikan dokumen ke `PENDING` (AC-47.05).
5. Langkah VERIFICATION tidak lagi menunggu, atau tugas sudah ditutup: `409 ALREADY_PROCESSED`.

**Output 200**

```json
{ "data": { "result": "HAS_NOT_MATCH", "nextStep": null, "applicationStatus": "DRAFT" }, "message": "Verification submitted" }
```

**Errors**

| code | status | condition |
|---|---|---|
| `REMARKS_REQUIRED` | 422 | "Remarks are required for Not Match documents" (AC-64.03) |
| `VERIFICATION_INCOMPLETE` | 422 | "Please verify all documents" (teks usulan engineering) |
| `TASK_NOT_ASSIGNED_TO_YOU` | 403 | 14.5 |
| `ALREADY_PROCESSED` | 409 | "This application has already been processed" |

**Traceability:** US-64; AC-64.01, AC-64.02, AC-64.03.
