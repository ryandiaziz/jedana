import { useState, type FormEvent } from 'react';
import { TransactionService, type TransactionWithTags } from '../services/transaction.service';
import { WalletService } from '../services/wallet.service';
import { TagService } from '../services/tag.service';
import { cn } from '../lib/utils';
import { X } from 'lucide-react';
import { SmartInput } from './ui/SmartInput';
import { SmartTagsInput } from './ui/SmartTagsInput';

interface TransactionFormProps {
  onClose: () => void;
  defaultType?: 'INCOME' | 'EXPENSE';
  initialData?: TransactionWithTags;
}

export default function TransactionForm({ onClose, defaultType = 'EXPENSE', initialData }: TransactionFormProps) {
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(initialData?.type || defaultType);
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');

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

  const handleSubmit = async (e: FormEvent) => {
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
      onClose();
    } catch (error) {
      console.error("Error saving transaction:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="font-semibold">
            {initialData ? (initialData.isVoided ? 'Transaction Details (Voided)' : 'Edit Transaction') : 'New Transaction'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <fieldset disabled={initialData?.isVoided} className="flex flex-col gap-4">
          <div className="flex bg-muted rounded-lg p-1">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                type === 'EXPENSE' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                type === 'INCOME' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Income
            </button>
          </div>

          {wallets && wallets.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Select Wallet</label>
              <select 
                value={effectiveWalletId} 
                onChange={e => setWalletId(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary transition-colors"
                required
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Amount</label>
            <input
              type="number"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-lg focus:outline-none focus:border-primary transition-colors"
              placeholder="0"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Date & Time</label>
            <input
              type="datetime-local"
              required
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <SmartInput
            label="Location / Payee"
            placeholder="e.g., Walmart, Gas Station"
            value={payee}
            onChange={setPayee}
            options={allPayees || []}
            disabled={initialData?.isVoided}
          />

          <SmartInput
            label="Note"
            placeholder="Lunch, gas, etc."
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

          <div className="flex gap-2 mt-2">
            {initialData && !initialData.isVoided && (
              <button 
                type="button" 
                onClick={async () => {
                  if (confirm('Mark this transaction as void? It will be crossed out and excluded from summaries.')) {
                    await TransactionService.voidTransaction(initialData.id!);
                    onClose();
                  }
                }}
                className="w-1/3 bg-destructive/10 text-destructive font-medium py-2.5 rounded-md hover:bg-destructive/20 transition-colors"
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
                    onClose();
                  }
                }}
                className="flex-1 bg-foreground text-background font-medium py-2.5 rounded-md hover:opacity-90 transition-opacity"
              >
                Restore Transaction
              </button>
            )}
            {!initialData?.isVoided && (
              <button type="submit" className="flex-1 bg-primary text-primary-foreground font-medium py-2.5 rounded-md hover:opacity-90 transition-opacity">
                Save
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
