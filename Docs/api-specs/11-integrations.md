# 11. Integrations

Integration Registry: katalog adapter, konfigurasi penyedia per tenant, uji koneksi, log panggilan, dan endpoint data masuk. Modul pemilik: CORE Integration Registry ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.15). Pola lengkap: [../technical-specs/13-integration-adapter-pattern.md](../technical-specs/13-integration-adapter-pattern.md). Aturan bisnis: IN-01 s.d. IN-15.

Di POC, IntegrationConfig berasal dari seed: adapter simulasi untuk M07, M08 (reputasi IP), dan M10, serta mode MANUAL untuk M15. Registry internal (`IntegrationApi`) dibangun di POC; endpoint HTTP di file ini dibangun setelah POC (TO-18) dan ditulis penuh agar seed dan uji memakai kontrak yang sama.

## 11.1 GET /integrations/providers

**Purpose:** Katalog adapter yang terpasang di paket ini, per modul.  
**Access:** `MST-INTEGRATION` VIEW.

**Output 200**

```json
{ "data": [ { "providerCode": "DUKCAPIL_ASIS", "moduleCode": "M07", "supportedModes": ["SYNC"], "isSimulation": false, "adapterVersion": "1.0.0", "settingsSchema": { "type": "object" } },
            { "providerCode": "SIMULATION_M07", "moduleCode": "M07", "supportedModes": ["SYNC"], "isSimulation": true, "adapterVersion": "1.0.0", "settingsSchema": { "type": "object" } } ] }
```

`settingsSchema` adalah JSON Schema dari `settingsSchema` Zod adapter, dipakai klien untuk merender form pengaturan (IN-05). Adapter simulasi tidak dikembalikan di production kecuali tenant trial (IN-03).

**Traceability:** TO-18; IN-02, IN-05.

## 11.2 GET /integrations/configs

**Purpose:** Konfigurasi aktif dan yang sedang diajukan per modul.  
**Access:** `MST-INTEGRATION` VIEW.

**Output 200**

```json
{ "data": [ { "id": "0192...", "moduleCode": "M07", "providerCode": "SIMULATION_M07", "mode": "SYNC", "endpointUrl": null, "timeoutSeconds": 30, "maxRetries": 3,
              "asyncWaitHours": null, "settings": {}, "hasCredential": false, "versionNumber": 1, "status": "ACTIVE", "lastTestResult": "SUCCESS", "lastTestAt": "2026-10-21T02:00:00Z" } ] }
```

Kredensial tidak pernah dikembalikan; hanya `hasCredential` (PR-09).

**Traceability:** TO-18; IN-04, IN-05.

## 11.3 PUT /integrations/configs/{moduleCode}

**Purpose:** Maker mengajukan konfigurasi penyedia untuk satu modul.  
**Access:** `MST-INTEGRATION` UPDATE.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| providerCode | string | ya | dari 11.1, `moduleCode` sama |
| mode | enum | ya | `SYNC`, `ASYNC`, `MANUAL`; harus ada di `supportedModes` (MANUAL selalu diizinkan untuk M10 dan M15) |
| endpointUrl | string | kondisional | wajib untuk adapter HTTP; harus `https` (IN-05) |
| timeoutSeconds | int | tidak | default 30 (COM-04) |
| maxRetries | int | tidak | default 3 |
| asyncWaitHours | int | kondisional | wajib bila `ASYNC` |
| settings | object | tidak | divalidasi `settingsSchema` adapter |
| credential | object | tidak | disimpan terenkripsi ke `platform.secrets`; kosong = pakai kredensial versi aktif |
| testConnectionId | uuid | kondisional | hasil 11.4 yang `SUCCESS` untuk isian yang sama, wajib kecuali `MANUAL` (IN-05) |

**Behavior:** Validasi; tanpa uji sukses: `422 TEST_CONNECTION_REQUIRED`; versi baru + ChangeRequest `INTEGRATION_CONFIG`. Saat ACTIVE, cache adapter dibuang lewat `NOTIFY`; langkah yang sedang `WAITING_EXTERNAL` tetap memakai konfigurasi lama sampai selesai.

