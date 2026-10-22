# 21. Fraud (M08)

Pengecekan blacklist, frekuensi pengajuan, dan reputasi IP. Modul pemilik: M08 Fraud ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.18). Port `IpReputationPort` (adapter simulasi; tanpa penyedia = Not applicable). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.11 M08. Rute mengembalikan `403 MODULE_NOT_LICENSED` bila M08 tidak berlisensi.

## 21.1 Perilaku langkah FRAUD (tanpa endpoint)

| Kondisi | Hasil | StepResult | Rujukan |
|---|---|---|---|
| Pemohon ada di blacklist | `HIGH_FRAUD_POTENTIAL` | `FINISH FINISHED_REJECTED` | TRM_FRD_001 |
| FraudVelocityRule terlampaui (seed: nama sama > 3 per hari) | `HIGH_FRAUD_POTENTIAL`, data pemohon masuk blacklist | `FINISH FINISHED_REJECTED` | TRM_FRD_002 |
| Tepat di batas velocity | `CLEAN` | `CONTINUE` | TRM_FRD_003 |
| IP VPN/Proxy atau lokasi IP beda domisili | `SUSPICIOUS` | `WAIT_HUMAN` antrean `PRESCREEN_FRAUD` (backlog US-66) | TRM_FRD_004, 005 |
| Normal | `CLEAN` | `CONTINUE` | TRM_FRD_006 |
| Pengajuan tanpa IP (Upload Excel) | Cek IP `NOT_APPLICABLE`; hasil dari blacklist dan velocity saja | | AC-65.02 |

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

`ipCheck.status`: `NORMAL`, `VPN_PROXY`, `LOCATION_MISMATCH`, `NOT_APPLICABLE` (label "Not applicable", AC-65.02).

**Errors:** `APPLICATION_NOT_FOUND` 404, `MODULE_NOT_LICENSED` 403.

**Traceability:** US-65; AC-65.01 (TRM_FRD_001 s.d. 006), AC-65.02.

## 21.3 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /fraud-matrix`, `PUT /fraud-matrix` | Baris matrix lewat checker-maker | `MST-FRAUD` | US-35 |
| `GET /fraud-velocity-rules`, `PUT /fraud-velocity-rules/{id}` | Aturan frekuensi per dimensi | `MST-FRAUD` | US-35 |
| `POST /applications/{id}/fraud/review` | Verifikator: `CLEAR` atau `REJECT_AND_BLACKLIST` | `OPS-PRESCREEN` UPDATE | US-66 |
| `GET /blacklists`, `POST /blacklists`, `PUT /blacklists/{id}` | Kelola blacklist | `MST-FRAUD` | US-95 |
