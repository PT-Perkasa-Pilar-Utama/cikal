# 7. Security

Kontrol keamanan per lapisan. Mekanisme login dan matriks role ada di `09-authentication-authorization.md`.

## 7.1 Autentikasi dan sesi

| Kontrol | Implementasi | Rujukan |
|---|---|---|
| Password | Argon2id (memory 64 MiB, iterasi 3, paralel 1); aturan komposisi TRM_PWD; 5 password terakhir tidak boleh dipakai ulang | US-04, US-05 |
| Penguncian | `LOCK_ATTEMPTS` gagal berturut-turut mengunci `LOCK_MINUTES`; batas pengaman tidak bisa dilonggarkan melebihi PR-10 | AC-01.05, PR-10 |
| Sesi web | Cookie `cikal_sid` HttpOnly, Secure, SameSite=Strict, Path=/api; nilai acak 256 bit, hanya hash di DB | 4.5 |
| Idle dan absolut | Idle `SESSION_IDLE_MINUTES` (30); absolut 12 jam | AC-06.03 |
| Satu sesi per channel | Login baru menghapus sesi lama di channel yang sama | Grooming v1 E-25 |
| Pembatalan | Logout, user nonaktif, ganti password, dan lisensi dicabut menghapus sesi | AC-07.05 |

## 7.2 Otorisasi

| Kontrol | Implementasi |
|---|---|
| Hak menu dan aksi | Decorator `@Requires(menuCode, action)` di setiap controller; guard memanggil `identity.authorize` (AC-09.04). Rute tanpa decorator ditolak oleh uji arsitektur |
| Lingkup data | `identity.dataScope` membatasi query pengajuan per unit kerja (TN-02) |
| Pemisahan tugas | Pembuat ChangeRequest bukan checker (CHECK di DB dan di modul); penginput pengajuan bukan approver (AC-72.05); escalator Dukcapil bukan Supervisor yang memutuskan (AC-63.05) |
| Lisensi | Guard menolak rute modul tak berlisensi dengan 403 `MODULE_NOT_LICENSED` |

## 7.3 Isolasi tenant

| Kontrol | Implementasi |
|---|---|
| RLS | Semua tabel ber-`tenant_id` memakai policy DM-09; role aplikasi tanpa `BYPASSRLS` |
| Konteks | `SET LOCAL app.tenant_id` di awal setiap transaksi dari token sesi, tidak pernah dari parameter request (API-03) |
| Worker | Setiap job membawa `tenantId`; worker membuka transaksi dengan konteks tenant yang sama |
| Uji | Suite `apps/api/test/tenant-isolation.int.spec.ts` di CI: dua company, setiap endpoint daftar dan detail dipanggil silang, harus 404 atau kosong (TN-03) |

## 7.4 Perlindungan data

| Data | Perlakuan |
|---|---|
| NIK, nomor KK, NPWP, nomor rekening, nama ibu kandung, NIK pasangan | AES-256-GCM per field dengan data key per tenant (DM-08); NIK juga blind index HMAC |
| Respons mentah pihak ketiga | Terenkripsi di kolom `raw_response_enc` (IN-06) |
| Kunci utama | File secret di-mount ke container (`/run/secrets/cikal_master_key`); tidak di env, image, atau database |
| Rotasi kunci | Data key baru per tenant; baris lama tetap terbaca lewat `key_version`; re-enkripsi bertahap lewat job |
| Tampilan | NIK disamarkan `3273********0001` di daftar dan ekspor (tech ref 13, AC-82.05) |
| Log | pino redaction untuk field sensitif; log integrasi menyamarkan PII (IN-06) |
| Retensi | Audit 5 tahun; log integrasi 1 tahun; data pengajuan 10 tahun sejak selesai [Usulan BA DD-07] |

## 7.5 Request hardening

