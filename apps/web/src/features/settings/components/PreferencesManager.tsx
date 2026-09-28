import { useMemo } from 'react';
import { Calendar, Wallet, CheckCircle2 } from 'lucide-react';
import { usePreferences } from '../../../context';
import { getCycleRange, getCurrentCycleDate } from '../../../utils/dateCycle';

export default function PreferencesManager() {
  const {
    startDayOfMonth,
    setStartDayOfMonth,
    isMultiWalletEnabled,
    setIsMultiWalletEnabled,
  } = usePreferences();

  // Preview cycle for the current month
  const currentCyclePreview = useMemo(() => {
    const currentAnchor = getCurrentCycleDate(new Date(), startDayOfMonth);
    return getCycleRange(currentAnchor, startDayOfMonth);
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
              Cycle & Wallet Preferences
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              Set monthly calculation start date and wallet management mode
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
                Monthly Cycle Start (Payday Date)
              </label>
              <p className="text-xs text-muted-foreground">
                Specify the start date for monthly dashboard and statistical calculations (1 – 28).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">Date:</span>
              <select
                id="cycle-start-select"
                value={startDayOfMonth}
                onChange={(e) => setStartDayOfMonth(Number(e.target.value))}
                className="bg-background border border-border/80 rounded-xl px-4 py-2.5 min-h-[44px] text-sm font-bold font-mono font-tabular text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day} {day === 1 ? '(Standard 1st of month)' : ''}
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
                Current Cycle Preview ({currentCyclePreview.monthName}):
              </span>
              <span className="font-mono font-tabular text-primary font-bold text-xs sm:text-sm">
                {currentCyclePreview.rangeLabel}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {startDayOfMonth === 1
                  ? 'Calculations run from day 1 to the end of the month.'
                  : `Transactions are calculated from day ${startDayOfMonth} of the previous month to day ${startDayOfMonth - 1} of this month.`}
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
                Multi-Wallet Mode
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                {isMultiWalletEnabled
                  ? 'Enabled. You can create multiple wallets/accounts and choose the source wallet when recording transactions.'
                  : 'Disabled (Simple Mode). Transactions are automatically assigned to the main wallet without selection, and wallet navigation is hidden.'}
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
