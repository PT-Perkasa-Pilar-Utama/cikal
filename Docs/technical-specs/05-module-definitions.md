# 5. Module Definitions

Satu subbagian per modul. **Antarmuka** berarti semua yang harus diketahui pemanggil: operasi, invariant, mode error, urutan, dan konfigurasi. Modul lain hanya memakai yang tertulis di sini (aturan XM-01). Tabel fisik setiap modul ada di `06-data-model.md`; kontrak langkah ada di `12-orchestrator-step-contract.md`; pola adapter ada di `13-integration-adapter-pattern.md`.

Konvensi error: setiap operasi melempar `DomainError` dengan `code` (bahasa Inggris, `SCREAMING_SNAKE_CASE`) dan `message` berisi teks persis dari AC. Lapisan HTTP memetakan ke format API-04: `{ code, message, details[] }`.

## 5.0 Platform (infrastruktur bersama)

Bukan modul bisnis dan tidak dilisensi. Menyediakan koneksi database dan transaksi, antrean, enkripsi, storage, guard HTTP, konfigurasi, dan endpoint operasional.

### 5.0.1 Antarmuka

| Operasi | Kontrak |
|---|---|
| `withTenantTx(ctx, fn)` | Membuka transaksi, menjalankan `SET LOCAL app.tenant_id` dan `app.user_id` dari konteks, lalu `fn`. Semua akses data bisnis wajib lewat sini; tanpa tenant, RLS menolak semua baris |
| `enqueue(job, payload, opts)` | Menulis job pg-boss di transaksi aktif; job tidak terlihat worker sebelum commit |
| `publish(event)` | Menulis baris outbox di transaksi aktif; dispatcher mengirim ke handler setelah commit (at-least-once; handler wajib idempotent) |
| `crypto.encrypt / decrypt / blindIndex` | AES-256-GCM dengan data key per tenant yang dibungkus kunci utama; `blindIndex(nik)` = HMAC-SHA256 dengan kunci indeks per tenant |
| `storage.put / getSignedUrl / delete` | Port S3; URL bertanda tangan berumur 5 menit |

### 5.0.2 Endpoint operasional

| Rute | Metode | Akses | Kontrak |
|---|---|---|---|
| `/api/health/live` | GET | Publik | `200 {"status":"ok"}` selama proses hidup. Dipakai healthcheck Docker |
| `/api/health/ready` | GET | Jaringan internal atau header `Authorization: Bearer <MONITORING_TOKEN>` | `200` bila semua dependensi kritis sehat, `503` bila tidak. Body di bawah |
| `/api/admin/reset-state` | POST | Hanya terdaftar bila `APP_ENV` in (`dev`, `test`, `sit`, `uat`) **dan** `ENABLE_RESET_API=true`; pemanggil login dengan role QA dan mengirim `X-Reset-Token` | Body `{"seed":"dev"\|"qa"}`. Sinkron. Body respons di bawah |

Respons `/api/health/ready`:

```json
{
  "status": "degraded",
  "version": "1.0.0",
  "checkedAt": "2026-10-21T08:00:00Z",
  "dependencies": {
    "database": { "status": "ok", "latencyMs": 3, "migration": "0042_m07_dukcapil" },
    "objectStorage": { "status": "ok", "latencyMs": 12 },
    "queue": { "status": "ok", "pending": 4, "failedLastHour": 0 },
    "pdfConverter": { "status": "ok", "latencyMs": 40 },
    "integrations": {
      "M07": { "status": "degraded", "provider": "DUKCAPIL_ASIS", "lastTestAt": "2026-10-21T07:55:00Z", "lastError": "TIMEOUT" }
    }
  }
}
```

`database` dan `objectStorage` kritis (`down` menjadikan status keseluruhan `down` dan HTTP 503). `queue`, `pdfConverter`, dan `integrations` non-kritis (`degraded`, HTTP 200).

Respons `/api/admin/reset-state`:

```json
{ "seed": "qa", "durationMs": 8420, "migrationsApplied": 42, "tenantsSeeded": ["001"], "bucketObjectsDeleted": 17 }
```

Langkah reset: hentikan konsumen worker, `DROP SCHEMA ... CASCADE` untuk semua skema aplikasi dan `pgboss`, jalankan migrasi, jalankan seed terpilih, kosongkan bucket lingkungan, nyalakan kembali konsumen. Di production modul ini tidak mendaftarkan rute sama sekali (bukan sekadar menolak akses), lihat `07-security.md` 7.8.

