# Production Deployment Runbook — Jedana

> [!NOTE]
> Panduan ini adalah alat bantu eksekusi manual untuk Ryan di VPS (`jedana.my.id`). Deployment **tidak** dijalankan secara otomatis oleh CI atau oleh AI agent.

## 1. Prasyarat di Server (VPS)

Sebelum mengeksekusi deployment, pastikan hal-hal berikut telah terpenuhi di host VPS:
1. **Repositori:** Terkloning di `/var/www/jedana` (atau path kerja repo), berada pada branch `development`, dan working tree bersih tanpa uncommitted changes.
2. **Environment File (`.env`):** Berada di root repositori dengan variabel wajib terisi:
   - `JWT_SECRET`: String acak minimal 32 karakter (buat via `openssl rand -base64 48`).
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Kredensial OAuth produksi Google Cloud Console.
   - `GOOGLE_CALLBACK_URL`: Harus diawali `https://` (`https://jedana.my.id/api/auth/google/callback`).
   - `FRONTEND_URL`: Harus diawali `https://` (`https://jedana.my.id`).
   - Kredensial PostgreSQL (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`).
3. **Docker Network:** Jaringan eksternal `shared_net` sudah dibuat (`docker network inspect shared_net` atau `docker network create shared_net`).
4. **Hak Akses:** User memiliki izin `sudo` untuk menguji sintaks Nginx dan me-reload service (`sudo nginx -t && sudo systemctl reload nginx`).

## 2. Alur Deployment

Jalankan seluruh perintah dari root direktori repositori:

```bash
# 1. Jalankan pra-pemeriksaan (read-only, aman dijalankan kapan pun)
./scripts/deploy-production.sh --check

# 2. Perbaiki temuan bila ada item FAIL (lihat tabel pesan error di bawah)

# 3. Eksekusi deployment penuh
./scripts/deploy-production.sh --deploy

# 4. Catat commit yang terpasang untuk audit trail
git rev-parse HEAD
```

Tahapan yang dijalankan otomatis oleh `./scripts/deploy-production.sh --deploy`:
1. Memvalidasi seluruh checklist `--check` (berhenti jika ada kegagalan).
2. Menandai image aktif saat ini untuk rollback (`jedana-server:rollback-<timestamp>`, `jedana-web:rollback-...`).
3. Membangun image baru (`docker compose build server web`) dan meluncurkannya (`docker compose up -d`).
4. Memeriksa kesiapan service via polling `curl -fsS http://127.0.0.1:8090/api/health` maks 90 detik. Jika gagal, rollback otomatis langsung dieksekusi.
5. Membackup vhost lama di `/etc/nginx/sites-available/jedana.my.id.conf`, menyalin template dari `deploy/nginx/jedana.my.id.conf`, symlink ke `sites-enabled`, uji sintaks `nginx -t`, dan reload Nginx host.
6. Memverifikasi hasil deployment: keberadaan 6 security header di `/`, ketiadaan `X-Powered-By` di `/api/health`, UID non-root 1000 di kontainer server, dan respons 401 di POST `/mcp`.

## 3. Rollback Manual & Arti Pesan Error

Bila terjadi kendala operasional setelah rilis, jalankan rollback manual:

```bash
./scripts/deploy-production.sh --rollback
```

Langkah yang dijalankan: menghentikan kontainer (`docker compose down`), men-tag ulang image rollback terakhir menjadi `:latest`, menyalakan ulang kontainer (`docker compose up -d`), serta memulihkan file backup vhost Nginx host lalu reload.

### Arti Pesan Error & Solusi

| Pesan Error | Penyebab | Solusi |
| :--- | :--- | :--- |
| `[FAIL] JWT_SECRET len=NN (< 32 characters)` | Panjang rahasia JWT kurang dari 32 karakter | Generate ulang: `openssl rand -base64 48`, lalu masukkan ke `.env` |
| `[FAIL] ... must start with https://` | Skema URL di `.env` masih `http://` | Ganti protokol menjadi `https://jedana.my.id...` di `.env` |
| `[FAIL] docker network 'shared_net' not found` | Jaringan Docker eksternal belum ada | Buat jaringan dengan `docker network create shared_net` |
| `[FAIL] git working directory has uncommitted changes` | Terdapat perubahan lokal di VPS | Cek via `git status`, bersihkan atau stash perubahan |
| `[FAIL] HEAD does not match origin/development` | Commit lokal tertinggal dari remote | Jalankan `git pull origin development` |
| `[FAIL] docker compose config failed` | Interpolasi variabel environment tidak lengkap | Periksa file `.env`, pastikan semua variabel wajib ada |
| `ERROR: Health check failed after 90s` | Server gagal boot / migrasi DB terhenti | Cek log: `docker compose logs --tail=100 server` (rollback otomatis aktif) |
| `ERROR: nginx -t failed with new configuration!` | Sintaks konfigurasi Nginx host tidak valid | Periksa log Nginx, backup konfigurasi lama otomatis dipulihkan |

## 4. Pasca-Deploy & Rekomendasi Ops

### Verifikasi Visual Manual (Browser oleh Ryan)
- **Login Google:** Buka `https://jedana.my.id`, uji flow autentikasi Google OAuth hingga berhasil kembali ke dashboard.
- **Catat Transaksi & Tag:** Buat transaksi pengeluaran/pemasukan baru beserta tag, pastikan saldo terhitung tepat.
- **Sinkronisasi Data:** Periksa indikator status sinkronisasi IndexedDB ke PostgreSQL berjalan lancar.
- **Floating Actions:** Uji menu aksi mengambang (FAB) dan interaksi modal/bottom sheet drawer di mobile viewport.

### Rekomendasi Hardening Ops VPS
- **Disable SSH Password Authentication:** Setelah memastikan SSH public key login berfungsi tanpa kendala, matikan opsi password di host: setel `PasswordAuthentication no` di `/etc/ssh/sshd_config`, lalu jalankan `sudo systemctl reload ssh`.
- **Fail2ban Whitelist:** Tambahkan IP statis/koneksi rumah ke directive `ignoreip` pada konfigurasi fail2ban (`/etc/fail2ban/jail.local`) untuk mencegah lockout saat debugging.
