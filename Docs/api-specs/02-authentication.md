# 2. Authentication

Login, sesi, dan logout kanal web. Mekanisme dan alur ada di [../technical-specs/09-authentication-authorization.md](../technical-specs/09-authentication-authorization.md); kontrol sesi di [../technical-specs/07-security.md](../technical-specs/07-security.md) 7.1. Modul pemilik: CORE Identity & Access ([../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md) 5.1).

## 2.1 Strategi sesi

| Hal | Kontrak |
|---|---|
| Cookie sesi | `cikal_sid`: acak 256 bit, `HttpOnly; Secure; SameSite=Strict; Path=/api`. Server menyimpan hash SHA-256 di `iam.sessions` |
| Cookie CSRF | `cikal_csrf`: acak, tidak HttpOnly, `SameSite=Strict; Path=/`. Klien menyalin nilainya ke header `X-CSRF-Token` |
| Idle | `SESSION_IDLE_MINUTES` (default 30). Setiap request terautentikasi memperbarui `lastActivityAt`. Menit ke-29 masih aktif, menit ke-30 kedaluwarsa (AC-06.03, AC-06.04) |
| Absolut | 12 jam sejak login |
| Satu sesi per channel | Login baru di channel `WEB` menghapus sesi WEB lama; request dari sesi lama mendapat `401 SESSION_REPLACED` (AC-06.05) |
| Pencabutan | Logout, user dinonaktifkan, ganti password, lisensi dicabut |
| Ganti password awal | Selama `mustChangePassword = true`, semua rute selain ganti password, sesi, dan logout mengembalikan `403 PASSWORD_CHANGE_REQUIRED` (AC-05.04) |

Klien SPA menangani `401` apa pun dengan membuang state lokal dan menampilkan halaman "Login" beserta `message` dari respons (AC-06.02, AC-06.03, AC-06.05).

## 2.2 POST /auth/login

**Purpose:** Login username dan password dari halaman "Login" (US-01).  
**Access:** Publik. Rate limit 10 request per menit per IP.  
**Idempotency:** tidak dipakai.

**Input (body)**

| field | type | required | notes |
|---|---|---|---|
| username | string | ya | 3 s.d. 50; dicocokkan tanpa membedakan huruf besar dan kecil |
| password | string | ya | maks 128 |

**Behavior**

1. Validasi skema. Field kosong: `400` dengan `details` "Username is required" dan "Password is required" (AC-01.04).
2. Cari user berdasarkan username (unik per instalasi). Tidak ditemukan: catat LoginAttempt gagal, jawab `401 INVALID_CREDENTIALS` dengan pesan yang sama persis dengan password salah (AC-01.03). Waktu respons disamakan dengan verifikasi Argon2id agar keberadaan username tidak terbaca.
3. `lockedUntil` di masa depan: `423 ACCOUNT_LOCKED`, walau password benar (AC-01.05).
4. Verifikasi Argon2id. Salah: `failedLoginCount + 1`; mencapai `LOCK_ATTEMPTS` (5) mengisi `lockedUntil = now + LOCK_MINUTES` (15) dan menjawab `423 ACCOUNT_LOCKED`; di bawahnya `401 INVALID_CREDENTIALS` (AC-01.02, AC-01.05).
5. Status `INACTIVE`: `403 ACCOUNT_INACTIVE` (AC-01.07). Status `NO_ROLE`: `403 ACCOUNT_NO_ROLE`.
6. Berhasil: `failedLoginCount = 0` (AC-01.06), hapus sesi WEB lama user, buat sesi baru, isi `lastLoginAt`, catat audit `LOGIN` dengan IP. Input berisi pola injeksi diperlakukan sebagai teks biasa lewat query terparameter (AC-01.08).

**Output 200** (+ `Set-Cookie: cikal_sid`, `Set-Cookie: cikal_csrf`)

```json
{
  "data": {
    "user": { "id": "0192b6a0-...", "username": "sales.jkt01", "fullName": "Sari Wulandari", "roleName": "Sales" },
    "company": { "companyCode": "001", "companyName": "Bank Contoh" },
    "mustChangePassword": false
  }
}
```

Bila `mustChangePassword = true`, klien membuka halaman ganti password (backlog, 2.6).

**Errors**

| code | status | condition |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Username atau password kosong (AC-01.04) |
| `INVALID_CREDENTIALS` | 401 | "Invalid username or password"; username tidak ada atau password salah (AC-01.02, AC-01.03, AC-01.08) |
| `ACCOUNT_INACTIVE` | 403 | "Your account is inactive. Please contact your administrator" (AC-01.07) |
| `ACCOUNT_NO_ROLE` | 403 | "Your account has no role yet. Please contact your administrator" (teks usulan engineering; belum ada AC) |
| `ACCOUNT_LOCKED` | 423 | "Your account is locked for 15 minutes due to too many failed attempts" (AC-01.05) |
| `RATE_LIMITED` | 429 | Lebih dari 10 request per menit dari IP yang sama |

**Traceability:** US-01; AC-01.01 s.d. AC-01.08; AC-06.05 (sesi lama dihapus).

## 2.3 POST /auth/logout

**Purpose:** Keluar lewat ikon "Logout" (US-06).  
**Access:** Sesi web aktif. Tanpa pemeriksaan hak menu.

**Input:** tanpa body. Header `X-CSRF-Token`.

**Behavior**

