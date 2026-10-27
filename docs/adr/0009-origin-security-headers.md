# ADR-0009: Header keamanan dikirim dari origin (nginx), bukan hanya mengandalkan Cloudflare

**Tanggal:** 2026-10-27 · **Status:** diusulkan

## Konteks

- TLS diterminasi di Cloudflare (keputusan Ryan, 27 Okt 2026), tetapi origin tetap bisa diakses
  langsung lewat IP VPS pada port 80 — dan pada jalur itu **tidak ada header keamanan sama sekali**.
- `nginx.conf` hanya 48 baris: `listen 80`, `gzip`, SPA fallback, proxy `/api/` dan `/mcp`. Tidak ada
  `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`,
  `Referrer-Policy`, maupun `Content-Security-Policy`.
- `helmet()` aktif untuk respons API (`apps/server/src/main.ts:37`), tetapi **dokumen HTML** dilayani
  nginx (bukan Express), jadi ketujuh header helmet tidak berlaku untuk halaman aplikasi.
- `apps/web/index.html` memuat satu `<script>` inline (inisialisasi tema pra-paint) dan satu `<style>`
  inline, serta memuat font dari `fonts.googleapis.com` / `fonts.gstatic.com`. CSP karena itu harus
  mengizinkannya secara eksplisit — kalau tidak, tema akan berkedip (FOUC) atau font gagal dimuat.

## Pilihan yang dipertimbangkan

1. **Andalkan Cloudflare saja.** Nol perubahan repo, tetapi semua proteksi hilang pada jalur langsung
   ke IP, dan konfigurasi keamanan tidak terlihat di repositori (tidak bisa ditinjau/diuji).
2. **CSP ketat tanpa `unsafe-inline`.** Paling aman, tetapi menuntut refactor: memindahkan script tema
   inline ke file eksternal justru mengembalikan FOUC yang sebelumnya diperbaiki dengan sengaja.
3. **Header di origin dengan CSP berbasis hash untuk script inline** + `style-src 'unsafe-inline'`.
   Script inline punya isi yang stabil (tidak berubah per build), sehingga hash `sha256` bisa
   dihitung sekali dan diuji; gaya inline (atribut `style` dari React/Tailwind) tetap butuh
   `unsafe-inline` karena jumlahnya banyak dan dinamis.

## Keputusan

Pilihan **3**. nginx mengirim, untuk semua respons:

- `Strict-Transport-Security: max-age=15552000` (6 bulan, **tanpa** `includeSubDomains`/`preload`
  sampai semua subdomain dipastikan HTTPS).
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`, `Permissions-Policy: geolocation=(), microphone=(), camera=()`.
- `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'sha256-<hash script tema>';
  style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self';
  form-action 'self'; object-src 'none'`.

Catatan yang disengaja: `style-src 'unsafe-inline'` diterima sebagai trade-off (dibutuhkan atribut
`style` React), dan HSTS tetap dikirim meski TLS ada di Cloudflare — header ini yang melindungi
pengunjung saat origin diakses langsung.

Tanda keputusan ini salah: konsol browser penuh pelanggaran CSP setelah deploy (gejala paling awal:
font tidak termuat, tema berkedip) → hash/daftar domain perlu dikoreksi, bukan CSP dimatikan.

## Konsekuensi

- **Lebih mudah:** konfigurasi keamanan bisa ditinjau di repo, diuji dengan `curl -I`, dan tidak
  bergantung pada pengaturan dashboard Cloudflare.
- **Lebih sulit / berutang:** hash script inline harus diperbarui bila `index.html` berubah (uji akan
  menangkapnya); CSP perlu diperluas bila menambah domain eksternal baru.
- **Harus diubah di fase berikutnya:** bila menambah analytics/embed pihak ketiga → perbarui CSP
  secara sadar, bukan melemahkan `default-src`.

## Kapan ditinjau ulang

- Bila `index.html` berubah (hash CSP), bila menambah domain eksternal (font/CDN/analytics), atau bila
  subdomain lain mulai memakai HTTPS (pertimbangkan `includeSubDomains`).
