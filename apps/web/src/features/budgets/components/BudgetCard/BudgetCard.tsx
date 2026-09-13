import { type TagBudgetProgress } from '../../services/budget.service';
import { cn } from '../../../../utils/cn';
import { Tag as TagIcon, Edit2, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';

interface BudgetCardProps {
  item: TagBudgetProgress;
  onEdit: (item: TagBudgetProgress) => void;
  onDelete: (budgetId: string) => void;
}

export default function BudgetCard({ item, onEdit, onDelete }: BudgetCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const clampedPercentage = Math.min(100, Math.max(0, item.percentage));

  return (
    <div
      className={cn(
        "bg-card border p-4 md:p-5 rounded-2xl flex flex-col gap-3 transition-all duration-200 shadow-xs relative overflow-hidden group",
        item.status === 'danger'
          ? "border-destructive/50 bg-gradient-to-br from-card via-card to-destructive/[0.04]"
          : item.status === 'warning'
          ? "border-amber-500/50 bg-gradient-to-br from-card via-card to-amber-500/[0.04]"
          : "border-border/80 hover:border-primary/40"
      )}
    >
      {/* Top row: Tag & Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
              item.status === 'danger'
                ? "bg-destructive/15 text-destructive"
                : item.status === 'warning'
                ? "bg-amber-500/15 text-amber-500"
                : "bg-primary/10 text-primary"
            )}
          >
            <TagIcon size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm sm:text-base tracking-tight truncate">
              {item.tagName}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              Limit: <span className="font-mono font-tabular">{formatCurrency(item.monthlyLimit)}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Status Badge */}
          {item.status === 'danger' && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-destructive/15 text-destructive font-mono font-tabular">
              <AlertCircle size={12} />
              Over limit
            </span>
          )}
          {item.status === 'warning' && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-tabular">
              <AlertTriangle size={12} />
              &gt;80%
            </span>
          )}

          <button
            type="button"
            onClick={() => onEdit(item)}
            className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 rounded-xl transition-all cursor-pointer"
            title="Edit Budget"
            aria-label={`Edit ${item.tagName} budget`}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.budgetId)}
            className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90 rounded-xl transition-all cursor-pointer"
            title="Delete Budget"
            aria-label={`Delete ${item.tagName} budget`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="h-2.5 w-full bg-muted/80 rounded-full overflow-hidden p-0.5 border border-border/40">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              item.status === 'danger'
                ? "bg-destructive shadow-xs shadow-destructive/40"
                : item.status === 'warning'
                ? "bg-amber-500 shadow-xs shadow-amber-500/40"
                : "bg-primary shadow-xs shadow-primary/40"
            )}
            style={{ width: `${clampedPercentage}%` }}
          />
        </div>

        {/* Bottom row: spent vs remaining metrics */}
        <div className="flex items-center justify-between text-xs font-mono font-tabular mt-0.5">
          <span className="font-semibold text-foreground">
            {formatCurrency(item.spent)}
            <span className="text-muted-foreground text-[11px] font-normal ml-1">spent</span>
          </span>

          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-bold text-[11px]",
                item.status === 'danger'
                  ? "text-destructive"
                  : item.status === 'warning'
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              )}
            >
              {item.remaining >= 0 ? (
                `${formatCurrency(item.remaining)} left`
              ) : (
                `+${formatCurrency(item.remaining)} over`
              )}
            </span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded text-[10px] font-extrabold",
                item.status === 'danger'
                  ? "bg-destructive text-destructive-foreground"
                  : item.status === 'warning'
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {Math.round(item.percentage)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
