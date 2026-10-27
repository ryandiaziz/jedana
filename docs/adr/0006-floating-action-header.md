# ADR-0006: Aksi cepat lintas halaman lewat satu header melayang + tombol kembali ke atas

**Tanggal:** 2026-10-26 · **Status:** diterima (Ryan, 2026-10-26)

## Konteks

Fakta yang memaksa keputusan ini (semua terukur di `development` @ `aa363d2`, 26 Okt 2026):

- `apps/web/src/pages/Dashboard/Dashboard.tsx` 607 baris; tombol `New Transaction` berada di header
  halaman (`:244`) yang ikut tergulir, dan daftar transaksi dirender penuh tanpa paginasi/virtualisasi.
- `apps/web/src/App.tsx:37` — `<main>` hanya punya `overflow-x-hidden` (tanpa `overflow-y`), jadi
  gulir terjadi di jendela. Ini penting: `overflow-x: hidden` menjadikan `main` scroll container, sehingga
  `position: sticky` di dalamnya **tidak menempel** saat jendela digulir (sticky hanya menempel pada
  scrollport terdekat, yaitu `main`, yang tidak menggulir).
- Mobile sudah punya FAB tambah transaksi (`Dashboard.tsx:578`, `md:hidden`) dan dock bawah
  `fixed z-40` (`components/layout/Sidebar/Sidebar.tsx:63`); modal/form memakai `z-50`.
- `apps/web/src/index.css:110` memaksa `scroll-behavior: smooth` global, tanpa dukungan
  `prefers-reduced-motion`.
- Uji web: 10 file / 1.076 baris, semuanya level service/utils; `apps/web/vite.config.ts` tidak punya
  blok `test` → vitest berjalan di environment `node`, tanpa jsdom/React Testing Library. Menguji
  komponen React berarti menambah devDependency baru.
- e2e Playwright: 3 test, 5,8 s, chromium 1.64.1 — **tidak** dijalankan CI
  (`.github/workflows/ci-verify.yml` hanya build + `npm test` + lint).
- Aksi utama tiap halaman berbeda: Dashboard `New Transaction`; Recurring `New Rule`; Wallets berupa
  kartu inline `Create New Wallet`; Tags tidak punya aksi tambah (tag lahir dari form transaksi);
  Statistics punya `Export CSV` + chip periode.
- `.agents/AGENTS.md` mewajibkan struktur folder + barrel `index.ts`, target sentuh ≥ 44 px,
  `env(safe-area-inset-bottom)` untuk elemen mengambang, utilitas `.glass-card`/`.glass-dock`, token
  tema (tanpa hex), dan ikon `lucide-react` (tanpa emoji).

## Pilihan yang dipertimbangkan

1. **Header sticky ditulis ulang per halaman** — cara termudah dibaca per file, tapi aksi, ambang gulir,
   dan gaya glass diduplikasi 5×; setiap perbaikan harus disentuh 5 tempat.
2. **Satu komponen layout bersama + registrasi aksi per halaman** — halaman mendeklarasikan aksinya,
   komponen global menangani posisi/ambang/gaya. Biaya: satu context kecil dan kontrak "aksi harus
   stabil (memoized)".
3. **Perluas FAB ke desktop** (status quo diperluas) — paling murah, tapi tidak menyelesaikan ganti
   periode dan pencarian yang juga tertinggal di atas; tidak ada kembali ke atas.
4. **Auto-hide berdasarkan arah gulir** (sembunyi saat turun, muncul saat naik) — menambah state arah +
   risiko kedip saat toolbar dinamis iOS Safari mengubah tinggi viewport.
5. **Tidak melakukan apa-apa** — friksi "gulir ke atas dulu" tetap ada; keluhan ini yang memicu PRD.

## Keputusan

Diambil pilihan **2**, dengan rincian yang mengikat:

- **D1 — Satu komponen bersama.** Header melayang di `src/components/layout/FloatingActions/`
  (frame/shell → wajib di `layout/` menurut `.agents/AGENTS.md`), tombol kembali ke atas di
  `src/components/common/ToTop/`. Tidak ada salinan per halaman.
- **D2 — Registrasi aksi, bukan hardcode rute.** Halaman memanggil hook `useFloatingActions(actions)`
  untuk mendeklarasikan aksi; komponen global yang memutuskan kapan tampil. Halaman tanpa aksi
  (Tags, Statistics) tidak mendaftar → hanya mendapat `ToTop`.
