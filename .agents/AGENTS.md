# Project Rules for Jedana Web Application

## React 2025 Folder Structure

All React frontend changes inside `apps/web/src` must strictly adhere to the modular React 2025 folder structure guidelines. 

### Key Rules:
1. **Domain Features**: Group domain-specific features under `src/features/<feature-name>/`. Avoid creating files directly under `components/` or `services/` if they only relate to a specific feature/domain (e.g. transactions, wallets, tags, sync).
2. **Barrel Exports**: Every component folder (e.g., `src/components/common/SmartInput/`) and page folder (e.g., `src/pages/Dashboard/`) must have an `index.ts` file that default or named exports the main element.
3. **Common Components**: Standard reusable, domain-agnostic UI elements (buttons, inputs, toggle, modal) must go under `src/components/common/`.
4. **Layout Components**: Page frames and shells (such as Sidebar, Header) must go under `src/components/layout/`.
5. **Global Contexts**: Cross-cutting context wrappers (such as AuthContext, ThemeContext) must reside in `src/context/`.
6. **General Utilities**: General helpers and utilities should be placed in `src/utils/` (e.g. `cn.ts`).

For detailed implementation workflow and path structures, please refer to the global skill: `react-folder-structure` or the file `/home/ryan/.gemini/config/skills/react-folder-structure/SKILL.md`.

## UI/UX & Design System Guidelines (Bento & Mobile-First)

Setiap penambahan atau pembaruan antarmuka (UI) wajib mengacu pada master design system di [MASTER.md](file:///home/ryan/Projects/jedana/design-system/jedana/MASTER.md) dan memenuhi prinsip-prinsip berikut:

### 1. Mobile-First & Ergonomi Sentuh
- **Touch Target**: Semua elemen interaktif (tombol, tab, chips, input) wajib berukuran minimal **44x44px** pada tampilan mobile (< 768px).
- **Safe Area Insets**: Floating dock, bar navigasi bawah, dan tombol aksi mengambang (FAB) wajib memperhitungkan `env(safe-area-inset-bottom, 0px)` untuk perangkat dengan home indicator (iOS/Android).
- **Adaptive Modals**: Form transaksi dan input kompleks harus bertransformasi menjadi **Bottom Sheet Drawer** pada mobile (`< 768px`) dan centered dialog pada desktop (`>= 768px`).
- **No Horizontal Scroll**: Seluruh layout mobile wajib bersih dari horizontal overflow (`overflow-x: hidden`). Kontainer utama mobile wajib memiliki padding bawah aman (`pb-28`) agar tidak tertutup bottom dock.

### 2. Estetika Bento Box Grid & Glassmorphism
- **Cards**: Gunakan styling modular Bento (`rounded-2xl`, `border border-border/80`, `bg-card`, shadow bertingkat halus).
- **Squircle Badges**: Ikon fitur atau kategori menggunakan container rounded squircle (`rounded-xl` atau `rounded-2xl`) dengan background opacity 10–15%.
- **Ambient Glow / Glass**: Gunakan utilitas `.glass-card` dan `.glass-dock` untuk navigasi atau kartu metrik utama.

### 3. Tipografi Finansial
- **Antarmuka Utama**: Menggunakan `Plus Jakarta Sans` (`font-sans`).
- **Nominal Uang & Metrik**: Semua angka transaksi, tanggal, persentase, dan saldo **wajib** menggunakan `JetBrains Mono` atau utilitas `.font-tabular` (`tabular-nums font-mono`) agar angka rata vertikal dan tidak terjadi layout shift saat nilainya berganti.

### 4. Konsistensi Warna & Semantik
- **Dilarang Hardcoded Hex**: Gunakan token tema Tailwind/CSS variables (`text-primary`, `bg-card`, `border-border`, `text-muted-foreground`).
- **Semantik Transaksi**:
  - Pemasukan / Saldo Positif: Emerald (`text-success` / `bg-success/15` / `#10B981`).
  - Pengeluaran / Peringatan: Crimson Rose (`text-destructive` / `bg-destructive/15` / `#F43F5E`).
  - Brand Utama: Indigo (`text-primary` / `bg-primary` / `#4F46E5` & `#6366F1`).
- **Kontras WCAG AA**: Pastikan rasio kontras teks terhadap background minimal **4.5:1** di kedua mode (Light & Dark).

### 5. Pre-Delivery UI Checklist
Sebelum menyelesaikan perubahan UI, verifikasi:
1. Tidak menggunakan emoji sebagai icon (gunakan SVG dari `lucide-react`).
2. Terdapat atribut `cursor-pointer` pada semua elemen yang dapat diklik.
3. Transisi hover/active responsif (150–250ms).
4. Konten bawah tidak tertutup oleh bottom dock (`pb-28` pada container mobile).
5. Build dan linter lulus tanpa error (`npm run build --prefix apps/web` & `npm run lint --prefix apps/web`).
