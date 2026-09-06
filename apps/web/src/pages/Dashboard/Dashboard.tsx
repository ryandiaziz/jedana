import { useState, useMemo, useRef } from 'react';
import { Plus, ArrowDown, ArrowUp, Wallet as WalletIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import TransactionForm from '../../features/transactions/components/TransactionForm';
import { TransactionService, type TransactionWithTags } from '../../features/transactions/services/transaction.service';
import { cn } from '../../utils/cn';

export default function Dashboard() {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [selectedTx, setSelectedTx] = useState<TransactionWithTags | undefined>(undefined);
  const monthInputRef = useRef<HTMLInputElement>(null);
  
  // State for Month Navigation
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const { startDate, endDate, monthName, monthInputValue } = useMemo(() => {
    const start = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1).getTime();
    const end = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const month = currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // YYYY-MM for <input type="month">
    const yyyy = currentMonthDate.getFullYear();
    const mm = String(currentMonthDate.getMonth() + 1).padStart(2, '0');
    const inputValue = `${yyyy}-${mm}`;
    
    return { startDate: start, endDate: end, monthName: month, monthInputValue: inputValue };
  }, [currentMonthDate]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [year, month] = e.target.value.split('-');
    setCurrentMonthDate(new Date(Number(year), Number(month) - 1, 1));
  };

  const transactions = TransactionService.useRecentTransactions(startDate, endDate);
  const validTransactions = useMemo(() => transactions?.filter(t => !t.isVoided) || [], [transactions]);
  const voidedTransactions = useMemo(() => transactions?.filter(t => t.isVoided) || [], [transactions]);
  const { income, expense, net } = TransactionService.useSummary(startDate, endDate);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  // Group valid transactions by Date string (YYYY-MM-DD)
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, {
      dateStr: string,
      label: string,
      income: number,
      expense: number,
      transactions: TransactionWithTags[]
    }> = {};

    validTransactions.forEach(tx => {
      const d = new Date(tx.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      if (!groups[dateKey]) {
        // Build pretty label
        const today = new Date();
        let label = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        
        if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
          label = `Today, ${d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}`;
        } else if (d.getDate() === today.getDate() - 1 && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
          label = `Yesterday, ${d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}`;
        }
        
        groups[dateKey] = {
          dateStr: dateKey,
          label,
          income: 0,
          expense: 0,
          transactions: []
        };
      }
      
      // Sort the transactions inside the group by time (descending)
      groups[dateKey].transactions.push(tx);
      groups[dateKey].transactions.sort((a, b) => b.date - a.date);
      
      if (tx.type === 'INCOME') groups[dateKey].income += tx.amount;
      if (tx.type === 'EXPENSE') groups[dateKey].expense += tx.amount;
    });

    // Convert to array and sort descending by dateKey
    return Object.values(groups).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [validTransactions]);

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-500 pb-6">
      {/* Header & Controls */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col gap-1">
          {/* Month Stepper Pill */}
          <div className="inline-flex items-center gap-1.5 bg-card/80 border border-border/80 px-2 py-1 rounded-2xl shadow-xs">
            <button 
              onClick={handlePrevMonth} 
              className="w-9 h-9 flex items-center justify-center hover:bg-muted active:scale-90 rounded-xl transition-all text-muted-foreground hover:text-foreground cursor-pointer"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="relative group px-1">
              <h2 
                key={monthName}
                onClick={() => {
                  try { monthInputRef.current?.showPicker(); } catch { /* fallback for unsupported browsers */ }
                }}
                className="text-base sm:text-lg md:text-xl font-bold tracking-tight cursor-pointer group-hover:text-primary transition-colors animate-month-switch select-none"
              >
                {monthName}
              </h2>
              <input 
                ref={monthInputRef}
                type="month" 
                value={monthInputValue}
                onChange={handleMonthChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-none"
                title="Select Month"
              />
            </div>

            <button 
              onClick={handleNextMonth} 
              className="w-9 h-9 flex items-center justify-center hover:bg-muted active:scale-90 rounded-xl transition-all text-muted-foreground hover:text-foreground cursor-pointer"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <p className="text-muted-foreground text-xs font-medium pl-1">Cash flow overview across all wallets</p>
        </div>

        <button 
          onClick={() => { setSelectedTx(undefined); setFormType('EXPENSE'); setShowForm(true); }}
          className="hidden md:flex bg-primary text-primary-foreground items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all justify-center cursor-pointer shadow-sm shadow-primary/25"
        >
          <Plus size={18} />
          New Transaction
        </button>
      </header>

      {/* Bento Grid Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {/* Net Balance (Hero Bento Card): full width on mobile, 1 col on desktop */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-card via-card to-primary/[0.06] border border-border/80 p-5 md:p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group hover:border-primary/40 hover:shadow-md transition-all duration-200">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Balance</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <WalletIcon size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className={cn(
              "text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-extrabold tracking-tight font-mono font-tabular transition-colors duration-200", 
              net >= 0 ? "text-foreground" : "text-destructive"
            )}>
              {formatCurrency(net)}
            </span>
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
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-base md:text-lg tracking-tight">Transaction History</h3>
          {validTransactions.length > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {validTransactions.length} transaction{validTransactions.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        
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
                Track your expenses and income for this month to visualize your financial habits.
              </p>
            </div>
            <button 
              onClick={() => { setSelectedTx(undefined); setFormType('EXPENSE'); setShowForm(true); }}
              className="mt-2 text-xs md:text-sm font-semibold text-primary hover:underline underline-offset-4 cursor-pointer"
            >
              + Add first transaction
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 md:gap-5">
            {groupedTransactions.map(group => (
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
                  {group.transactions.map(tx => (
                    <div 
                      key={tx.id} 
                      onClick={() => { setSelectedTx(tx); setShowForm(true); }}
                      className="bg-card border border-border/70 p-3.5 md:p-4 rounded-2xl flex items-center justify-between hover:border-primary/40 hover:bg-muted/30 active:scale-[0.99] transition-all duration-150 ease-out group cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div className={cn(
                          "w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200",
                          tx.type === 'INCOME' ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                        )}>
                          {tx.type === 'INCOME' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm md:text-base truncate group-hover:text-primary transition-colors">
                            {tx.note || (tx.type === 'INCOME' ? 'Income' : 'Expense')}
                          </span>
                          <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] font-mono font-tabular font-medium text-muted-foreground whitespace-nowrap">
                              {new Date(tx.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {tx.tags && tx.tags.length > 0 && (
                              <>
                                <span className="text-muted-foreground/30 text-[10px]">•</span>
                                <div className="flex gap-1 flex-wrap">
                                  {tx.tags.map(t => (
                                    <span key={t?.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                                      {t?.name}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        "font-bold text-sm sm:text-base md:text-lg font-mono font-tabular whitespace-nowrap ml-3",
                        tx.type === 'INCOME' ? "text-success" : "text-foreground"
                      )}>
                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
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
            {voidedTransactions.map(tx => (
              <div 
                key={tx.id} 
                onClick={() => { setSelectedTx(tx); setShowForm(true); }}
                className="bg-card border border-border p-3 md:p-4 rounded-xl flex items-center justify-between hover:bg-muted/50 hover:border-muted-foreground/30 active:scale-[0.99] transition-all duration-150 ease-out cursor-pointer"
              >
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-muted text-muted-foreground shrink-0">
                    {tx.type === 'INCOME' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm md:text-base line-through truncate">{tx.note || (tx.type === 'INCOME' ? 'Income' : 'Expense')}</span>
                    <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="font-bold text-base md:text-lg line-through text-muted-foreground ml-3 md:ml-4">
                  {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => { setSelectedTx(undefined); setFormType('EXPENSE'); setShowForm(true); }}
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
