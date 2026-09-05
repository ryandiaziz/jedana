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

  // Premium monochrome/neutral palette that is highly visible on dark backgrounds
  const COLORS = ['#ffffff', '#e4e4e7', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a'];

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
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Statistics</h2>
          <p className="text-muted-foreground text-sm font-medium">Visual analysis of your cash flow</p>
        </div>
        <button onClick={seedDummyData} className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 text-xs font-semibold rounded-md text-muted-foreground transition-colors">
          <Wand2 size={14} />
          Inject Dummy
        </button>
      </header>

      {/* Filter Section */}
      <div className="bg-card border border-border p-4 md:p-5 rounded-xl flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <Filter size={16} />
          Filter Data
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Time Range</label>
            <div className="flex bg-muted rounded-md p-1">
              {(['MONTH', 'YEAR', 'ALL'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium rounded-sm transition-all",
                    period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                className="mt-2 w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors"
                title="Select Time"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Transaction Type</label>
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value as 'ALL' | 'INCOME' | 'EXPENSE')}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors h-9.5"
            >
              <option value="ALL">All Types</option>
              <option value="EXPENSE">Expense Only</option>
              <option value="INCOME">Income Only</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Wallet</label>
            <select 
              value={walletFilter} 
              onChange={e => setWalletFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors h-9.5"
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
        <div className="bg-card border border-border border-dashed p-12 rounded-xl text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <PieIcon size={32} className="opacity-50" />
          <p className="text-sm mt-2">No transaction data for these filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-card border border-border p-4 md:p-6 rounded-xl flex flex-col gap-4 md:gap-6 hover:border-muted-foreground/30 transition-colors">
            <div className="flex items-center gap-2 font-semibold">
              <PieIcon size={18} />
              Composition by Tag
            </div>
            <div className="h-62.5 md:h-75 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: unknown) => formatCurrency(Number(value) || 0)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#09090b', color: '#ffffff' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-card border border-border p-4 md:p-6 rounded-xl flex flex-col gap-4 md:gap-6 hover:border-muted-foreground/30 transition-colors">
            <div className="flex items-center gap-2 font-semibold">
              <BarChart3 size={18} />
              Trend - {typeFilter === 'INCOME' ? 'Income' : typeFilter === 'EXPENSE' ? 'Expense' : 'Activity'}
            </div>
            <div className="h-62.5 md:h-75 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.5} />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#a1a1aa' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#a1a1aa' }}
                    tickFormatter={(value) => `IDR ${(value / 1000)}k`}
                    width={80}
                  />
                  <Tooltip 
                    formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value) || 0), name === 'income' ? 'Income' : 'Expense']}
                    cursor={{ fill: '#27272a' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#09090b', color: '#ffffff' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  {typeFilter === 'ALL' && <Legend />}
                  {typeFilter !== 'EXPENSE' && (
                    <Bar 
                      name="income"
                      dataKey="income" 
                      fill="#22c55e" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={50}
                    />
                  )}
                  {typeFilter !== 'INCOME' && (
                    <Bar 
                      name="expense"
                      dataKey="expense" 
                      fill="#ef4444" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={50}
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
