import { useState, useMemo } from 'react';
import { Store, ChevronDown, ChevronUp } from 'lucide-react';
import type { TransactionWithTags } from '../../services/transaction.service';
import { cn } from '../../../../utils/cn';

interface TopPayeesProps {
  transactions: TransactionWithTags[];
  title?: string;
  typeFilter?: 'ALL' | 'INCOME' | 'EXPENSE';
}

export function TopPayees({ transactions, title = 'Top Merchants & Payees', typeFilter }: TopPayeesProps) {
  const [showAll, setShowAll] = useState(false);

  const { list, totalAmount, maxAmount } = useMemo(() => {
    const map: Record<string, { name: string; amount: number; count: number }> = {};
    let total = 0;

    transactions.forEach((tx) => {
      const name = tx.payee?.trim() || 'Others / Unspecified';
      if (!map[name]) {
        map[name] = { name, amount: 0, count: 0 };
      }
      map[name].amount += tx.amount;
      map[name].count += 1;
      total += tx.amount;
    });

    const sorted = Object.values(map).sort((a, b) => b.amount - a.amount);
    const max = sorted.length > 0 ? sorted[0].amount : 0;

    return {
      list: sorted,
      totalAmount: total,
      maxAmount: max,
    };
  }, [transactions]);

  const displayedList = showAll ? list : list.slice(0, 5);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (list.length === 0) {
    return (
      <div className="bg-card border border-border/80 p-6 rounded-2xl shadow-xs flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
          <Store size={20} />
        </div>
        <p className="text-sm font-medium">No merchant or payee data available for this selection.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/80 p-5 md:p-6 rounded-2xl flex flex-col gap-4 shadow-xs hover:border-primary/40 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-base tracking-tight">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Store size={16} />
          </div>
          <div className="flex flex-col">
            <span>{title}</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              {typeFilter === 'INCOME' ? 'Income sources breakdown' : 'Top spending destinations'}
            </span>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-muted/80 rounded-lg text-muted-foreground">
          {list.length} {list.length === 1 ? 'payee' : 'payees'}
        </span>
      </div>

      {/* Payee Ranking List */}
      <div className="flex flex-col gap-3 pt-1">
        {displayedList.map((item, index) => {
          const rank = index + 1;
          const percentage = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
          const barWidth = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;

          return (
            <div
              key={item.name}
              className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors group"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left: Rank & Name */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-transform group-hover:scale-105",
                      rank === 1 && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
                      rank === 2 && "bg-slate-400/15 text-slate-600 dark:text-slate-300 border border-slate-400/30",
                      rank === 3 && "bg-orange-600/15 text-orange-600 dark:text-orange-400 border border-orange-600/30",
                      rank > 3 && "bg-muted text-muted-foreground border border-border/50"
                    )}
                  >
                    #{rank}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono font-tabular">
                      {item.count} {item.count === 1 ? 'transaction' : 'transactions'}
                    </span>
                  </div>
                </div>

                {/* Right: Amount & % */}
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-bold font-mono font-tabular text-foreground">
                    {formatCurrency(item.amount)}
                  </span>
                  <span className="text-[11px] font-mono font-tabular text-muted-foreground">
                    {percentage.toFixed(1)}% of total
                  </span>
                </div>
              </div>

              {/* Relative Progress Bar */}
              <div className="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    rank === 1 ? "bg-amber-500" : rank === 2 ? "bg-indigo-500" : "bg-primary/70"
                  )}
                  style={{ width: `${Math.max(barWidth, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More / Less Toggle */}
      {list.length > 5 && (
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-xs font-semibold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-xl transition-all cursor-pointer"
        >
          {showAll ? (
            <>
              <ChevronUp size={14} />
              Show Top 5 Only
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              Show All ({list.length} Merchants)
            </>
          )}
        </button>
      )}
    </div>
  );
}
