import { useState, useMemo } from 'react';
import { TransactionService } from '../../features/transactions/services/transaction.service';
import { WalletService } from '../../features/wallets/services/wallet.service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { cn } from '../../utils/cn';
import { Filter, PieChart as PieIcon, BarChart3, Wand2 } from 'lucide-react';

export default function Statistics() {
  const [period, setPeriod] = useState<'MONTH' | 'YEAR' | 'ALL'>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('EXPENSE');
  const [walletFilter, setWalletFilter] = useState<string | 'ALL'>('ALL');
  
  const wallets = WalletService.useWallets() || [];
  
  // Calculate date boundaries
  const { startDate, endDate } = useMemo(() => {
    if (period === 'ALL') return { startDate: undefined, endDate: undefined };
    if (period === 'MONTH') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return { startDate: start, endDate: end };
    }
    // YEAR
    const start = new Date(currentDate.getFullYear(), 0, 1).getTime();
    const end = new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
    return { startDate: start, endDate: end };
  }, [period, currentDate]);

  const rawTransactions = TransactionService.useRecentTransactions(startDate, endDate);
  
  // Apply JS filtering for type and wallet
  const validTransactions = useMemo(() => {
    if (!rawTransactions) return [];
    return rawTransactions.filter(tx => {
      if (tx.isVoided) return false;
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (walletFilter !== 'ALL' && tx.walletId !== walletFilter) return false;
      return true;
    });
  }, [rawTransactions, typeFilter, walletFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  // --- Data for Donut Chart (Group by Tag) ---
  const pieData = useMemo(() => {
    const groups: Record<string, number> = {};
    let untagged = 0;
    
    validTransactions.forEach(tx => {
      if (tx.tags && tx.tags.length > 0) {
        // Divide amount equally among tags if multiple
        const splitAmount = tx.amount / tx.tags.length;
        tx.tags.forEach(t => {
          groups[t.name] = (groups[t.name] || 0) + splitAmount;
        });
      } else {
        untagged += tx.amount;
      }
    });

    const data = Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
      
    if (untagged > 0) {
      data.push({ name: 'Untagged', value: untagged });
    }
    return data;
  }, [validTransactions]);

  // --- Data for Bar Chart (Trend) ---
  const barData = useMemo(() => {
    if (validTransactions.length === 0) return [];

    const groups: Record<string, { label: string, income: number, expense: number, timestamp: number }> = {};

    validTransactions.forEach(tx => {
      const d = new Date(tx.date);
      let key: string;
      let label: string;
      
      if (period === 'MONTH') {
        // Group by day
        key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        label = `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
      } else {
        // Group by month
        key = `${d.getFullYear()}-${d.getMonth()}`;
        label = d.toLocaleDateString('en-US', { month: 'short', year: period === 'ALL' ? '2-digit' : undefined });
      }

      if (!groups[key]) {
        groups[key] = { label, income: 0, expense: 0, timestamp: new Date(d.getFullYear(), d.getMonth(), period === 'MONTH' ? d.getDate() : 1).getTime() };
      }
      if (tx.type === 'INCOME') groups[key].income += tx.amount;
      if (tx.type === 'EXPENSE') groups[key].expense += tx.amount;
    });

    return Object.values(groups).sort((a, b) => a.timestamp - b.timestamp);
  }, [validTransactions, period]);

  // Harmonious multi-color fintech palette with high contrast in both themes
  const COLORS = [
    '#6366F1', // Indigo
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#64748B', // Slate
  ];

  const seedDummyData = async () => {
    if (!confirm('This will generate hundreds of dummy data for 2025-2026. Continue?')) return;
    const tagsExpense = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Gas'];
    const tagsIncome = ['Salary', 'Bonus', 'Freelance', 'Investment'];
    
    for (let year = 2025; year <= 2026; year++) {
      const maxMonth = year === 2026 ? 6 : 11;
      for (let month = 0; month <= maxMonth; month++) {
        const numExpenses = Math.floor(Math.random() * 10) + 5; // 5-15 pengeluaran per bulan
        for (let i = 0; i < numExpenses; i++) {
          const day = Math.floor(Math.random() * 28) + 1;
          const date = new Date(year, month, day, 12, 0).getTime();
          const amount = (Math.floor(Math.random() * 150) + 10) * 1000;
          const tag = tagsExpense[Math.floor(Math.random() * tagsExpense.length)];
          await TransactionService.addTransaction({
            type: 'EXPENSE',
            amount,
            date,
            note: `[DUMMY] ${tag}`,
            tags: [tag]
          });
        }
        
        const numIncomes = Math.floor(Math.random() * 3) + 1; // 1-3 pemasukan per bulan
        for (let i = 0; i < numIncomes; i++) {
          const day = Math.floor(Math.random() * 28) + 1;
          const date = new Date(year, month, day, 10, 0).getTime();
          const amount = (Math.floor(Math.random() * 500) + 100) * 10000;
          const tag = tagsIncome[Math.floor(Math.random() * tagsIncome.length)];
          await TransactionService.addTransaction({
            type: 'INCOME',
            amount,
            date,
            note: `[DUMMY] ${tag}`,
            tags: [tag]
          });
        }
      }
    }
    alert('Done! Dummy data has been injected.');
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-500 pb-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Financial Statistics</h2>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Visual cash flow and expense breakdown</p>
        </div>
        <button 
          onClick={seedDummyData} 
          className="flex items-center gap-2 px-3.5 py-2 bg-muted/80 hover:bg-muted text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-border/50"
        >
          <Wand2 size={14} />
          Seed Mock Data
        </button>
      </header>

      {/* Filter Section (Bento Card) */}
      <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Filter size={15} />
          Filter Analytics
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Time Range</label>
            <div className="flex bg-muted/70 rounded-xl p-1 border border-border/50">
              {(['MONTH', 'YEAR', 'ALL'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    period === p 
                      ? "bg-card text-foreground shadow-xs" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p === 'MONTH' ? 'Month' : p === 'YEAR' ? 'Year' : 'All'}
                </button>
              ))}
            </div>
            {period !== 'ALL' && (
              <input 
                type={period === 'MONTH' ? 'month' : 'number'}
                value={period === 'MONTH' 
                  ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
                  : currentDate.getFullYear()}
                onChange={(e) => {
                  if (!e.target.value) return;
                  if (period === 'MONTH') {
                    const [y, m] = e.target.value.split('-');
                    setCurrentDate(new Date(Number(y), Number(m) - 1, 1));
                  } else {
                    setCurrentDate(new Date(Number(e.target.value), 0, 1));
                  }
                }}
                className="mt-1 w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
                title="Select Time"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Transaction Type</label>
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value as 'ALL' | 'INCOME' | 'EXPENSE')}
              className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
            >
              <option value="ALL">All Types</option>
              <option value="EXPENSE">Expense Only</option>
              <option value="INCOME">Income Only</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2 md:col-span-1">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Wallet / Envelope</label>
            <select 
              value={walletFilter} 
              onChange={e => setWalletFilter(e.target.value)}
              className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
            >
              <option value="ALL">All Wallets</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {validTransactions.length === 0 ? (
        <div className="bg-card border border-border/80 border-dashed p-12 rounded-2xl text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <PieIcon size={32} className="opacity-50" />
          <p className="text-sm mt-2">No transaction data available for the chosen filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Pie Chart Bento Card */}
          <div className="bg-card border border-border/80 p-5 md:p-6 rounded-2xl flex flex-col gap-4 shadow-xs hover:border-primary/40 transition-all">
            <div className="flex items-center gap-2 font-bold text-base tracking-tight">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <PieIcon size={16} />
              </div>
              Composition by Tag
            </div>
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: unknown) => formatCurrency(Number(value) || 0)}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid var(--color-border)', 
                      backgroundColor: 'var(--color-card)', 
                      color: 'var(--color-card-foreground)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart Bento Card */}
          <div className="bg-card border border-border/80 p-5 md:p-6 rounded-2xl flex flex-col gap-4 shadow-xs hover:border-primary/40 transition-all">
            <div className="flex items-center gap-2 font-bold text-base tracking-tight">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <BarChart3 size={16} />
              </div>
              Trend Overview
            </div>
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.6} />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    tickFormatter={(value) => `${(value / 1000)}k`}
                    width={55}
                  />
                  <Tooltip 
                    formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value) || 0), name === 'income' ? 'Income' : 'Expense']}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid var(--color-border)', 
                      backgroundColor: 'var(--color-card)', 
                      color: 'var(--color-card-foreground)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
                    }}
                  />
                  {typeFilter === 'ALL' && <Legend wrapperStyle={{ paddingTop: '10px' }} />}
                  {typeFilter !== 'EXPENSE' && (
                    <Bar 
                      name="income"
                      dataKey="income" 
                      fill="#10B981" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={40}
                    />
                  )}
                  {typeFilter !== 'INCOME' && (
                    <Bar 
                      name="expense"
                      dataKey="expense" 
                      fill="#F43F5E" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={40}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