## 5.1 Identity & Access

**Tanggung jawab:** login lokal dan SSO, sesi, penguncian akun, reset dan ganti password, user, role, hak akses per role dan per user, menu.
**Skema:** `iam`. **Entity:** User, Role, Menu, RoleAccess, UserAccess, LoginAttempt, PasswordResetToken, Session.
**US:** US-01 s.d. US-11.

| Operasi | Kontrak |
|---|---|
| `login(username, password, channel)` | Pesan gagal seragam untuk username salah dan password salah (AC-01.03). Kunci `LOCK_MINUTES` setelah `LOCK_ATTEMPTS` gagal berturut-turut (AC-01.05). User `INACTIVE` atau `NO_ROLE` ditolak. Password awal mewajibkan ganti sebelum akses lain (AC-05.03). Membuat Session; satu sesi aktif per user per channel |
| `loginSso(tenant, authorizationCode)` | OIDC code flow; user baru dibuat `NO_ROLE` di company pemilik IdP (A-11); penautan ke user lokal mengikuti AU-01 |
| `authorize(ctx, menuCode, action)` | `true` bila RoleAccess atau UserAccess yang berlaku hari ini memberi hak; View wajib bila hak lain diberikan (AC-09.03). Dipanggil guard di setiap rute API, bukan hanya di UI (AC-09.04). `allows` memakai aturan yang sama tanpa melempar, untuk menampilkan atau menyembunyikan aksi (contoh `canReview`, api-specs 07 §7.2) |
| `describeUsers(tx, userIds)` | Username dan nama role user tenant transaksi untuk modul lain (Change Request, Audit). Didaftarkan di port platform `USER_DIRECTORY_PORT` agar modul lain tidak mengimpor Identity, yang sendiri mencatat audit (XM-02) |
| `dataScope(ctx)` | Unit kerja user (company, regional, branch, sub branch) untuk membatasi data (TN-02) |
| `deactivateUser(userId)` | Lewat checker-maker; setelah disetujui, sesi dihapus dan tugas yang diambil dilepas ke antrean (AC-07.05, TQ-07) |

**Seam:** `IdentityProviderPort` (adapter OIDC generik, adapter simulasi untuk test). **Kenapa dalam:** aturan penguncian, sesi, validitas akses sementara, dan hak per menu disembunyikan di balik dua panggilan (`authorize`, `dataScope`) yang dipakai semua modul.

## 5.2 Tenant & License

**Tanggung jawab:** company, lisensi modul, salin konfigurasi antar company.
**Skema:** `tenancy`. **Entity:** Company, License, ModuleEntitlement.
**US:** US-15, US-16, US-99, US-100.

| Operasi | Kontrak |
|---|---|
| `Licensing.state(tx)` (`isLicensed`) | Status (`ACTIVE`, `EXPIRED`, `NONE`) dan modul aktif company yang terpasang di transaksi `tx`, dari lisensi terverifikasi di cache memori; modul aktif = modul lisensi yang ada di paket (PK-04). Lisensi kedaluwarsa membuat aplikasi masuk mode baca saja (LC-06) |
| `installLicense(file)` | `POST /license`: verifikasi tanda tangan Ed25519 dengan kunci publik PPU yang tertanam di image; menolak file yang diubah (AC-100.02); lisensi lama tetap berlaku bila gagal |
| `createCompany(cmd)` | Super User; membuat dua akun awal (Admin dan Checker) (grooming v1 E-04) |
| `copyConfiguration(source, target, type)` | Menyalin tanpa menimpa data yang sudah ada; laporan jumlah ditambah dan dilewati (AC-16.01, AC-16.02) |

**Seam:** tidak ada pihak ketiga. **Kenapa dalam:** verifikasi kriptografis, cache, dan mode kedaluwarsa disembunyikan di balik `isLicensed`.

## 5.3 Organization

**Tanggung jawab:** Regional, Branch, Sub Branch, Currency, kurs. **Skema:** `org`. **US:** US-17 s.d. US-19.

| Operasi | Kontrak |
|---|---|
| `getUnit(id)`, `listActive(parentId)` | Hanya unit aktif untuk dropdown (AC-17.06) |
| `deactivateBranch(id)` | Ditolak bila masih ada pengajuan berjalan (AC-17.05); menanyakan jumlah ke Application lewat antarmuka publiknya |
| `rateAt(currency, timestamp)` | Kurs yang berlaku pada waktu submit (AC-19.04); dipakai hanya bila valas diaktifkan |

