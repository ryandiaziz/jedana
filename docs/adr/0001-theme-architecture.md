# 0001. Theme Architecture (Sistem Tema Dinamis)

## Konteks
Aplikasi membutuhkan sistem desain (*design system*) dengan warna yang terstandardisasi untuk menjamin konsistensi UI, mendukung mode terang dan gelap (*Light/Dark mode*), serta merepresentasikan identitas "aplikasi keuangan profesional" (bukan tema hacker/hitam murni). Pengembang membutuhkan cara standar untuk menggunakan warna tanpa melakukan *hardcoding* kode *hex* di setiap komponen.

## Keputusan
Kita mengadopsi **Enterprise-grade Semantic Color System** dengan arsitektur CSS Variables.

1. **Variabel Semantik**: Warna tidak dinamai berdasarkan warnanya (misal `blue-500`), melainkan berdasarkan fungsinya (misal `primary`, `background`, `destructive`).
2. **Implementasi Teknologi**: 
   - Semua variabel dideklarasikan pada pseudo-class `:root` untuk Light Mode dan `.dark` untuk Dark Mode di `src/index.css`.
   - Tailwind CSS v4 diatur (`@theme`) agar memetakan kelas-kelas utilitas standar (seperti `bg-primary`, `text-muted-foreground`) langsung ke nilai CSS Variables tersebut.
3. **Pengelolaan State**: Kita menggunakan `ThemeProvider.tsx` berbasis React Context untuk menyuntikkan kelas `.dark` atau `.light` ke elemen `<html>`, dan menyimpan preferensi pengguna di `localStorage`.

## Palet Inti (Core Palette)
- **Primary**: Trust Blue (`#2563eb`) melambangkan stabilitas dan keamanan.
- **Secondary**: Vibrant Amber (`#f59e0b`) melambangkan energi, kontras dengan biru.
- **Background**: Menggunakan spektrum Slate. Abu-abu terang (`#f8fafc`) untuk Light, dan Biru Dongker Gelap (`#020617`) untuk Dark. BUKAN Hitam `#000000`.

## Konsekuensi
- **Positif**: Peralihan mode warna (Light/Dark) terasa sangat instan dan mulus tanpa memerlukan *re-render* dari JavaScript. Sangat mudah membuat tema ke-3 (misal: "Neon Mode") di masa depan hanya dengan menambahkan CSS class baru.
- **Negatif**: Pengembang baru harus belajar menggunakan nama semantik (`bg-muted`, `text-primary-foreground`) alih-alih warna mentah Tailwind (`bg-slate-800`, `text-blue-500`).
