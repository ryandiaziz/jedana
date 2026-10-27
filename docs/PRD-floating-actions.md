# PRD: Header Melayang (Floating Actions) & Tombol To-Top · v1.2 · 2026-10-27

**Pemilik:** Ryan · **Disetujui oleh:** Ryan, 2026-10-27 · **Status:** disetujui (revisi tata letak)

## 1. Konteks

Dashboard merender seluruh transaksi pada periode terpilih dalam satu daftar panjang, dikelompokkan
per tanggal, tanpa paginasi maupun virtualisasi (`apps/web/src/pages/Dashboard/Dashboard.tsx:390`,
`TransactionSearch` + daftar grup tanggal). Tombol `New Transaction` hanya ada di header halaman
paling atas (`Dashboard.tsx:244`) dan ikut tergulir keluar layar di desktop/tablet. Di mobile sudah ada
FAB tetap (`Dashboard.tsx:578`, `md:hidden`), tetapi pencarian dan ganti bulan tetap harus digulir ke
atas. Ryan memakai aplikasi ini harian untuk mencatat pengeluaran, sering setelah menggulir riwayat.

## 2. Masalah

Setelah menggulir jauh ke bawah, menambah transaksi atau mengganti periode memaksa pengguna menggulir
kembali ke paling atas. Friksi ini membuat pencatatan ditunda atau dilewatkan, padahal kecepatan input
adalah alasan utama aplikasi ini dipakai.

## 3. Pengguna dan peran

| Peran | Jumlah | Kebutuhan utama | Yang DILARANG dilakukan |
|---|---|---|---|
| Pengguna (single user, login/anonymous) | 1 | Aksi utama selalu terjangkau tanpa menggulir balik | — |
| Pengguna mobile (<768 px) | 1 | To-top & pencarian terjangkau saat riwayat panjang | Melihat dua tombol tambah (FAB + header) |

## 4. Lingkup

**In-scope**

- Header melayang muncul saat header asli keluar viewport dan tetap tampil selama pengguna di bawah;
  hilang kembali saat pengguna kembali ke area atas halaman.
- Isi header melayang per halaman: Dashboard → tambah transaksi + fokus pencarian + ganti bulan
  (‹ / ›); Wallets → New Wallet; Recurring → New Rule.
- Tombol to-top melayang di kelima halaman, muncul setelah menggulir ≥ 1 tinggi viewport.
- Mobile: tombol tambah tetap hanya FAB; header melayang tidak menduplikasi aksi tambah.
- Halaman tanpa aksi utama (Tags, Statistics) hanya mendapat to-top, tanpa header melayang.
- Aksi dari header melayang dan ganti bulan tidak mengubah posisi gulir.

**Asumsi eksplisit**

- A1: Daftar transaksi tetap dirender penuh (tanpa virtualisasi) selama v1; ambang gulir dihitung dari
  gulir jendela (`main` di `App.tsx` bukan kontainer gulir).
- A2: Hanya ada satu peran pengguna; tidak ada izin berbeda per peran.

**Out-of-scope**

| Hal | Kenapa tidak sekarang | Kapan ditinjau lagi |
|---|---|---|
| Virtualisasi / paginasi daftar transaksi | bukan akar keluhan; risiko regresi besar pada grup tanggal | bila satu periode > 1.000 transaksi atau daftar terasa lambat |
| Auto-hide header berdasarkan arah gulir | menambah kompleksitas & risiko kedip di iOS Safari | bila header terasa menutupi saat dipakai 2 minggu |
| Aksi cepat di header melayang untuk Statistics (Export CSV, pemilih periode) | kebutuhan belum terbukti | v1.1 |
| Quick-add nominal cepat / bottom sheet tambah transaksi | fitur berbeda, bukan lingkup ini | setelah pola header melayang stabil |
| Preferensi tampilkan/sembunyikan header melayang per akun (tersinkron) | data baru + sinkron, tidak perlu untuk 1 pengguna | bila ada pengguna kedua |
| Infinite scroll per bulan | mengubah model navigasi periode | tidak dijadwalkan |

## 5. Alur utama

1. Pengguna membuka Dashboard bulan berjalan (mis. 45 transaksi) lalu menggulir melewati header asli →
   header melayang turun berisi `New Transaction` · pencarian · ‹ bulan ›, konten tidak bergeser.
2. Klik `New Transaction` → form transaksi terbuka; setelah form ditutup, posisi gulir tetap di tempat.
3. Klik ‹ atau › → daftar berganti periode, posisi gulir tidak berubah, tidak ada lompatan visual.
   Catatan: aksi ganti bulan dan buka/tutup form wajib mempertahankan posisi gulir; aksi pencarian
   boleh menggulir ke field pencarian karena tujuannya menaruh kursor di sana.
4. Menggulir jauh ke bawah → tombol to-top tampil (mobile: di atas dock; desktop: kanan bawah); klik →
   kembali ke paling atas.
5. Bila periode kosong (0 transaksi) atau halaman lebih pendek dari viewport → header melayang dan
   to-top tidak pernah tampil (jalur gagal).