## 5.4 Master Data

**Tanggung jawab:** General Parameter, data wilayah, asuransi dan tarif, parameter sistem. **Skema:** `masterdata`. **US:** US-21 s.d. US-23, US-29, US-30.

| Operasi | Kontrak |
|---|---|
| `options(paramType)` | Nilai aktif untuk dropdown; nilai nonaktif tetap terbaca di data lama (AC-21.03) |
| `param(key, productId?)` | Nilai parameter sistem dengan urutan produk, tenant, default (PR-03); dari cache memori |
| `snapshotLocked(productId)` | Semua parameter `lockOnSubmit` untuk disimpan di ProcessInstance (PR-06) |
| `syncRegions()` | Job terjadwal dan tombol manual; gagal = data lama tidak berubah (AC-23.02) |
| `premiumRate(insuranceId, age, tenorYear)` | Lookup tabel tarif untuk rumus `IJK_AMOUNT` (RM-18) |

**Seam:** `RegionDataPort` (adapter Oksara, adapter simulasi). Parameter `SECRET` disimpan sebagai rujukan ke penyimpanan rahasia (PR-09).

## 5.5 Product & Route

**Tanggung jawab:** produk, SubProduct (harga per periode), rute modul berversi, checklist dokumen. **Skema:** `product`. **US:** US-20, US-25, US-31, US-32, US-97.

| Operasi | Kontrak |
|---|---|
| `availableProducts(category)` | Hanya produk aktif yang punya versi rute ACTIVE (RT-07, AC-39.05) |
| `activeRoute(productId)` | Versi rute ACTIVE beserta langkah; dikunci ke ProcessInstance saat submit (RT-06) |
| `proposeRoute(productId, steps)` | Langkah wajib tidak bisa dimatikan (RT-03); modul tak berlisensi tidak tampil (RT-04); modul integrasi tanpa penyedia aktif menolak pengajuan (IN-09); tanpa perubahan ditolak (AC-31.05) |
| `checklist(productId, occupation, marital)` | Daftar dokumen wajib dan opsional; kosong = submit diblokir (AC-25.05) |
| `pricing(productId, date)` | SubProduct yang berlaku pada tanggal tersebut |

## 5.6 Change Request

**Tanggung jawab:** satu mekanisme checker-maker untuk semua data master (CM-01 s.d. CM-08). **Skema:** `cr`. **US:** US-12, US-13.

| Operasi | Kontrak |
|---|---|
| `submit(entityType, entityId?, newData)` | Satu permintaan terbuka per data (AC-12.06); `oldData` diambil saat submit; satu impor = satu paket (grooming v1 N-07) |
| `approve(id, reviewer)` | `reviewer` bukan pembuat (AC-12.04); memanggil `apply()` milik modul pemilik data dalam satu transaksi; persetujuan bersamaan diproses sekali (AC-12.05, kunci baris) |
| `reject(id)`, `revise(id, reason)`, `resubmit(id, newData)` | Alasan revisi wajib dan maksimal 500 karakter (AC-13.02, AC-13.04); hanya pembuat yang mengajukan ulang (AC-13.05) |
| `registerEntity(entityType, handler)` | Setiap modul mendaftarkan `validate`, `apply`, dan `diff` untuk entity miliknya |

**Kenapa dalam:** satu modul menggantikan sekitar 15 tabel `*Temp` AS-IS. Modul pemilik data hanya menyediakan `apply`; alur status, perbandingan, kunci, dan audit disembunyikan di sini.

## 5.7 Audit

**Skema:** `audit`. **US:** US-14. Operasi: `record(tx, actor, event)` dipanggil modul lain di transaksi aksinya, sehingga aksi dan jejaknya commit atau batal bersama (BE-S1-02); Audit modul dasar tanpa dependensi modul, jadi panggilan langsung tidak membuat impor melingkar. Role pelaku dibaca lewat `USER_DIRECTORY_PORT`. Tabel `audit_logs` hanya bisa di-`SELECT` dan `INSERT` oleh role aplikasi (AD-03): runner migrasi mencabut `UPDATE`, `DELETE`, dan `TRUNCATE` (`appendOnlyTables`). Pencarian dibatasi 366 hari (AC-14.04). Nilai `SECRET` tidak pernah dicatat (PR-12).

## 5.8 Notification

