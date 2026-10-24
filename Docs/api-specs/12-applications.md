# 12. Applications

Pengajuan kredit: draft, section, dokumen, submit, dan detail. Modul pemilik: CORE Application ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.10). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.9. Status: 6.13 `Application.status`. Daftar dan pencarian pengajuan (inquiry) ada di `17-reporting-audit.md` 17.1.

## 12.1 Section dan urutan step

Form pengajuan terdiri dari section. Urutan step dihitung server dari kategori produk, status kawin, dan pekerjaan (TRM_STP, AC-50.06) dan dikembalikan di setiap respons form sebagai `steps[]`.

| section (path) | Label UI | Tampil bila | Rilis |
|---|---|---|---|
| `application` | Application | selalu | POC |
| `personal` | Personal | selalu | POC |
| `spouse` | Spouse | marital `Kawin` | Backlog (US-43) |
| `occupation` | Occupation | selalu | POC |
| `business` | Business | pekerjaan wiraswasta | Backlog (US-45) |
| `collateral` | Collateral | kategori `COLLATERAL` atau `PENSION` | Backlog (US-46) |
| `documents` | Document | selalu (12.6, 12.7) | POC |
| `emergency-contact` | Emergency Contact | selalu | POC |

Contoh hasil: KTA, Belum Kawin, Karyawan Swasta = `application > personal > occupation > documents > emergency-contact` (TRM_STP_001).

Dua mode simpan berlaku untuk setiap section:

| Mode | Tombol | Validasi |
|---|---|---|
| `strict=true` | "Next" | Semua field wajib section dan aturan lintas field; gagal = `400`/`422`, data tidak disimpan |
| `strict=false` | "Save as Draft" | Hanya tipe dan format field yang terisi; field kosong diizinkan |

Hanya Sales pembuat draft yang bisa membaca dan mengubah form draft (AC-49.06). Tombol "Back" tanpa menyimpan tidak memanggil API; data yang belum disimpan dibuang di klien (AC-39.04). Pengajuan selain `DRAFT` tidak bisa diubah lewat file ini: `409 INVALID_STATE`.

## 12.2 POST /applications

**Purpose:** Simpan draft pertama kali dan bentuk Loan ID (tombol "Save as Draft" pertama, atau "Next" pertama di step Application).  
**Layar:** Step Application memuat blok "Applicant Identity" (ID Type, ID Card Number, Full Name, Full Name ID) agar tujuh field minimum draft terisi sebelum "Next" pertama; setelah draft terbentuk, identitas diubah di step Personal (keputusan FE-S3-01, 2026-10-24).  
**Access:** `APP-ENTRY` CREATE. Idempotency: opsional, dianjurkan.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| application.applicationType | string | ya | `paramId` Application Type |
| application.productCategory | enum | ya | |
| application.productId | uuid | ya | dari `08-products-routes.md` 8.7 |
| application.segment, purposeOfLoan | string | tidak | `paramId` |
| application.tenorProposed | int | tidak | |
| application.requestedLimit | money | tidak | |
| application.insuranceId | uuid | tidak | |
| personal.idType | enum | ya | hanya `KTP` (AC-40.10) |
| personal.idCardNumber | string | ya | 16 digit |
| personal.fullName | string | ya | maks 100 |
| personal.fullNameId | string | ya | nama sesuai KTP, maks 100 |
| strict | boolean | tidak | default `false`; `true` bila dipanggil dari tombol "Next" step Application |

**Behavior**

1. Tujuh field minimum (Application Type, Identity Type, Identity Number, Product Category, Product, Full Name, Full Name ID) tidak lengkap: `422 DRAFT_MINIMUM_FIELDS` (AC-49.02, A-15).
2. `strict=true`: aturan 12.3 section `application` dijalankan.
3. Produk harus tersedia untuk pengajuan baru (RT-07): bila tidak, `422 PRODUCT_NOT_AVAILABLE`.
4. Bentuk Loan ID `ddMMyyyy` + `productCode` + 7 digit counter per produk per company, dengan satu `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` pada `loan_id_counters` (baris counter terkunci sampai transaksi draft selesai; produk pertama kali mulai dari 1; nomor kembali bila draft batal disimpan); tanggal dari zona waktu Asia/Jakarta (TRM_LID_001 s.d. 006). Counter sudah 9.999.999: `422 LOAN_ID_EXHAUSTED`.
5. Simpan Application `DRAFT`, `channel = WEB`, cabang dari user, dan IP asal request di `client_ip_address` untuk cek reputasi IP Fraud (api-specs 21 §21.1); NIK disimpan terenkripsi dan blind index.

