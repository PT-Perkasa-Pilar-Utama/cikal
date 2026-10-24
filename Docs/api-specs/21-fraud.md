# 21. Fraud (M08)

Pengecekan blacklist, frekuensi pengajuan, dan reputasi IP. Modul pemilik: M08 Fraud ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.18). Port `IpReputationPort` (adapter simulasi; tanpa penyedia = Not applicable). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.11 M08. Rute mengembalikan `403 MODULE_NOT_LICENSED` bila M08 tidak berlisensi.

## 21.1 Perilaku langkah FRAUD (tanpa endpoint)

| Kondisi | Hasil | StepResult | Rujukan |
|---|---|---|---|
| Pemohon ada di blacklist | `HIGH_FRAUD_POTENTIAL` | `FINISH FINISHED_REJECTED` | TRM_FRD_001 |
| FraudVelocityRule terlampaui (seed: nama sama > 3 per hari) | `HIGH_FRAUD_POTENTIAL`, data pemohon masuk blacklist | `FINISH FINISHED_REJECTED` | TRM_FRD_002 |
| Tepat di batas velocity | `CLEAN` | `CONTINUE` | TRM_FRD_003 |
| IP VPN/Proxy atau lokasi IP beda domisili | `SUSPICIOUS` | `WAIT_HUMAN` antrean `PRESCREEN_FRAUD` (backlog US-66). Di POC: `ERROR` `BUSINESS_SETUP` "Manual review is not available in POC" tanpa retry | TRM_FRD_004, 005 |
| Normal | `CLEAN` | `CONTINUE` | TRM_FRD_006 |
| Pengajuan tanpa IP (Upload Excel) | Cek IP `NOT_APPLICABLE`; hasil dari blacklist dan velocity saja | | AC-65.02 |

Urutan penilaian: blacklist (NIK lewat blind index), lalu FraudVelocityRule aktif, lalu reputasi IP dan Fraud Matrix. Frekuensi dihitung dari pengajuan non-draft yang disubmit dalam jendela aturan (contoh 24 jam terakhir untuk `1 DAY`), termasuk pengajuan yang dicek; nama dibandingkan tanpa membedakan huruf besar. Dimensi tanpa data (`DEVICE_ID`, atau `IP_ADDRESS` tanpa IP) tidak dihitung. Blacklist atau frekuensi terlampaui menentukan hasil tanpa memanggil penyedia IP, dan cek IP dicatat `NOT_APPLICABLE`. IP berasal dari `applications.client_ip_address`, diisi saat draft WEB dan MOBILE dibuat. `LOCATION_MISMATCH` = provinsi IP berbeda dari provinsi alamat KTP. Kombinasi tanpa baris Fraud Matrix = `SUSPICIOUS`. Entri blacklist dari frekuensi menyimpan nama, NIK terenkripsi, blind index, alasan, dan pengajuan sumber. Seed `dev` company 001: aturan nama sama lebih dari 3 per 1 hari = `HIGH_FRAUD_POTENTIAL`, matrix VPN/Proxy dan beda lokasi `SUSPICIOUS`, IP normal dan tanpa IP `CLEAN`. Timeout dan gangguan penyedia IP diretry otomatis orchestrator.

## 21.2 GET /applications/{id}/fraud

**Purpose:** Tab "Fraud" dan klik langkah Fraud di timeline.  
**Access:** `APP-INQUIRY` VIEW; lingkup data.

**Input (query):** `processInstanceId` (opsional).

**Output 200**

```json
{
  "data": {
    "outcome": "CLEAN", "isBlacklisted": false,
    "ipCheck": { "status": "NOT_APPLICABLE", "ipAddress": null, "category": null, "providerCode": null },
    "velocityHits": [ { "dimension": "FULL_NAME", "windowValue": 1, "windowUnit": "DAY", "maxCount": 3, "actualCount": 1, "exceeded": false } ],
    "matrixRow": { "id": "0192...", "priority": 5, "nameCondition": "NORMAL", "ipCondition": "ANY" },
    "review": null
  }
}
```

`ipCheck.status`: `NORMAL`, `VPN_PROXY`, `LOCATION_MISMATCH`, `NOT_APPLICABLE` (label "Not applicable", AC-65.02). `ipCheck.category`: klasifikasi penyedia (`NORMAL`, `VPN_PROXY`), kosong bila penyedia tidak dipanggil. Langkah belum berjalan atau dilewati: `data: null` dengan `meta.stepStatus`; pengajuan tanpa proses `PENDING`. Hasil `SUSPICIOUS` tetap dikembalikan walau langkahnya `ERROR` di POC; `review` selalu `null` sampai US-66.

**Errors:** `APPLICATION_NOT_FOUND` 404, `NOT_FOUND` 404 (`processInstanceId` bukan milik pengajuan), `MODULE_NOT_LICENSED` 403 (lisensi tenant tanpa M08, diperiksa use case karena menu `APP-INQUIRY` milik CORE).

**Traceability:** US-65; AC-65.01 (TRM_FRD_001 s.d. 006), AC-65.02.

## 21.3 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /fraud-matrix`, `PUT /fraud-matrix` | Baris matrix lewat checker-maker | `MST-FRAUD` | US-35 |
| `GET /fraud-velocity-rules`, `PUT /fraud-velocity-rules/{id}` | Aturan frekuensi per dimensi | `MST-FRAUD` | US-35 |
| `POST /applications/{id}/fraud/review` | Verifikator: `CLEAR` atau `REJECT_AND_BLACKLIST` | `OPS-PRESCREEN` UPDATE | US-66 |
| `GET /blacklists`, `POST /blacklists`, `PUT /blacklists/{id}` | Kelola blacklist | `MST-FRAUD` | US-95 |
