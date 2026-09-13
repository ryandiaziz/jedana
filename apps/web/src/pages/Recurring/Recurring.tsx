import { useState, useMemo } from 'react';
import { RecurringService, RecurringCard, RecurringForm } from '../../features/recurring';
import { type RecurringTransaction } from '@jedana/shared';
import { Repeat, Plus, Play, CheckCircle2, ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Recurring() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | undefined>(undefined);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [generatorNotice, setGeneratorNotice] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const rawRules = RecurringService.useRecurringTransactions();
  const rules = useMemo(() => rawRules || [], [rawRules]);

  const filteredRules = useMemo(() => {
    if (filterTab === 'ACTIVE') return rules.filter((r) => r.isActive);
    if (filterTab === 'PAUSED') return rules.filter((r) => !r.isActive);
    return rules;
  }, [rules, filterTab]);

  // Estimated monthly totals from active rules
  const { estMonthlyIncome, estMonthlyExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;

    rules.filter((r) => r.isActive).forEach((r) => {
      let multiplier = 1;
      if (r.frequency === 'DAILY') multiplier = 30;
      else if (r.frequency === 'WEEKLY') multiplier = 4.33;
      else if (r.frequency === 'YEARLY') multiplier = 1 / 12;

      const monthlyEquiv = r.amount * multiplier;
      if (r.type === 'INCOME') inc += monthlyEquiv;
      else exp += monthlyEquiv;
    });

    return { estMonthlyIncome: inc, estMonthlyExpense: exp };
  }, [rules]);

  const handleManualGenerate = async () => {
    setIsGenerating(true);
    try {
      const { generatedCount, generatedTitles } = await RecurringService.generateDueTransactions();
      if (generatedCount > 0) {
        setGeneratorNotice(
          `Success! Generated ${generatedCount} transaction(s): ${generatedTitles.slice(0, 3).join(', ')}${
            generatedTitles.length > 3 ? '...' : ''
          }`
        );
      } else {
        setGeneratorNotice('All recurring transactions are up to date. None due today.');
      }
      setTimeout(() => setGeneratorNotice(null), 5000);
    } catch (err) {
      console.error('Error generating transactions:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await RecurringService.toggleActive(id, !currentActive);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this recurring rule? Previously generated transactions will remain in your history.')) {
      await RecurringService.deleteRecurring(id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-500 pb-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Repeat size={20} />
            </div>
            Recurring Transactions
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">
            Automate routine income and expenses with offline-first auto generation
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={handleManualGenerate}
            disabled={isGenerating}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-card border border-border/80 hover:border-primary/50 text-xs font-semibold rounded-xl text-foreground hover:text-primary transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 min-h-[44px]"
            title="Scan and generate transactions due today"
          >
            <Play size={14} className={isGenerating ? "animate-spin" : ""} />
            <span>{isGenerating ? 'Scanning...' : 'Check Due'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingItem(undefined);
              setShowForm(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs sm:text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all cursor-pointer shadow-sm shadow-primary/25 min-h-[44px]"
          >
            <Plus size={16} />
            <span>New Rule</span>
          </button>
        </div>
      </header>

      {/* Generator Notice Banner */}
      {generatorNotice && (
        <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs font-medium text-primary flex items-center gap-2 animate-in fade-in-50 duration-200">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{generatorNotice}</span>
        </div>
      )}

      {/* Bento Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {/* Active Rules Count */}
        <div className="col-span-2 md:col-span-1 bg-card border border-border/80 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active Rules
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono font-tabular">
              {rules.filter((r) => r.isActive).length}
            </span>
            <span className="text-xs text-muted-foreground">of {rules.length} total</span>
          </div>
        </div>

        {/* Est. Monthly Income */}
        <div className="col-span-1 bg-card border border-border/80 p-4 md:p-5 rounded-2xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Est. Routine Income
            </span>
            <div className="w-7 h-7 rounded-xl bg-success/15 flex items-center justify-center text-success">
              <ArrowDown size={14} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-xl font-bold font-mono font-tabular text-success truncate block">
              {formatCurrency(estMonthlyIncome)}
            </span>
            <span className="text-[10px] text-muted-foreground">/ month</span>
          </div>
        </div>

        {/* Est. Monthly Expense */}
        <div className="col-span-1 bg-card border border-border/80 p-4 md:p-5 rounded-2xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Est. Routine Bills
            </span>
            <div className="w-7 h-7 rounded-xl bg-destructive/15 flex items-center justify-center text-destructive">
              <ArrowUp size={14} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-xl font-bold font-mono font-tabular text-destructive truncate block">
              {formatCurrency(estMonthlyExpense)}
            </span>
            <span className="text-[10px] text-muted-foreground">/ month</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex bg-muted/60 p-1 rounded-xl border border-border/40">
          {(['ALL', 'ACTIVE', 'PAUSED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[36px]",
                filterTab === tab
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === 'ALL' ? 'All' : tab === 'ACTIVE' ? 'Active' : 'Paused'}
            </button>
          ))}
        </div>

        <span className="text-xs font-medium text-muted-foreground">
          {filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Rules Grid or Empty State */}
      {filteredRules.length === 0 ? (
        <div className="bg-card border border-border/80 border-dashed rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center text-muted-foreground">
            <Repeat size={26} />
          </div>
          <div>
            <p className="font-bold text-base md:text-lg">No recurring transactions found</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Set up recurring rules for bills, subscriptions, or salaries to be automatically recorded without manual entry.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingItem(undefined);
              setShowForm(true);
            }}
            className="mt-2 text-xs md:text-sm font-semibold text-primary hover:underline underline-offset-4 cursor-pointer"
          >
            + Create your first rule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {filteredRules.map((item) => (
            <RecurringCard
              key={item.id}
              item={item}
              onEdit={(rule) => {
                setEditingItem(rule);
                setShowForm(true);
              }}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <RecurringForm
          onClose={() => {
            setShowForm(false);
            setEditingItem(undefined);
          }}
          initialData={editingItem}
        />
      )}
    </div>
  );
}
