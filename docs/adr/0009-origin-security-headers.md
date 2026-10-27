# ADR-0009: Header keamanan dokumen HTML dikirim nginx host (satu sumber), helmet tetap untuk API

**Tanggal:** 2026-10-27 · **Status:** diusulkan

## Konteks

Bukti produksi, diambil 27 Okt 2026 05:49 UTC dengan `curl -D -` ke `https://jedana.my.id`:

| Permintaan | Header keamanan yang terlihat |
|---|---|
| `GET /` (dokumen HTML) | **tidak ada sama sekali** — hanya `Server`, `Date`, `Content-Type`, `Content-Length`, `Last-Modified`, `ETag`, `Accept-Ranges` |
| `GET /api/health` | `Content-Security-Policy` (default helmet), `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Origin-Agent-Cluster` |
| `POST /mcp` (tanpa key → 401) | **tidak ada header helmet sama sekali**, dan `X-Powered-By: Express` bocor |

Penyebabnya terbaca di repo:

- `helmet()` dipasang di `apps/server/src/main.ts:37`, sedangkan middleware MCP dipasang lebih dulu di
  `main.ts:32`. Request yang berhenti di 401 (MCP) tidak pernah melewati helmet, dan `X-Powered-By` tidak
  dihapus.
- Dokumen HTML tidak dilayani Express, jadi helmet **tidak akan pernah** menyentuhnya — harus dari nginx.
- HSTS dari helmet hanya menempel pada respons API. HSTS berlaku per-host setelah diterima browser, jadi
  perilakunya bergantung pada apakah browser kebetulan memanggil `/api` lebih dulu — tidak deterministik.
- `apps/web/index.html:13-38` memuat script tema inline; baris 39-56 style inline; font dimuat dari
  `fonts.googleapis.com` / `fonts.gstatic.com`.

## Pilihan yang dipertimbangkan

1. **Andalkan helmet saja.** Tidak mungkin: HTML tidak melewati Express (bukti di tabel).
2. **Header di nginx container (`nginx.conf` di repo) saja.** Semua respons HTML lewat container nginx,
   jadi berfungsi dan bisa ditinjau; tetapi hop TLS ada di nginx host, sehingga HSTS berasal dari komponen
   yang tidak memegang sertifikat — membingungkan saat audit.
3. **Header di nginx host saja** (config hanya di server, di luar repo). Berfungsi, tetapi konfigurasi
   keamanan tidak bisa ditinjau/diuji dari repositori — persis masalah yang membuat temuan ini terlambat
   terlihat.
4. **Hibrida terkontrol:** header dokumen HTML + HSTS di **nginx host**, dipelihara sebagai template di
   repo (`deploy/nginx/jedana.my.id.conf`); helmet tetap untuk API; `helmet()` dipindah ke **sebelum** mount
   `/mcp` agar tidak ada jalur yang lolos.

## Keputusan

Pilihan **4**:

- **nginx host** mengirim untuk semua respons:
  `Strict-Transport-Security: max-age=31536000; includeSubDomains` (tanpa `preload`; `includeSubDomains`
  dipertahankan karena sudah dikirim helmet dan `*.jedana.my.id` tidak dipakai),
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: geolocation=(), microphone=(), camera=()`, dan `Content-Security-Policy`:
  `default-src 'self'; script-src 'self' 'sha256-<hash script tema>'; style-src 'self' 'unsafe-inline';
  font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self';
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`.
- Config tersebut **disimpan di repo** sebagai `deploy/nginx/jedana.my.id.conf` (template + komentar cara
  pasang ke `/etc/nginx/sites-available/`). Perubahan header ditinjau lewat PR, bukan lewat SSH.
- **helmet tetap aktif** untuk respons API (defense-in-depth), tetapi `helmet()` dipindah ke awal bootstrap
  (sebelum middleware `/mcp`) sehingga `/mcp` tidak lagi bocor `X-Powered-By` dan ikut mendapat header.
  Duplikasi HSTS (helmet + nginx host) diterima: nilainya searah dan HSTS bersifat monoton.
- CSP: `style-src 'unsafe-inline'` diterima (atribut `style` React/Tailwind), `script-src` **tidak boleh**
  `unsafe-inline`; hash dihitung dari `apps/web/index.html` dan dijaga cek otomatis di
  `scripts/verify-security.sh`.

## Konsekuensi

- **Lebih mudah:** satu sumber header dokumen yang bisa ditinjau di repo; HSTS deterministik untuk semua
  respons; `X-Powered-By` hilang.
- **Lebih sulit / berutang:** dua lapisan header (nginx host untuk HTML/HSTS, helmet untuk API) harus dijaga
  agar tidak bertentangan; `index.html` berubah → hash CSP dihitung ulang (ada cek-nya).
- **Harus diubah di fase berikutnya:** bila menambah domain eksternal (analytics) → perluas CSP secara
  sadar; bila memasang CDN → verifikasi ulang header di edge.

## Kapan ditinjau ulang

- `index.html` berubah (hash CSP), menambah domain eksternal, memasang CDN, atau ada subdomain baru yang
  belum siap HTTPS (pertimbangkan mencabut `includeSubDomains`).
