# ADR-0007: Rahasia produksi divalidasi saat boot (gagal-cepat, tanpa nilai cadangan)

**Tanggal:** 2026-10-27 · **Status:** diusulkan

## Konteks

Fakta terukur (27 Okt 2026, `development` @ `7c46a7e`):

- `apps/server/src/auth/auth.module.ts:17` dan `apps/server/src/auth/jwt.strategy.ts:21` memakai
  `process.env.JWT_SECRET || 'fallback-secret'`. Bila env tidak terpasang, proses tetap boot dan
  **semua token ditandatangani dengan string yang ada di repo publik**.
- `docker-compose.yml:20` memberi default `JWT_SECRET:-change_this_secret_in_production`, jadi
  deploy tanpa `.env` tetap "berhasil" dengan rahasia yang diketahui publik.
- `apps/server/src/auth/google.strategy.ts:19-22` memakai default `missing-client-id` /
  `missing-secret` / `http://localhost:3000/...` — OAuth tampak aktif walau belum dikonfigurasi.
- Runtime produksi: `NODE_ENV=production` di `apps/server/Dockerfile:27` dan `docker-compose.yml:13`.
- `.env` lokal: `JWT_SECRET` ada, panjang **24** karakter (di bawah 32 byte yang lazim untuk HS256).
- Belum ada validasi env terpusat; `@nestjs/config@^4.0.4` dan `zod@^4.5.4` sudah menjadi dependency
  (tidak perlu menambah paket baru).
- Diverifikasi ulang saat implementasi (27 Okt 2026): validasi Zod boot aktif dan docker-compose mensyaratkan JWT_SECRET via :? tanpa fallback.

## Pilihan yang dipertimbangkan

1. **Status quo (fallback string).** Nol pekerjaan, tetapi rahasia publik = siapa pun bisa membuat
   token yang diterima server. Risiko tertinggi, biaya perbaikan terendah.
2. **Generate acak saat boot bila kosong.** Deploy tidak pernah gagal, tetapi semua sesi hilang setiap
   restart dan multi-replica mustahil. Menyembunyikan salah konfigurasi.
3. **Gagal-cepat: validasi env saat boot, tanpa nilai cadangan di production.** Deploy tanpa rahasia
   berhenti dengan pesan jelas. Biaya: satu kali menyiapkan `.env` di VPS.

## Keputusan

Pilihan **3**, diterapkan lewat validasi skema (zod) di `ConfigModule.forRoot({ validate })`:

- Selalu wajib: `JWT_SECRET` (≥ 32 karakter), `DATABASE_URL` atau kombinasi `POSTGRES_*`.
- Wajib hanya saat `NODE_ENV === 'production'`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_CALLBACK_URL` (https), `FRONTEND_URL` (https).
- Tidak ada fallback string di kode. `docker-compose.yml` memakai `${JWT_SECRET:?...}`.
- Dev/test boleh memakai nilai pendek yang eksplisit, tetapi **bukan** rahasia dari repo: test
  menyetel `JWT_SECRET` sendiri (sudah dilakukan `jwt.strategy.spec.ts:13-21`).

Tanda keputusan ini salah: container production gagal boot setelah deploy padahal `.env` sudah ada
(berarti nama variabel/skema terlalu ketat) — gejalanya muncul langsung di log, bukan diam-diam.

## Konsekuensi

- **Lebih mudah:** salah konfigurasi ketahuan saat deploy, bukan saat insiden; tidak ada jalur "token
  publik".
- **Lebih sulit / berutang:** rotasi `JWT_SECRET` = semua sesi logout (HS256, tanpa `kid`). Ganti
  rahasia harus diumumkan; belum ada rotasi mulus.
- **Harus diubah di fase berikutnya:** bila butuh banyak instance server atau rotasi tanpa logout →
  pindah ke RS256 + `kid` (ADR baru).

## Kapan ditinjau ulang

- Bila server dijalankan lebih dari satu replica, atau
- Bila rotasi rahasia tanpa logout seluruh pengguna mulai dibutuhkan, atau
- Bila OAuth dari lebih dari satu domain (mis. staging) → skema env perlu `GOOGLE_*` per environment.