**Output 201**

```json
{
  "data": { "id": "0192...", "loanId": "20102026KTA0000013", "status": "DRAFT", "currentSection": "application",
            "steps": ["application", "personal", "occupation", "documents", "emergency-contact"] },
  "message": "Application saved as draft. Loan ID: 20102026KTA0000013"
}
```

**Errors**

| code | status | condition |
|---|---|---|
| `DRAFT_MINIMUM_FIELDS` | 422 | "Fill in Application Type, Identity Type, Identity Number, Product Category, Product, Full Name, and Full Name ID to save a draft" (AC-49.02) |
| `PRODUCT_NOT_AVAILABLE` | 422 | "Selected product is not available" (teks usulan engineering) |
| `LOAN_ID_EXHAUSTED` | 422 | "Loan ID counter has reached its limit. Please contact your administrator" (TRM_LID_005) |
| `VALIDATION_FAILED` | 400 | Format field salah (contoh NIK bukan 16 digit) |

**Traceability:** US-49; AC-49.01, AC-49.02, AC-49.04 (TRM_LID_001 s.d. 006); US-39 (AC-39.01).

## 12.3 PUT /applications/{id}/sections/{section}

**Purpose:** Simpan satu section ("Next" atau "Save as Draft").  
**Access:** `APP-ENTRY` UPDATE; hanya pembuat draft.

**Input:** path `section` (12.1); query `strict` (boolean, default `true`); body field section. Body tiap section POC:

`application`

| field | type | required (strict) | notes |
|---|---|---|---|
| applicationType, productCategory, productId | | ya | |
| segment | string | ya | |
| purposeOfLoan | string | tidak | |
| tenorProposed | int | ya | |
| requestedLimit | money | ya | |
| insuranceId | uuid | tidak | |
| sourceCode, salesCode, referralCode, marketingCode | string | tidak | |

`personal`

| field | type | required (strict) | notes |
|---|---|---|---|
| fullName, fullNameId | string | ya | |
| placeOfBirth | string | ya | |
| dateOfBirth | date | ya | |
| gender, religion, nationality, education, marital | string | ya | `paramId` |
| motherMaidenName | string | ya | terenkripsi |
| idType | enum | ya | `KTP` |
| idCardNumber | string | ya | 16 digit |
| idIssuedDate | date | tidak | |
| idExpiredDate | string | tidak | `SEUMUR HIDUP` atau tanggal |
| npwpNumber | string | kondisional | wajib bila `requestedLimit > NPWP_MIN_LIMIT` (50.000.000) |
| kkNumber | string | tidak | |
| mobileNumber | string | ya | `08`, 10 s.d. 13 digit |
| phoneNumber, email | string | tidak | |
| addresses.id | Address | ya | alamat KTP |
| addresses.residence | Address | ya | |
| addresses.residence.sameAsId | boolean | ya | `true` = server menyalin alamat KTP dan mengabaikan field lain (AC-40.07) |
| consentGiven | boolean | kondisional | wajib `true` bila parameter `REQUIRE_CONSENT_FOR_EXTERNAL_CHECK = Yes` |

Address: `address` (wajib), `rt`, `rw`, `provinceCode`, `cityCode`, `districtCode`, `subDistrictCode`, `zipCode` (kode dari `06-master-data.md` 6.3), `sameAsId`.

`occupation`

