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
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-2">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevMonth} 
              className="p-1.5 hover:bg-muted active:scale-90 rounded-md transition-all text-muted-foreground hover:text-foreground cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="relative group">
              <h2 
                key={monthName}
                onClick={() => {
                  try { monthInputRef.current?.showPicker(); } catch { /* fallback for unsupported browsers */ }
                }}
                className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight cursor-pointer group-hover:text-primary transition-colors animate-month-switch"
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
              className="p-1.5 hover:bg-muted active:scale-90 rounded-md transition-all text-muted-foreground hover:text-foreground cursor-pointer"
              title="Next Month"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Cash flow from all wallets</p>
        </div>
        <button 
          onClick={() => { setSelectedTx(undefined); setFormType('EXPENSE'); setShowForm(true); }}
          className="hidden md:flex bg-foreground text-background items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold hover:opacity-90 active:scale-95 transition-all justify-center cursor-pointer shadow-sm"
        >
          <Plus size={18} />
          New Transaction
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-card border border-border p-4 md:p-6 rounded-xl flex flex-col gap-1.5 md:gap-2 relative overflow-hidden group hover:border-muted-foreground/40 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ease-out">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <WalletIcon size={80} />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Net Balance</span>
          <span className={cn("text-2xl md:text-4xl font-bold tracking-tight transition-colors duration-200", net >= 0 ? "text-foreground" : "text-destructive")}>
            {formatCurrency(net)}
          </span>
        </div>
        
        <div className="bg-card border border-border p-4 md:p-6 rounded-xl flex flex-col gap-1.5 md:gap-2 hover:border-muted-foreground/40 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ease-out group">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <ArrowDown size={12} className="text-success" />
            </div>
            Total Income
          </span>
          <span className="text-xl md:text-2xl font-bold tracking-tight">
            {formatCurrency(income)}
          </span>
        </div>

        <div className="bg-card border border-border p-4 md:p-6 rounded-xl flex flex-col gap-1.5 md:gap-2 hover:border-muted-foreground/40 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ease-out group">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <ArrowUp size={12} className="text-destructive" />
            </div>
            Total Expense
          </span>
          <span className="text-xl md:text-2xl font-bold tracking-tight">
            {formatCurrency(expense)}
          </span>
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-lg tracking-tight">Transaction History</h3>
        
        {!transactions ? (
          <div className="text-muted-foreground text-sm animate-pulse">Loading data...</div>
        ) : validTransactions.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <WalletIcon size={28} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-lg">No transactions</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Start recording your first income or expense to track your cash flow this month.</p>
            </div>
            <button 
              onClick={() => { setSelectedTx(undefined); setFormType('EXPENSE'); setShowForm(true); }}
              className="mt-2 text-sm font-medium underline underline-offset-4 hover:text-muted-foreground transition-colors"
            >
              Start tracking
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupedTransactions.map(group => (
              <div key={group.dateStr} className="flex flex-col gap-3">
                {/* Daily Group Header */}
                <div className="flex items-center justify-between px-1 border-b border-border/50 pb-2">
                  <h4 className="font-semibold text-sm">{group.label}</h4>
                  <div className="flex gap-3 text-xs font-medium bg-muted px-2 py-1 rounded-md">
                    {group.income > 0 && <span className="text-success">+{formatCurrency(group.income)}</span>}
                    {group.expense > 0 && <span className="text-foreground">-{formatCurrency(group.expense)}</span>}
                  </div>
                </div>
                
                {/* Daily Transactions */}
                <div className="flex flex-col gap-2">
                  {group.transactions.map(tx => (
                    <div 
                      key={tx.id} 
                      onClick={() => { setSelectedTx(tx); setShowForm(true); }}
                      className="bg-card border border-border p-3 md:p-4 rounded-xl flex items-center justify-between hover:bg-muted/50 hover:border-muted-foreground/30 active:scale-[0.99] transition-all duration-150 ease-out group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div className={cn(
                          "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200",
                          tx.type === 'INCOME' ? "bg-success/10 text-success" : "bg-foreground text-background"
                        )}>
                          {tx.type === 'INCOME' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-sm md:text-base truncate">{tx.note || (tx.type === 'INCOME' ? 'Income' : 'Expense')}</span>
                          <div className="flex items-center gap-2 mt-0.5 md:mt-1 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {new Date(tx.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {tx.tags && tx.tags.length > 0 && (
                              <>
                                <span className="text-muted-foreground/30 text-xs">•</span>
                                <div className="flex gap-1 md:gap-1.5 flex-wrap">
                                  {tx.tags.map(t => (
                                    <span key={t?.id} className="text-[10px] uppercase tracking-wider font-bold px-1.5 md:px-2 py-0.5 rounded-sm bg-muted text-foreground">
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
                        "font-bold text-base md:text-lg whitespace-nowrap ml-3 md:ml-4",
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
        className="md:hidden fixed right-5 bottom-20 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-90 transition-all duration-200 cursor-pointer animate-tab-pop"
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