**Skema:** `notification`. **US:** US-87. Operasi: `send(templateCode, recipient, data)` dari handler event `ApplicationSubmitted`, `ApplicationRejected`, `DisbursementCompleted`; email kosong dicatat `SKIPPED` (TRM_NTF_006); gagal kirim dicatat `FAILED` dan tidak menghentikan proses. **Seam:** `EmailPort` (adapter SMTP, adapter memori untuk test).

## 5.9 Document

**Tanggung jawab:** metadata file, template, generate PDF, penomoran dokumen. **Skema:** `document`. **US:** US-24, US-102.

| Operasi | Kontrak |
|---|---|
| `upload(file, ctx)` | Maksimal `UPLOAD_MAX_MB`, ekstensi png/jpg/jpeg/pdf/docx; disimpan sebagai PDF (DC-02) |
| `validateTemplate(docx)` | Menolak placeholder di luar katalog (AC-24.03) |
| `generate(documentCode, applicationId)` | Mengisi template (docxtemplater) lalu konversi lewat Gotenberg; menyimpan GeneratedDocument dengan nomor dari `nextNumber` |
| `nextNumber(documentType, scope, date)` | Nomor dari format aktif (DN-01 s.d. DN-10): satu kali per dokumen, aman konkuren (`UPDATE ... RETURNING` pada baris counter), berhenti dengan error bila habis (AC-102.06) |

**Seam:** `PdfConverterPort` (Gotenberg, adapter tiruan untuk test), `StoragePort`.

## 5.10 Application

**Tanggung jawab:** pengajuan dan section, Loan ID, draft, submit, detail. **Skema:** `application`. **US:** US-39 s.d. US-50, US-84.

| Operasi | Kontrak |
|---|---|
| `saveDraft(cmd)` | Minimal tujuh field (A-15); Loan ID dibentuk pada draft pertama dan tidak berubah (AC-49.03); counter per produk per company, batas 9.999.999 (TRM_LID) |
| `saveSection(appId, section, data)` | Validasi per section dari skema Zod bersama; urutan step menurut produk, status kawin, pekerjaan (TRM_STP) |
| `submit(appId)` | Cek field wajib dan dokumen wajib; idempotent terhadap klik ganda (AC-50.07); mengunci data; meminta Orchestrator memulai proses dalam transaksi yang sama |
| `returnToDraft(appId, note)` | Dipanggil Orchestrator untuk hasil BACK_TO_DRAFT |
| `detail(appId, ctx)` | Hanya dalam lingkup data user; company lain = "Application not found" (AC-84.04); setiap akses dicatat (AC-84.06) |

**Kenapa dalam:** validasi kondisional (NPWP di atas batas, usia saat lunas lewat rumus, Taspen untuk pensiun), Loan ID, dan penguncian submit disembunyikan di balik tiga operasi.

## 5.11 Orchestrator

**Tanggung jawab:** menjalankan rute, riwayat langkah, aging, retry, monitoring, recontest. **Skema:** `orchestrator`. **US:** US-85, US-86. Spesifikasi lengkap: `12-orchestrator-step-contract.md`.

| Operasi | Kontrak |
|---|---|
| `start(appId)` | Membuat ProcessInstance dengan versi rute, versi rumus, dan snapshot parameter |
| `advance(processId)` | Job pg-boss; menjalankan langkah berikutnya lewat StepHandler |
| `completeHumanStep(stepId, result)` | Dipanggil Task Queue saat tugas ditutup |
| `receiveExternal(reference, payload)` | Dipanggil Integration Registry untuk data masuk (IN-15) |
| `retry(stepId)`, `finish(processId, reason)` | Process Monitoring (AC-86.01 s.d. AC-86.04) |
| `recontest(appId, reason)` | ProcessInstance baru, maksimal `RECONTEST_MAX` (ER-04, ER-05) |

## 5.12 Task Queue

**Skema:** `taskqueue`. **US:** US-58. Operasi: `create(step, queueCode, branchId, eligibleRoleId)`, `assign(taskId, user)` (yang pertama menang, AC-58.04), `release(taskId, by)` (pemilik, atau Supervisor untuk tugas orang lain), `close(taskId, result)` (meneruskan ke Orchestrator). Katalog antrean mengikuti data dictionary (HumanTask). Antrean SURVEY_KPR dan APPROVAL tanpa Assign to Me (TQ-06, ditugaskan per user).

## 5.13 Verification

