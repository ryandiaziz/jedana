# Jedana MCP (Model Context Protocol) Server

Dokumentasi resmi integrasi **MCP Server** di Jedana (Jejak Dana) untuk memungkinkan AI Agent pribadi pengguna (Claude Desktop, Cursor, Cline, Open WebUI, chatbot Telegram, dll) mengelola pencatatan keuangan secara otomatis via remote endpoint.

---

## 1. Konsep & Arsitektur

Jedana mengimplementasikan standar **Model Context Protocol (MCP)** dengan arsitektur **Remote Streamable HTTP**.

```
┌──────────────────────────────────────────────┐
│        Personal AI Agent Pengguna            │
│  (Claude Desktop, Cursor, Antigravity, dll)  │
└──────────────────────┬───────────────────────┘
                       │ 
                       │ HTTPS / Streamable HTTP
                       │ Header: Authorization: Bearer jdn_...
                       ▼
┌──────────────────────────────────────────────┐
│           Jedana Server (Cloud/VPS)          │
│                                              │
│  1. Express Auth Middleware                  │
│     (Validasi SHA-256 API Key & Resolve User)│
│                                              │
│  2. MCP Server Protocol Handler              │
│     (Handshake + System Instructions)        │
│                                              │
│  3. 8 MCP Tools Handler                      │
│     (Transactions, Wallets, Tags, Summary)   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│         PostgreSQL Database (Server)         │
└──────────────────────┬───────────────────────┘
                       │
                       │ Push / Pull Sync (REST)
                       ▼
┌──────────────────────────────────────────────┐
│        Jedana Web App (Offline-First)        │
│          (IndexedDB Local Storage)           │
└──────────────────────────────────────────────┘
```

### Bagaimana Agent "Belajar" Tools Jedana?
Standar MCP dirancang bersifat **Self-Describing**:
1. **Handshake & Instructions**: Saat client agent terhubung ke `https://<domain>/mcp`, server Jedana mengirimkan instruksi domain sistem (*Server Instructions*) yang memuat aturan bisnis Jedana (Envelope Budgeting, pemisahan Tag vs Payee, dsb).
2. **Tool Discovery (`tools/list`)**: Client agent secara otomatis meminta daftar tools, parameter schema (JSON Schema), dan deskripsi fungsi tiap tool.
3. **Tool Execution (`tools/call`)**: Agent menyusun payload JSON sesuai schema Zod dan mengeksekusi aksi yang diminta pengguna.

---

## 2. Autentikasi: Personal API Key

Setiap pengguna memiliki API Key unik yang di-generate dari antarmuka Web Jedana (**Settings** → **API Keys**):

- Format Key: `jdn_<32 karakter random base64url>` (Contoh: `jdn_X8k9Lm...`)
- Di database, key disimpan dalam bentuk **SHA-256 Hash** (`key_hash`). Key asli hanya ditampilkan sekali saat pembuatan.
- Setiap request MCP wajib menyertakan HTTP Header:
  ```http
  Authorization: Bearer jdn_YOUR_API_KEY
  ```
- Keamanan: Setiap data yang dibaca atau ditulis oleh tool MCP terisolasi 100% pada `user_id` pemilik API Key.

---

## 3. Spesifikasi 8 MCP Tools

### 1. `list_wallets`
Melihat daftar semua wallet beserta saldo terkini.
- **Parameters**: *(none)*
- **Return**: Daftar wallet (`id`, `name`, `balance`, `createdAt`).

### 2. `create_wallet`
Membuat wallet pembukuan baru (*Envelope Budget*).
- **Parameters**:
  - `name` *(string, required)*: Nama wallet (misal: `"Dana Darurat"`).

### 3. `list_tags`
Melihat tag/kategori yang tersedia.
- **Parameters**:
  - `includeArchived` *(boolean, optional)*: Tampilkan tag yang diarsipkan (default: `false`).

### 4. `create_tag`
Membuat tag kategori baru.
- **Parameters**:
  - `name` *(string, required)*: Nama tag (misal: `"Kesehatan"`).

### 5. `create_transaction`
Mencatat transaksi keuangan baru (pemasukan atau pengeluaran).
- **Parameters**:
  - `walletId` *(UUID string, required)*: ID wallet tujuan.
  - `type` *(string enum: `"INCOME"` | `"EXPENSE"`, required)*: Jenis transaksi.
  - `amount` *(number, positive, required)*: Nilai uang (misal: `50000`).
  - `note` *(string, required)*: Catatan transaksi (misal: `"Makan siang"`).
  - `payee` *(string, optional)*: Pihak kedua / nama toko / merchant (misal: `"McDonalds"`).
  - `tagIds` *(array of UUIDs, optional)*: Tag kategori yang terhubung.
  - `date` *(number, optional)*: Unix timestamp dalam milliseconds (default: waktu sekarang).

