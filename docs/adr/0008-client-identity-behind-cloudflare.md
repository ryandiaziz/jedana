# ADR-0008: Identitas klien di belakang Cloudflare + nginx (dasar rate limit yang benar)

**Tanggal:** 2026-10-27 · **Status:** diusulkan

## Konteks

Topologi yang disepakati Ryan (27 Okt 2026): **TLS diterminasi di Cloudflare / reverse proxy di depan
VPS; nginx container tetap `listen 80`**. Fakta repo:

- `nginx.conf:23` mengirim `X-Real-IP $remote_addr` dan `nginx.conf:24-25` `X-Forwarded-For` /
  `X-Forwarded-Proto`. Di belakang Cloudflare, `$remote_addr` adalah IP **edge Cloudflare**, bukan IP
  pengguna; Cloudflare menyediakan `CF-Connecting-IP` dan menimpa `X-Forwarded-For`.
- Aplikasi tidak pernah memanggil `app.set('trust proxy', …)` (`grep -rn "trust proxy" apps/server/src`
  → kosong), jadi `req.ip` = IP nginx (satu IP untuk semua pengguna).
- `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])` + `APP_GUARD` (`app.module.ts:55,71`)
  membatasi **per `req.ip`**: karena semua request terlihat berasal dari satu IP, anggaran 100
  req/menit dibagi seluruh pengguna (satu klien bisa menghabiskan kuota pengguna lain).
- `/mcp` dilayani middleware Express (`main.ts:32`) sebelum route Nest dan transport microservice →
  `ThrottlerGuard` (guard Nest) **tidak berlaku**: tidak ada rate limit di `/mcp`, hanya API key.
- Port server **tidak dipublikasikan** (`docker-compose.yml`: service `server` tanpa `ports`), jadi
  header hanya bisa masuk lewat nginx container.
- Dependency `proxy-addr` punya advisory critical (IP spoofing via IPv4-mapped IPv6 trust subnet) —
  relevan bila kita memilih pendekatan `trust proxy` numerik.

## Pilihan yang dipertimbangkan

1. **`app.set('trust proxy', N)`** (N = jumlah hop). Sederhana, tetapi nilainya bergantung pada
   topologi: Cloudflare → (host proxy?) → nginx container → app. Bila topologi berubah (tambah host
   nginx, atau langsung ke container), nilai N salah tanpa gejala jelas, dan `X-Forwarded-For` bisa
   dipalsukan klien bila hop dihitung keliru.
2. **Daftar IP Cloudflare + `real_ip_header CF-Connecting-IP`** di nginx. Paling akurat, tetapi
   memerlukan pemeliharaan daftar rentang IP Cloudflare di `nginx.conf` (berubah sewaktu-waktu).
3. **nginx meneruskan identitas yang tidak bisa dipalsukan ke app**: `X-Real-IP` diisi dari
   `$http_cf_connecting_ip` bila ada, jika tidak `$remote_addr`; aplikasi memakai header itu sebagai
   kunci rate limit, bukan `req.ip`.

## Keputusan

Pilihan **3**:

- `nginx.conf`: `set $jedana_client_ip $http_cf_connecting_ip;` lalu `if` kosong → `$remote_addr`;
  kirim sebagai `X-Real-IP`. `X-Forwarded-For` dan `X-Forwarded-Proto` tetap diteruskan.
- Aplikasi: satu helper `getClientIp(req)` yang membaca `X-Real-IP` (fallback `req.ip`), dipakai
  sebagai tracker pada throttler (`getTracker`) dan sebagai kunci log.
- Rate limit berlapis:
  - `/api/*` umum: 100 req/menit per IP (nilai sekarang, kini benar per klien).
  - `/api/auth/google` + `/api/auth/google/callback`: 20 req/menit per IP.
  - `/mcp`: 120 req/menit per **API key** (hash), di middleware Express sebelum handler MCP.
- `trust proxy` **tidak** diandalkan sebagai sumber kebenaran; bila nanti diaktifkan, nilainya harus
  diturunkan dari topologi nyata dan diverifikasi dengan uji header.

## Konsekuensi

- **Lebih mudah:** rate limit per pengguna nyata; tidak perlu memelihara daftar IP Cloudflare; tidak
  mengubah apa pun di sisi Cloudflare.
- **Lebih sulit / berutang:** header `X-Real-IP` menjadi **nilai yang dipercaya**; keamanannya
  bergantung pada fakta port aplikasi tidak pernah dipublikasikan. Karena itu port server harus tetap
  tertutup, dan bila suatu saat diekspos, helper harus berhenti mempercayai header.
- **Harus diubah di fase berikutnya:** bila pindah dari Cloudflare ke LB lain, nama header berubah.

## Kapan ditinjau ulang

- Bila ada host-level proxy tambahan antara Cloudflare dan container (topologi berubah), atau
- Bila port `server` dipublikasikan (mis. untuk debugging), atau
- Bila pindah dari Cloudflare ke penyedia lain.
