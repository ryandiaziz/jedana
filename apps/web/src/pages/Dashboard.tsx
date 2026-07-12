import { useState, useMemo, useRef } from 'react';
import { Plus, ArrowDown, ArrowUp, Wallet as WalletIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import TransactionForm from '../components/TransactionForm';
import { TransactionService, type TransactionWithTags } from '../services/transaction.service';
import { cn } from '../lib/utils';

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
    const month = currentMonthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    
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
  const validTransactions = transactions?.filter(t => !t.isVoided) || [];
  const voidedTransactions = transactions?.filter(t => t.isVoided) || [];
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
        let label = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        
        if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
          label = `Hari ini, ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}`;
        } else if (d.getDate() === today.getDate() - 1 && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
          label = `Kemarin, ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}`;
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
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground">
              <ChevronLeft size={20} />
            </button>
            
            <div className="relative group">
              <h2 
                onClick={() => {
                  try { monthInputRef.current?.showPicker(); } catch (e) { /* fallback for unsupported browsers */ }
                }}
                className="text-2xl md:text-3xl font-bold tracking-tight cursor-pointer group-hover:text-primary transition-colors"
              >
                {monthName}
              </h2>
              <input 
                ref={monthInputRef}
                type="month" 
                value={monthInputValue}
                onChange={handleMonthChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-none"
                title="Pilih Bulan"
              />
            </div>

            <button onClick={handleNextMonth} className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground">
              <ChevronRight size={20} />
            </button>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Aliran dana dari semua dompet</p>
        </div>
        <button 
          onClick={() => { setSelectedTx(undefined); setFormType('EXPENSE'); setShowForm(true); }}
          className="bg-foreground text-background flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity w-full md:w-auto justify-center"
        >
          <Plus size={18} />
          Catat Transaksi
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-2 relative overflow-hidden group hover:border-muted-foreground/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <WalletIcon size={80} />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Sisa Dana (Net)</span>
          <span className={cn("text-4xl font-bold tracking-tight", net >= 0 ? "text-foreground" : "text-destructive")}>
            {formatCurrency(net)}
          </span>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-2 hover:border-muted-foreground/30 transition-colors">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
              <ArrowDown size={12} className="text-success" />
            </div>
            Total Pemasukan
          </span>
          <span className="text-2xl font-bold tracking-tight">
            {formatCurrency(income)}
          </span>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-2 hover:border-muted-foreground/30 transition-colors">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
              <ArrowUp size={12} className="text-destructive" />
            </div>
            Total Pengeluaran
          </span>
          <span className="text-2xl font-bold tracking-tight">
            {formatCurrency(expense)}
          </span>
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-lg tracking-tight">Riwayat Transaksi</h3>
        
        {!transactions ? (
          <div className="text-muted-foreground text-sm animate-pulse">Memuat data...</div>
        ) : validTransactions.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <WalletIcon size={28} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-lg">Belum ada transaksi</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Mulai catat pemasukan atau pengeluaran pertamamu untuk melacak jejak dana di bulan ini.</p>
            </div>
            <button 
              onClick={() => { setSelectedTx(undefined); setFormType('EXPENSE'); setShowForm(true); }}
              className="mt-2 text-sm font-medium underline underline-offset-4 hover:text-muted-foreground transition-colors"
            >
              Mulai mencatat
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
                      className="bg-card border border-border p-4 rounded-xl flex items-center justify-between hover:bg-muted/50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                          tx.type === 'INCOME' ? "bg-success/10 text-success" : "bg-foreground text-background"
                        )}>
                          {tx.type === 'INCOME' ? <ArrowDown size={20} /> : <ArrowUp size={20} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-base">{tx.note || (tx.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran')}</span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {tx.tags && tx.tags.length > 0 && (
                              <>
                                <span className="text-muted-foreground/30 text-xs">•</span>
                                <div className="flex gap-1.5 flex-wrap">
                                  {tx.tags.map(t => (
                                    <span key={t?.id} className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-muted text-foreground">
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
                        "font-bold text-lg whitespace-nowrap ml-4",
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
          <h3 className="font-semibold text-lg tracking-tight text-muted-foreground">Transaksi Dibatalkan</h3>
          <div className="flex flex-col gap-3 opacity-50">
            {voidedTransactions.map(tx => (
              <div 
                key={tx.id} 
                onClick={() => { setSelectedTx(tx); setShowForm(true); }}
                className="bg-card border border-border p-4 rounded-xl flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted text-muted-foreground shrink-0">
                    {tx.type === 'INCOME' ? <ArrowDown size={20} /> : <ArrowUp size={20} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-base line-through">{tx.note || (tx.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran')}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="font-bold text-lg line-through text-muted-foreground ml-4">
                  {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
