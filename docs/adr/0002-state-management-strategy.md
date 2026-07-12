# 2. State Management Strategy & Rejection of Redux

Date: 2026-07-05

## Status

Accepted

## Context

Aplikasi Jedana berkembang dan ada rencana masa depan untuk mendukung sinkronisasi (*sync*) dengan *server* jarak jauh agar pengguna bisa mengelola keuangannya secara *multi-device* (lintas perangkat). 

Mengingat skalabilitas ini, muncul gagasan untuk mengadopsi *state management* global kelas berat seperti **Redux** untuk mengatur *state* dan sinkronisasi data.

Namun, kita harus membedakan antara *UI State* dan *Server/Persistent State*. Saat ini, Jedana menggunakan **IndexedDB (via Dexie.js)** sebagai *Single Source of Truth* untuk data domain (transaksi, tag, dompet). Menambahkan Redux berarti kita harus menduplikasi data dari IndexedDB ke dalam memori Redux (RAM) agar UI bisa bereaksi, yang akan memicu masalah "Sinkronisasi Ganda" (*Double Sync Problem*): menjaga Redux agar tetap sinkron dengan IndexedDB, sekaligus menjaga IndexedDB agar tetap sinkron dengan *server*.

## Decision

1. **Tolak Redux (Reject Redux)**: Kita memutuskan untuk **TIDAK** menggunakan Redux, Zustand, Recoil, atau *library global state management* serupa untuk mengelola data domain.
2. **Local-First Database sebagai Single Source of Truth**: **Dexie (IndexedDB)** akan terus menjadi satu-satunya sumber kebenaran untuk data domain.
3. **Reaktivitas UI (UI Reactivity)**: Kita akan mengandalkan `dexie-react-hooks` (`useLiveQuery`) untuk menghubungkan UI langsung ke *database* secara reaktif.
4. **Strategi Sinkronisasi (Sync Strategy)**: Untuk kebutuhan sinkronisasi multi-perangkat di masa depan, sinkronisasi tidak akan ditangani oleh lapisan UI (seperti *Redux Thunks/Sagas*). Sinkronisasi akan ditangani di lapisan *database* (misalnya menggunakan mekanisme Dexie Sync, Dexie Cloud, atau *Background Service Worker* yang menyinkronkan IndexedDB lokal dengan *backend server* API) secara transparan di latar belakang (*background-sync*).
5. **UI State Sederhana**: Status visual UI seperti tema (*Light/Dark mode*) cukup dikelola menggunakan **React Context**. Status internal komponen (*Sidebar open/close*, *Autocomplete filtering*) harus disimpan se-lokal mungkin menggunakan state lokal (`useState`) di dalam komponen yang bersangkutan (*Locality of State*).

## Consequences

- **Positif**: Basis kode bebas dari *boilerplate* *reducers*, *actions*, dan *store* yang masif.
- **Positif**: Arsitektur *Local-First* tetap murni. Aplikasi bisa bekerja 100% *offline* karena UI hanya membaca dan menulis ke IndexedDB lokal.
- **Negatif/Risiko**: Jika aplikasi membutuhkan *state* sementara (*ephemeral*) lintas halaman yang sangat kompleks (misalnya *multi-step wizard* yang rumit sebelum disimpan ke *database*), kita harus mendesainnya dengan matang menggunakan React Context atau cukup menyimpannya ke tabel `drafts` di IndexedDB.