| field | type | required (strict) | notes |
|---|---|---|---|
| sourceOfIncome, occupation, industryOfProfession | string | ya | `paramId` |
| position | string | tidak | |
| tenureAtCurrentJob | decimal (1 digit) | ya, kecuali kategori `PENSION` (AC-44.03) | tahun |
| monthlyIncomeAllowance | money | ya, kecuali kategori `PENSION` (AC-44.03) | > 0 |
| organization, previousEmployer, pensionInstance | string | tidak | |
| company.name, company.address, company.provinceCode, company.cityCode, company.districtCode, company.subDistrictCode, company.zipCode, company.phoneNumber | | ya bila `sourceOfIncome` ada di parameter `EMPLOYED_INCOME_SOURCES` (default `["001"]` Bekerja) | |

`emergency-contact`

| field | type | required (strict) | notes |
|---|---|---|---|
| contactName | string | ya | |
| relationToApplicant | string | ya | `paramId` |
| mobileNumber | string | ya | `08`, 10 s.d. 13 digit, beda dari nomor pemohon |
| homePhoneNumber, altPhoneNumber | string | tidak | |
| address | Address | ya | |

**Behavior (strict)**

| Aturan | Error | Rujukan |
|---|---|---|
| Field wajib kosong | `400 VALIDATION_FAILED`, `details[].message` "This field is required" | AC-39.02, AC-44.05 |
| `requestedLimit` di luar `minPlafond` s.d. `maxPlafond` produk | `422 LIMIT_OUT_OF_RANGE` "Requested limit must be between 5,000,000 and 300,000,000" | AC-39.03 |
| `tenorProposed` di luar `minTenor` s.d. `maxTenor` | `422 TENOR_OUT_OF_RANGE` "Tenor must be between 6 and 60 months" | AC-39.03 |
| NIK bukan 16 digit | `400`, detail "ID card number must be 16 digits" | AC-40.02 |
| Usia pada tanggal simpan di luar `minAge` s.d. `maxAge`; batas inklusif | `422 AGE_OUT_OF_RANGE` "Applicant age must be between 21 and 55 years for this product" | AC-40.03, AC-40.04 |
| NPWP kosong dan limit > 50.000.000; tepat 50.000.000 tidak wajib | `422 NPWP_REQUIRED` "NPWP is required for requested limit above 50,000,000" | AC-40.05, AC-40.06 |
| Usia saat lunas (rumus `AGE_AT_MATURITY`) > batas produk | `422 AGE_AT_MATURITY_EXCEEDED` "Applicant age at maturity must not exceed 55 years" | AC-40.09 |
| `monthlyIncomeAllowance` = 0 | `422 INVALID_INCOME` "Monthly income must be greater than 0" | AC-44.02 |
| Produk KUR (parameter produk `SELF_EMPLOYED_ONLY = true`) dan `occupation` di luar parameter `SELF_EMPLOYED_OCCUPATIONS` (default `["005"]` Wiraswasta) | `422 OCCUPATION_NOT_ELIGIBLE` "This product is only available for self-employed applicants" | AC-44.04 |
| Nomor HP tidak cocok `^08\d{8,11}$` | `400`, detail "Mobile number must start with 08 and contain 10 to 13 digits" | AC-48.02, AC-48.04 |
| Nomor kontak darurat sama dengan nomor pemohon | `422 EMERGENCY_CONTACT_SAME_NUMBER` "Emergency contact number must be different from applicant number" | AC-48.03 |

**Behavior (kedua mode)**

| Aturan | Error | Rujukan |
|---|---|---|
| Format field terisi salah: NIK, nomor HP, NPWP 15 atau 16 digit, KK 16 digit, telepon 6 s.d. 15 digit, lama kerja satu desimal, tanggal, email | `400 VALIDATION_FAILED` dengan pesan per field | AC-40.02, AC-48.02, AC-48.04; pesan NPWP, KK, telepon, dan lama kerja teks usulan engineering |
| Section `application` atau `personal` tanpa field minimum draft (A-15) pada `strict=false` | `422 DRAFT_MINIMUM_FIELDS` | AC-49.02 |
| Section `application`: produk tidak tersedia atau beda kategori (RT-07) | `422 PRODUCT_NOT_AVAILABLE` | 12.2 langkah 3 |
| Section `application`: `insuranceId` tidak ada atau nonaktif | `400 VALIDATION_FAILED`, detail `insuranceId` "Selected insurance is not available" (teks usulan engineering) | api-specs 06 §6.2 |

