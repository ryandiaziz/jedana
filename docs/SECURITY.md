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
| `JWT_SECRET` | String acak ≥ 32 karakter | `openssl rand -base64 48` | Ganti nilai di `.env` & restart server → seluruh sesi login aktif hangus (logout global). Divalidasi saat boot (fail-fast, tanpa fallback). |
| `POSTGRES_*` / `DATABASE_URL` | User & password database kuat | `openssl rand -base64 24` | Update password di Postgres, sesuaikan `.env`, lalu restart server backend. |
| `GOOGLE_CLIENT_ID` | OAuth Client ID GCP | Didapat dari Google Cloud Console | Wajib di production. Perbarui OAuth credentials di GCP Console dan konfigurasi `.env`. |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret GCP | Didapat dari Google Cloud Console | Wajib di production. Reset di GCP Console, pasang secret baru ke `.env`, lalu restart server. |
| `GOOGLE_CALLBACK_URL` | URL absolut callback backend | `https://<domain>/api/auth/google/callback` | Wajib `https://` di production. Sesuaikan Authorized redirect URIs di GCP Console dan update `.env`. |
| `FRONTEND_URL` | Origin web frontend resmi | `https://<domain>` | Wajib `https://` di production. Digunakan untuk whitelist CORS ketat dan redirect OAuth. |

