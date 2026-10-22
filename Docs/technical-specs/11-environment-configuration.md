# 11. Environment Configuration

Konfigurasi teknis per lingkungan diatur lewat environment variable saat deploy (CF-03). Konfigurasi bisnis per tenant (parameter sistem, rumus, penyedia integrasi) diatur lewat layar dengan checker-maker, bukan env. Semua env divalidasi skema Zod saat start (`platform/config`); nilai tidak valid membuat proses berhenti dengan pesan jelas.

## 11.1 Lingkungan

| Lingkungan | Tujuan | Data | Adapter integrasi |
|---|---|---|---|
| `dev` | Pengembangan lokal | Seed `dev` | Simulasi |
| `test` | CI | Testcontainers, seed `qa` | Simulasi, memori |
| `sit` | Uji integrasi tim | Seed `qa` | Simulasi atau sandbox penyedia |
| `uat` | Uji penerimaan client | Seed `qa` atau data uji client | Sandbox penyedia; simulasi hanya tenant trial |
| `production` | Operasional bank | Data nyata | Adapter asli; simulasi ditolak (IN-03) |

## 11.2 Variabel

| Variabel | Wajib | Contoh | Keterangan |
|---|---|---|---|
| `APP_ENV` | Ya | `uat` | `dev`, `test`, `sit`, `uat`, `production` |
| `APP_VERSION` | Ya | `1.0.0` | Diisi saat build |
| `PORT` | Tidak | `3000` | Port HTTP api |
| `PROCESS_ROLE` | Ya | `api` | `api` atau `worker`; image sama |
| `PUBLIC_BASE_URL` | Ya | `https://los.bankcontoh.co.id` | Untuk tautan email dan redirect SSO |
| `DATABASE_URL` | Ya | `postgres://cikal_app:***@db:5432/cikal` | Role aplikasi tanpa `BYPASSRLS` |
| `DATABASE_MIGRATION_URL` | Ya (container `migrate`) | `postgres://cikal_owner:***@db:5432/cikal` | Role pemilik skema; hanya dipakai migrasi dan reset |
| `DATABASE_POOL_MAX` | Tidak | `20` | |
| `S3_ENDPOINT` | Ya | `https://s3.bankcontoh.co.id` | |
| `S3_REGION` | Ya | `id-jkt-1` | |
| `S3_BUCKET` | Ya | `cikal-uat` | |
| `S3_ACCESS_KEY_FILE`, `S3_SECRET_KEY_FILE` | Ya | `/run/secrets/s3_access_key` | Dibaca dari file secret |
| `S3_FORCE_PATH_STYLE` | Tidak | `true` | Untuk server S3 cadangan |
| `GOTENBERG_URL` | Ya | `http://gotenberg:3000` | Jaringan internal |
| `MASTER_KEY_FILE` | Ya | `/run/secrets/cikal_master_key` | Kunci utama envelope encryption |
| `LICENSE_FILE` | Ya | `/etc/cikal/license.json` | File lisensi bertanda tangan |
| `SESSION_COOKIE_SECURE` | Ya | `true` | `false` hanya di `dev` |
| `MONITORING_TOKEN_FILE` | Ya | `/run/secrets/monitoring_token` | Untuk `/api/health/ready` dan `/api/metrics` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD_FILE`, `SMTP_FROM` | Ya | `smtp.bankcontoh.co.id` | `dev`: Mailpit |
| `REGION_API_KEY_FILE` | Ya | `/run/secrets/oksara_key` | Parameter bercakupan INSTALLATION |
| `ALLOW_SIMULATION_ADAPTERS` | Ya | `false` | Boleh `true` di `dev`, `test`, `sit`, `uat`; production hanya untuk tenant bertanda trial |
| `WORKER_CONCURRENCY` | Tidak | `5` | Konkurensi per antrean pg-boss |
| `LOG_LEVEL` | Tidak | `info` | |
| `ENABLE_RESET_API` | Tidak | `true` | Memasang `POST /api/admin/reset-state` |
| `RESET_API_TOKEN_FILE` | Kondisional | `/run/secrets/reset_token` | Wajib bila `ENABLE_RESET_API=true` |
| `DEFAULT_RESET_SEED` | Tidak | `qa` | Seed bila body tidak mengirim `seed` |

## 11.3 Nilai per lingkungan untuk variabel yang dikunci

| Variabel | dev | test | sit | uat | production |
|---|---|---|---|---|---|
| `ENABLE_RESET_API` | `true` | `true` | `true` | `true` | **tidak di-set; start ditolak bila `true`** |
| `RESET_API_TOKEN_FILE` | ada | ada | ada | ada | **tidak ada** |
| `DEFAULT_RESET_SEED` | `dev` | `qa` | `qa` | `qa` | **tidak ada** |
| `ALLOW_SIMULATION_ADAPTERS` | `true` | `true` | `true` | `true` | `false` |
| `SESSION_COOKIE_SECURE` | `false` | `true` | `true` | `true` | `true` |
| `LOG_LEVEL` | `debug` | `warn` | `info` | `info` | `info` |

Aturan production (`APP_ENV=production`): konfigurasi menolak start bila `ENABLE_RESET_API=true` atau `ALLOW_SIMULATION_ADAPTERS=true` tanpa tenant trial, sehingga rute reset tidak pernah terpasang (`07-security.md` 7.8).

## 11.4 Contoh `.env` (uat)

```dotenv
APP_ENV=uat
APP_VERSION=1.0.0
PROCESS_ROLE=api
PUBLIC_BASE_URL=https://los-uat.bankcontoh.co.id
DATABASE_URL=postgres://cikal_app:change-me@db:5432/cikal
DATABASE_MIGRATION_URL=postgres://cikal_owner:change-me@db:5432/cikal
S3_ENDPOINT=https://s3-uat.bankcontoh.co.id
S3_REGION=id-jkt-1
S3_BUCKET=cikal-uat
S3_ACCESS_KEY_FILE=/run/secrets/s3_access_key
S3_SECRET_KEY_FILE=/run/secrets/s3_secret_key
GOTENBERG_URL=http://gotenberg:3000
MASTER_KEY_FILE=/run/secrets/cikal_master_key
LICENSE_FILE=/etc/cikal/license.json
SESSION_COOKIE_SECURE=true
MONITORING_TOKEN_FILE=/run/secrets/monitoring_token
SMTP_HOST=smtp-uat.bankcontoh.co.id
SMTP_PORT=587
SMTP_USER=cikal
SMTP_PASSWORD_FILE=/run/secrets/smtp_password
SMTP_FROM=no-reply@bankcontoh.co.id
REGION_API_KEY_FILE=/run/secrets/oksara_key
ALLOW_SIMULATION_ADAPTERS=true
ENABLE_RESET_API=true
RESET_API_TOKEN_FILE=/run/secrets/reset_token
DEFAULT_RESET_SEED=qa
```