Parameter sistem aturan section (seed `base`, `masterdata`): `NPWP_MIN_LIMIT` (MONEY, default `50000000.00`), `REQUIRE_CONSENT_FOR_EXTERNAL_CHECK` (BOOLEAN, default `false`), `SELF_EMPLOYED_ONLY` (BOOLEAN, scope PRODUCT, default `false`), `SELF_EMPLOYED_OCCUPATIONS` dan `EMPLOYED_INCOME_SOURCES` (MULTI_CHOICE berisi `paramId` General Parameter). Usia saat lunas memakai default RM-02 (usia dalam bulan penuh + tenor dibanding `maxAgeAtMaturityMonth`) sampai rumus `AGE_AT_MATURITY_MONTH` tersedia di modul Calculation.

Angka di pesan diisi dari produk dan parameter aktif. Error `422` aturan di atas membawa satu `details[]` berisi field penyebabnya (contoh `requestedLimit`, `dateOfBirth`, `mobileNumber`). `consentGiven = true` menyimpan `consentAt = now` dan `consentChannel = WEB` (AC-40.08, IN-12). Perubahan produk, status kawin, atau pekerjaan menghitung ulang `steps[]`.

**Output 200**

```json
{
  "data": { "id": "0192...", "loanId": "20102026KTA0000013", "status": "DRAFT", "savedSection": "personal", "nextSection": "occupation",
            "steps": ["application", "personal", "occupation", "documents", "emergency-contact"] },
  "message": "Application saved as draft. Loan ID: 20102026KTA0000013"
}
```

`nextSection` adalah step setelah section yang disimpan, `null` untuk step terakhir. `strict=true` memindahkan `currentSection` ke `nextSection`; `strict=false` menyimpan `currentSection` = section yang disimpan. Simpan section mengganti seluruh field section; field yang tidak dikirim menjadi kosong. `message` hanya dikirim pada `strict=false` (AC-49.03). Loan ID tidak berubah saat disimpan ulang (AC-49.03).

**Errors:** tabel di atas; `NOT_FOUND` 404 untuk draft milik Sales lain (AC-49.06); `INVALID_STATE` 409 bila bukan `DRAFT`; `NOT_FOUND` 404 untuk section backlog yang belum tersedia.

**Traceability:** US-39 (AC-39.01 s.d. AC-39.03), US-40 (AC-40.01 s.d. AC-40.10), US-44 (AC-44.01 s.d. AC-44.05), US-48 (AC-48.01 s.d. AC-48.04), US-49 (AC-49.03), US-50 (AC-50.06).

## 12.4 GET /applications/drafts

**Purpose:** Daftar draft milik Sales di "Application List", termasuk pengajuan yang dikembalikan ke draft.  
**Layar:** "Application List" dibuka menu Data Entry dan menjadi tujuan tombol "Back" step pertama (AC-39.04); dibangun FE-S3-01, membuka draft dari Loan ID dipasang FE-S3-03 (AC-49.05).  
**Access:** `APP-ENTRY` VIEW. Hanya draft dengan `createdBy` = user sesi (AC-49.06).

**Input (query):** `q` (Loan ID atau nama), paging, `sort` (`updatedAt`, default `updatedAt,desc`).

**Output 200**

```json
{ "data": [ { "id": "0192...", "loanId": "20102026KTA0000013", "fullName": "Rudi Hartono", "productCode": "KTA", "requestedLimit": "20000000.00",
              "currentSection": "occupation", "returnNote": null, "updatedAt": "2026-10-20T07:00:00Z" } ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 3, "totalPages": 1 } }
```

`returnNote` terisi untuk pengajuan hasil `BACK_TO_DRAFT` (Verification Not Match, Validity Not Valid, Approval Return).

**Traceability:** US-49 (AC-49.05, AC-49.06); US-73 (AC-73.02); US-64 (AC-64.02).

## 12.5 GET /applications/{id}/form

