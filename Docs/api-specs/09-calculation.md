# 9. Calculation

Simulasi angsuran, mesin rumus, dan kalender libur. Modul pemilik: CORE Calculation ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.16). Mesin rumus: ADR-004 (jsep + evaluator daftar putih + decimal.js).

## 9.1 POST /calculations/installment-simulation

**Purpose:** Sales menghitung simulasi angsuran (tombol "Calculate").  
**Access:** `APP-SIMULATION` VIEW. Operasi baca: tidak mengubah data, tidak butuh CREATE.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| interestType | enum | ya | `FLAT`, `EFFECTIVE`; `FLOATING`, `HYBRID`, `CAPPED` diterima tetapi baris MRTM-nya [Deferred] |
| principal | money | ya | > 0 |
| tenor | int | ya | bulan, >= 1 |
| interestRate | percent | ya | >= 0 (0 diizinkan, AC-51.04) |
| spreadRate | percent | kondisional | `FLOATING`, `CAPPED` |
| floatingRate | percent | kondisional | `HYBRID` |
| tenorFixed | int | kondisional | `HYBRID`; harus < `tenor` |
| capRate | percent | kondisional | `CAPPED` |
| firstInstallmentDate | date | tidak | default tanggal hari ini + 1 bulan |
| productId | uuid | tidak | bila dikirim, rumus versi ACTIVE produk dipakai |

**Behavior**

1. `tenor` kosong: `400 VALIDATION_FAILED` dengan detail "Tenor is required" (AC-51.03).
2. `FLOATING`, `HYBRID`, `CAPPED`: `501 NOT_IMPLEMENTED` selama baris MRTM-nya [Deferred] (TRM_INS_003 s.d. 007). Saat dibangun, `HYBRID` dengan `tenorFixed >= tenor` menjadi `422 INVALID_FIXED_TENOR` (TRM_INS_007).
3. Hitung lewat `calculation.schedule` dengan rumus `INSTALLMENT_FLAT` atau `INSTALLMENT_EFFECTIVE` versi ACTIVE (FM-04). Pembulatan per rumus (FM-07); selisih pembulatan pokok ditaruh di angsuran terakhir sehingga sisa pinjaman baris terakhir 0 (RM-19, TRM_INS_001).
4. Error evaluasi rumus: `422 FORMULA_ERROR` tanpa nilai pengganti (FM-09).
5. Tidak menyimpan data; eksekusi dicatat di `formula_execution_logs` (FM-08).

**Output 200**

```json
{
  "data": {
    "interestType": "EFFECTIVE", "principal": "100000000.00", "tenor": 12, "appliedRate": "12.0000",
    "monthlyInstallment": "8884879.00", "totalInterest": "6618545.00", "totalPayment": "106618545.00",
    "schedule": [
      { "installmentNo": 1, "dueDate": "2026-11-21", "principalAmount": "7884879.00", "interestAmount": "1000000.00", "installmentAmount": "8884879.00", "outstandingAmount": "92115121.00" },
      { "installmentNo": 12, "dueDate": "2027-10-21", "principalAmount": "8796907.00", "interestAmount": "87969.00", "installmentAmount": "8884876.00", "outstandingAmount": "0.00" }
    ],
    "formulaVersions": { "INSTALLMENT_EFFECTIVE": "DEFAULT", "INSTALLMENT_DUE_DATE": "DEFAULT" }
  }
}
```

`monthlyInstallment` adalah angsuran baris pertama. Pokok baris terakhir sama dengan sisa pinjaman, jadi angsuran baris terakhir Flat dan Effective bisa berbeda beberapa rupiah karena selisih pembulatan (TRM_INS_001; FM-07). `formulaVersions` berisi id versi rumus, atau `DEFAULT` untuk rumus default bawaan (FM-04). Nilai acuan uji ada di MRTM US-51.

**Errors**

| code | status | condition |
|---|---|---|
| `VALIDATION_FAILED` | 400 | "Tenor is required" dan field wajib lain (AC-51.03) |
| `NOT_IMPLEMENTED` | 501 | `FLOATING`, `HYBRID`, `CAPPED` selama [Deferred] |
| `INVALID_FIXED_TENOR` | 422 | "Fixed tenor must be less than total tenor" (TRM_INS_007, [Deferred]) |
| `FORMULA_ERROR` | 422 | Rumus gagal dievaluasi; `details` berisi kode rumus |

**Traceability:** US-51; AC-51.01, AC-51.02 (TRM_INS_001, TRM_INS_002; TRM_INS_003 s.d. 007 [Deferred]), AC-51.03, AC-51.04.

## 9.2 GET /formula-variables

**Purpose:** Katalog variabel untuk dropdown "Field" kriteria scoring dan RAC serta editor rumus.  
**Access:** `MST-SCORING` VIEW atau `MST-FORMULA` VIEW.

**Input (query):** `usage` (`SCORING`, `FORMULA`; opsional), `q`.

**Behavior:** Membaca `formula_variables` [instalasi]; variabel milik modul tak berlisensi tidak dikembalikan.

**Output 200**

```json
{ "data": [
  { "variableCode": "OCCUPATION", "label": "Occupation", "dataType": "CHOICE", "paramType": "Occupation", "source": "APPLICATION" },
  { "variableCode": "INSTALLMENT_TO_INCOME_RATIO", "label": "Installment to Income Ratio (%)", "dataType": "PERCENT", "paramType": null, "source": "FORMULA" },
  { "variableCode": "PRODUCT_DBR_MAX", "label": "Product DBR Max", "dataType": "PERCENT", "paramType": null, "source": "PRODUCT" }
] }
```

`dataType`: `NUMBER`, `MONEY`, `PERCENT`, `TEXT`, `BOOLEAN`, `DATE`, `CHOICE`. Tipe dipakai untuk memvalidasi nilai kriteria (AC-37.03).

**Traceability:** US-37 (AC-37.01 s.d. AC-37.03); FM-10.

## 9.3 Operasi backlog (TODO)

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `GET /formulas`, `GET /formulas/{code}/versions` | Katalog rumus dan versinya | `MST-FORMULA` VIEW | TO-11; FM-04 |
| `POST /formulas/{code}/versions` | Ajukan versi rumus; minimal satu uji wajib (FM-06) | `MST-FORMULA` CREATE | TO-11; FM-03, FM-06 |
| `POST /formulas/validate` | Validasi ekspresi: daftar putih node dan fungsi, variabel, referensi melingkar | `MST-FORMULA` VIEW | FM-02, FM-03 |
| `POST /formula-versions/{id}/tests` | Simpan dan jalankan FormulaTestCase | `MST-FORMULA` UPDATE | FM-06 |
| `GET /holidays`, `POST /holidays` | Kalender libur untuk `WORKDAYS` | `MST-FORMULA` | TO-11 |
