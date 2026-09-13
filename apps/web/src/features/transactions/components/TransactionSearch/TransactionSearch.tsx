import { useState, useMemo, useEffect } from 'react';
import { type TransactionWithTags } from '../../services/transaction.service';
import { TagService } from '../../../tags/services/tag.service';
import { Search, X, Filter, ChevronDown } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export interface FilterCriteria {
  query: string;
  type: 'ALL' | 'EXPENSE' | 'INCOME';
  tagId: string;
  minAmount?: number;
  maxAmount?: number;
}

interface TransactionSearchProps {
  transactions: TransactionWithTags[];
  onFiltered: (filtered: TransactionWithTags[], criteria: FilterCriteria) => void;
}

export default function TransactionSearch({ transactions, onFiltered }: TransactionSearchProps) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [tagId, setTagId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [amountFilter, setAmountFilter] = useState<'ALL' | '<100k' | '100k-500k' | '>500k'>('ALL');

  const rawTags = TagService.useAllTags();
  const activeTags = useMemo(() => (rawTags || []).filter((t) => !t.isArchived && !t.isDeleted), [rawTags]);

  // Compute active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (type !== 'ALL') count++;
    if (tagId) count++;
    if (amountFilter !== 'ALL') count++;
    return count;
  }, [query, type, tagId, amountFilter]);

  // Perform client-side filter
  useEffect(() => {
    let minAmount: number | undefined;
    let maxAmount: number | undefined;

    if (amountFilter === '<100k') {
      maxAmount = 100000;
    } else if (amountFilter === '100k-500k') {
      minAmount = 100000;
      maxAmount = 500000;
    } else if (amountFilter === '>500k') {
      minAmount = 500000;
    }

    const q = query.trim().toLowerCase();

    const filtered = transactions.filter((tx) => {
      // 1. Type
      if (type !== 'ALL' && tx.type !== type) return false;

      // 2. Tag
      if (tagId) {
        const hasTag = tx.tags?.some((t) => t.id === tagId);
        if (!hasTag) return false;
      }

      // 3. Amount range
      if (minAmount !== undefined && tx.amount < minAmount) return false;
      if (maxAmount !== undefined && tx.amount > maxAmount) return false;

      // 4. Query text
      if (q) {
        const inNote = tx.note?.toLowerCase().includes(q);
        const inPayee = tx.payee?.toLowerCase().includes(q);
        const inTag = tx.tags?.some((t) => t.name.toLowerCase().includes(q));
        const inAmount = String(tx.amount).includes(q);
        if (!inNote && !inPayee && !inTag && !inAmount) return false;
      }

      return true;
    });

    onFiltered(filtered, {
      query,
      type,
      tagId,
      minAmount,
      maxAmount,
    });
  }, [transactions, query, type, tagId, amountFilter, onFiltered]);

  const handleReset = () => {
    setQuery('');
    setType('ALL');
    setTagId('');
    setAmountFilter('ALL');
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Search Bar Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Search
            size={16}
            className="absolute left-3.5 text-muted-foreground pointer-events-none transition-colors"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, payees, tags, or amounts..."
            className="w-full bg-card border border-border/80 rounded-xl pl-9 pr-9 py-2.5 min-h-[44px] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs active:scale-95 shrink-0",
            showFilters || activeFilterCount > 0
              ? "bg-primary text-primary-foreground border-primary shadow-primary/25"
              : "bg-card text-muted-foreground hover:text-foreground border-border/80 hover:border-primary/40"
          )}
          aria-expanded={showFilters}
          aria-label="Toggle filters"
        >
          <Filter size={15} />
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 && (
            <span
              className={cn(
                "w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center font-mono",
                showFilters
                  ? "bg-white text-primary"
                  : "bg-primary text-primary-foreground"
              )}
            >
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            size={14}
            className={cn("transition-transform duration-200", showFilters ? "rotate-180" : "")}
          />
        </button>
      </div>

      {/* Expandable Filter Drawer / Chips Panel */}
      {showFilters && (
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs flex flex-col gap-3.5 animate-in fade-in-50 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Filter Options
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-primary hover:underline underline-offset-4 cursor-pointer"
              >
                Reset all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Type Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Type
              </label>
              <div className="flex bg-muted/70 p-1 rounded-xl border border-border/40">
                {(['ALL', 'EXPENSE', 'INCOME'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[36px] flex items-center justify-center",
                      type === t
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t === 'ALL' ? 'All' : t === 'EXPENSE' ? 'Expense' : 'Income'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tag / Category
              </label>
              <select
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
                className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 min-h-[44px] text-xs font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
              >
                <option value="">All Tags</option>
                {activeTags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Range */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Nominal Range
              </label>
              <select
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value as typeof amountFilter)}
                className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 min-h-[44px] text-xs font-medium font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
              >
                <option value="ALL">All Amounts</option>
                <option value="<100k">&lt; Rp 100.000</option>
                <option value="100k-500k">Rp 100.000 – Rp 500.000</option>
                <option value=">500k">&gt; Rp 500.000</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Quick Active Filter Pills if collapsed and active */}
      {!showFilters && activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] font-semibold text-muted-foreground">Filtered by:</span>
          {query && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">
              "{query}"
              <X size={11} className="cursor-pointer" onClick={() => setQuery('')} />
            </span>
          )}
          {type !== 'ALL' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">
              {type}
              <X size={11} className="cursor-pointer" onClick={() => setType('ALL')} />
            </span>
          )}
          {tagId && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">
              Tag: {activeTags.find((t) => t.id === tagId)?.name || 'Tag'}
              <X size={11} className="cursor-pointer" onClick={() => setTagId('')} />
            </span>
          )}
          {amountFilter !== 'ALL' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground font-mono">
              {amountFilter}
              <X size={11} className="cursor-pointer" onClick={() => setAmountFilter('ALL')} />
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] font-semibold text-primary hover:underline ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
