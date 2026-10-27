# Panduan Pengujian E2E Jedana & Matriks Uji Manual

Direktori ini berisi pengujian End-to-End (E2E) otomatis berbasis Playwright untuk alur inti offline (*offline-first core flows*) serta matriks pengujian manual untuk alur yang melibatkan pihak ketiga (Google OAuth) atau interaksi multi-perangkat.

## Menjalankan Uji Otomatis (Playwright)

Pastikan dependensi telah terinstal:

```bash
# Menjalankan seluruh skenario e2e secara headless
npm run test:e2e

# Atau menggunakan binary npx playwright secara langsung
npx playwright test

# Menjalankan dengan mode UI untuk debugging interaktif
npx playwright test --ui
```

> **Catatan Arsitektur:** Pengujian E2E Playwright dijalankan terhadap dev server frontend lokal tanpa backend aktif. Hal ini sengaja dilakukan untuk menguji ketahanan aplikasi dalam mode *offline-first* dan anonim menggunakan IndexedDB (Dexie).

---

## Matriks Uji Manual (Alur Non-Otomasi)

Alur berikut membutuhkan akun Google nyata, otentikasi browser interaktif, atau sinkronisasi lintas perangkat fisik/browser terisolasi sehingga diuji secara manual.

| Skenario | Langkah | Expected |
| :--- | :--- | :--- |
| **Login Google OAuth** | 1. Buka aplikasi di browser.<br>2. Klik tombol "Sign in with Google" / avatar di header.<br>3. Pilih akun Google dan selesaikan alur otentikasi consent. | 1. Browser diarahkan kembali ke aplikasi Jedana.<br>2. Cookie `auth_token` terpasang (HttpOnly).<br>3. Status profil menampilkan nama/email pengguna yang terotentikasi. |
| **Klaim Data Anonim saat Login Pertama** | 1. Dalam kondisi belum login, buat minimal 1 wallet dan 2 transaksi di IndexedDB lokal.<br>2. Klik login dengan Google untuk pertama kali.<br>3. Selesaikan alur OAuth. | 1. Data transaksi dan wallet lokal tidak hilang.<br>2. Backend mengaitkan (*claim*) entitas lokal ke user ID yang baru login.<br>3. Data tersimpan di database PostgreSQL server dan tetap tampil di dashboard. |
| **Logout & Pembersihan IndexedDB (*Physical Wipe*)** | 1. Login menggunakan akun terdaftar dan pastikan transaksi tampil.<br>2. Buka menu profil/pengaturan, lalu klik tombol "Logout".<br>3. Periksa panel Developer Tools (`Application > Storage > IndexedDB`). | 1. Cookie `auth_token` dihapus.<br>2. Seluruh tabel IndexedDB lokal dibersihkan/dihapus (*physical wipe* demi privasi).<br>3. Halaman kembali ke mode anonim tanpa menyisakan riwayat transaksi pengguna sebelumnya. |
| **Sinkronisasi Lintas Dua Perangkat (Cross-Device Sync)** | 1. Buka Jedana pada Browser A dan Browser B (atau perangkat terpisah), lalu login dengan akun Google yang sama.<br>2. Pada Browser A, tambahkan satu transaksi pengeluaran baru.<br>3. Tunggu siklus auto-sync atau picu sinkronisasi manual pada Browser B. | 1. Data dari Browser A ter-push ke backend.<br>2. Browser B melakukan pull sync dan memperbarui IndexedDB lokalnya.<br>3. Transaksi baru yang dicatat di Browser A muncul di histori transaksi Browser B dengan nominal dan tag yang identik. |
