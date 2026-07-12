# 0001 Local-First Architecture

Aplikasi Jedana akan dibangun menggunakan arsitektur **Local-First (Offline-First)** sebagai Web App.

Data akan disimpan secara lokal di dalam browser perangkat pengguna (menggunakan teknologi seperti IndexedDB) sehingga aplikasi dapat merespons secara instan dan dapat digunakan untuk mencatat transaksi meskipun tidak ada koneksi internet. Ketika perangkat terhubung ke internet, data akan disinkronisasikan ke server (Cloud) di latar belakang agar pengguna tetap bisa login dan mengakses datanya dari perangkat lain.

Keputusan ini diambil untuk memaksimalkan *user experience* dalam mencatat keuangan sehari-hari yang menuntut kecepatan dan keandalan, dengan *trade-off* kompleksitas di sisi sinkronisasi data (resolusi konflik).
