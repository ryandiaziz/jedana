# Jedana (Jejak Dana)

Aplikasi pencatatan keuangan untuk melacak pemasukan dan pengeluaran, yang dirancang awalnya untuk pengguna perseorangan.

## Language

**User**:
The person registered and using the Jedana application. The application works Offline-First. 
- **Anonymous**: User who has not logged in. All data is stored purely in local IndexedDB.
- **Login Transition**: When an anonymous user logs in, all their local data is automatically tied (claimed) to that Google account and synced to the server.
- **Logout**: When the User clicks Logout, **all data in IndexedDB must be physically wiped** for privacy security, with a UI warning beforehand.
_Avoid_: Klien, akun, customer

**Wallet**:
A bookkeeping space based on the "Envelope Budgeting" concept or financial goals, NOT a physical representation of where money is stored (e.g., "Daily Needs Fund", "Vacation Fund"). Physical transfers between bank accounts/ATMs are not tracked.
_Avoid_: Dompet (Indonesian), Rekening, buku, ledger, akun bank

**Transaction**:
A record of money moving in or out of a Wallet.
_Avoid_: Mutasi, record, riwayat

**Income**:
A transaction type where money is added to a Wallet.
_Avoid_: Pemasukan, deposit, gain

**Expense**:
A transaction type where money is deducted from a Wallet.
_Avoid_: Pengeluaran, withdrawal, loss

**Void**:
A status where a Transaction is canceled/withdrawn but its record is not physically deleted (hard-delete) from the system. Voided transactions remain visible in the history with a strikethrough visual, but are not calculated in the wallet summary.
_Avoid_: Pembatalan, hapus permanen, delete

**Tag**:
A classification label added to a Transaction. One Transaction can have multiple Tags. If deleted, a Tag is only "archived" so old transactions still retain it.
_Avoid_: Kategori, label, folder

**Payee**:
The second entity in a transaction (e.g., store name, employer). Separates the concept of Category (Tag) from Location/Merchant (Payee) to keep statistical analysis accurate.
_Avoid_: Pihak, Merchant, Toko, Vendor
