# Cikal LOS: Code Review Checklist

**Version:** 1.0  
**Date:** 2026-10-22  
**Author:** Tech Lead PPU  
**Status:** Active  
**Phase:** POC  

Checklist untuk setiap PR. Setiap butir dijawab ya atau menjadi temuan. Setiap butir menunjuk aturan di [CODING_STANDARD.md](CODING_STANDARD.md); butir tanpa aturan pendukung tidak boleh ditambahkan di sini.

## 0. Gate otomatis (cukup cek hijau)

CI dan hook sudah memeriksa butir ini. Reviewer hanya memastikan check PR hijau.

- [ ] `pnpm check` hijau di CI: Biome, typecheck, test, build (§1.1, §1.8, §13)
- [ ] Tidak ada `any` (§1.2)
- [ ] Impor antar modul hanya lewat `index.ts` (§3.3)
- [ ] Setiap rute punya `@Public`, `@Authenticated`, atau `@Requires` (§7.1)
- [ ] Lockfile sinkron dan versi persis (§11.1)

## 1. Cakupan

- [ ] PR menyelesaikan satu kartu; judul dan branch memuat ID kartu (§12.1, §12.2, §12.3)
- [ ] Deskripsi PR mencantumkan AC yang dibuktikan, penundaan, migrasi destruktif, env baru, dan dependensi baru bila ada (§12.3)
- [ ] Perubahan lintas modul hanya lewat antarmuka publik modul lain (§3.3)

## 2. Arsitektur dan lapisan

- [ ] Controller hanya memvalidasi lewat DTO kontrak, memanggil satu use case, dan mengembalikan hasil (§3.5)
- [ ] Query Drizzle hanya di `db/*.repository.ts`; `domain/` tanpa I/O; query `pg` mentah hanya di `platform/` (§3.6, §1.2)
- [ ] Tidak ada baca atau tulis ke tabel skema modul lain; foreign key mengikuti XM-05 (§3.4)
- [ ] Skema request dan response baru ada di `packages/contracts`, tidak didefinisikan ulang di app (§3.7)
- [ ] Efek samping lintas modul lewat outbox di transaksi yang sama (§3.8)
- [ ] `packages/formula` tetap tanpa NestJS, database, atau I/O (§3.9)
- [ ] Frontend: `fetch` hanya di `lib/api/client.ts`, respons divalidasi skema, rute tidak memanggil API langsung (§3.10)
- [ ] Tidak ada file sumber di atas 300 baris; pemecahan menurut tanggung jawab, bukan ke `utils` (§4.1, §4.2)

## 3. Kebenaran dan keamanan

- [ ] Tidak ada `as` (selain `as const`) atau `!` di kode produksi (§1.2)
- [ ] Data dari luar proses dipersempit dengan Zod atau type guard (§1.3)
- [ ] Tipe yang punya skema diturunkan dengan `z.infer` (§1.4)
- [ ] Fungsi yang diekspor dari `apps/api` dan `packages/*` punya tipe return (§1.5)
- [ ] Uang dan persen memakai string desimal, `decimal.js`, dan `numeric`; tidak ada `number` untuk uang (§1.7)
- [ ] Error yang diketahui dilempar sebagai `DomainError` dengan kode dari spec (§5.1)
- [ ] Pesan ke pengguna sama persis dengan teks AC (§5.2)
- [ ] Tidak ada `catch` yang menelan error atau hanya mencatat log (§5.4)
- [ ] Akses tabel ber-`tenant_id` lewat `withTenantTx`; tenant tidak dari parameter request (§6.1)
- [ ] Penulisan multi langkah dalam satu transaksi, termasuk outbox, enqueue, dan audit (§6.2)
- [ ] `process.env` tidak dibaca di luar `platform/config` dan pengecualian di §8.1 (§8.1)
- [ ] Tidak ada secret di kode, log, pesan error, atau URL (§8.2)

## 4. Database dan API

- [ ] Migrasi baru hasil `db:generate`; migrasi yang sudah di-merge tidak diedit (§6.3)
- [ ] Migrasi hanya menambah, atau penghapusan ditandai sebagai destruktif di PR (§6.4)
- [ ] Seed idempoten dan berada di lapisan yang tepat (§6.5)
- [ ] Alamat, envelope, paging, checker-maker, dan `Idempotency-Key` sesuai api-specs 01, atau spec ikut diubah (§7.2)
- [ ] Env baru tercatat di `config.ts`, `.env.example`, tech 11, dan DEPLOYMENT_PLAN §3.5 (§8.3)

## 5. Test

- [ ] Setiap AC kartu punya test yang menyebut ID AC di namanya (§9.2)
- [ ] Setiap kode error endpoint punya test status, `code`, dan pesan (§9.3)
- [ ] Kartu wiring punya spec Playwright (§9.4)
- [ ] Repository dan use case diuji dengan PostgreSQL asli; hanya adapter pihak ketiga yang diganti (§9.5)
- [ ] Test berada di lokasi yang benar: unit di sebelah source, lintas modul di `apps/api/test/` (§9.1)

## 6. Kebersihan, dependensi, dan riwayat

- [ ] Tidak ada angka atau string ajaib (§10.1)
- [ ] Tidak ada kode mati atau kode yang dikomentari (§10.2)
- [ ] Nama file dan identifier mengikuti pola; komentar menjelaskan alasan dalam bahasa Indonesia (§2.1, §2.2, §10.4)
- [ ] Tidak ada `TODO`/`FIXME`; penundaan menyebut ID kartu yang ada di TASK_BREAKDOWN (§10.3)
- [ ] Dependensi baru diberi alasan dan tidak ada di daftar larangan; paket framework satu versi (§11.2, §11.3)
- [ ] Pesan commit mengikuti format dan hook tidak dilewati (§12.1, §12.4)