*Catatan: Dilarang keras meng-commit berkas `.env` atau nilai rahasia produksi ke version control. Tidak ada fallback string default di kode maupun file konfigurasi compose (`:?`). OAuth Google hanya aktif bila ketiga variabel Google (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`) terisi lengkap; pada mode development tanpa kredensial tersebut, server tetap dapat boot normal dan route `/api/auth/google*` merespons dengan HTTP 503.*

## 3. Kontrol Keamanan Aktif

- **Validasi Environment Startup (ADR-0007 / Fase S3):** Validasi skema (Zod) saat server boot via `ConfigModule.forRoot({ validate: validateEnv })`. Menolak boot bila `JWT_SECRET` < 32 karakter atau konfigurasi produksi tidak lengkap. Semua fallback rahasia publik dihapus dari kode.
- **Aktivasi OAuth Kondisional & Proteksi Route (Fase S3b):** Provider `GoogleStrategy` didaftarkan secara kondisional hanya bila ketiga variabel Google OAuth terisi. Endpoint `/api/auth/google` dan `/api/auth/google/callback` dilindungi `GoogleConfiguredGuard` yang mengembalikan HTTP 503 saat kredensial tidak dikonfigurasi, menghindari pemakaian kredensial palsu / fallback rahasia tanpa memutus proses boot development.
- **CORS Per Environment (Fase S3):** Pada mode produksi, origin CORS dibatasi ketat hanya ke `FRONTEND_URL`. Pada mode pengembangan, origin tambahan (`localhost`, `127.0.0.1`) diizinkan.
- **Header Keamanan API:** `helmet()` terpasang di awal middleware `apps/server/src/main.ts` sebelum route MCP dan API sehingga seluruh respons (termasuk 401/429) terlindungi dan header `X-Powered-By` dihapus.
- **Pengamanan Cookie Sesi:** Cookie `auth_token` menggunakan flag `httpOnly: true`, `secure: true` (prod), `sameSite: 'lax'` di `apps/server/src/auth/auth.controller.ts:31-36`.
- **Validasi Payload:** `ValidationPipe` global dengan `whitelist: true` di `apps/server/src/main.ts`.
- **Identitas Klien & Rate Limiting Terkelola (ADR-0008 / Fase S5):**
  - Resolusi IP klien via `getClientIp` (`apps/server/src/common/client-ip.ts`) yang membaca header `X-Real-IP` tervalidasi `isIP()`. Nginx container mempertahankan IP klien asli melalui arahan `set_real_ip_from` dan `real_ip_header X-Real-IP`.
  - **Catatan & Asumsi Keamanan Kritis:** Header `X-Real-IP` hanya boleh dipercaya karena port server backend (`3000`) tidak pernah dipublikasikan ke publik (`docker-compose.yml` tidak mendefinisikan `ports` untuk service `server`). Seluruh request wajib melalui reverse proxy nginx internal kita.
  - **Rate Limiting Global API (`/api/*`):** `IpThrottlerGuard` (100 req/60s per IP klien riil) di `apps/server/src/app.module.ts`.
  - **Rate Limiting Auth (`/api/auth/google*`):** Decorator `@Throttle` khusus (20 req/60s per IP klien) untuk mitigasi DoS pada handshake OAuth.
  - **Rate Limiting MCP (`/mcp`):** Dua tahap in-memory fixed window limiter (`apps/server/src/mcp/mcp-rate-limit.ts`):
    - Stage 1 (sebelum auth): 240 req/menit per IP klien (`ip:<client-ip>`) guna mencegah banjir request tanpa kredensial.
    - Stage 2 (sesudah auth): 120 req/menit per user API key (`user:<user-id>`).
    - Mengembalikan status HTTP 429 JSON `{ error: 'Too many requests', retryAfterSeconds }` dan header `Retry-After`. Entri kedaluwarsa dibersihkan secara otomatis untuk menjaga penggunaan memori.
- **Autentikasi MCP:** Middleware validasi `Bearer jdn_...` di `apps/server/src/main.ts` & `apps/server/src/mcp/mcp-auth.ts`.
- **Proteksi Dekompresi:** Penolakan body terkompresi (`inflate: false`, limit 5MB) di `apps/server/src/main.ts` (mitigasi CVE-2026-111497).

## 4. Kontrol Akhir

Tabel berikut merangkum seluruh kontrol keamanan aktif pada monorepo Jedana hasil fase S1–S6:

| Kontrol Keamanan | Di Mana Diterapkan | Cara Verifikasi |
|---|---|---|
| Ketergantungan Bebas Kerentanan (Critical/High = 0) | Monorepo (`package-lock.json`) | `npm audit` / `bash scripts/verify-security.sh` |
| Validasi Environment & Tanpa Fallback Secret | `apps/server/src/config/env.validation.ts`, `docker-compose.yml` | Boot tanpa env / `scripts/verify-security.sh` |
| Autentikasi Google Kondisional & Fail-Closed Guard | `apps/server/src/auth/google-configured.guard.ts` | Unit test & GET `/api/auth/google` (HTTP 503 jika belum dikonfigurasi) |
| Resolusi IP Klien Riil (`X-Real-IP`) & Whitelist Hop | `apps/server/src/common/client-ip.ts`, `nginx.conf` | `scripts/verify-security.sh` & test `client-ip.spec.ts` |
| Rate Limiting API Global (`/api/*`) & Auth | `apps/server/src/common/guards/ip-throttler.guard.ts`, `auth.controller.ts` | Request berulang > 100 req/min (HTTP 429) |
| Rate Limiting Multi-Stage MCP (`/mcp`) | `apps/server/src/mcp/mcp-rate-limit.ts` | Pre-auth 240/min per IP, post-auth 120/min per user (HTTP 429) |
| Origin Security Headers (HSTS, CSP, nosniff, frame, referrer) | `deploy/nginx/jedana.my.id.conf` (Nginx Host) | `scripts/verify-security.sh` & `curl -sI https://jedana.my.id/` |
| Proteksi Helmet API & Penghapusan `X-Powered-By` | `apps/server/src/main.ts` (dipasang sebelum MCP/API) | `curl -sI https://jedana.my.id/api/health` |
| Container Server Non-Root (`USER node`, uid 1000) | `apps/server/Dockerfile` (runner stage) | `docker run --rm --entrypoint id jedana-server:sec` |
| Isolasi Port Internal (Tanpa Port Publik Backend) | `docker-compose.yml` (`server` tanpa directive `ports`) | `docker-compose config` / `scripts/verify-security.sh` |

## 5. Yang Belum Dilindungi

Meskipun postur pertahanan dasar telah diperkuat, batasan berikut belum terproteksi:

- **Tidak Ada WAF di Origin:** Bila alamat IP origin (`43.134.83.20`) diakses langsung tanpa melewati nama domain atau lapisan WAF, server menerima koneksi langsung. Belum ada mitigasi DDoS layer 7 tingkat lanjut atau filtering payload cerdas di tingkat jaringan.
- **CSP Masih Menggunakan `style-src 'unsafe-inline'`:** Kebutuhan atribut `style` inline dan class Tailwind CSS dinamis pada antarmuka frontend membuat directive CSP `style-src` tetap mengizinkan `'unsafe-inline'` (meskipun `script-src` telah diamankan tanpa `'unsafe-inline'` dan dikunci dengan hash SHA-256).
- **Rate Limit In-Memory (Hilang Saat Restart & Single-Instance):** Data bucket rate limit (`IpThrottlerGuard` dan `mcp-rate-limit.ts`) disimpan dalam memori proses Node.js. Bucket akan ter-reset saat container restart dan tidak tersinkronisasi jika server dijalankan lebih dari 1 instance (memerlukan store terdistribusi seperti Redis bila scale-out).
- **Token JWT Tidak Bisa Dicabut Per-Sesi (Stateless 7 Hari):** Token JWT berumur 7 hari dan divalidasi stateless. Belum ada mekanisme pembatalan (*revocation list* / token blacklisting) per-sesi; logout pada klien hanya menghapus penyimpanan lokal, sedangkan token tetap valid di sisi server hingga masa kedaluwarsa habis atau `JWT_SECRET` dirotasi secara global.
- **State Parameter OAuth Google Dinamis:** Parameter `state` acak anti-CSRF pada handshake OAuth Google belum diintegrasikan dengan validasi session cookie/nonce dinamis.

## 6. Cara Memeriksa Postur Keamanan

Jalankan skrip verifikasi dari root repositori:

```bash
# Verifikasi ketat / gate CI (default: mode strict — seluruh cek blocking)
bash scripts/verify-security.sh

# Laporan postur keamanan repo (mode non-blocking, exit 0)
bash scripts/verify-security.sh --report

# Verifikasi fungsional web app & unit test
bash scripts/verify-web.sh
```
