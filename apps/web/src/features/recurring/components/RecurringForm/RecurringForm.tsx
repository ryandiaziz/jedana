import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { type RecurringTransaction } from '@jedana/shared';
import { RecurringService } from '../../services/recurring.service';
import { WalletService } from '../../../wallets/services/wallet.service';
import { TagService } from '../../../tags/services/tag.service';
import { TransactionService } from '../../../transactions/services/transaction.service';
import { SmartInput } from '../../../../components/common/SmartInput';
import { SmartTagsInput } from '../../../../components/common/SmartTagsInput';
import { cn } from '../../../../utils/cn';
import { X, Repeat } from 'lucide-react';

interface RecurringFormProps {
  onClose: () => void;
  initialData?: RecurringTransaction;
}

export default function RecurringForm({ onClose, initialData }: RecurringFormProps) {
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(initialData?.type || 'EXPENSE');
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [note, setNote] = useState(initialData?.note || '');
  const [payee, setPayee] = useState(initialData?.payee || '');
  const [walletId, setWalletId] = useState(initialData?.walletId || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || []);
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>(
    initialData?.frequency || 'MONTHLY'
  );
  const [dayOfMonth, setDayOfMonth] = useState(initialData?.dayOfMonth ?? 25);
  const [dayOfWeek, setDayOfWeek] = useState(initialData?.dayOfWeek ?? 1); // 1 = Monday
  const [startDateStr, setStartDateStr] = useState(() => {
    const d = initialData ? new Date(initialData.startDate) : new Date();
    return d.toISOString().slice(0, 10);
  });

  const [isClosing, setIsClosing] = useState(false);

  const wallets = WalletService.useWallets() || [];
  const effectiveWalletId = walletId || (wallets.length > 0 ? wallets[0].id! : '');
  const allTags = TagService.useFrequentTags() || [];
  const allPayees = TransactionService.usePayees() || [];
  const frequentNotes = TransactionService.useFrequentNotes(payee) || [];

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 140);
  }, [onClose]);

  // Lock background scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const formatAmountDisplay = (val: string) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('id-ID').format(Number(clean));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    setAmount(rawDigits);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || !note.trim()) return;

    const startTs = new Date(startDateStr).getTime();

    try {
      if (initialData?.id) {
        await RecurringService.updateRecurring(initialData.id, {
          walletId: effectiveWalletId,
          type,
          amount: numAmount,
          note: note.trim(),
          payee: payee.trim() || undefined,
          tags: selectedTags,
          frequency,
          dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : undefined,
          dayOfWeek: frequency === 'WEEKLY' ? dayOfWeek : undefined,
          startDate: startTs,
        });
      } else {
        await RecurringService.addRecurring({
          walletId: effectiveWalletId,
          type,
          amount: numAmount,
          note: note.trim(),
          payee: payee.trim() || undefined,
          tags: selectedTags,
          frequency,
          dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : undefined,
          dayOfWeek: frequency === 'WEEKLY' ? dayOfWeek : undefined,
          startDate: startTs,
        });
      }
      handleClose();
    } catch (err) {
      console.error('Failed to save recurring transaction:', err);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center sm:p-4",
        isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={cn(
          "bg-card border-t sm:border border-border/80 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col",
          isClosing ? "animate-drawer-out sm:animate-modal-card-out" : "animate-drawer-in sm:animate-modal-card"
        )}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 cursor-grab">
          <span className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Modal Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Repeat size={16} />
            </div>
            <h2 className="font-bold text-base sm:text-lg tracking-tight">
              {initialData ? 'Edit Recurring Rule' : 'New Recurring Transaction'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground cursor-pointer active:scale-95"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Income / Expense Toggle */}
          <div className="flex bg-muted/70 p-1 rounded-2xl border border-border/50">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={cn(
                "flex-1 h-11 sm:h-10 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
                type === 'EXPENSE'
                  ? "bg-destructive text-white shadow-md shadow-destructive/25"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={cn(
                "flex-1 h-11 sm:h-10 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
                type === 'INCOME'
                  ? "bg-success text-white shadow-md shadow-success/25"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Income
            </button>
          </div>

          {/* Amount Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Amount
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-muted-foreground font-bold text-base select-none pointer-events-none font-mono">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={formatAmountDisplay(amount)}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full bg-background border border-border/80 rounded-2xl pl-12 pr-4 py-3 min-h-[44px] text-xl sm:text-2xl font-extrabold font-mono font-tabular focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
                autoFocus={!initialData}
              />
            </div>
          </div>

          {/* Note / Description */}
          <SmartInput
            label="Description / Title"
            placeholder="e.g., Gaji Bulanan, Tagihan Listrik, Spotify"
            value={note}
            onChange={setNote}
            options={frequentNotes}
          />

          {/* Frequency Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Frequency
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/50">
              {(['MONTHLY', 'WEEKLY', 'DAILY', 'YEARLY'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq)}
                  className={cn(
                    "py-2 text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[40px] flex items-center justify-center",
                    frequency === freq
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {freq === 'MONTHLY'
                    ? 'Monthly'
                    : freq === 'WEEKLY'
                    ? 'Weekly'
                    : freq === 'DAILY'
                    ? 'Daily'
                    : 'Yearly'}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency specific options */}
          {frequency === 'MONTHLY' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Repeat on Day of Month (1 - 31)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)))}
                  className="w-24 bg-background border border-border/80 rounded-xl px-3 py-2 min-h-[44px] text-sm font-mono font-bold text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[1, 15, 25, 28].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayOfMonth(d)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border",
                        dayOfMonth === d
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/70 text-muted-foreground hover:text-foreground border-border/40"
                      )}
                    >
                      Tgl {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {frequency === 'WEEKLY' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Repeat on Day of Week
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
              >
                <option value={1}>Monday (Senin)</option>
                <option value={2}>Tuesday (Selasa)</option>
                <option value={3}>Wednesday (Rabu)</option>
                <option value={4}>Thursday (Kamis)</option>
                <option value={5}>Friday (Jumat)</option>
                <option value={6}>Saturday (Sabtu)</option>
                <option value={0}>Sunday (Minggu)</option>
              </select>
            </div>
          )}

          {/* Wallet Selector */}
          {wallets.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Target Wallet / Envelope
              </label>
              <select
                value={effectiveWalletId}
                onChange={(e) => setWalletId(e.target.value)}
                required
                className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payee */}
          <SmartInput
            label="Location / Payee (Optional)"
            placeholder="e.g., PT Maju Jaya, PLN, Netflix"
            value={payee}
            onChange={setPayee}
            options={allPayees}
          />

          {/* Tags */}
          <SmartTagsInput
            label="Tags"
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            availableTags={allTags}
          />

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Start Date
            </label>
            <input
              type="date"
              required
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm font-mono font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-3 mt-auto">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 min-h-[44px] rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-all cursor-pointer text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!amount || Number(amount) <= 0 || !note.trim()}
              className="flex-1 py-3 min-h-[44px] rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-primary/25"
            >
              {initialData ? 'Save Changes' : 'Create Recurring'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