| Kontrol | Implementasi |
|---|---|
| CSRF | Token di cookie `cikal_csrf` (bukan HttpOnly) dan header `X-CSRF-Token`, wajib untuk metode selain GET/HEAD |
| CORS | Tidak diaktifkan untuk SPA (satu origin lewat Nginx); API mitra M02 hanya server-ke-server |
| CSP | `default-src 'self'; img-src 'self' data: blob:; frame-ancestors 'none'; object-src 'none'` |
| Header | HSTS 1 tahun, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin` |
| Validasi input | Semua body, query, dan params divalidasi skema Zod; field tak dikenal ditolak |
| Ukuran body | 1 MB untuk JSON; unggahan file `UPLOAD_MAX_MB` (default 2 MB), dicek ekstensi dan tanda tangan file (magic bytes) |
| SQL injection | Hanya query terparameter Drizzle; tidak ada string SQL yang dirangkai dari input (AC-01.08) |
| Rate limit | Login 10 per menit per IP; lupa password 5 per jam per IP; API mitra 60 per menit per mitra |
| Mesin rumus | Tanpa `eval`/`Function`; daftar putih node AST dan fungsi; batas kedalaman ekspresi 50 dan waktu evaluasi 50 ms (FM-02) |

## 7.6 Lisensi

| Kontrol | Implementasi |
|---|---|
| Format | File `{ "license": {...}, "signature": "<base64>" }`. `license` berisi company, nomor lisensi, deploymentType, modul (wajib CORE), validFrom, validTo, maxUsers; field asing ditolak. Tanda tangan Ed25519 atas isi kanonik: JSON tanpa spasi dengan kunci urut alfabet (`canonicalLicensePayload`, `packages/contracts`) |
| Kunci | Kunci privat hanya di tim PPU (`tools/license-cli keygen`, disimpan di password manager). Kunci publik tertanam di image saat build: `tools/package-builder --license-key <pem>` membangkitkan `license-public-key.generated.ts`; tidak ada env untuk menggantinya. Build dev dan CI memakai kunci dev `deploy/license/dev-license-public-key.pem`; image rilis memakai kunci PPU (TL-S6-01) |
| Pemeriksaan | Saat file dipasang, dan dari cache per proses di empat titik LC-04. Cache kosong saat proses start, jadi lisensi setiap company diverifikasi ulang dari `raw_document` sebelum dipakai pertama kali; baris yang gagal verifikasi atau milik company lain dianggap tidak ada. `NOTIFY license_installed` di `cikal_ops` dan reset membuang cache semua proses |
| Tanpa lisensi | Tidak ada modul berlisensi, termasuk CORE: rute menu dan metode yang mengubah data ditolak `MODULE_NOT_LICENSED`; halaman License tetap terbuka agar lisensi bisa dipasang |
| Kedaluwarsa | Mode baca saja mulai hari setelah `validTo`: metode yang mengubah data ditolak dengan `LICENSE_EXPIRED`; data tetap bisa dilihat dan diekspor (LC-06). Orchestrator tetap menjalankan proses yang sudah diajukan |
| Pemasangan modul | Modul di luar manifest tidak ada di image (PK-02); modul aktif = modul lisensi yang ada di paket (PK-04) |

## 7.7 Object storage

| Kontrol | Implementasi |
|---|---|
| Akses | Bucket privat; unduhan lewat URL bertanda tangan 5 menit setelah otorisasi aplikasi |
| Enkripsi | Enkripsi saat tersimpan oleh storage, bukan oleh aplikasi (ADR-005): SeaweedFS hosting PPU dengan `-filer.encryptVolumeData`; storage client atau penyedia cloud dengan default encryption bucket atau grid yang dikonfirmasi penyedia sebelum go-live. Aplikasi tidak mengenkripsi isi file, karena URL bertanda tangan menyajikan objek apa adanya dan file tidak boleh lewat origin aplikasi (api-specs 10 §10.1) |
| Kunci objek | `tenants/<tenantId>/<modul>/<uuid>`; tanpa nama file asli di path |

## 7.8 Endpoint operasional

| Endpoint | Kebijakan |
|---|---|
| `GET /api/health/live` | Publik; hanya `{"status":"ok"}`, tanpa informasi versi atau dependensi |
| `GET /api/health/ready` | Hanya dari jaringan internal (Nginx membatasi ke subnet monitoring) atau dengan `Authorization: Bearer <MONITORING_TOKEN>`; memuat versi dan status dependensi |
| `POST /api/admin/reset-state` | **Hanya dipasang** di `dev`, `test`, `sit`, `uat` bila `ENABLE_RESET_API=true`. Modul `OpsModule` mendaftarkan controller ini secara kondisional saat bootstrap; di production controller tidak dimuat sehingga rute tidak ada (404), bukan sekadar ditolak. Konfigurasi production menolak start bila `ENABLE_RESET_API=true`. Di lingkungan yang memasangnya: sesi login dengan role QA dan header `X-Reset-Token` cocok dengan `RESET_API_TOKEN` |

## 7.9 Ancaman utama

| Ancaman | Mitigasi |
|---|---|
| Kebocoran data antar company | RLS + uji isolasi (7.3) |
| Pengambilalihan akun lewat SSO | Penautan akun berdasarkan aturan AU-01 dan IdP per company; `sub` disimpan |
| Pemalsuan lisensi | Tanda tangan Ed25519 (7.6) |
| Callback palsu dari "core" | Endpoint masuk per tenant dengan autentikasi penyedia dan pencocokan `externalReference` (IN-15) |
| Rumus berbahaya | Evaluator daftar putih (7.5) dan checker-maker dengan uji wajib (FM-06) |
| Reset database di production | Rute tidak didaftarkan (7.8) |
| File berbahaya | Validasi magic bytes, konversi ke PDF, tidak pernah disajikan dari origin aplikasi |
