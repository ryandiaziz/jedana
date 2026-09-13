import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  ArrowDown,
  ArrowUp,
  Wallet as WalletIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import TransactionForm from '../../features/transactions/components/TransactionForm';
import { TransactionService, type TransactionWithTags } from '../../features/transactions/services/transaction.service';
import { TransactionSearch, type FilterCriteria } from '../../features/transactions/components/TransactionSearch';
import { BudgetOverview } from '../../features/budgets';
import {
  getFinancialMonthStartDay,
  getFinancialPeriodRange,
  getPreviousPeriodRange,
  FINANCIAL_MONTH_CHANGED_EVENT,
} from '../../utils/dateCycle';
import { cn } from '../../utils/cn';

export default function Dashboard() {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [selectedTx, setSelectedTx] = useState<TransactionWithTags | undefined>(undefined);
  const monthInputRef = useRef<HTMLInputElement>(null);

  // Financial cycle start day from user setting
  const [startDay, setStartDay] = useState(getFinancialMonthStartDay());

  useEffect(() => {
    const handleStartDayChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (customEvent.detail) setStartDay(customEvent.detail);
    };
    window.addEventListener(FINANCIAL_MONTH_CHANGED_EVENT, handleStartDayChange);
    return () => window.removeEventListener(FINANCIAL_MONTH_CHANGED_EVENT, handleStartDayChange);
  }, []);

  // State for Month Navigation
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Compute current and previous financial periods
  const { startDate, endDate, periodLabel, monthInputKey, isCalendarMonth } = useMemo(() => {
    return getFinancialPeriodRange(currentMonthDate, startDay);
  }, [currentMonthDate, startDay]);

  const { startDate: prevStartDate, endDate: prevEndDate } = useMemo(() => {
    return getPreviousPeriodRange(currentMonthDate, startDay);
  }, [currentMonthDate, startDay]);

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [year, month] = e.target.value.split('-');
    setCurrentMonthDate(new Date(Number(year), Number(month) - 1, 1));
  };

  // Transactions query
  const transactions = TransactionService.useRecentTransactions(startDate, endDate);
  const validTransactions = useMemo(() => transactions?.filter((t) => !t.isVoided) || [], [transactions]);
  const voidedTransactions = useMemo(() => transactions?.filter((t) => t.isVoided) || [], [transactions]);

  // Summaries: current vs previous period
  const { income, expense, net } = TransactionService.useSummary(startDate, endDate);
  const { income: prevIncome, expense: prevExpense, net: prevNet } = TransactionService.useSummary(
    prevStartDate,
    prevEndDate
  );

  // Monthly Comparison Deltas
  const incomeDelta = useMemo(() => {
    if (prevIncome === 0) return null;
    return ((income - prevIncome) / prevIncome) * 100;
  }, [income, prevIncome]);

  const expenseDelta = useMemo(() => {
    if (prevExpense === 0) return null;
    return ((expense - prevExpense) / prevExpense) * 100;
  }, [expense, prevExpense]);

  const netDelta = useMemo(() => {
    return net - prevNet;
  }, [net, prevNet]);

  // Search & Filter State
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithTags[] | null>(null);

  const handleFiltered = useCallback((results: TransactionWithTags[], criteria: FilterCriteria) => {
    const isFilterActive = !!(
      criteria.query.trim() ||
      criteria.type !== 'ALL' ||
      criteria.tagId ||
      criteria.minAmount !== undefined ||
      criteria.maxAmount !== undefined
    );

    if (isFilterActive) {
      setFilteredTransactions(results);
    } else {
      setFilteredTransactions(null);
    }
  }, []);

  const displayTransactions = filteredTransactions !== null ? filteredTransactions : validTransactions;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Group transactions by Date string (YYYY-MM-DD)
  const groupedTransactions = useMemo(() => {
    const groups: Record<
      string,
      {
        dateStr: string;
        label: string;
        income: number;
        expense: number;
        transactions: TransactionWithTags[];
      }
    > = {};

    displayTransactions.forEach((tx) => {
      const d = new Date(tx.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (!groups[dateKey]) {
        const today = new Date();
        let label = d.toLocaleDateString('en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        if (
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear()
        ) {
          label = `Today, ${d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}`;
        } else if (
          d.getDate() === today.getDate() - 1 &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear()
        ) {
          label = `Yesterday, ${d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}`;
        }

        groups[dateKey] = {
          dateStr: dateKey,
          label,
          income: 0,
          expense: 0,
          transactions: [],
        };
      }

      groups[dateKey].transactions.push(tx);
      groups[dateKey].transactions.sort((a, b) => b.date - a.date);

      if (tx.type === 'INCOME') groups[dateKey].income += tx.amount;
      if (tx.type === 'EXPENSE') groups[dateKey].expense += tx.amount;
    });

    return Object.values(groups).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [displayTransactions]);

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-500 pb-6">
      {/* Header & Controls */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col gap-1">
          {/* Month / Period Stepper Pill */}
          <div className="inline-flex items-center gap-1.5 bg-card/80 border border-border/80 px-2 py-1 rounded-2xl shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="w-9 h-9 flex items-center justify-center hover:bg-muted active:scale-90 rounded-xl transition-all text-muted-foreground hover:text-foreground cursor-pointer"
              title="Previous Period"
              aria-label="Previous Period"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="relative group px-1">
              <h2
                key={periodLabel}
                onClick={() => {
                  try {
                    monthInputRef.current?.showPicker();
                  } catch {
                    /* fallback for unsupported browsers */
                  }
                }}
                className="text-sm sm:text-base md:text-lg font-bold tracking-tight cursor-pointer group-hover:text-primary transition-colors animate-month-switch select-none"
              >
                {periodLabel}
              </h2>
              <input
                ref={monthInputRef}
                type="month"
                value={monthInputKey}
                onChange={handleMonthChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-none"
                title="Select Month"
              />
            </div>

            <button
              onClick={handleNextMonth}
              className="w-9 h-9 flex items-center justify-center hover:bg-muted active:scale-90 rounded-xl transition-all text-muted-foreground hover:text-foreground cursor-pointer"
              title="Next Period"
              aria-label="Next Period"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <p className="text-muted-foreground text-xs font-medium pl-1">
            Cash flow overview {!isCalendarMonth && `(Cycle start: ${startDay})`}
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedTx(undefined);
            setFormType('EXPENSE');
            setShowForm(true);
          }}
          className="hidden md:flex bg-primary text-primary-foreground items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all justify-center cursor-pointer shadow-sm shadow-primary/25 min-h-[44px]"
        >
          <Plus size={18} />
          New Transaction
        </button>
      </header>

      {/* Bento Grid Summary Cards with Monthly Comparison */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {/* Net Balance (Hero Bento Card) */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-card via-card to-primary/[0.06] border border-border/80 p-5 md:p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group hover:border-primary/40 hover:shadow-md transition-all duration-200">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Balance</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <WalletIcon size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={cn(
                "text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-extrabold tracking-tight font-mono font-tabular transition-colors duration-200 block",
                net >= 0 ? "text-foreground" : "text-destructive"
              )}
            >
              {formatCurrency(net)}
            </span>

            {/* Delta vs Previous Period */}
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-mono font-tabular">
              {netDelta > 0 ? (
                <span className="inline-flex items-center gap-1 font-bold text-success bg-success/15 px-2 py-0.5 rounded-md">
                  <TrendingUp size={12} />
                  +{formatCurrency(netDelta)}
                </span>
              ) : netDelta < 0 ? (
                <span className="inline-flex items-center gap-1 font-bold text-destructive bg-destructive/15 px-2 py-0.5 rounded-md">
                  <TrendingDown size={12} />
                  -{formatCurrency(Math.abs(netDelta))}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  <Minus size={12} />
                  No change
                </span>
              )}
              <span className="text-muted-foreground text-[10px]">vs last period</span>
            </div>
          </div>
        </div>

        {/* Total Income */}
        <div className="col-span-1 bg-card border border-border/80 p-4 md:p-5 rounded-2xl flex flex-col justify-between hover:border-success/40 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Income</span>
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-success/15 flex items-center justify-center text-success group-hover:scale-110 transition-transform">
              <ArrowDown size={14} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight font-mono font-tabular text-success truncate block">
              {formatCurrency(income)}
            </span>

            {/* Delta vs Previous Period */}
            <div className="flex items-center gap-1 mt-1.5 text-[11px] font-mono font-tabular">
              {incomeDelta !== null ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded",
                    incomeDelta >= 0 ? "text-success bg-success/15" : "text-muted-foreground bg-muted"
                  )}
                >
                  {incomeDelta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {incomeDelta >= 0 ? `+${incomeDelta.toFixed(1)}%` : `${incomeDelta.toFixed(1)}%`}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">New</span>
              )}
              <span className="text-muted-foreground text-[10px] hidden sm:inline">vs prev</span>
            </div>
          </div>
        </div>

        {/* Total Expense */}
        <div className="col-span-1 bg-card border border-border/80 p-4 md:p-5 rounded-2xl flex flex-col justify-between hover:border-destructive/40 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expense</span>
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-destructive/15 flex items-center justify-center text-destructive group-hover:scale-110 transition-transform">
              <ArrowUp size={14} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight font-mono font-tabular text-destructive truncate block">
              {formatCurrency(expense)}
            </span>

            {/* Delta vs Previous Period: note that lower expense is positive (green)! */}
            <div className="flex items-center gap-1 mt-1.5 text-[11px] font-mono font-tabular">
              {expenseDelta !== null ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded",
                    expenseDelta <= 0 ? "text-success bg-success/15" : "text-destructive bg-destructive/15"
                  )}
                >
                  {expenseDelta <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                  {expenseDelta >= 0 ? `+${expenseDelta.toFixed(1)}%` : `${expenseDelta.toFixed(1)}%`}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">New</span>
              )}
              <span className="text-muted-foreground text-[10px] hidden sm:inline">vs prev</span>
            </div>
          </div>
        </div>
      </div>

      {/* Budget per Tag Tracking Overview Section */}
      <BudgetOverview startDate={startDate} endDate={endDate} periodLabel={periodLabel} />

      {/* Transaction History Section */}
      <div className="flex flex-col gap-3 md:gap-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base md:text-lg tracking-tight">Transaction History</h3>
            {validTransactions.length > 0 && (
              <span className="text-xs font-medium text-muted-foreground">
                ({displayTransactions.length} of {validTransactions.length})
              </span>
            )}
          </div>
        </div>

        {/* Global Search & Filter Bar */}
        {validTransactions.length > 0 && (
          <TransactionSearch transactions={validTransactions} onFiltered={handleFiltered} />
        )}

        {!transactions ? (
          <div className="text-muted-foreground text-sm animate-pulse p-4">Loading data...</div>
        ) : validTransactions.length === 0 ? (
          <div className="bg-card border border-border/80 border-dashed rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center">
              <WalletIcon size={26} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold text-base md:text-lg">No transactions yet</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Track your expenses and income for this period to visualize your financial habits.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTx(undefined);
                setFormType('EXPENSE');
                setShowForm(true);
              }}
              className="mt-2 text-xs md:text-sm font-semibold text-primary hover:underline underline-offset-4 cursor-pointer"
            >
              + Add first transaction
            </button>
          </div>
        ) : displayTransactions.length === 0 ? (
          <div className="bg-card border border-border/80 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-2">
            <p className="font-semibold text-sm">No transactions match your search</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your keywords or clearing your filters.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 md:gap-5">
            {groupedTransactions.map((group) => (
              <div key={group.dateStr} className="flex flex-col gap-2">
                {/* Daily Group Sticky Header */}
                <div className="flex items-center justify-between px-2 py-1 bg-background/90 backdrop-blur-sm rounded-lg">
                  <h4 className="font-bold text-xs md:text-sm text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </h4>
                  <div className="flex gap-2 text-[11px] font-mono font-tabular font-medium bg-muted/60 px-2 py-0.5 rounded-lg border border-border/40">
                    {group.income > 0 && <span className="text-success">+{formatCurrency(group.income)}</span>}
                    {group.expense > 0 && <span className="text-muted-foreground">-{formatCurrency(group.expense)}</span>}
                  </div>
                </div>

                {/* Daily Transactions */}
                <div className="flex flex-col gap-2">
                  {group.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => {
                        setSelectedTx(tx);
                        setShowForm(true);
                      }}
                      className="bg-card border border-border/70 p-3.5 md:p-4 rounded-2xl flex items-center justify-between hover:border-primary/40 hover:bg-muted/30 active:scale-[0.99] transition-all duration-150 ease-out group cursor-pointer shadow-xs min-h-[44px]"
                    >
                      <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div
                          className={cn(
                            "w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200",
                            tx.type === 'INCOME' ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                          )}
                        >
                          {tx.type === 'INCOME' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm md:text-base truncate group-hover:text-primary transition-colors">
                            {tx.note || (tx.type === 'INCOME' ? 'Income' : 'Expense')}
                          </span>
                          <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] font-mono font-tabular font-medium text-muted-foreground whitespace-nowrap">
                              {new Date(tx.date).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {tx.payee && (
                              <>
                                <span className="text-muted-foreground/30 text-[10px]">•</span>
                                <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[120px]">
                                  {tx.payee}
                                </span>
                              </>
                            )}
                            {tx.tags && tx.tags.length > 0 && (
                              <>
                                <span className="text-muted-foreground/30 text-[10px]">•</span>
                                <div className="flex gap-1 flex-wrap">
                                  {tx.tags.map((t) => (
                                    <span
                                      key={t?.id}
                                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                                    >
                                      {t?.name}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "font-bold text-sm sm:text-base md:text-lg font-mono font-tabular whitespace-nowrap ml-3",
                          tx.type === 'INCOME' ? "text-success" : "text-foreground"
                        )}
                      >
                        {tx.type === 'INCOME' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voided Transactions */}
      {voidedTransactions.length > 0 && (
        <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-border border-dashed">
          <h3 className="font-semibold text-lg tracking-tight text-muted-foreground">Voided Transactions</h3>
          <div className="flex flex-col gap-3 opacity-50">
            {voidedTransactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => {
                  setSelectedTx(tx);
                  setShowForm(true);
                }}
                className="bg-card border border-border p-3 md:p-4 rounded-xl flex items-center justify-between hover:bg-muted/50 hover:border-muted-foreground/30 active:scale-[0.99] transition-all duration-150 ease-out cursor-pointer"
              >
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-muted text-muted-foreground shrink-0">
                    {tx.type === 'INCOME' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm md:text-base line-through truncate">
                      {tx.note || (tx.type === 'INCOME' ? 'Income' : 'Expense')}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="font-bold text-base md:text-lg line-through text-muted-foreground ml-3 md:ml-4">
                  {tx.type === 'INCOME' ? '+' : '-'}
                  {formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => {
          setSelectedTx(undefined);
          setFormType('EXPENSE');
          setShowForm(true);
        }}
        className="md:hidden fixed right-5 z-30 w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-90 transition-all duration-200 cursor-pointer animate-tab-pop"
        style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' }}
        title="New Transaction"
        aria-label="New Transaction"
      >
        <Plus size={26} className="transition-transform active:rotate-90 duration-200" />
      </button>

      {showForm && (
        <TransactionForm
          defaultType={formType}
          initialData={selectedTx}
          onClose={() => {
            setShowForm(false);
            setSelectedTx(undefined);
          }}
        />
      )}
    </div>
  );
}
