import { useState, useEffect, useCallback, type SubmitEvent } from 'react';
import { TransactionService, type TransactionWithTags } from '../../services/transaction.service';
import { WalletService } from '../../../wallets/services/wallet.service';
import { TagService } from '../../../tags/services/tag.service';
import { cn } from '../../../../utils/cn';
import { X } from 'lucide-react';
import { SmartInput } from '../../../../components/common/SmartInput';
import { SmartTagsInput } from '../../../../components/common/SmartTagsInput';

interface TransactionFormProps {
  onClose: () => void;
  defaultType?: 'INCOME' | 'EXPENSE';
  initialData?: TransactionWithTags;
}

export default function TransactionForm({ onClose, defaultType = 'EXPENSE', initialData }: TransactionFormProps) {
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(initialData?.type || defaultType);
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');

  const [isClosing, setIsClosing] = useState(false);

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

  const toDatetimeLocal = (timestamp: number) => {
    const d = new Date(timestamp);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [dateStr, setDateStr] = useState(() => toDatetimeLocal(initialData ? initialData.date : Date.now()));
  const [payee, setPayee] = useState(initialData?.payee || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData ? initialData.tags.map(t => t.name) : []);
  
  const wallets = WalletService.useWallets();
  const allTags = TagService.useFrequentTags();
  const allPayees = TransactionService.usePayees();
  const frequentNotes = TransactionService.useFrequentNotes(payee);

  const [walletId, setWalletId] = useState<string | ''>(initialData?.walletId || '');

  const effectiveWalletId = walletId || (wallets && wallets.length > 0 ? wallets[0].id! : '');

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    try {
      const data = {
        walletId: effectiveWalletId === '' ? undefined : effectiveWalletId,
        type,
        amount: Number(amount),
        date: new Date(dateStr).getTime(),
        note,
        payee: payee.trim() || undefined,
        tags: selectedTags
      };

      if (initialData?.id) {
        await TransactionService.updateTransaction(initialData.id, data);
      } else {
        await TransactionService.addTransaction(data);
      }
      handleClose();
    } catch (error) {
      console.error("Error saving transaction:", error);
    }
  };

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

  return (
    <div 
      className={cn(
        "fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center sm:p-4",
        isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop"
      )}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
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

        <div className="flex justify-between items-center px-5 py-3 border-b border-border/60">
          <h2 className="font-bold text-base sm:text-lg tracking-tight">
            {initialData ? (initialData.isVoided ? 'Transaction Details (Voided)' : 'Edit Transaction') : 'New Transaction'}
          </h2>
          <button 
            type="button"
            onClick={handleClose} 
            className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground cursor-pointer active:scale-95"
            aria-label="Close form"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          <fieldset disabled={initialData?.isVoided} className="flex flex-col gap-4">
          
          {/* Segmented Type Toggle (Expense / Income) */}
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

          {/* Amount Input with Jumbo Display */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Amount</label>
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
                className="w-full bg-background border border-border/80 rounded-2xl pl-12 pr-4 py-3 text-xl sm:text-2xl font-extrabold font-mono font-tabular focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
                placeholder="0"
                autoFocus={!initialData}
              />
            </div>
          </div>

          {/* Wallet Selector */}
          {wallets && wallets.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Wallet / Envelope</label>
              <select 
                value={effectiveWalletId} 
                onChange={e => setWalletId(e.target.value)}
                className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
                required
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date & Time */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Date & Time</label>
            <div className="relative">
              <input
                type="datetime-local"
                required
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {
                    /* fallback for unsupported browsers */
                  }
                }}
                className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm font-mono font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
              />
            </div>
          </div>

          <SmartInput
            label="Location / Payee"
            placeholder="e.g., Supermarket, Starbucks"
            value={payee}
            onChange={setPayee}
            options={allPayees || []}
            disabled={initialData?.isVoided}
          />

          <SmartInput
            label="Note / Description"
            placeholder="Lunch with team, groceries, etc."
            value={note}
            onChange={setNote}
            options={payee ? (frequentNotes || []) : []}
            disabled={initialData?.isVoided}
            suggestionVariant="highlight"
          />

          <SmartTagsInput
            label="Tags"
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            availableTags={allTags || []}
            disabled={initialData?.isVoided}
          />
          </fieldset>

          <div className="flex gap-2.5 mt-2 pt-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {initialData && !initialData.isVoided && (
              <button 
                type="button" 
                onClick={async () => {
                  if (confirm('Mark this transaction as void? It will be crossed out and excluded from summaries.')) {
                    await TransactionService.voidTransaction(initialData.id!);
                    handleClose();
                  }
                }}
                className="w-1/3 bg-destructive/10 text-destructive font-semibold py-3 min-h-[48px] text-sm rounded-xl hover:bg-destructive/20 active:scale-95 transition-all cursor-pointer"
              >
                Void
              </button>
            )}
            {initialData?.isVoided && (
              <button 
                type="button" 
                onClick={async () => {
                  if (confirm('Restore this transaction to the main history?')) {
                    await TransactionService.restoreTransaction(initialData.id!);
                    handleClose();
                  }
                }}
                className="flex-1 bg-foreground text-background font-bold py-3 min-h-[48px] text-sm rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                Restore Transaction
              </button>
            )}
            {!initialData?.isVoided && (
              <button 
                type="submit" 
                className="flex-1 bg-primary text-primary-foreground font-bold py-3 min-h-[48px] text-sm rounded-xl hover:bg-primary/90 active:scale-95 transition-all cursor-pointer shadow-md shadow-primary/25"
              >
                Save Transaction
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
