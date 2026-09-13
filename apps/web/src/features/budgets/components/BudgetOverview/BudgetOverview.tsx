import { useState } from 'react';
import { BudgetService, type TagBudgetProgress } from '../../services/budget.service';
import BudgetCard from '../BudgetCard/BudgetCard';
import BudgetForm from '../BudgetForm/BudgetForm';
import { ConfirmModal } from '../../../../components/common/ConfirmModal';
import { Target, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BudgetOverviewProps {
  startDate?: number;
  endDate?: number;
  periodLabel?: string;
}

export default function BudgetOverview({ startDate, endDate, periodLabel }: BudgetOverviewProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<TagBudgetProgress | undefined>(undefined);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  const budgetSummary = BudgetService.useBudgetProgress(startDate, endDate);
  const { items, totalLimit, totalSpent, overBudgetCount, nearLimitCount } = budgetSummary;

  const handleEdit = (item: TagBudgetProgress) => {
    setEditingBudget(item);
    setShowForm(true);
  };

  const handleDelete = (budgetId: string) => {
    setDeletingBudgetId(budgetId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <section className="flex flex-col gap-3 md:gap-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Target size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base md:text-lg tracking-tight">Budget Tracking</h3>
              {periodLabel && (
                <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
                  {periodLabel}
                </span>
              )}
            </div>
            {items.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Total Budget: <span className="font-mono font-tabular font-semibold text-foreground">{formatCurrency(totalLimit)}</span>
                {' • '}
                Spent: <span className="font-mono font-tabular font-semibold text-foreground">{formatCurrency(totalSpent)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Status Pills */}
          {overBudgetCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-destructive/15 text-destructive border border-destructive/20">
              <AlertCircle size={13} />
              {overBudgetCount} over limit
            </span>
          ) : items.length > 0 && nearLimitCount === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-success/15 text-success border border-success/20">
              <CheckCircle2 size={13} />
              All on track
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setEditingBudget(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-card border border-border/80 hover:border-primary/50 text-foreground hover:text-primary transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Plus size={14} />
            <span>Set Budget</span>
          </button>
        </div>
      </div>

      {/* Grid of Budget Cards or Empty State */}
      {items.length === 0 ? (
        <div className="bg-card border border-border/80 border-dashed rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl bg-muted/70 flex items-center justify-center text-muted-foreground">
            <Target size={22} />
          </div>
          <div>
            <p className="font-bold text-sm sm:text-base">No budgets set yet</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
              Set monthly spending limits for your tags (e.g. Food, Entertainment) to stay in control of your expenses.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingBudget(undefined);
              setShowForm(true);
            }}
            className="mt-1 text-xs font-semibold text-primary hover:underline underline-offset-4 cursor-pointer"
          >
            + Create your first budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {items.map((item) => (
            <BudgetCard
              key={item.budgetId}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <BudgetForm
          onClose={() => {
            setShowForm(false);
            setEditingBudget(undefined);
          }}
          initialData={editingBudget}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingBudgetId}
        onClose={() => setDeletingBudgetId(null)}
        onConfirm={async () => {
          if (deletingBudgetId) {
            await BudgetService.deleteBudget(deletingBudgetId);
            setDeletingBudgetId(null);
          }
        }}
        title="Delete Budget Limit"
        description="Are you sure you want to delete this budget limit? Past transactions will remain unchanged."
        variant="danger"
        confirmLabel="Delete Budget"
      />
    </section>
  );
}
