# 4. Keamanan Backend dan Pengelolaan Sesi Auth

Date: 2026-08-02

## Status

Accepted

## Context

Aplikasi Jedana membutuhkan mekanisme autentikasi dan komunikasi API yang aman antara Klien Web (Vite React) dan Server Backend (NestJS) saat dideploy ke lingkungan produksi.
Sebelumnya, callback OAuth mengarahkan pengguna ke URL lokal yang ter-hardcode (`http://localhost:5173/`), belum ada pengaturan CORS yang dinamis, serta belum tersedia perlindungan rate limiting maupun pengerasan (*hardening*) header HTTP.

## Decision

Kita menerapkan konfigurasi keamanan backend berbasis Dynamic Environment Variables dan *defense-in-depth*:

1. **Dynamic CORS & Cookie Auth**: Server mengizinkan request berKredensial (`credentials: true`) hanya dari domain yang terdaftar pada `FRONTEND_URL`. Cookie JWT di-set dengan `httpOnly: true`, `secure: true` (pada mode produksi), dan `sameSite: 'lax'`.
2. **OAuth Dynamic Redirect**: Callback Google OAuth menggunakan environment variable `FRONTEND_URL` sebagai basis pengarahan (*redirect*) pasca-login.
3. **HTTP Hardening & Input Sanitization**: Menggunakan middleware `helmet` untuk proteksi header HTTP standard, `ValidationPipe` global dengan `whitelist: true` & `forbidNonWhitelisted: true` untuk sanitasi payload request DTO.
4. **Rate Limiting**: Menggunakan `@nestjs/throttler` untuk mencegah *brute-force* dan DDoS pada endpoint sensitif (`/api/auth/*` dan `/api/sync/*`).

## Consequences

- **Positif**: Fleksibilitas tinggi dalam deployment multi-domain/subdomain tanpa mengorbankan keamanan cookie authentication dan proteksi request.
- **Negatif**: Membutuhkan pengelolaan environment variable yang disiplin (`FRONTEND_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, dll.) di setiap environment deployment.
