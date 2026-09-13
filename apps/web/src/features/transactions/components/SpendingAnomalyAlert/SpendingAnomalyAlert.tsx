import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, X, TrendingUp } from 'lucide-react';
import { db } from '../../../../db/db';
import {
  detectSpendingAnomalies,
  getDismissedAnomalyIds,
  dismissAnomaly,
  type SpendingAnomaly,
} from '../../services/anomaly.service';

export function SpendingAnomalyAlert() {
  const [dismissedLocal, setDismissedLocal] = useState<Set<string>>(() => getDismissedAnomalyIds());
  const [currentIndex, setCurrentIndex] = useState(0);

  // Query past 35 days of transactions using indexed 'date'
  const recentTxs = useLiveQuery(async () => {
    const thirtyFiveDaysAgo = Date.now() - 35 * 24 * 60 * 60 * 1000;
    return db.transactions.where('date').above(thirtyFiveDaysAgo).toArray();
  }, []);

  const activeAnomalies: SpendingAnomaly[] = useMemo(() => {
    if (!recentTxs) return [];
    const detected = detectSpendingAnomalies(recentTxs);
    return detected.filter((a) => !dismissedLocal.has(a.id));
  }, [recentTxs, dismissedLocal]);

  if (activeAnomalies.length === 0) {
    return null;
  }

  // Bound index safely
  const safeIndex = Math.min(currentIndex, activeAnomalies.length - 1);
  const currentAnomaly = activeAnomalies[safeIndex] || activeAnomalies[0];

  const handleDismiss = (id: string) => {
    dismissAnomaly(id);
    setDismissedLocal((prev) => new Set([...prev, id]));
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      role="alert"
      className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/25 p-4 sm:p-5 rounded-2xl shadow-xs transition-all animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Icon & Content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle size={20} />
          </div>

          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                {currentAnomaly.title}
              </span>

              <span className="inline-flex items-center gap-1 font-mono font-tabular text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <TrendingUp size={11} />
                {currentAnomaly.ratio.toFixed(1)}x spike
              </span>

              {activeAnomalies.length > 1 && (
                <span className="text-[10px] text-muted-foreground font-semibold">
                  ({safeIndex + 1} of {activeAnomalies.length})
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
              {currentAnomaly.description}{' '}
              <span className="font-semibold">
                Recorded:{' '}
                <span className="font-mono font-tabular font-bold text-amber-700 dark:text-amber-300">
                  {formatCurrency(currentAnomaly.amount)}
                </span>{' '}
                (vs avg{' '}
                <span className="font-mono font-tabular text-muted-foreground">
                  {formatCurrency(currentAnomaly.baselineAmount)}
                </span>
                )
              </span>
            </p>

            {/* Pager if multiple anomalies */}
            {activeAnomalies.length > 1 && (
              <div className="flex items-center gap-2 mt-1">
                {activeAnomalies.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === safeIndex ? 'w-5 bg-amber-500' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                    }`}
                    aria-label={`View anomaly ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Dismiss Button (44px min touch target on mobile) */}
        <button
          onClick={() => handleDismiss(currentAnomaly.id)}
          className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-amber-500/10 active:scale-95 transition-all cursor-pointer shrink-0"
          title="Dismiss alert"
          aria-label="Dismiss anomaly alert"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
