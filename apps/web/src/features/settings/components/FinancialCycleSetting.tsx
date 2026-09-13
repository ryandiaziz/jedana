import { useState, useEffect } from 'react';
import {
  getFinancialMonthStartDay,
  setFinancialMonthStartDay,
  FINANCIAL_MONTH_CHANGED_EVENT,
} from '../../../utils/dateCycle';
import { Calendar, Check } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function FinancialCycleSetting() {
  const [startDay, setStartDayState] = useState(getFinancialMonthStartDay());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (customEvent.detail) setStartDayState(customEvent.detail);
    };
    window.addEventListener(FINANCIAL_MONTH_CHANGED_EVENT, handleUpdate);
    return () => window.removeEventListener(FINANCIAL_MONTH_CHANGED_EVENT, handleUpdate);
  }, []);

  const handleChange = (newDay: number) => {
    const sanitized = Math.max(1, Math.min(28, newDay));
    setStartDayState(sanitized);
    setFinancialMonthStartDay(sanitized);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const presets = [
    { label: 'Tanggal 1 (Kalender Standar)', value: 1 },
    { label: 'Tanggal 25 (Siklus Gajian)', value: 25 },
    { label: 'Tanggal 28', value: 28 },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Calendar size={16} />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-bold tracking-tight">
              Awal Siklus Finansial (Awal Bulan Buku)
            </h2>
            <p className="text-xs text-muted-foreground">
              Menentukan tanggal reset perhitungan ringkasan bulanan dan tracking budget.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="text-xs font-semibold text-success flex items-center gap-1 animate-in fade-in">
            <Check size={14} /> Tersimpan
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => handleChange(p.value)}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5",
              startDay === p.value
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            {startDay === p.value && <Check size={13} />}
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          Pilih tanggal kustom (1 - 28):
        </label>
        <input
          type="number"
          min={1}
          max={28}
          value={startDay}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) handleChange(val);
          }}
          className="w-20 bg-background border border-border/80 rounded-xl px-3 py-2 text-sm font-mono font-bold text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
        />
        <span className="text-xs text-muted-foreground">setiap bulannya</span>
      </div>

      <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40">
        {startDay === 1 ? (
          <>Perhitungan bulan berjalan dari tanggal <strong>1</strong> hingga akhir bulan kalender.</>
        ) : (
          <>
            Perhitungan bulan berjalan dari tanggal <strong>{startDay}</strong> bulan ini hingga tanggal{' '}
            <strong>{startDay - 1}</strong> bulan berikutnya. Cocok untuk budgeting berbasis tanggal gajian.
          </>
        )}
      </p>
    </div>
  );
}