**Purpose:** Melanjutkan draft: seluruh section terisi dan step terakhir yang disimpan.  
**Access:** `APP-ENTRY` VIEW; hanya pembuat draft.

**Output 200**

```json
{
  "data": {
    "id": "0192...", "loanId": "20102026KTA0000013", "status": "DRAFT", "currentSection": "occupation",
    "steps": ["application", "personal", "occupation", "documents", "emergency-contact"],
    "sections": { "application": { "productId": "0192...", "tenorProposed": 36, "requestedLimit": "20000000.00", "interestRate": "14.0000" },
                  "personal": { "fullName": "Rudi Hartono", "idCardNumber": "3273011402900001" },
                  "occupation": null, "emergency-contact": null },
    "documentCompleteness": { "uploadedMandatory": 0, "requiredMandatory": 7 },
    "returnNote": null
  }
}
```

Section yang belum disimpan bernilai `null`. NIK dikembalikan utuh hanya ke pembuat draft. `currentSection` adalah step yang sedang diisi saat "Save as Draft" atau step berikutnya saat "Next". `documentCompleteness` bernilai `null` selama checklist belum bisa dicocokkan karena pekerjaan atau status kawin belum diisi.

**Errors:** `NOT_FOUND` 404 (bukan pembuat atau tidak ada).

**Traceability:** US-49 (AC-49.05, AC-49.06).

## 12.6 GET /applications/{id}/documents

**Purpose:** Slot unggah step "Document" dari checklist yang cocok (produk, pekerjaan, status kawin).  
**Access:** `APP-ENTRY` VIEW untuk draft miliknya; `APP-INQUIRY` VIEW untuk pengajuan dalam lingkup data.

**Behavior:** Checklist ACTIVE untuk kombinasi pengajuan (AC-25.04). Tidak ada checklist, atau Occupation dan Marital belum disimpan sehingga belum bisa dicocokkan: `422 CHECKLIST_NOT_CONFIGURED`; submit juga diblokir (AC-25.05). Label slot dari General Parameter `Document`. Akses `APP-INQUIRY` sesuai lingkup data dipasang di kartu FE-S5-04; sampai saat itu hanya pembuat draft.

**Output 200**

```json
{
  "data": {
    "slots": [
      { "documentType": "KTP", "label": "KTP", "isMandatory": true, "file": { "fileId": "0192...", "fileName": "ktp.jpg", "sizeBytes": 819200, "uploadedAt": "2026-10-20T07:05:00Z" }, "verificationStatus": "PENDING" },
      { "documentType": "BPJS", "label": "BPJS", "isMandatory": false, "file": null, "verificationStatus": "PENDING" }
    ],
    "completeness": { "uploadedMandatory": 0, "requiredMandatory": 7 }
  }
}
```

Klien menampilkan `completeness` sebagai "0 of 7 documents"; dokumen opsional tidak dihitung (AC-47.06).

**Errors:** `CHECKLIST_NOT_CONFIGURED` 422 "No document checklist is configured for this product. Please contact your administrator" (AC-25.05).

**Traceability:** US-25 (AC-25.04, AC-25.05); US-47 (AC-47.06).

## 12.7 PUT /applications/{id}/documents/{documentType}

**Purpose:** Unggah atau ganti file pada satu slot.  
**Access:** `APP-ENTRY` UPDATE; hanya pembuat draft; status `DRAFT`.

**Input:** `multipart/form-data`, field `file`.

**Behavior**

1. `documentType` tidak ada di checklist pengajuan: `422 BUSINESS_RULE_VIOLATION` "Document type is not in the checklist".
2. Ekstensi bukan png, jpg, jpeg, pdf, docx, magic bytes tidak cocok, atau isinya tidak terbaca konverter PDF: `415 UNSUPPORTED_FILE_TYPE` (AC-47.02).
3. Ukuran > `UPLOAD_MAX_MB`: `413 FILE_TOO_LARGE`; tepat 2 MB (2.097.152 byte) diterima (AC-47.03, AC-47.04).
4. Simpan ke storage, konversi ke PDF lewat Gotenberg bila bukan PDF (DC-02), buat `document_files`.
5. Slot yang sudah berisi: file baru menggantikan; file lama tidak lagi dirujuk (AC-47.05).

