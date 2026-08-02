# 5. Strategi Deployment Single VPS via Docker Compose & Shared PostgreSQL

Date: 2026-08-02

## Status

Accepted

## Context

Pada VPS produksi yang meng-host banyak projek sekaligus, menjalankan kontainer PostgreSQL dedicated untuk setiap projek akan boros penggunaan RAM. Diperlukan arsitektur deployment yang efisien RAM di mana Jedana terhubung ke instansi PostgreSQL terpusat (shared instance) di VPS melalui Docker external network.

## Decision

Kita mengadopsi strategi deployment **Self-Hosted Single VPS dengan Shared PostgreSQL**:

1. **Shared PostgreSQL Container**: Menggunakan instansi PostgreSQL terpusat di VPS yang terhubung ke jaringan Docker eksternal `shared_net`. Database `jedana_db` dan user `jedana_user` dibuat secara spesifik di dalam instansi PostgreSQL bersama ini.
2. **NestJS Server Container**: Menjalankan kontainer NestJS ter-build yang tersambung ke `shared_net` dan otomatis mengeksekusi `npm run migrate:up` ke `DATABASE_URL` terpusat sebelum server listen.
3. **Nginx Reverse Proxy & Static Web Server**: Melayani file statis frontend React (`apps/web/dist`) dan memproksi request `/api/*` ke `jedana_server`.

## Consequences

- **Positif**: Menghemat efisiensi penggunaan RAM secara signifikan pada VPS multi-project (menghindari duplikasi proses Postgres di memori).
- **Negatif**: Membutuhkan pembuatan Docker network eksternal `shared_net` dan pembuatan database `jedana_db` di instansi PostgreSQL terpusat sebelum kontainer Jedana dijalankan.
