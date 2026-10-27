# ADR-0010: Container server berjalan sebagai pengguna non-root

**Tanggal:** 2026-10-27 · **Status:** diusulkan

## Konteks

- `apps/server/Dockerfile` tidak pernah memakai instruksi `USER`; tahap runner berjalan sebagai root
  (`COPY` ke `/app`, `CMD ["sh","-c","cd apps/server && npm run migrate:up && node dist/main"]`).
- Base image `node:24.22.1-alpine` sudah menyediakan user `node` (uid 1000) dan direktori `/home/node`.
- Proses server: membaca env, menulis log ke stdout, menjalankan `node-pg-migrate` (menulis ke database,
  bukan ke disk), tidak menulis file apa pun di dalam container. Tidak ada volume yang di-mount.
- Container `web` tidak terpengaruh: ia memakai `nginx:1.29-alpine` yang sudah menurunkan hak ke user
  `nginx` untuk worker process.
- Diverifikasi ulang saat implementasi (27 Okt 2026): Dockerfile runner memakai USER node (uid 1000) dengan chown /app dan npm_config_cache=/tmp/.npm.

## Pilihan yang dipertimbangkan

1. **Status quo (root).** Tidak ada pekerjaan. Dampak bila container ter-escape: penyerang mendapat
   root di namespace container, dan lebih mudah menyentuh volume/host path yang kelak ditambahkan.
2. **`USER node` tanpa mengubah kepemilikan file.** Cukup satu baris; `/app` tetap milik root tetapi
   terbaca (file build di-copy dengan mode 644/755). Risiko: `npm`/`node-pg-migrate` yang menulis cache
   ke `$HOME` bisa gagal bila `HOME` tidak dapat ditulis.
3. **Tahap runner dengan `chown` + `USER node` + `HOME` eksplisit.** Sedikit lebih banyak baris, tetapi
   menghilangkan kelas masalah izin (npm cache, folder sementara) tanpa membuka hak tulis ke `/app`.

## Keputusan

Pilihan **3**:

- Tahap runner: `ENV HOME=/home/node`, `RUN chown -R node:node /app`, `USER node`.
- Tidak ada `chmod 777`, tidak ada volume baru; `/app` tetap tidak perlu ditulis saat runtime.
- `npm_config_cache=/tmp/.npm` di-set agar `npm run migrate:up` tidak menulis ke direktori yang tidak
  bisa diakses.

Verifikasi wajib: `docker run --rm --entrypoint id jedana-server` → `uid=1000(node)`, dan container tetap
bisa boot + migrasi (log menunjukkan migrasi selesai lalu `[Jedana Server] Running on port 3000`).

Tanda keputusan ini salah: container crash saat start dengan `EACCES` pada `npm`/migrasi.

## Konsekuensi

- **Lebih mudah:** permukaan eskalasi lebih kecil; sejalan dengan praktik container standar.
- **Lebih sulit / berutang:** bila nanti perlu menulis file (mis. upload, cache di disk), path-nya harus
  disiapkan dengan kepemilikan `node` — bukan menambal dengan `chmod 777`.
- **Harus diubah di fase berikutnya:** bila ada fitur upload/berkas → siapkan volume dengan uid 1000.

## Kapan ditinjau ulang

- Bila menambah penulisan file di container, menambah volume, atau menambah sidecar yang butuh group
  berbeda.
