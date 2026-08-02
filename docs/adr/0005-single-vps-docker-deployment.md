# 5. Strategi Deployment Self-Hosted Single VPS via Docker Compose

Date: 2026-08-02

## Status

Accepted

## Context

Untuk rilis produksi awal Jedana, diperlukan arsitektur deployment yang sederhana, hemat biaya, namun terisolasi dan mudah direplikasi tanpa ketergantungan pada vendor PaaS spesifik.

## Decision

Kita mengadopsi strategi deployment **Self-Hosted Single VPS** menggunakan **Docker Compose** yang mengorkestrasi tiga kontainer utama:

1. **Nginx Reverse Proxy & Static Web Server**: Bertindak sebagai *entrypoint* (port 80/443 dengan SSL via Certbot/Let's Encrypt). Melayani build statis React (`apps/web/dist`) dan memproksi request `/api/*` ke kontainer NestJS Backend.
2. **NestJS Server Container**: Menjalankan image Node.js ter-build dari `apps/server`. Menjalankan skrip `npm run start:prod` yang otomatis melakukan `migrate:up` pada database PostgreSQL sebelum aplikasi NestJS listen.
3. **PostgreSQL Database Container**: Menjalankan service PostgreSQL 16 dengan *persistent volume mount* untuk menjamin ketahanan data.

## Consequences

- **Positif**: Seluruh stack aplikasi berada dalam 1 file `docker-compose.yml`, meminimalkan latency jaringan antara API & DB, serta mempermudah pemeliharaan dan pengujian staging lokal.
- **Negatif**: Membutuhkan manajemen backup database PostgreSQL secara mandiri (via cron pg_dump) dan kapasitas resource VPS terbatas sesuai spesifikasi server.