**Skema:** `verification`. **US:** US-64. StepHandler `VERIFICATION`: membuat tugas; `saveProgress` menyimpan status per dokumen; `submit` menghasilkan CONTINUE (semua Match) atau BACK_TO_DRAFT dengan catatan per dokumen (AC-64.02). Remarks wajib untuk Not Match (AC-64.03).

## 5.14 Approval

**Tanggung jawab:** level, hierarki, keputusan, auto approval, struktur kredit, jadwal angsuran. **Skema:** `approval`. **US:** US-26 s.d. US-28, US-72 s.d. US-74.

| Operasi | Kontrak |
|---|---|
| StepHandler `APPROVAL` | Auto approve bila `requestedLimit <= limitAutoApproval` dan `limitAutoApproval > 0` (RM-05). Selain itu membentuk rantai: level dipilih dari rentang nominal (batas menurut `APPROVAL_RANGE_BOUNDARY`), naik lewat `upLevel`/`upSubLevel` sampai `isFinalApprover` (RM-06). Tanpa level atau tanpa setup = ERROR dengan pesan TRM_APV_004/005 |
| `decide(approvalId, decision, comment)` | Komentar wajib, maksimal 1.000 (AC-72.04, AC-73.05); penginput pengajuan tidak bisa memutuskan (AC-72.05); keputusan bersamaan diproses sekali (AC-72.07); level atas menunggu level bawah (AC-72.03) |
| `buildFinancing(appId)` | Saat level final menyetujui: rumus RM-07, RM-08, angsuran per jenis bunga, jadwal; SP3K untuk KPR lewat Document; dihitung ulang setelah e-polis |

## 5.15 Integration Registry

**Tanggung jawab:** katalog adapter, konfigurasi penyedia per tenant, rujukan rahasia, uji koneksi, log panggilan, endpoint data masuk. **Skema:** `integration`. **US:** US-94, TO-18. Spesifikasi lengkap: `13-integration-adapter-pattern.md`.

| Operasi | Kontrak |
|---|---|
| `resolve(tenantId, moduleCode, providerHint?)` | Mengembalikan adapter aktif beserta konfigurasi; adapter simulasi ditolak di production kecuali tenant trial (IN-03) |
| `call(adapter, request, ctx)` | Timeout, retry per kategori error (IN-07), log dengan PII disamarkan (IN-06) |
| `testConnection(configId)` | Wajib sukses sebelum perubahan konfigurasi diajukan (IN-05) |
| `inbound(tenantCode, providerCode, payload, auth)` | Endpoint data masuk; autentikasi sesuai penyedia; idempotent; dicocokkan dengan `externalReference` (IN-15) |

## 5.16 Calculation

**Tanggung jawab:** mesin rumus configurable, perhitungan angsuran, kalender libur. **Skema:** `calculation`. **US:** US-51, TO-11. Mesin rumus ada di `packages/formula` (tanpa I/O); modul ini menyediakan katalog variabel, versi, dan log.

| Operasi | Kontrak |
|---|---|
| `evaluate(formulaCode, ctx)` | Versi: yang dikunci ProcessInstance bila ada, selain itu ACTIVE produk, lalu ACTIVE tenant, lalu default bawaan (FM-04, FM-05). Error (pembagian nol, variabel kosong) melempar `FORMULA_ERROR`; tidak ada nilai pengganti diam-diam (FM-09). Setiap eksekusi dicatat (FM-08) |
| `validate(expression)` | Parse jsep; hanya node dan fungsi di daftar putih FM-02; variabel harus ada di katalog dengan tipe cocok; referensi melingkar ditolak (FM-03) |
| `test(versionId, inputs)` | Menyimpan FormulaTestCase; ChangeRequest rumus ditolak tanpa minimal satu uji (FM-06) |
| `schedule(principal, tenor, rate, type, firstDate)` | Jadwal angsuran Flat dan Effective; sisa pokok baris terakhir 0 (AC-51.01, RM-19) |

Bahasa ekspresi: angka, string, tanggal, `+ - * /`, perbandingan, `AND OR NOT`, `IF`, `MIN`, `MAX`, `ABS`, `ROUND`, `ROUNDUP`, `ROUNDDOWN`, `PMT`, `IPMT`, `PPMT`, `PV`, `DATEDIFF`, `ADDMONTHS`, `EOMONTH`, `WORKDAYS`, `LOOKUP`. Semua angka diproses decimal.js; pembulatan per rumus (FM-07).

