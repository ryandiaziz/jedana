import { useMemo } from 'react';
import { Calendar, Wallet, CheckCircle2 } from 'lucide-react';
import { usePreferences } from '../../../context';
import { getCycleRange } from '../../../utils/dateCycle';

export default function PreferencesManager() {
  const {
    startDayOfMonth,
    setStartDayOfMonth,
    isMultiWalletEnabled,
    setIsMultiWalletEnabled,
  } = usePreferences();

  // Preview cycle for the current month
  const currentCyclePreview = useMemo(() => {
    return getCycleRange(new Date(), startDayOfMonth);
  }, [startDayOfMonth]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Calendar size={18} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Preferensi Siklus & Dompet
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              Atur awal perhitungan bulanan dan mode penggunaan dompet
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* ==================== CYCLE START DAY SETTING ==================== */}
        <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/70 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="cycle-start-select" className="text-sm font-bold text-foreground flex items-center gap-2">
                Awal Siklus Bulan (Tanggal Gajian)
              </label>
              <p className="text-xs text-muted-foreground">
                Tentukan tanggal awal perhitungan transaksi dashboard dan statistik bulanan (1 – 28).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">Tanggal:</span>
              <select
                id="cycle-start-select"
                value={startDayOfMonth}
                onChange={(e) => setStartDayOfMonth(Number(e.target.value))}
                className="bg-background border border-border/80 rounded-xl px-4 py-2.5 min-h-[44px] text-sm font-bold font-mono font-tabular text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day} {day === 1 ? '(Awal Bulan Standar)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Preview Card */}
          <div className="flex items-start gap-2.5 p-3 sm:p-3.5 bg-card border border-border/60 rounded-xl text-xs">
            <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-foreground">
                Preview Siklus Saat Ini ({currentCyclePreview.monthName}):
              </span>
              <span className="font-mono font-tabular text-primary font-bold text-xs sm:text-sm">
                {currentCyclePreview.rangeLabel}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {startDayOfMonth === 1
                  ? 'Perhitungan dimulai dari tanggal 1 hingga hari terakhir bulan.'
                  : `Transaksi dihitung mulai tanggal ${startDayOfMonth} bulan sebelumnya sampai tanggal ${startDayOfMonth - 1} bulan ini.`}
              </span>
            </div>
          </div>
        </div>

        {/* ==================== MULTI-WALLET TOGGLE SETTING ==================== */}
        <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Wallet size={20} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-foreground">
                Mode Multi-Wallet
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                {isMultiWalletEnabled
                  ? 'Aktif. Anda dapat membuat beberapa dompet/amplop dan memilih dompet asal saat mencatat transaksi.'
                  : 'Nonaktif (Mode Sederhana). Transaksi otomatis dicatat ke dompet utama tanpa perlu memilih dompet, menu dompet disembunyikan.'}
              </p>
            </div>
          </div>

          {/* Accessible Toggle Button */}
          <button
            type="button"
            role="switch"
            aria-checked={isMultiWalletEnabled}
            onClick={() => setIsMultiWalletEnabled(!isMultiWalletEnabled)}
            className="relative inline-flex items-center min-h-[44px] cursor-pointer self-start sm:self-center shrink-0"
          >
            <div
              className={`w-12 h-7 rounded-full transition-colors duration-200 ease-in-out ${
                isMultiWalletEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out mt-1 ${
                  isMultiWalletEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </div>
            <span className="sr-only">Toggle Multi-Wallet Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
}