## 6. Data dan integrasi

- Data baru: **tidak ada**. Status tampil/sembunyi hanya di memori; tidak disimpan ke IndexedDB,
  tidak disinkronkan, hilang saat reload.
- Integrasi: tidak ada layanan pihak ketiga; tetap berfungsi offline (PWA shell yang sudah ada).
- Migrasi data lama: tidak ada.

## 7. Non-fungsional

| Aspek | Target terukur |
|---|---|
| Kinerja | header tampil/hilang ≤ 150 ms setelah ambang terlewati; biaya handler gulir < 2 ms/frame pada daftar 500 baris (ukur DevTools Performance) |
| Layout | kontribusi CLS = 0 (komponen melayang tidak memesan ruang, `position: fixed`) |
| Ketahanan viewport | histeresis: tampil saat `scrollY > 120 px`, hilang saat `scrollY < 24 px`, agar toolbar dinamis iOS Safari tidak membuatnya berkedip |
| Aksesibilitas | target sentuh ≥ 44×44 px; kontras ≥ 4.5:1; `aria-label` berbahasa Inggris mengikuti UI yang ada ("Back to top", "New Transaction"); fokus keyboard terlihat; `prefers-reduced-motion: reduce` → lompat instan tanpa animasi (saat ini `index.css` memaksa `scroll-behavior: smooth` global) |
| Lapisan tampilan | di bawah modal form dan di bawah dock mobile (`z-40`), tidak menutupi FAB |
| Bundle | tanpa dependensi baru; komponen ikut chunk layout agar bisa dipakai 5 halaman |
| Operasional | tanpa pemantauan baru; regresi dicek `npm run test`, `npm run test:e2e`, dan uji manual bernomor |

## 8. Kriteria penerimaan

- [x] AC-1: Given Dashboard dengan ≥ 20 transaksi pada viewport ≥ 768 px, when menggulir sampai header asli keluar viewport, then header melayang tampil ≤ 150 ms memuat tambah transaksi, pencarian, dan ‹ / › bulan, tanpa merubah `scrollY` saat muncul · verifikasi: manual no. 1 + tangkapan layar 1280×800 · **bukti 27 Okt 2026:** e2e `floating header appears after scrolling past the original header`; probe 1280×800 → bar `y=0`, `h=56`, `x=256` (= lebar sidebar), `scrollY` tetap 500 saat muncul
- [x] AC-2: Given viewport 375×667, when menggulir melewati header asli, then header melayang tampil tanpa tombol tambah (hanya FAB yang ada), dan tombol to-top tampil terpisah tanpa bertumpuk FAB atau dock · verifikasi: tangkapan layar 375×667 · **bukti:** probe 375×667 → tombol tambah di bar `hidden`, FAB tampil, to-top `x≈20` (kiri) vs FAB `x≈298` (kanan), `scrollWidth−clientWidth = −10`; dikonfirmasi Ryan saat uji runtime
- [x] AC-3: Given header melayang tampil, when klik ‹ atau ›, then periode berganti dan `scrollY` tetap (selisih ≤ 4 px) · verifikasi: Playwright e2e (`npm run test:e2e`) · **bukti:** e2e `month switch keeps scroll position`, stabil pada `--repeat-each=3`
- [x] AC-4: Given posisi ≥ 3 tinggi viewport ke bawah, when klik to-top, then `scrollY` = 0 dalam ≤ 600 ms, atau seketika bila `prefers-reduced-motion: reduce` aktif · verifikasi: Playwright e2e + emulasi reduced motion · **bukti:** e2e `back-to-top returns to the top` (≤ 2 s timeout) dan `back-to-top is instant with reduced motion`; probe emulasi → 0 px dalam 35 ms
- [x] AC-5 (gagal): Given periode tanpa transaksi (0 baris) atau halaman lebih pendek dari viewport, when halaman dibuka dan digulir, then header melayang maupun to-top tidak pernah tampil · verifikasi: manual no. 2 · **bukti:** e2e `floating actions stay hidden on short pages`; aksi pencarian tidak didaftarkan saat daftar kosong (commit `80dc832`); dikonfirmasi Ryan saat uji runtime
- [x] AC-6 (gagal): Given pencarian aktif dan hasil 0, when tombol pencarian di header melayang diklik, then fokus masuk ke input pencarian dan field tersebut terlihat di viewport, filter tetap aktif, dan nilai filter tidak berubah · verifikasi: manual no. 3 · **bukti:** e2e `search action focuses the search input`; `settleScroll()` dipakai agar animasi smooth tidak menimpa gulir (`14d3016`)
- [x] AC-7: Given halaman Wallets dan Recurring, when header melayang tampil, then memuat aksi utama halaman (New Wallet: menggulir ke kartu "Create New Wallet" + fokus input nama; New Rule: membuka form); di Tags dan Statistics hanya to-top yang tampil · verifikasi: manual no. 4 · **bukti:** probe → Wallets: input nama fokus, kartu `top=132`; Recurring: form terbuka (7 field); Tags & Statistics: `floating-actions` count = 0, to-top tampil; dikonfirmasi Ryan saat uji runtime
- [x] AC-8: Given navigasi keyboard, when Tab dari konten halaman, then tombol to-top dan seluruh aksi header melayang dapat difokuskan, punya `aria-label`, dan ring fokus terlihat · verifikasi: manual no. 5 · **bukti:** probe keyboard → Tab pertama mencapai `Back to top`; `role="toolbar"` + `aria-label="Quick actions"`; state tersembunyi `inert` + `tabindex=-1` + `visibility:hidden`; ring fokus `rgb(9,13,22) 2px` + `rgb(99,102,241) 4px` setelah transisi
- [x] AC-9: Given header melayang tampil di Dashboard, when dibandingkan dengan header halaman asli, then (a) bar menampilkan periode aktif (nama bulan, atau rentang siklus bila tanggal mulai ≠ 1) di sisi **kiri**, (b) `New Transaction` berada di sisi **kanan** — sama seperti header asli, bukan berpindah sisi, dan (c) tombol ‹ / › mengapit label periode · verifikasi: e2e + tangkapan layar 1280×800 dan 375×667 · **bukti:** e2e `floating bar shows the active period on the left and the primary action on the right`; probe → label `x=339`, cari `x=1013`, `New Transaction` `x=1063` (header asli: bulan `x=351`, aksi `x=1055`)