**Output 200**

```json
{ "data": { "documentType": "KTP", "file": { "fileId": "0192...", "fileName": "ktp.jpg", "sizeBytes": 819200, "uploadedAt": "2026-10-20T07:05:00Z" },
            "completeness": { "uploadedMandatory": 1, "requiredMandatory": 7 } } }
```

**Errors**

| code | status | condition |
|---|---|---|
| `UNSUPPORTED_FILE_TYPE` | 415 | "Allowed file types: png, jpg, jpeg, pdf, docx" (AC-47.02) |
| `FILE_TOO_LARGE` | 413 | "File must not exceed 2 MB" (AC-47.04) |
| `BUSINESS_RULE_VIOLATION` | 422 | "Document type is not in the checklist" |
| `CHECKLIST_NOT_CONFIGURED` | 422 | Checklist tidak ada (AC-25.05) |
| `INVALID_STATE` | 409 | Pengajuan bukan `DRAFT` |
| `NOT_FOUND` | 404 | Bukan pembuat draft |
| `SERVICE_UNAVAILABLE` | 503 | Storage atau konverter PDF tidak tersedia |

**Traceability:** US-47; AC-47.01 s.d. AC-47.05.

## 12.8 POST /applications/{id}/submit

**Purpose:** Kirim pengajuan untuk diproses (tombol "Submit" lalu "Yes").  
**Layar:** Tombol "Submit" di step terakhir lebih dulu menyimpan section itu dengan `strict=true` (12.3) agar pesan kontak darurat tampil di bawah field (AC-48.02 s.d. AC-48.04); konfirmasi "Submit this application?" muncul bila simpan berhasil. "Save as Draft" (`strict=false`) tersedia di setiap step kecuali Document, karena file tersimpan saat diunggah (keputusan FE-S3-02).  
**Access:** `APP-ENTRY` CREATE; hanya pembuat draft.  
**Idempotency:** wajib.

**Input:** tanpa body.

**Behavior** (satu transaksi)

1. Kunci baris Application. Status bukan `DRAFT`: bila pengajuan sudah disubmit dengan kunci idempotensi lain, `409 ALREADY_SUBMITTED`; klik ganda dengan kunci sama mendapat respons pertama (AC-50.07).
2. Jalankan validasi strict semua section di `steps[]` dengan data tersimpan, memakai aturan 12.3 yang sama dengan "Next". Gagal: `422 INCOMPLETE_APPLICATION` dengan `details[].field` berisi path, `details[].code` berisi kode aturan (contoh `REQUIRED`, `AGE_OUT_OF_RANGE`), dan `details[].section` berisi section yang ditandai error di stepper (AC-50.03). Section yang belum pernah disimpan ditandai dengan semua field wajibnya.
3. Dokumen wajib belum lengkap: `422 DOCUMENTS_INCOMPLETE` dengan jumlah terunggah dan wajib, detail `section` = `documents` (AC-50.02). Checklist tidak ada: `422 CHECKLIST_NOT_CONFIGURED` (AC-25.05).
4. Status `ON_PROGRESS`, `submittedAt`, `submittedBy`; hapus `returnNote`.
5. `orchestrator.start(applicationId)` di transaksi yang sama: ProcessInstance dengan versi rute ACTIVE, versi rumus, dan snapshot parameter (RT-06, FM-05, PR-06); StepExecution `DATA_ENTRY` `COMPLETED`; job `advance` di-enqueue. Langkah pertama berikutnya mengikuti rute produk (AC-50.04).
6. Publish `ApplicationSubmitted` ke outbox platform dengan payload `{ applicationId, loanId }`; Notification mengirim email "Pengajuan kredit <Loan ID> telah kami terima" bila email pemohon terisi (AC-50.05); kosong dicatat `SKIPPED`.

**Output 200**

```json
{ "data": { "id": "0192...", "loanId": "20102026KTA0000013", "status": "ON_PROGRESS", "processInstanceId": "0192..." },
  "message": "Application submitted. Loan ID: 20102026KTA0000013" }
```