1. Hapus baris sesi dari `iam.sessions`; catat audit `LOGOUT`.
2. Kirim `Set-Cookie` yang mengosongkan `cikal_sid` dan `cikal_csrf` (`Max-Age=0`).
3. Sesi yang sudah tidak ada tetap dijawab `204` (logout idempoten).

**Output:** `204 No Content`. Request berikutnya dengan cookie lama mendapat `401 UNAUTHENTICATED` sehingga tombol Back dan alamat halaman langsung membawa ke "Login" (AC-06.01, AC-06.02).

**Errors:** `CSRF_TOKEN_INVALID` 403 bila header tidak cocok.

**Traceability:** US-06; AC-06.01, AC-06.02.

## 2.4 GET /auth/session

**Purpose:** Konteks sesi untuk kerangka layout SPA: identitas di header, menu sesuai hak, modul berlisensi. Dipanggil saat SPA dimuat dan setelah login.  
**Access:** Sesi web aktif.

**Behavior**

1. Validasi sesi (idle, absolut, diganti). Gagal: `401` sesuai 2.1.
2. Hitung hak efektif hari ini: gabungan RoleAccess dan UserAccess yang berlaku (`../technical-specs/09-authentication-authorization.md` 9.4).
3. Bangun pohon menu: hanya menu aktif dengan hak View, dari modul berlisensi (AC-09.02, AC-100.01).
4. Panggilan ini tidak memperbarui `lastActivityAt` bila dipanggil oleh polling latar; klien mengirim header `X-Background: true` untuk polling.

**Output 200**

```json
{
  "data": {
    "user": { "id": "0192b6a0-...", "username": "maker.01", "fullName": "Andi Pratama", "roleName": "Maker", "branchCode": "011" },
    "company": { "companyCode": "001", "companyName": "Bank Contoh", "platformCode": "01" },
    "mustChangePassword": false,
    "license": { "status": "ACTIVE", "validTo": "2027-10-20", "modules": ["CORE", "M06", "M07", "M08", "M09", "M10", "M11", "M15"] },
    "menus": [
      {
        "menuCode": "MST-PRODUCT", "menuName": "Product", "link": "/master/products", "iconName": "package",
        "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"],
        "children": []
      }
    ],
    "sessionExpiresAt": "2026-10-21T20:15:00Z",
    "idleTimeoutMinutes": 30
  }
}
```

`actions` dipakai klien untuk menampilkan atau menyembunyikan tombol; server tetap memeriksa setiap rute (AC-09.04).

**Errors:** `UNAUTHENTICATED`, `SESSION_EXPIRED`, `SESSION_REPLACED` (401).

**Traceability:** US-01 (AC-01.01 header nama, role, company); US-09 (AC-09.02); US-100 (AC-100.01, AC-100.03).

## 2.5 Perilaku sesi pada rute lain

Setiap rute terautentikasi menjalankan urutan guard berikut sebelum handler:

1. Sesi: cookie ada, hash cocok, tidak idle, tidak lewat absolut. Gagal: `401` (2.1).
2. CSRF untuk metode selain GET/HEAD.
3. `mustChangePassword`: `403 PASSWORD_CHANGE_REQUIRED`.
4. Lisensi modul pemilik rute: `403 MODULE_NOT_LICENSED`. Lisensi kedaluwarsa dan metode mengubah data: `403 LICENSE_EXPIRED`.
5. Hak menu: rute View tanpa hak View `403 ACCESS_DENIED` (AC-09.02 TRM_ACC_001); rute aksi lain tanpa hak aksi itu, termasuk bila View juga tidak ada, `403 ACTION_DENIED` (AC-09.04).
6. Konteks tenant di transaksi dari sesi (`SET LOCAL app.tenant_id`).

## 2.6 Operasi backlog (TODO)

Kontrak dirinci saat US dijadwalkan.

| Operasi | Purpose | Access | Traceability |
|---|---|---|---|
| `POST /auth/mfa/verify` | Verifikasi kode TOTP 6 digit (RFC 6238) setelah login untuk role berwenang tinggi; login mengembalikan `202 {"data":{"mfaRequired":true,"challengeId":"..."}}` tanpa cookie sesi. Salah: `401 INVALID_VERIFICATION_CODE` "Invalid verification code" | Publik dengan `challengeId` | AC-01.09, AC-01.10. Belum ada di tech spec dan kartu Sprint 1; butuh kolom secret TOTP terenkripsi di `iam.users` |
| `GET /auth/sso/{companyCode}/start` | Redirect ke IdP OIDC dengan `state` dan PKCE | Publik | US-02; AC-02.01 |
| `GET /auth/sso/callback` | Tukar code, cocokkan atau buat user `NO_ROLE`, buat sesi; batal di IdP kembali ke Login dengan "SSO login was cancelled" | Publik | US-02; AC-02.01 s.d. AC-02.05 |
| `POST /auth/password/forgot` | Kirim tautan reset ke email; respons sama untuk email ada atau tidak | Publik, 5 per jam per IP | US-03 |
| `POST /auth/password/reset` | Set password baru dari token sekali pakai | Publik dengan token | US-04; AC-04.01 |
| `POST /auth/password/change` | Ganti password; 5 password terakhir ditolak; mencabut sesi lain | Sesi aktif, diizinkan saat `mustChangePassword` | US-05; AC-05.03 s.d. AC-05.05 |
| `POST /auth/mobile/token`, `POST /auth/mobile/refresh` | JWT 15 menit + refresh token 30 hari dirotasi, channel `MOBILE` | Publik dengan kredensial / refresh token | US-92, M01 |