- **D3 — Ambang gulir adalah fungsi murni.** `apps/web/src/utils/scroll.ts` memuat histeresis
  (`resolveFloatingVisible(scrollY, currentVisible)`; tampil > 120 px, hilang < 24 px). Dengan begitu
  logika ini bisa diuji di environment `node` tanpa menambah jsdom/RTL; perilaku DOM-sejati diuji
  Playwright.
- **D4 — Posisi memakai `fixed`, bukan `sticky`.** `sticky` tidak berfungsi karena `main` adalah scroll
  container (lihat Konteks). Batas kiri header melayang diambil dari CSS variable `--sidebar-w` yang
  di-set `Sidebar` (16rem terbuka / 5rem tertutup) dan diabaikan di bawah `md`. `fixed` juga menjamin
  CLS = 0 karena tidak memesan ruang.
- **D5 — Fokus pencarian lewat imperative handle.** `TransactionSearch` mengekspos `focusSearch()`
  melalui `forwardRef`/`useImperativeHandle`; tidak ada event global kustom, tidak ada query DOM
  manual. Aksi ini **boleh** menggulir field pencarian ke dalam viewport (memang tujuannya) — berbeda
  dari aksi ganti bulan dan buka/tutup form yang wajib mempertahankan `scrollY`.
- **D6 — Tanpa dependensi baru.** Verifikasi UI memakai Playwright yang sudah ada; tidak menambah
  jsdom/RTL/jsdom-based testing, tidak menambah pustaka animasi.

Tanda lebih dulu bila keputusan ini salah: header melayang terasa menutupi baris transaksi teratas
saat dipakai, atau registrasi aksi memicu re-render berulang (gejala: konsol penuh peringatan
`Maximum update depth exceeded`).

**Persetujuan:** Ryan, 2026-10-26 — D1–D6 diterima, termasuk `fixed` + CSS variable `--sidebar-w`
(D4) dan larangan dependensi baru (D6). Ambang tombol to-top diputuskan 1× tinggi viewport
(lihat PRD v1.1).

### Amandemen 2026-10-27 (hasil uji runtime Ryan)

- **D2 diperluas:** registrasi halaman boleh menyertakan satu slot `leading` (ReactNode milik halaman)
  untuk konteks periode. Alasan: label periode harus mengikuti state halaman (bulan/rentang siklus) dan
  tidak boleh diduplikasi di komponen global.
- **Tata letak bar dicerminkan dari header halaman:** konteks/aksi utama tidak boleh berpindah sisi saat
  bar muncul. Aturan urutan: `leading` (kiri) → aksi sekunder → aksi `primary` paling kanan. Di Dashboard:
  kiri = `‹ <periode aktif> ›`, kanan = `[cari] [New Transaction]` — sama dengan header asli.
- **D3 tetap:** ambang gulir masih fungsi murni; amandemen ini tidak menyentuh mekanisme visibilitas.

## Konsekuensi

- **Lebih mudah:** satu tempat untuk ambang, gaya glass, safe-area, dan a11y; halaman baru cukup
  mendeklarasikan aksi.
- **Lebih sulit / berutang:** `Sidebar` harus memelihara CSS variable `--sidebar-w`; kontrak
  "array aksi wajib memoized" harus dipatuhi setiap halaman (kalau tidak → loop render); a11y
  header melayang (fokus, `aria-hidden` saat tersembunyi) menjadi tanggung jawab satu komponen.
- **Harus diubah di fase berikutnya:** bila paginasi/virtualisasi daftar masuk, ambang gulir tetap
  berlaku (berbasis `window.scrollY`), tetapi tombol `ToTop` perlu memakai kontainer gulir baru.

## Kapan ditinjau ulang

- Bila header terasa menutupi setelah 2 minggu pemakaian → tinjau auto-hide arah gulir (pilihan 4).
- Bila tinggi header halaman berubah jauh (> 120 px) → ganti ambang tetap dengan sentinel
  `IntersectionObserver` pada header asli.
- Bila daftar transaksi mulai dipaginasi/di-virtualisasi → tinjau ulang sumber `scrollY` dan `ToTop`.
- Bila muncul halaman baru dengan aksi utama → cukup daftar aksi; bila butuh 3+ aksi berbeda, tinjau
  ulang bentuk header melayang (bukan menambah tombol tanpa batas).
