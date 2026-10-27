# ADR-0008: Identitas klien di belakang nginx host (TLS Let's Encrypt), tanpa CDN

**Tanggal:** 2026-10-27 (revisi; menggantikan versi "Cloudflare" di hari yang sama) · **Status:** diusulkan

## Konteks

Topologi produksi **terverifikasi dari luar** pada 27 Okt 2026 (bukan asumsi):

- `jedana.my.id` → `43.134.83.20` (A record aktif). `jedana.app` **tidak pernah ada** — string itu hanya
  contoh URL di dokumentasi lama (sudah diperbaiki di `docs/MCP.md` baris 170/186 dan `.env.example`).
- TLS: sertifikat Let's Encrypt `CN=jedana.my.id`, berlaku 2 Sep 2026 – **1 Des 2026**, SAN hanya
  `jedana.my.id`. Diterminasi **nginx host** (`Server: nginx/1.24.0 (Ubuntu)`), **bukan** Cloudflare —
  tidak ada header `cf-ray`/`cf-cache-status` pada respons.
- Rantai: klien → nginx host (TLS) → `127.0.0.1:8090` (vhost proxy) → container `jedana_web` (`:80`) →
  `jedana_server:3000`. Ini **satu hop proxy lebih banyak** daripada asumsi "Cloudflare → nginx container".
- Aplikasi tidak pernah memanggil `app.set('trust proxy', …)` → `req.ip` = IP container nginx untuk semua
  klien. Di belakang rantai ini, `ThrottlerModule` (60 s / 100 req, `app.module.ts:55,71`) membagi **satu
  ember** ke seluruh pengguna.
- `/mcp` dilayani middleware Express (`main.ts:32`) sebelum route Nest dan transport microservice →
  `ThrottlerGuard` tidak berlaku; tidak ada rate limit di `/mcp` (terverifikasi di produksi: 1 request
  tanpa API key → 401 `{"error":"Missing or invalid API key"}`, tanpa header limit apa pun).
- `nginx.conf` (container) sudah mengirim `X-Real-IP $remote_addr`, `X-Forwarded-For`,
  `X-Forwarded-Proto`; nginx host melakukan hal yang sama untuk hop berikutnya (`docs/MCP.md` §6 memuat
  contohnya).
- Karena tidak ada CDN, `$remote_addr` di nginx host **adalah IP klien sebenarnya** — tidak perlu
  `CF-Connecting-IP`, tidak perlu `real_ip_header`, tidak ada daftar IP edge untuk dipelihara.
- Diverifikasi ulang saat implementasi (27 Okt 2026): getClientIp tervalidasi via net.isIP, Throttler dan MCP rate limit aktif dengan kunci IP riil.

## Pilihan yang dipertimbangkan

1. **`app.set('trust proxy', N)` numerik.** Nilai N bergantung pada jumlah hop (2 saat ini: nginx host +
   nginx container). Rapuh: menambah/menghapus satu proxy membuat kuota salah tanpa gejala jelas, dan
   menambah ketergantungan pada `proxy-addr` (advisory critical, dibereskan di S2).
2. **Mempercayai `X-Forwarded-For` mentah.** Paling mudah dipalsukan: `$proxy_add_x_forwarded_for`
   **menambahkan** IP kiriman klien, jadi nilai paling kiri bukan bukti.
3. **Header tunggal yang ditulis hop milik kita sendiri** (`X-Real-IP`), dibaca aplikasi sebagai identitas
   klien, dengan syarat port aplikasi tidak dapat dijangkau publik.

## Keputusan

Pilihan **3**:

- `getClientIp(req)` membaca **`X-Real-IP`** (divalidasi `node:net` `isIP`), fallback `req.ip`, lalu
  `socket.remoteAddress`.
- Header itu ditulis oleh nginx yang kita kontrol (host: `$remote_addr`; container: `$remote_addr` dari hop
  host). Aplikasi **tidak** mempercayai `X-Forwarded-For` untuk keputusan keamanan.
- Syarat yang mengikat: `jedana_web` hanya dipublikasikan di **127.0.0.1:8090** (wajib diverifikasi di
  server sebelum fase S5 di-merge). Bila port itu terbuka ke publik, header bisa dipalsukan dan ADR ini
  batal.
- Kunci rate limit: `/api/*` 100 req/menit per IP klien; `/api/auth/google*` 20 req/menit per IP;
  `/mcp` 240 req/menit per IP **sebelum** auth + 120 req/menit per user API key **sesudah** auth.
- Bila kelak memasang CDN, **nginx host** yang diubah untuk mengisi `X-Real-IP` dari header CDN
  (`CF-Connecting-IP`), bukan aplikasi. Aplikasi tetap membaca satu header yang sama.

## Konsekuensi

- **Lebih mudah:** tidak ada angka hop yang ditebak; menambah lapisan proxy cukup diubah di nginx.
- **Lebih sulit / berutang:** keakuratan bergantung pada binding `127.0.0.1:8090`; header menjadi nilai yang
  dipercaya (wajib dicatat di `docs/SECURITY.md`).
- **Harus diubah di fase berikutnya:** bila ada CDN/host proxy tambahan, atau bila port 8090 dibuka.

## Kapan ditinjau ulang

- Saat memasang Cloudflare/CDN, menambah host proxy, atau saat binding `127.0.0.1:8090` berubah menjadi
  publik. Verifikasi ulang: dari host lain, kirim request dengan `X-Real-IP` palsu langsung ke port 8090 —
  bila diterima, ADR ini tidak lagi sah.