**Status verifikasi (27 Okt 2026):** seluruh AC terverifikasi otomatis (unit/e2e) dan/atau probe terukur; AC-2, AC-5, AC-7 serta kesesuaian visual dikonfirmasi Ryan pada uji runtime di `http://localhost:5173`.

## 9. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi / pemicu berhenti |
|---|---|---|
| Header melayang menutupi baris transaksi teratas | terasa data hilang | tinggi ≤ 56 px, latar glass + blur, tanpa memesan ruang; tinjau auto-hide bila terasa mengganggu |
| To-top bertumpuk FAB / dock mobile | salah klik | posisi berseberangan dengan FAB, `bottom: calc(4.75rem + safe-area)`, z-index di bawah dock |
| Toolbar dinamis iOS Safari mengubah tinggi viewport | header berkedip | histeresis ambang 120/24 px, hanya baca `window.scrollY` |
| `scroll-behavior: smooth` global | to-top terasa lambat di daftar panjang | durasi wajar + hormati `prefers-reduced-motion` |
| Duplikasi aksi tambah di mobile | kebingungan pengguna | FAB tetap satu-satunya aksi tambah di < 768 px |
| Perubahan menyentuh 5 halaman | regresi navigasi | satu komponen dipakai ulang, `core-flows.spec.ts` tetap hijau |

## 10. Pertanyaan terbuka

| Pertanyaan | Menghambat? | Pemilik jawaban | Tenggat |
|---|---|---|---|
| Tampilkan indikator jumlah filter aktif di header melayang? | tidak | Ryan | sebelum fase 2 |
| Statistics: sertakan Export CSV + pemilih periode di header melayang? | tidak (v1: to-top saja) | Ryan | v1.1 |
| Perlu toggle di Settings untuk mematikan header melayang? | tidak | Ryan | setelah 2 minggu pemakaian |
| Ambang to-top: 1× tinggi viewport atau 600 px tetap? | tidak | Ryan — **diputuskan 26 Okt 2026: 1× tinggi viewport** | selesai |
| Tombol to-top perlu juga di dalam form/modal? | tidak (diputuskan: tidak) | Ryan | bila muncul keluhan |

## 11. Keputusan yang sudah diambil

- D1: Aksi cepat Dashboard = tambah transaksi, fokus pencarian, ganti bulan ‹ / ›.
- D2: Berlaku semua ukuran layar; di mobile tombol tambah tetap hanya FAB.
- D3: Cakupan v1 = Dashboard, Wallets, Recurring, Tags, Statistics (Tags & Statistics: to-top saja).
- D4: Klik aksi header melayang dan ganti bulan tidak mengubah posisi gulir.
- D5: Pola "floating action header" dipakai lintas halaman → akan dicatat sebagai ADR-0006 sebelum fase 1.

## Changelog

| Versi | Tanggal | Perubahan | Peminta |
|---|---|---|---|
| v1 | 2026-10-26 | draf awal dari sesi scoping | Ryan |
| v1.1 | 2026-10-26 | AC-6 dikoreksi (fokus pencarian boleh menggulir ke field; yang wajib tetap adalah filter aktif dan nilainya tidak berubah); catatan aturan gulir di §5; ambang to-top diputuskan 1× tinggi viewport; PRD disetujui | Ryan |
| v1.2 | 2026-10-27 | Hasil uji runtime: bar melayang memindahkan aksi utama ke sisi kiri (berlawanan dengan header halaman) dan tidak menampilkan periode aktif. AC-9 ditambahkan: periode di kiri (‹ bulan ›), aksi utama di kanan seperti header asli. Anggaran bundle & komponen tidak berubah | Ryan |
