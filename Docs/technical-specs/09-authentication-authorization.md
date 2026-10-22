# 9. Authentication and Authorization

## 9.1 Mekanisme per kanal

| Kanal | Autentikasi | Token | Rujukan |
|---|---|---|---|
| Web (SPA) | Username + password (LOCAL) atau OIDC authorization code + PKCE (SSO) | Sesi server, cookie HttpOnly + CSRF (`07-security.md` 7.1) | US-01, US-02, AU-01 |
| Mobile (M01) | Username + password atau SSO lewat browser sistem | Access token JWT 15 menit + refresh token 30 hari (dirotasi, disimpan hash di `iam.sessions` channel MOBILE) | US-92 |
| API mitra (M02) | API key per mitra ditukar token | JWT Ed25519 berumur 30 menit, klaim `tenantId` dan `partnerId` | AU-07, US-54 |
| Callback penyedia | Sesuai penyedia: API key, token, atau mTLS | Tidak ada sesi | IN-15 |
| Monitoring | `MONITORING_TOKEN` | Header Bearer | 7.8 |

## 9.2 Alur login web

```mermaid
sequenceDiagram
    participant U as Browser
    participant A as api
    participant DB as PostgreSQL
    U->>A: POST /api/v1/auth/login {username, password}
    A->>DB: cari user (username unik per instalasi), cek status dan locked_until
    A->>A: verifikasi Argon2id
    alt gagal
        A->>DB: failed_login_count + 1; kunci bila mencapai LOCK_ATTEMPTS
        A-->>U: 401 "Invalid username or password"
    else berhasil
        A->>DB: reset counter, hapus sesi WEB lama, buat sesi baru
        A-->>U: 200 + Set-Cookie cikal_sid, cikal_csrf; mustChangePassword
    end
```

Bila `must_change_password = true`, semua rute selain ganti password dan logout mengembalikan 403 `PASSWORD_CHANGE_REQUIRED` (AC-05.04).

## 9.3 Alur SSO

1. SPA memanggil `GET /api/v1/auth/sso/{companyCode}/start`; API menyimpan `state` dan `code_verifier` di sesi pra-login lalu redirect ke IdP dari `companies.sso_config`.
2. IdP memanggil `GET /api/v1/auth/sso/callback`; API menukar code, memverifikasi ID token, membaca `sub`, `email`, `name`.
3. User dicari lewat `sso_subject`; bila belum ada, dicocokkan lewat email sesuai AU-01; bila tetap tidak ada, dibuat `NO_ROLE` di company pemilik IdP (A-11, AC-02.02).
4. Batal di IdP mengembalikan pengguna ke halaman Login dengan pesan "SSO login was cancelled" (AC-02.03).

## 9.4 Model otorisasi

| Lapisan | Aturan |
|---|---|
| Hak menu | RoleAccess dan UserAccess per menu dengan lima aksi: View, Create, Update, Delete, Approve (AU-04). UserAccess berlaku `valid_from` s.d. `valid_to` inklusif |
| Gabungan | Hak efektif = gabungan hak role dan UserAccess yang berlaku hari ini |
| Lingkup data | Unit kerja user: Sales melihat pengajuannya sendiri; unit cabang melihat cabang dan sub cabang di bawahnya; role pusat melihat seluruh company (TN-02) |
| Antrean | Tugas boleh diambil user dengan role sama dengan `eligible_role_id` dan unit kerja yang mencakup cabang tugas; antrean APPROVAL ditugaskan per user dari ApprovalHierarchy |
| Pemisahan tugas | AP-07: maker bukan checker; penginput bukan approver |
| Lisensi | Menu dan rute modul tak berlisensi tidak tersedia |

## 9.5 Matriks role awal (seed)

Role dan haknya bisa diubah tenant lewat checker-maker; tabel ini adalah seed awal dari data dictionary (Menu, role awal). V = View, C = Create, U = Update, D = Delete, A = Approve.

| Menu | Super User | Admin Sistem | Maker | Checker | Sales | Customer Service | Surveyor | Verifikator | Supervisor | Risk Manager | Approver | Kepala Cabang | Admin Operasional | Auditor | Compliance Officer | QA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Company, Copy Configuration, Menu | VCUD | | | | | | | | | | | | | | | |
| User, Role, Role Access, User Access | | VCUD | | VA | | | | | | | | | | V | | |
| Master Data (produk, rute, parameter, matrix, rumus, integrasi, template, penomoran) | | | VCUD | VA | | | | | | V | | | | V | | |
| Application (Data Entry) | | | | | VCU | | | | | | | | | | | |
| Application Inquiry dan Detail | V | | | | V | V | V | V | V | V | V | V | V | V | V | V |
| Survey / LKN, Appraisal | | | | | | VU (pembayaran) | VU | | | | | | | | | |
| Prescreen Dedup, Dukcapil L1, Fraud, Verification, Credit Report Upload | | | | | | | | VU | | | | | | | | |
| Prescreen Dukcapil L2, rilis tugas orang lain | | | | | | | | | VU | | | | | | | |
| Recontest | | | | | | | | | | VU | | | | | | |
| Approval | | | | | | | | | | | VA | VA | | | | |
| Epolis, Validity Check, Print Akad, Disbursement, Process Monitoring | | | | | | | | | | | | | VU | | | |
| Dashboard, Export | | | | | | | | | | V | | V | | V | | |
| Audit Trail | | | | | | | | | | | | | | V | | |
| Screening Review (M16) | | | | | | | | | | | | | | | VU | |
| Reset State (non-production) | | | | | | | | | | | | | | | | VU |

## 9.6 Kode error autentikasi dan otorisasi

| HTTP | code | message (persis AC) |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Invalid username or password |
| 423 | `ACCOUNT_LOCKED` | Your account is locked for 15 minutes due to too many failed attempts |
| 403 | `ACCOUNT_INACTIVE` | Your account is inactive. Please contact your administrator |
| 401 | `SESSION_EXPIRED` | Your session has expired. Please log in again |
| 403 | `ACCESS_DENIED` | You do not have access to this page |
| 403 | `ACTION_DENIED` | You do not have permission to perform this action |
| 403 | `PASSWORD_CHANGE_REQUIRED` | Please change your initial password before continuing |
| 403 | `MODULE_NOT_LICENSED` | You do not have access to this page |
| 403 | `LICENSE_EXPIRED` | License has expired. The application is in read-only mode (teks usulan engineering; belum ada AC) |
