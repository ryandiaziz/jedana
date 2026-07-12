# 3. Sinkronisasi Last-Write-Wins dengan Tombstones

Date: 2026-07-11

## Status

Accepted

## Context

Aplikasi Jedana menggunakan arsitektur *Offline-First* di mana pengguna bisa melakukan mutasi data di banyak perangkat secara offline, lalu menyinkronkannya saat kembali *online*.
Masalah klasik muncul saat terjadi perubahan data yang bertabrakan (*conflict*), misalnya: Perangkat A mengedit Transaksi #1, dan Perangkat B juga mengedit Transaksi #1. Lebih ekstrim lagi: Perangkat A menghapus Dompet X, sementara Perangkat B menambahkan Transaksi baru ke dalam Dompet X.

Kita membutuhkan sebuah strategi sinkronisasi deterministik yang bisa dijalankan tanpa server harus menjadi "wasit" yang meminta input manual dari pengguna, karena akan merusak pengalaman aplikasi (UX).

## Decision

Kita mengadopsi algoritma **Last-Write-Wins (LWW) murni** yang digabungkan dengan teknik **Soft Deletion (Tombstones)**:

1. **Aturan Dasar LWW**: Setiap baris tabel (entitas) di-*tag* dengan *timestamp* `updated_at`. Saat sinkronisasi (menerima *payload* dari klien), baris (berdasarkan `id` UUID) yang memiliki `updated_at` paling besar (paling baru) akan secara mutlak mengesampingkan versi lama. Tidak ada penggabungan atribut parsial (merge partial fields); seluruh baris menang atau kalah sekaligus.
2. **Tombstones (Pusara)**: Data tidak pernah dihapus secara fisik (*hard delete*). Saat dihapus, kolom `is_deleted` diset menjadi `true` dan `updated_at` diperbarui. Ini memungkinkan peladen (server) memberi tahu perangkat lain bahwa sebuah entitas telah "dimatikan".
3. **Resolusi Orphaned Data (Data Yatim)**: Jika perangkat B menambahkan Transaksi ke Dompet yang sudah dihapus oleh perangkat A (sehingga dompet berstatus `is_deleted = true`), Transaksi tersebut akan tetap disinkronkan dan disimpan di database. Namun, *layer query UI* dan *Backend API* wajib menyaring (filter) seluruh transaksi yang induk dompetnya berstatus dihapus, sehingga transaksi yatim ini menjadi tidak kasat mata bagi pengguna, menjaga integritas riwayat tanpa kompleksitas *reversal*.

## Consequences

- **Positif**: Logika sinkronisasi di sisi klien maupun *server* menjadi sangat sederhana dan dapat diprediksi. Server cukup melakukan *upsert* `ON CONFLICT (id) DO UPDATE SET ... WHERE EXCLUDED.updated_at > table.updated_at`.
- **Negatif**: *Storage* database tidak akan pernah berkurang walau pengguna rajin "menghapus" data, karena secara teknis kita hanya menumpuk bendera *Tombstone*. (Dapat dimitigasi dengan mekanisme pembersihan manual rutin di sisi *server* untuk data yang sudah *deleted* lebih dari 1 tahun).
