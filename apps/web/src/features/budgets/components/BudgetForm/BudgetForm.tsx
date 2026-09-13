import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { BudgetService, type TagBudgetProgress } from '../../services/budget.service';
import { TagService } from '../../../tags/services/tag.service';
import { cn } from '../../../../utils/cn';
import { X, Target } from 'lucide-react';

interface BudgetFormProps {
  onClose: () => void;
  initialData?: TagBudgetProgress;
}

export default function BudgetForm({ onClose, initialData }: BudgetFormProps) {
  const [tagId, setTagId] = useState(initialData?.tagId || '');
  const [limit, setLimit] = useState(initialData ? String(initialData.monthlyLimit) : '');
  const [isClosing, setIsClosing] = useState(false);

  const allTags = TagService.useAllTags() || [];
  const activeTags = allTags.filter((t) => !t.isArchived && !t.isDeleted);

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

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    setLimit(rawDigits);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tagId) return;
    const numLimit = Number(limit);
    if (isNaN(numLimit) || numLimit <= 0) return;

    try {
      await BudgetService.setBudget(tagId, numLimit);
      handleClose();
    } catch (err) {
      console.error('Failed to save budget:', err);
    }
  };

  const applyPreset = (amount: number) => {
    setLimit(String(amount));
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
          "bg-card border-t sm:border border-border/80 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col",
          isClosing ? "animate-drawer-out sm:animate-modal-card-out" : "animate-drawer-in sm:animate-modal-card"
        )}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 cursor-grab">
          <span className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Target size={16} />
            </div>
            <h2 className="font-bold text-base sm:text-lg tracking-tight">
              {initialData ? 'Edit Budget' : 'Set Budget per Tag'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Tag Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Tag / Category
            </label>
            <select
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              required
              disabled={!!initialData}
              className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs disabled:opacity-60"
            >
              <option value="">Select a tag...</option>
              {activeTags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Monthly Limit Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Monthly Spending Limit
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-muted-foreground font-bold text-base select-none pointer-events-none font-mono">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={formatAmountDisplay(limit)}
                onChange={handleLimitChange}
                placeholder="0"
                className="w-full bg-background border border-border/80 rounded-2xl pl-12 pr-4 py-3 min-h-[44px] text-xl sm:text-2xl font-extrabold font-mono font-tabular focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
                autoFocus
              />
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {[500000, 1000000, 2000000, 3000000, 5000000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-2.5 py-1.5 rounded-lg bg-muted/80 hover:bg-muted text-xs font-mono font-tabular font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95 border border-border/40"
              >
                {new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(preset)}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground mt-1">
            Budget will track expenses associated with this tag for the active financial period.
          </p>

          {/* Action buttons */}
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
              disabled={!tagId || !limit || Number(limit) <= 0}
              className="flex-1 py-3 min-h-[44px] rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-primary/25"
            >
              Save Budget
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