## 5.17 Reporting

**Skema:** `reporting` (view saja). **US:** US-81 s.d. US-83. Operasi: `dashboard(filter, scope)`, `inquiry(filter, scope, page)` (paging 20, pencarian `pg_trgm` pada Loan ID dan nama, AC-83.01, AC-83.05), `export(filter, scope)` (maksimal 50.000 baris, AC-82.03; NIK disamarkan). Semua view memakai `security_invoker = true` agar RLS tenant berlaku.

## 5.18 Modul tambahan

Setiap modul langkah mendaftarkan StepHandler (`12-orchestrator-step-contract.md`). Modul integrasi memiliki port kontrak kanonik dan adapter (`13-integration-adapter-pattern.md`).

| Modul | Tanggung jawab dan antarmuka utama | Port dan adapter | Skema |
|---|---|---|---|
| M01 Mobile Sales | API khusus mobile (BFF), Device, draft per section di server | Tidak ada pihak ketiga | `m01_mobile` |
| M02 API Mitra | Registrasi mitra, API key, token JWT, insert pengajuan dengan idempotensi `partnerReference` (AC-54.05) | Tidak ada (mitra adalah klien) | `m02_partner` |
| M03 Bulk Upload | Template Excel, validasi per baris lewat skema Application, hasil gagal; maksimal 500 baris (AC-52.04) | Tidak ada | `m03_bulk` |
| M04 OCR KTP | Baca KTP, isi field dengan tanda `ocrFields` (US-41) | `OcrPort`: Oksara, simulasi | `m04_ocr` |
| M05 Survey & Appraisal | LKN Mikro, LKN KPR, pembayaran dan form appraisal, foto; rumus RM-09, RM-10 | Tidak ada | `m05_survey` |
| M06 Dedup | StepHandler `DEDUP`: kandidat dari blind index NIK dan DOB, skor fuzzy per `DedupFieldSetting`, lookup Dedup Matrix; Prescreen Dedup | Tidak ada pihak ketiga | `m06_dedup` |
| M07 Dukcapil | StepHandler `DUKCAPIL`: skor berbobot dan ambang dari DukcapilRule; Prescreen 2 tingkat | `DukcapilPort`: format AS-IS, simulasi | `m07_dukcapil` |
| M08 Fraud | StepHandler `FRAUD`: blacklist, FraudVelocityRule, Fraud Matrix, reputasi IP; Prescreen Fraud; blacklist | `IpReputationPort`: simulasi (tanpa penyedia = Not applicable) | `m08_fraud` |
| M09 Scoring & RAC | StepHandler `RAC` dan `SCORING`: model aktif per produk, kriteria dari katalog variabel; uji model | Tidak ada | `m09_scoring` |
| M10 Credit Bureau | StepHandler `CREDIT_BUREAU`: SYNC, ASYNC, atau MANUAL (tugas unggah iDeb); agregasi fasilitas; CreditBureauOutcomeMapping | `CreditBureauPort`: MANUAL, simulasi | `m10_credit_bureau` |
| M11 Decision Engine | StepHandler `DECISION`: membaca hasil enam langkah lewat Orchestrator (bukan tabel modul lain), lookup matrix dengan `[ANY]` dan prioritas, default NotGo; Recontest | Tidak ada | `m11_decision` |
| M12 SIKP | StepHandler `SIKP`, bersyarat `requestedLimit > SIKP_MIN_LIMIT`; SikpOutcomeRule | `SikpPort`: format AS-IS, simulasi | `m12_sikp` |
| M13 Kredit Pensiun | Verifikasi Taspen/EDAPEM saat input | `PensionPort`: impor EDAPEM, simulasi | `m13_pension` |
| M14 E-Polis | StepHandler `EPOLIS`: IJK dari `IJK_SOURCE`; penyedia per asuransi | `InsurancePort`: simulasi | `m14_epolis` |
| M15 Pencairan & Core | StepHandler `VALIDITY_CHECK`, `PRINT_AKAD`, `DISBURSEMENT`, `WAIT_CORE`; Record Disbursement (mode MANUAL, US-101) | `CoreBankingPort`: FAST JSON + respons file, MANUAL, simulasi | `m15_disbursement` |
| M16 Name Screening | StepHandler `NAME_SCREENING`, daftar DTTOT/DPPSPM, review Compliance Officer; hit dikonfirmasi = FINISH | `ScreeningPort`: daftar internal, simulasi | `m16_screening` |
