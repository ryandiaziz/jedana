import { type RecurringTransaction } from '@jedana/shared';
import { WalletService } from '../../../wallets/services/wallet.service';
import { cn } from '../../../../utils/cn';
import {
  Calendar,
  ArrowDown,
  ArrowUp,
  Edit2,
  Trash2,
  Tag as TagIcon,
  Power,
} from 'lucide-react';

interface RecurringCardProps {
  item: RecurringTransaction;
  onEdit: (item: RecurringTransaction) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentActive: boolean) => void;
}

export default function RecurringCard({
  item,
  onEdit,
  onDelete,
  onToggleActive,
}: RecurringCardProps) {
  const wallets = WalletService.useWallets() || [];
  const wallet = wallets.find((w) => w.id === item.walletId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getFrequencyLabel = () => {
    switch (item.frequency) {
      case 'DAILY':
        return 'Every Day';
      case 'WEEKLY': {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Weekly on ${days[item.dayOfWeek ?? 1]}`;
      }
      case 'MONTHLY':
        return `Monthly on the ${item.dayOfMonth ?? 1}${getOrdinal(item.dayOfMonth ?? 1)}`;
      case 'YEARLY':
        return 'Yearly';
      default:
        return item.frequency;
    }
  };

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  return (
    <div
      className={cn(
        "bg-card border p-4 md:p-5 rounded-2xl flex flex-col justify-between gap-3.5 transition-all duration-200 shadow-xs relative overflow-hidden group",
        item.isActive
          ? "border-border/80 hover:border-primary/40 hover:shadow-md"
          : "border-border/40 opacity-60 bg-muted/20"
      )}
    >
      {/* Top row: Frequency Badge & Power Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
              item.type === 'INCOME'
                ? "bg-success/15 text-success"
                : "bg-destructive/15 text-destructive"
            )}
          >
            {item.type === 'INCOME' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar size={12} />
              {getFrequencyLabel()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggleActive(item.id!, item.isActive)}
            className={cn(
              "px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer min-h-[36px] active:scale-95",
              item.isActive
                ? "bg-primary/15 text-primary hover:bg-primary/25"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            title={item.isActive ? 'Pause recurring' : 'Activate recurring'}
          >
            <Power size={12} />
            <span className="hidden sm:inline">{item.isActive ? 'Active' : 'Paused'}</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(item)}
            className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 rounded-xl transition-all cursor-pointer"
            title="Edit rule"
            aria-label="Edit recurring rule"
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id!)}
            className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90 rounded-xl transition-all cursor-pointer"
            title="Delete rule"
            aria-label="Delete recurring rule"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Middle: Note & Amount */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <h4 className="font-bold text-base md:text-lg tracking-tight truncate group-hover:text-primary transition-colors">
            {item.note}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            {wallet && <span className="font-medium">{wallet.name}</span>}
            {item.payee && (
              <>
                <span>•</span>
                <span className="truncate">{item.payee}</span>
              </>
            )}
          </div>
        </div>

        <div
          className={cn(
            "font-extrabold text-base sm:text-lg md:text-xl font-mono font-tabular whitespace-nowrap shrink-0",
            item.type === 'INCOME' ? "text-success" : "text-foreground"
          )}
        >
          {item.type === 'INCOME' ? '+' : '-'}
          {formatCurrency(item.amount)}
        </div>
      </div>

      {/* Bottom: Tags & Last Generated Date */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {item.tags && item.tags.length > 0 ? (
            item.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
              >
                <TagIcon size={10} />
                {tag}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-muted-foreground/60 italic">No tags</span>
          )}
        </div>

        <div className="text-[11px] font-mono text-muted-foreground shrink-0">
          {item.lastGeneratedDate ? (
            <span>
              Last generated: {new Date(item.lastGeneratedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </span>
          ) : (
            <span>Starts: {new Date(item.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
          )}
        </div>
      </div>
    </div>
  );
}