### 6. `list_transactions`
Melihat daftar riwayat transaksi dengan filter opsional.
- **Parameters**:
  - `walletId` *(UUID string, optional)*: Filter berdasarkan wallet.
  - `type` *(string enum: `"INCOME"` | `"EXPENSE"`, optional)*: Filter tipe.
  - `startDate` *(number timestamp ms, optional)*: Filter tanggal awal.
  - `endDate` *(number timestamp ms, optional)*: Filter tanggal akhir.
  - `limit` *(number 1-100, optional)*: Batas jumlah transaksi (default: `20`).

### 7. `void_transaction`
Membatalkan (*void*) transaksi tanpa menghapus data secara permanen.
- **Parameters**:
  - `transactionId` *(UUID string, required)*: ID transaksi yang akan dibatalkan.

### 8. `get_summary`
Mendapatkan agregasi ringkasan keuangan (total pemasukan, pengeluaran, saldo, dan jumlah transaksi).
- **Parameters**:
  - `walletId` *(UUID string, optional)*: Filter untuk wallet tertentu.
  - `startDate` *(number timestamp ms, optional)*: Rentang awal.
  - `endDate` *(number timestamp ms, optional)*: Rentang akhir.

---

## 4. Panduan Aturan Domain untuk AI Agent

Saat AI Agent berinteraksi dengan pengguna, agent diarahkan mengikuti konvensi Jedana:

| Konsep | Penjelasan | Yang Harus Dihindari |
| :--- | :--- | :--- |
| **Wallet** | Ruang alokasi anggaran (*Envelope Budgeting*), misal: "Dana Harian", "Dompet Utama". Selalu panggil `list_wallets` terlebih dahulu. | **Dilarang membuat wallet baru (`create_wallet`) secara otomatis** tanpa instruksi eksplisit dari pengguna. Jika nama wallet tidak ada/ambigu, tanyakan klarifikasi ke pengguna. |
| **Payee** | Nama toko / merchant / instansi kedua (misal: "Indomaret", "PLN", "Starbucks"). | Memasukkan nama toko ke dalam Tag kategori. |
| **Tag** | Klasifikasi transaksi (misal: "Makanan", "Transportasi", "Listrik"). | Menjadikan nama toko sebagai Tag. |
| **Void** | Pembatalan transaksi (*soft-delete* dengan efek coret di riwayat). | Menghapus fisik baris data. |

### Contoh Alur Kerja Agent (Scenario Trace)

**Pengguna:**
> *"Catat pengeluaran kopi 35.000 di Kopi Kenangan pakai Dana Harian, tag Kopi & Nongkrong."*

**Langkah Agent:**
1. Agent memanggil `list_wallets` untuk mencari `walletId` dari wallet bernama `"Dana Harian"`.
2. Agent memanggil `list_tags` untuk memeriksa apakah tag `"Kopi"` dan `"Nongkrong"` sudah ada (jika belum, agent memanggil `create_tag`).
3. Agent memanggil `create_transaction` dengan:
   ```json
   {
     "walletId": "b1a2c3d4-...",
     "type": "EXPENSE",
     "amount": 35000,
     "note": "Kopi",
     "payee": "Kopi Kenangan",
     "tagIds": ["tag-id-1", "tag-id-2"]
   }
   ```
4. Agent menjawab ke pengguna: *"Pengeluaran Rp35.000 di Kopi Kenangan berhasil dicatat pada wallet Dana Harian."*

---

## 5. Cara Setup MCP Client

### A. Claude Desktop
Tambahkan konfigurasi ke file `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "jedana": {
      "url": "https://jedana.app/mcp",
      "headers": {
        "Authorization": "Bearer jdn_YOUR_API_KEY"
      }
    }
  }
}
```

### B. Cursor IDE / VS Code
Tambahkan ke `.cursor/mcp.json` atau pengaturan MCP:
```json
{
  "servers": {
    "jedana": {
      "type": "http",
      "url": "https://jedana.app/mcp",
      "headers": {
        "Authorization": "Bearer jdn_YOUR_API_KEY"
      }
    }
  }
}
```

### C. Testing dengan MCP Inspector
Untuk menguji secara interaktif via terminal / browser:
```bash
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```
*(Tambahkan header `Authorization: Bearer jdn_...` pada panel MCP Inspector)*.

---

## 6. Deployment & Reverse Proxy (Nginx)

Untuk deployment production dengan SSL/TLS dan Nginx, pastikan endpoint `/mcp` dikonfigurasi tanpa buffer (*Streamable HTTP / SSE friendly*):

```nginx
location /mcp {
    proxy_pass http://server:3000/mcp;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection '';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Nonaktifkan buffering untuk streaming SSE
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding on;
    proxy_read_timeout 24h;
}
```
