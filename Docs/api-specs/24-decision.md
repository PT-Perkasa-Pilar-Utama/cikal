# 24. Decision (M11)

Decision Matrix, simulasi, dan keputusan awal Go/NotGo. Modul pemilik: M11 Decision Engine ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.18). Tabel: [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) 6.11 M11. M11 membaca hasil enam langkah lewat `orchestrator.outcomes`, bukan tabel modul lain (XM-02). Rute mengembalikan `403 MODULE_NOT_LICENSED` bila M11 tidak berlisensi.

## 24.1 Nilai hasil modul

| Kolom | Nilai | Label UI |
|---|---|---|
| `dedupOutcome` | `MATCH`, `UNMATCH`, `SKIP`, `ANY` | Match, UnMatch, Skip, [ANY] |
| `dukcapilOutcome` | `PASSED`, `SKIP`, `ANY` | Passed, Skip, [ANY] |
| `fraudOutcome` | `CLEAN`, `SUSPICIOUS_CLEARED`, `SKIP`, `ANY` | Clean, Suspicious cleared, Skip, [ANY] |
| `racOutcome` | `PASS`, `FAIL`, `SKIP`, `ANY` | Pass, Fail, Skip, [ANY] |
| `scoringOutcome` | `PASS`, `REVIEW`, `FAIL`, `SKIP`, `ANY` | Pass, Review, Fail, Skip, [ANY] |
| `creditBureauOutcome` | `COLLECT_1` s.d. `COLLECT_5`, `NO_HISTORY`, `SKIP`, `ANY` | Collect 1 s.d. 5, No history, Skip, [ANY] |
| `decisionOutcome` | `GO`, `NOTGO` | Go, NotGo |

Hasil yang menghentikan proses sebelum DECISION (Dukcapil Failed, High Fraud Potential) tidak muncul di matrix. Langkah yang dilewati rute atau tak berlisensi bernilai `SKIP` (AC-69.03).

## 24.2 GET /decision-matrix, PUT /decision-matrix/rows/{id}, POST /decision-matrix/rows

**Purpose:** Halaman "Decision Matrix": daftar baris dan perubahan keputusan kombinasi.  
**Access:** `MST-DECISION` VIEW untuk `GET`; UPDATE untuk `PUT`; CREATE untuk `POST`.

**Input**

| Operasi | Input |
|---|---|
| `GET` | query `decisionOutcome`, paging, `sort` (`priority`, default asc) |
| `PUT /decision-matrix/rows/{id}` | body: enam kolom hasil, `decisionOutcome`, `priority` (int >= 1), `description?` |
| `POST /decision-matrix/rows` | body sama dengan `PUT` |

**Behavior:** Kombinasi enam kolom yang sama persis dengan baris lain: `409 MATRIX_ROW_EXISTS`. Prioritas dipakai bersama: baris lain dengan prioritas sama digeser saat disetujui. Perubahan lewat ChangeRequest `DECISION_MATRIX` dan tampil di "Pending Decision Matrix" (AC-36.01).

**Output:** `GET` 200 berisi baris `{ id, priority, dedupOutcome, dukcapilOutcome, fraudOutcome, racOutcome, scoringOutcome, creditBureauOutcome, decisionOutcome, description, hasPendingChange }`; `PUT`/`POST` 202 dengan `message` "Data submitted for approval" (AC-36.01).

**Errors:** `MATRIX_ROW_EXISTS` 409 "This combination already exists" (teks usulan engineering), `PENDING_CHANGE_REQUEST` 409.

**Traceability:** US-36; AC-36.01, AC-36.05.

## 24.3 POST /decision-matrix/simulate

**Purpose:** Menyimulasikan keputusan untuk satu kombinasi hasil (tombol "Simulate" lalu "Run").  
**Access:** `MST-DECISION` VIEW.

**Input (body):** enam kolom hasil 24.1, semuanya wajib, tanpa `ANY`. `useMatrix` (`ACTIVE` default, atau `PENDING` untuk menguji perubahan yang menunggu persetujuan).

**Behavior**

1. Ada kolom kosong: `422 OUTCOME_REQUIRED` (AC-36.04).
2. Cari baris pertama menurut `priority` yang cocok, dengan `ANY` cocok untuk semua nilai (AC-36.05).
3. Tanpa baris cocok: `NOTGO` default dengan keterangan (AC-36.03).

**Output 200**

```json
{ "data": { "decisionOutcome": "GO", "matchedRow": { "id": "0192...", "priority": 4, "dedupOutcome": "UNMATCH", "dukcapilOutcome": "PASSED", "fraudOutcome": "CLEAN", "racOutcome": "PASS", "scoringOutcome": "PASS", "creditBureauOutcome": "COLLECT_1" }, "note": null } }
```

Tanpa baris: `{"data":{"decisionOutcome":"NOTGO","matchedRow":null,"note":"No matching rule, default decision applied"}}`.

**Errors:** `OUTCOME_REQUIRED` 422 "Select an outcome for every module" (AC-36.04).

**Traceability:** US-36; AC-36.02 s.d. AC-36.05.

## 24.4 GET /applications/{id}/decision

**Purpose:** Klik langkah "Decision" di timeline.  
**Access:** `APP-INQUIRY` VIEW; lingkup data.

**Input (query):** `processInstanceId` (opsional).

**Output 200**

```json
{ "data": { "decisionOutcome": "GO", "outcomes": { "dedup": "UNMATCH", "dukcapil": "PASSED", "fraud": "CLEAN", "rac": "PASS", "scoring": "PASS", "creditBureau": "SKIP" },
            "matchedRow": { "id": "0192...", "priority": 4 }, "description": null, "nextStep": "APPROVAL" } }
```

`NOTGO` membawa pengajuan ke status `RECONTEST` dan antrean "Recontest" tanpa email ke pemohon (AC-69.02).

**Errors:** `APPLICATION_NOT_FOUND` 404, `MODULE_NOT_LICENSED` 403.

**Traceability:** US-69; AC-69.01 s.d. AC-69.03.

## 24.5 Operasi backlog (TODO)

Recontest dijalankan lewat `13-processes.md` 13.6 (US-71).
