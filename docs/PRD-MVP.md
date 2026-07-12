## Problem Statement

Pengguna sering kali mengalami "kelelahan melacak akun" (*account tracking fatigue*) saat menggunakan aplikasi pencatatan keuangan pribadi. Aplikasi yang ada umumnya memaksa pengguna untuk mereplikasi saldo dunia nyata (misal: Bank A, Uang Tunai, E-Wallet), sehingga setiap kali terjadi tarik tunai atau perpindahan uang antar akun sendiri, pengguna harus mencatat mutasinya. Hal ini melelahkan dan membuat pengguna berhenti mencatat.

## Solution

Jedana (Jejak Dana) adalah aplikasi Web *Local-First* yang menggunakan strategi pencatatan "Amplop Anggaran" (*single-pool / envelope budgeting*). Aplikasi ini murni berfokus pada melacak ke mana uang dihabiskan (Pengeluaran) dan dari mana uang didapat (Pemasukan), dengan mengabaikan lokasi fisik uang tersebut. Pengguna dapat mengelompokkan transaksi menggunakan multi-tag (yang diarsipkan jika dihapus, bukan dihilangkan permanen) dan mengelola dana ke dalam "Dompet" virtual (berbasis tujuan) alih-alih rekening fisik.

## User Stories

1. As a user, I want to create a Dompet so that I can allocate a budget for a specific purpose (e.g., "Kebutuhan Sehari-hari", "Dana Liburan").
2. As a user, I want to record an Income (Pemasukan) transaction so that I know how much money I received.
3. As a user, I want to record an Expense (Pengeluaran) transaction so that I know how much I spent.
4. As a user, I want to attach multiple Tags to a transaction so that I can classify it precisely (e.g., "Makanan", "Kantor").
5. As a user, I want to edit an existing transaction so that I can correct any mistakes in amount or tags without having to delete and recreate it.
6. As a user, I want to archive a Tag so that it no longer appears in the selection list for new transactions but remains visible on historical transactions.
7. As a user, I want to use the app completely offline so that I can log expenses instantly even without an internet connection.
8. As a user, I want to see a summary of my expenses and income for the current month so that I can monitor my financial health.
9. As a user, I want my data to sync automatically when I have internet access so that I can eventually access my records across multiple devices (Planned for Phase 2).

## Implementation Decisions

- **Architecture:** Aplikasi Web *Local-First*. Data disimpan langsung di browser menggunakan IndexedDB agar aplikasi sangat responsif dan offline-ready.
- **Tech Stack:** React (via Vite) untuk frontend, Dexie.js sebagai pembungkus IndexedDB, dan Vanilla CSS untuk styling.
- **Domain Language:** Mengikuti terminologi di `CONTEXT.md` (Pengguna, Dompet, Transaksi, Pemasukan, Pengeluaran, Tag).
- **Dompet Concept:** "Dompet" diimplementasikan sebagai tujuan anggaran (*budget goal*), BUKAN rekening fisik. Fitur transfer antar-rekening sengaja ditiadakan.
- **Tag Deletion:** Tag tidak pernah di-*hard delete*. Tag memiliki *flag* `isArchived`. Jika diarsipkan, tag disembunyikan dari form input baru, tapi dirender normal pada histori transaksi lama.
- **Data Schema:**
  - `wallets`: id, name, createdAt
  - `transactions`: id, walletId, type (INCOME/EXPENSE), amount, date, note
  - `tags`: id, name, isArchived
  - `transaction_tags`: id, transactionId, tagId

## Testing Decisions

- **What makes a good test:** Pengujian harus berfokus pada perilaku eksternal (*external behavior*), bukan detail implementasi. Misalnya: "Jika tag diarsipkan, form input tidak menampilkannya lagi."
- **Testing Seams:**
  - **Service Layer (Data):** Kita akan menguji pembungkus *IndexedDB* (`DexieService`) secara langsung untuk memastikan logika C.R.U.D dan *archiving* tag berjalan benar.
  - **UI Integration Layer:** Menggunakan pengujian komponen (misal: React Testing Library) untuk memastikan alur pengguna (seperti mengisi form Transaksi dengan multi-tag) memperbarui UI ringkasan (Dashboard) dengan benar, dengan melakukan *mocking* pada *database layer*.
- **Modules to test:** `DexieService` (Data), `TransactionForm` (UI), `DashboardSummary` (UI).

## Out of Scope

- Melacak saldo rekening fisik (Bank A, Gopay, Cash).
- Kolaborasi multi-pengguna (keluarga/bisnis kecil) tidak masuk MVP.
- Sinkronisasi Cloud yang kompleks dengan resolusi konflik lintas perangkat (ditunda ke Fase 2).
- Konversi mata uang (hanya mendukung IDR untuk saat ini).

## Further Notes

- UI akan dirancang dengan estetika modern, menggunakan elemen *glassmorphism*, warna kontras (vibrant), dan dukungan *dark mode* agar aplikasi terasa premium.