**Output 202:** `entityType = INTEGRATION_CONFIG`, `message` "Data submitted for approval".

**Errors:** `VALIDATION_FAILED` 400, `TEST_CONNECTION_REQUIRED` 422 "Test connection must succeed before submitting" (teks usulan engineering), `PENDING_CHANGE_REQUEST` 409.

**Traceability:** TO-18; IN-02, IN-04, IN-05, IN-08.

## 11.4 POST /integrations/test-connection

**Purpose:** Uji koneksi isian konfigurasi sebelum diajukan.  
**Access:** `MST-INTEGRATION` UPDATE. Rate limit 10 per menit per user.

**Input (body):** field 11.3 tanpa `testConnectionId`.

**Behavior:** Panggil `testConnection` adapter dengan timeout konfigurasi; tidak menyimpan konfigurasi; simpan hasil 15 menit dengan hash isian.

**Output 200:** `{"data":{"testConnectionId":"0192...","result":"FAILED","category":"AUTH","message":"Provider rejected the credential"}}`. Hasil `FAILED` tetap `200` karena pengujiannya berhasil dijalankan.

**Traceability:** IN-05.

## 11.5 GET /integrations/call-logs

**Purpose:** Log panggilan pihak ketiga untuk diagnosis.  
**Access:** `MST-INTEGRATION` VIEW atau `OPS-MONITORING` VIEW.

**Input (query):** `moduleCode`, `loanId`, `status` (`SUCCESS`, `FAILED`), `occurredFrom`, `occurredTo` (maks 31 hari), paging, `sort` (`occurredAt`).

**Output 200:** baris `{ id, moduleCode, providerCode, loanId, attempt, status, errorCategory, durationMs, occurredAt, requestMasked, responseMasked }`. PII disamarkan (IN-06).

**Traceability:** IN-06; US-86 (diagnosis error).

## 11.6 POST /integrations/inbound/{companyCode}/{providerCode}

**Purpose:** Penyedia mengirim hasil untuk langkah mode `ASYNC` (IN-15).  
**Access:** Bukan sesi pengguna. Autentikasi sesuai adapter: API key di header, token, atau mTLS yang diverifikasi Nginx ([../technical-specs/13-integration-adapter-pattern.md](../technical-specs/13-integration-adapter-pattern.md) 13.4). Tenant diambil dari `companyCode` setelah kredensial penyedia diverifikasi terhadap IntegrationConfig tenant itu.

**Input:** body format penyedia; maksimal 1 MB.

**Behavior**

1. Verifikasi kredensial penyedia. Gagal: `401 INVALID_PROVIDER_CREDENTIAL`; dicatat dan memicu alert admin tenant.
2. `parseInbound` adapter menghasilkan `externalReference` dan payload kanonik. Gagal: `400 INVALID_PAYLOAD`.
3. Idempotensi: kunci `providerCode + externalReference`; panggilan ulang mengembalikan hasil pertama.
4. `orchestrator.receiveExternal(reference, payload)`: `MATCHED` melanjutkan langkah; `IGNORED_NOT_WAITING`, `DUPLICATE`, `UNKNOWN_REFERENCE` dicatat tanpa efek.
5. Jawaban `200` untuk semua hasil di langkah 4 agar penyedia tidak mengulang.

**Output 200:** `{"data":{"processingStatus":"MATCHED"}}`.

**Errors**

| code | status | condition |
|---|---|---|
| `INVALID_PROVIDER_CREDENTIAL` | 401 | Kredensial penyedia salah |
| `INVALID_PAYLOAD` | 400 | Payload tidak bisa dibaca adapter |
| `NOT_FOUND` | 404 | `companyCode` atau `providerCode` tidak dikenal, atau tidak ada konfigurasi ASYNC aktif |

**Traceability:** IN-15; US-80 (backlog).

## 11.7 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /simulations/{moduleCode}/responses`, `PUT /simulations/{moduleCode}/responses/{key}` | Atur respons adapter simulasi per NIK atau skenario | `QA-RESET` atau menu Simulator, non-production | US-94 |
