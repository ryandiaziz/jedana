# ADR-0011: Deploy produksi lewat tag rilis → image GHCR → SSH satu arah ke VPS

**Tanggal:** 2026-10-27 · **Status:** diusulkan

## Konteks

Fakta terverifikasi 27 Okt 2026:

- CI yang berjalan sekarang hanya `ci-verify.yml` (push/PR ke `development` & `master`: build, unit test,
  lint web+server, `npm audit` blocking). Tidak ada deploy otomatis.
- `ci-cd.yml` ada tetapi **belum pernah jalan**: trigger-nya tag `v*`, sedangkan repo punya **0 tag**.
  Isinya juga bermasalah: image dibangun di runner tapi tidak di-push, deploy menjalankan
  `docker compose up -d --build` **di server** (build ulang tiap deploy, tanpa health check, tanpa
  rollback), dan tidak menyentuh nginx host — akibatnya setelah deploy manual 27 Okt, container sudah
  baru tetapi `GET https://jedana.my.id/` masih **tanpa header keamanan** karena vhost
  `deploy/nginx/jedana.my.id.conf` belum dipasang.
- Produksi: satu VPS (`jedana.my.id` → 43.134.83.20), nginx host sebagai terminator TLS (Let's Encrypt),
  proxy ke `127.0.0.1:8090`, container `jedana_web` + `jedana_server`, repo di `/var/www/jedana`.
- `scripts/deploy-production.sh` (fase S8 seri keamanan) sudah punya `--check` (read-only),
  `--deploy` (tag rollback → build/pull → up → tunggu `/api/health` → backup & pasang vhost →
  `nginx -t` → reload → verifikasi header/`X-Powered-By`/uid/`/mcp`) dan `--rollback`.
- Repo publik (`ryandiaziz/jedana`, `private: false`), jadi paket GHCR bisa dibuat publik.
- Keputusan Ryan (27 Okt 2026): deploy hanya saat **tag rilis** `v*.*.*`; image dari **GHCR**; akses VPS
  lewat **SSH key khusus deploy** di GitHub Secrets + runner GitHub-hosted; **tanpa** gerbang approval
  manual.

## Pilihan yang dipertimbangkan

1. **Auto-deploy setiap push ke `development`.** Umpan balik tercepat, tetapi tidak ada staging dan tidak
   ada kesempatan menahan rilis; satu commit buruk langsung ke produksi.
2. **Self-hosted runner di VPS.** Tidak perlu menyimpan kunci SSH di GitHub dan runner bisa memakai sudo
   lokal. Ditolak: runner di mesin produksi menambah permukaan serangan (dan sisa artefak build) yang
   harus dirawat.
3. **Pull-based (Watchtower/`compose pull` berkala).** Tanpa SSH masuk, tetapi deploy tidak deterministik
   (kapan tepatnya?), sulit dikorelasikan dengan commit, dan rollback jadi rebutan waktu.
4. **Tag rilis + GHCR + SSH satu arah + skrip deploy yang sudah ada.** Dipilih.

## Keputusan

Pilihan **4**:

- **Trigger:** `push` tag `v*.*.*` dan `workflow_dispatch` (input `tag`, untuk deploy ulang tag lama).
- **Verifikasi sebelum build:** workflow CI dijadikan *reusable* (`workflow_call`) dan dipanggil dari
  workflow rilis, sehingga tag tidak bisa lolos tanpa build+test+lint+audit yang sama dengan push.
- **Image:** `docker/build-push-action` → `ghcr.io/ryandiaziz/jedana-server` dan `-web`, tag
  `<versi>`, `sha-<7>`, dan `latest`. Paket dibuat **publik** supaya server tidak perlu kredensial
  registry.
- **Compose:** service memakai `image: ghcr.io/...:${IMAGE_TAG:-latest}` dengan `pull_policy: always`;
  blok `build:` dipertahankan hanya untuk dev lokal (`docker-compose.override.yml`), bukan jalur produksi.
- **Deploy:** job terakhir menjalankan SSH ke VPS dengan **kunci khusus deploy** (ed25519, hanya untuk
  `ubuntu@43.134.83.20`, tanpa passphrase, disimpan sebagai `VPS_SSH_KEY`) lalu:
  `git fetch --tags && git checkout <tag>` → `IMAGE_TAG=<versi> ./scripts/deploy-production.sh --deploy`.
  Skrip itu yang menangani health check, vhost, `nginx -t`, verifikasi, dan rollback otomatis.
- **Tanpa approval gate** (keputusan Ryan). Kompensasinya: hanya tag yang memicu deploy, dan
  `concurrency: production-deploy` memastikan tidak ada dua deploy bersamaan.
- **Rollback:** retag image sebelumnya (`jedana-server:rollback-<waktu>` sudah dibuat skrip) atau
  `workflow_dispatch` dengan tag lama.

## Konsekuensi

- **Lebih mudah:** deploy deterministik (commit = tag = image tag), cepat (pull, bukan build di server),
  jejaknya terlihat di GitHub (workflow + tag + image digest), rollback satu perintah.
- **Lebih sulit / berutang:**
  - Butuh `sudo` NOPASSWD terbatas di server untuk langkah nginx (`cp`, `nginx -t`,
    `systemctl reload nginx`) — harus dibatasi ke perintah itu saja, bukan `sudo` bebas.
  - Kunci deploy menjadi rahasia baru yang harus dirotasi; kalau bocor, penyerang bisa menjalankan
    `--deploy` (tetapi tidak bisa membaca `.env` lewat skrip).
  - Image publik di GHCR: siapa pun bisa menarik image (kode memang publik, tetapi pastikan tidak ada
    rahasia yang ikut ter-bake — `.env` tidak boleh masuk build context).
  - Tanpa staging, disiplin tag menjadi satu-satunya pengaman → butuh checklist rilis singkat.
- **Harus diubah di fase berikutnya:** bila menambah staging, pipeline bisa memakai tag `-rc` yang
  deploy ke environment kedua; bila pindah registry, hanya `image:` + login yang berubah.

## Kapan ditinjau ulang

- Bila menambah environment staging, pengguna kedua, atau kebutuhan approval (mis. rilis di jam kerja).
- Bila kunci deploy perlu dirotasi (jadwal 6–12 bulan) atau runner GitHub diganti.
- Bila image publik dianggap masalah (pindah ke paket privat + `docker login` di server).
