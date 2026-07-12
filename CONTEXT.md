# Jedana (Jejak Dana)

Aplikasi pencatatan keuangan untuk melacak pemasukan dan pengeluaran, yang dirancang awalnya untuk pengguna perseorangan.

## Language

**Pengguna**:
Orang yang terdaftar dan menggunakan aplikasi Jedana. Aplikasi bekerja secara *Offline-First*. 
- **Anonim**: Pengguna yang belum login. Seluruh data disimpan murni di IndexedDB lokal.
- **Transisi Login**: Saat Pengguna anonim melakukan login (Klaim), seluruh data lokal mereka secara otomatis diikat (diklaim) ke akun Google tersebut dan disinkronisasikan ke *server*.
- **Logout**: Saat Pengguna menekan Logout, **seluruh data di IndexedDB wajib dihapus (wipe) secara fisik** demi keamanan privasi dari pengguna perangkat selanjutnya, dengan memberikan peringatan UI sebelumnya.
_Avoid_: User, akun, klien

**Dompet**:
Tempat pembukuan berbasis "Amplop Anggaran" atau tujuan keuangan, BUKAN representasi fisik tempat uang disimpan (misal: "Dana Kebutuhan Sehari-hari", "Dana Liburan"). Perpindahan fisik antar-rekening/ATM tidak dilacak.
_Avoid_: Rekening, buku, ledger, akun bank

**Transaksi**:
Catatan perpindahan uang, baik masuk maupun keluar dari sebuah Dompet.
_Avoid_: Mutasi, record

**Pemasukan**:
Jenis transaksi di mana uang bertambah ke dalam Dompet.
_Avoid_: Income, deposit

**Pengeluaran**:
Jenis transaksi di mana uang berkurang dari Dompet.
_Avoid_: Expense, withdrawal

**Pembatalan (Void)**:
Status di mana sebuah Transaksi ditarik/dibatalkan namun riwayat catatannya tidak dihapus secara fisik (hard-delete) dari sistem. Transaksi yang dibatalkan tetap terlihat pada riwayat dengan visual dicoret, namun tidak dihitung dalam ringkasan dompet.
_Avoid_: Hapus permanen, delete

**Tag**:
Label penanda yang ditambahkan pada Transaksi untuk keperluan klasifikasi. Satu Transaksi dapat memiliki lebih dari satu Tag. Jika dihapus, Tag hanya "diarsipkan" sehingga transaksi lama tetap memilikinya.
_Avoid_: Kategori, label, folder

**Pihak (Payee)**:
Entitas kedua dalam sebuah transaksi (contoh: nama warung, toko, pemberi gaji). Memisahkan konsep Kategori (Tag) dari Lokasi/Merchant (Payee) agar analisis statistik tetap akurat.
_Avoid_: Merchant, Toko, Vendor