Langkah otomatis berjalan di belakang; respons tidak menunggunya (NFR submit < 3 detik).

**Errors**

| code | status | condition |
|---|---|---|
| `INCOMPLETE_APPLICATION` | 422 | "Please complete all required fields" (AC-50.03) |
| `DOCUMENTS_INCOMPLETE` | 422 | "Please upload all required documents (5 of 7 required)" (AC-50.02) |
| `CHECKLIST_NOT_CONFIGURED` | 422 | AC-25.05 |
| `PRODUCT_NOT_AVAILABLE` | 422 | Produk tidak lagi punya rute ACTIVE |
| `ALREADY_SUBMITTED` | 409 | "This application has already been submitted" (teks usulan engineering) |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | |
| `NOT_FOUND` | 404 | Bukan pembuat draft |

**Traceability:** US-50; AC-50.01 s.d. AC-50.07; AC-25.05; AC-85.05 (proses dimulai saat submit).

## 12.9 GET /applications/{id}

**Purpose:** Halaman "Application Detail": ringkasan dan tab detail.  
**Access:** `APP-INQUIRY` VIEW; dibatasi lingkup data user (TN-02).

**Behavior**

1. Pengajuan di tenant lain atau di luar lingkup data: `404 APPLICATION_NOT_FOUND` (AC-84.04).
2. Catat audit `VIEW_APPLICATION` (Data Access) dengan user, waktu, dan Loan ID (AC-84.06).
3. `tabs[]` hanya berisi tab yang relevan: section yang tidak ada di `steps[]` dan modul yang dilewati rute tidak tampil (AC-84.03).

**Output 200**

```json
{
  "data": {
    "id": "0192...", "loanId": "20102026KTA0000013", "status": "ON_PROGRESS", "currentStep": "APPROVAL", "currentStepStatus": "WAITING_HUMAN",
    "summary": { "applicationType": "NTB", "loanAmount": "20000000.00", "tenorApproved": null, "productCode": "KTA", "branchCode": "011", "submittedAt": "2026-10-20T07:30:00Z" },
    "tabs": ["detail", "documents", "workflow", "dedup", "dukcapil", "fraud", "scoring", "credit-bureau", "decision", "approval"],
    "sections": { "application": {}, "personal": { "idCardNumber": "3273011402900001" }, "occupation": {}, "emergency-contact": {} },
    "processInstances": [ { "id": "0192...", "recontestNumber": 0, "status": "WAITING" } ]
  }
}
```

Data tiap tab modul dibaca dari file modulnya (contoh `19-dedup.md` 19.2, `16-approvals.md` 16.7); timeline dari `13-processes.md` 13.2; dokumen dari 12.6 dan `10-documents.md` 10.1 (AC-84.02).

**Errors:** `APPLICATION_NOT_FOUND` 404 "Application not found" (AC-84.04, AC-84.05).

**Traceability:** US-84; AC-84.01 s.d. AC-84.06.

## 12.10 GET /applications/by-loan-id/{loanId}

**Purpose:** Buka detail dari Loan ID yang diketik atau ditautkan.  
**Access, behavior, output, errors:** sama dengan 12.9; Loan ID yang tidak ada mengembalikan `404 APPLICATION_NOT_FOUND` "Application not found" (AC-84.05).  
**Traceability:** US-84; AC-84.05.

## 12.11 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `PUT /applications/{id}/sections/spouse` | Data pasangan; NIK pasangan terenkripsi | `APP-ENTRY` UPDATE | US-43 |
| `PUT /applications/{id}/sections/business` | Data usaha | `APP-ENTRY` UPDATE | US-45 |
| `PUT /applications/{id}/sections/collateral` | Data agunan | `APP-ENTRY` UPDATE | US-46 |
| `POST /applications/{id}/ocr-ktp` | Isi data pribadi dari foto KTP (M04) | `APP-ENTRY` UPDATE | US-41 |
| `POST /applications/{id}/pension-verification` | Verifikasi Taspen/EDAPEM (M13) | `APP-ENTRY` UPDATE | US-42 |
