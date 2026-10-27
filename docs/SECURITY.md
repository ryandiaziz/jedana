# Kebijakan & Postur Keamanan Jedana

Dokumen ini mendefinisikan model ancaman, rahasia wajib produksi, kontrol keamanan aktif, serta rencana mitigasi pada monorepo Jedana.

## 1. Model Ancaman Ringkas

- **Aset Dilindungi:** Catatan transaksi & saldo keuangan, token sesi autentikasi (`auth_token`), kredensial API key MCP.
- **Aktor:** Pengguna anonim (tamu), pengguna terotentikasi (Google OAuth), dan klien MCP (asisten AI/agent eksternal).
- **Permukaan Serangan:**
  - Browser (SPA Vite): manipulasi DOM, eksfiltrasi data via XSS, skrip pihak ketiga.
  - REST API (`/api`): manipulasi payload, injeksi query, brute force, dan bypass autentikasi.
  - SSE/Streamable HTTP (`/mcp`): eksfiltrasi data via prompt injection atau akses agent tanpa otorisasi.
  - Penyimpanan Lokal (IndexedDB): pencurian data finansial offline bila perangkat fisik/browser terkompromi.

## 2. Rahasia Wajib Produksi

| Variabel | Kriteria / Panjang | Cara Pembuatan | Dampak & Cara Rotasi |
|---|---|---|---|
| `JWT_SECRET` | String acak ≥ 32 karakter | `openssl rand -base64 48` | Ganti nilai di `.env` & restart server → seluruh sesi login aktif hangus (logout global). |
| `POSTGRES_*` / `DATABASE_URL` | User & password database kuat | `openssl rand -base64 24` | Update password di Postgres, sesuaikan `.env`, lalu restart server backend. |
| `GOOGLE_CLIENT_ID` | OAuth Client ID GCP | Didapat dari Google Cloud Console | Perbarui OAuth credentials di GCP Console dan konfigurasi `.env`. |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret GCP | Didapat dari Google Cloud Console | Reset di GCP Console, pasang secret baru ke `.env`, lalu restart server. |
| `GOOGLE_CALLBACK_URL` | URL absolut callback backend | `https://<domain>/api/auth/google/callback` | Sesuaikan Authorized redirect URIs di GCP Console dan update `.env`. |
| `FRONTEND_URL` | Origin web frontend resmi | `https://<domain>` | Ubah di `.env` untuk sinkronisasi CORS dan pengarahan redirect OAuth. |

*Catatan: Dilarang keras meng-commit berkas `.env` atau nilai rahasia produksi ke version control.*

## 3. Kontrol Keamanan Aktif

- **Header Keamanan API:** `helmet()` terpasang di `apps/server/src/main.ts:37`.
- **Pengamanan Cookie Sesi:** Cookie `auth_token` menggunakan flag `httpOnly: true`, `secure: true` (prod), `sameSite: 'lax'` di `apps/server/src/auth/auth.controller.ts:31-36`.
- **Validasi Payload:** `ValidationPipe` global dengan `whitelist: true` di `apps/server/src/main.ts:53-59`.
- **Rate Limiting Global:** `@nestjs/throttler` (100 req/60s) di `apps/server/src/app.module.ts:55-60`.
- **Autentikasi MCP:** Middleware validasi `x-api-key` di `apps/server/src/main.ts:32` & `apps/server/src/mcp/mcp-auth.ts`.
- **Proteksi Dekompresi:** Penolakan body terkompresi (`inflate: false`, limit 5MB) di `apps/server/src/main.ts:19-20` (mitigasi CVE-2026-111497).

## 4. Kontrol yang Belum Ada (Rencana Mitigasi)

- **Validasi Environment Startup (Fase S3):** Validasi ketat variabel env untuk mencegah fallback hardcoded secret dan startup dengan env kosong.
- **State Parameter OAuth (Fase S4):** Penggunaan random `state` nonce untuk mencegah serangan CSRF pada flow OAuth Google.
- **Client IP & MCP Throttling (Fase S5):** Helper `getClientIp` di balik reverse proxy dan rate limiting khusus untuk endpoint `/mcp`.
- **Container Hardening & Origin Headers (Fase S6):** User non-root (`USER`) pada container runner `Dockerfile` dan header origin lengkap (`HSTS`, `CSP`, `X-Frame-Options`, dll.) pada `nginx.conf`.

## 5. Cara Memeriksa Postur Keamanan

Jalankan skrip verifikasi dari root repositori:

```bash
# Laporan postur keamanan repo (mode laporan, exit 0)
bash scripts/verify-security.sh

# Verifikasi ketat / gate CI (exit 1 jika ada temuan keamanan)
bash scripts/verify-security.sh --strict

# Verifikasi fungsional web app & unit test
bash scripts/verify-web.sh
```
