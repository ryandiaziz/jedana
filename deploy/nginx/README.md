# Panduan Konfigurasi Nginx Host (TLS & Security Headers)

Direktori ini memuat template konfigurasi vhost untuk Nginx di sisi **host** (Ubuntu 1.24.0) yang bertindak sebagai TLS terminator untuk `jedana.my.id`.

Konfigurasi ini menerapkan arsitektur header tunggal untuk app shell HTML sesuai **[ADR-0009](../../docs/adr/0009-origin-security-headers.md)**.

---

## 1. Langkah 0 Wajib: Cek Konfigurasi Eksisting di Server

Sebelum menyalin atau menimpa konfigurasi, periksa vhost yang sedang aktif di VPS:

```bash
cat /etc/nginx/sites-available/jedana.my.id.conf
# atau
nginx -T | grep -A 30 "server_name jedana.my.id"
```

> [!IMPORTANT]
> **Tentukan rute root `/`:** Di server, pastikan apakah `/` dilayani langsung dari disk (`root /var/www/...`) atau diproksi ke `http://127.0.0.1:8090` (container web).
>
> Respons produksi hanya menampilkan satu header `Server: nginx/1.24.0 (Ubuntu)`. Blok header keamanan dipasang di level `server` sehingga berlaku untuk kedua model routing, tetapi blok `location /` wajib disalin atau disesuaikan dari config yang **sedang berjalan di server**, bukan ditimpa mentah-mentah jika server melayani file statis langsung dari host.

---

## 2. Cara Pemasangan di VPS

1. **Salin template konfigurasi ke host:**
   ```bash
   sudo cp deploy/nginx/jedana.my.id.conf /etc/nginx/sites-available/jedana.my.id.conf
   ```

2. **Aktifkan vhost via symlink (jika belum ada):**
   ```bash
   sudo ln -sf /etc/nginx/sites-available/jedana.my.id.conf /etc/nginx/sites-enabled/jedana.my.id.conf
   ```

3. **Uji sintaks Nginx:**
   ```bash
   sudo nginx -t
   ```

4. **Reload service Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

---

## 3. Peringatan Penting & Arsitektur Header

### A. Larangan Duplikasi Header di Container
**Jangan** menambahkan header keamanan (`Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, dll.) ke `nginx.conf` di dalam container `jedana_web`.
Nginx tidak melakukan deduplikasi header; jika kedua lapisan mengirim `add_header`, browser akan menerima header ganda atau nilai ganda yang dapat memicu anomali parsing.

### B. Pewarisan Directive `add_header` Nginx
Pada Nginx, jika sebuah blok `location` memiliki instruksi `add_header` sendiri, seluruh `add_header` di level `server` **tidak diwariskan** ke `location` tersebut.
Bila di kemudian hari ditambahkan blok `location` baru yang mendefinisikan `add_header`, blok header keamanan wajib diulang di dalam `location` tersebut.

### C. Konfigurasi HSTS & CSP
- **HSTS:** Menggunakan `max-age=31536000; includeSubDomains` agar konsisten dengan header HSTS yang dikirim Helmet pada backend API (`/api`). **Tanpa** flag `preload`.
- **CSP (Content Security Policy):**
  - Menggunakan hash SHA-256 spesifik untuk inline script tema pada `apps/web/index.html`.
  - Dilarang menambahkan `'unsafe-inline'` pada `script-src`.
  - Mengizinkan font dari `https://fonts.gstatic.com`.
  - Jika inline script di `apps/web/index.html` diperbarui, jalankan `scripts/verify-security.sh --strict` untuk memvalidasi hash baru.

---

## 4. Cara Verifikasi Setelah Deployment

Jalankan perintah pengujian berikut dari luar / terminal klien:

### Verifikasi Respons Header Root (`/`)
```bash
curl -sI https://jedana.my.id/ | grep -Ei "strict-transport|content-security|x-frame|referrer|nosniff|permissions-policy"
```
*Harapan:* Seluruh keenam header keamanan muncul pada respons HTML.

### Verifikasi Header API (`/api/health`)
```bash
curl -sI https://jedana.my.id/api/health | grep -Ei "x-powered-by" && echo "MASIH BOCOR" || echo "X-Powered-By hilang"
```
*Harapan:* `X-Powered-By hilang` (tidak ada output header X-Powered-By).

### Verifikasi Header MCP (`/mcp`)
```bash
curl -sI -X POST https://jedana.my.id/mcp | grep -Ei "content-security|nosniff" | head -3
```
*Harapan:* Request ditolak (401 Unauthorized) namun tetap dilindungi header Helmet.

---

## 5. Checklist Verifikasi Manual (Browser)

1. Buka `https://jedana.my.id` di Google Chrome / Firefox.
2. Buka DevTools Console (`F12` / `Ctrl+Shift+I`).
3. Verifikasi:
   - **Tidak ada** pesan pelanggaran CSP (*Content Security Policy violation*).
   - Inisialisasi tema instan tanpa kedip (*flash of unstyled content* / FOUC).
   - Tipografi `Plus Jakarta Sans` dan `JetBrains Mono` termuat sempurna dari Google Fonts.
