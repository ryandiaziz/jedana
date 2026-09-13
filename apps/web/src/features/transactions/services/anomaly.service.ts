export interface SpendingAnomaly {
  id: string;
  type: 'DAILY_SPIKE' | 'UNUSUAL_TRANSACTION';
  title: string;
  description: string;
  amount: number;
  baselineAmount: number;
  ratio: number;
  date: number;
  severity: 'warning' | 'caution';
}

const STORAGE_KEY = 'jedana_dismissed_anomalies';

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

export function getDismissedAnomalyIds(): Set<string> {
  try {
    const storage = getStorage();
    if (!storage) return new Set();
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function dismissAnomaly(anomalyId: string): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    const current = getDismissedAnomalyIds();
    current.add(anomalyId);
    // Keep set bounded to last 50 items to prevent storage bloat
    const list = Array.from(current).slice(-50);
    storage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore localStorage errors
  }
}

interface TxItem {
  id?: string;
  type: string;
  amount: number;
  date: number;
  payee?: string;
  note?: string;
  isVoided?: boolean;
}

/**
 * Pure anomaly detection function.
 * Compares recent spending against a 30-day baseline prior to the reference date.
 */
export function detectSpendingAnomalies(
  transactions: TxItem[],
  referenceDate: Date = new Date()
): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = [];

  // Filter valid expenses
  const validExpenses = transactions.filter((t) => !t.isVoided && t.type === 'EXPENSE');
  if (validExpenses.length === 0) return anomalies;

  // Define reference boundaries: today's start and end
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  const startOfToday = new Date(refYear, refMonth, refDay, 0, 0, 0, 0).getTime();
  const endOfToday = new Date(refYear, refMonth, refDay, 23, 59, 59, 999).getTime();

  // Baseline window: 30 days before today
  const baselineStart = startOfToday - 30 * 24 * 60 * 60 * 1000;
  const baselineEnd = startOfToday - 1;

  // Group baseline expenses by calendar day
  const baselineExpenses = validExpenses.filter((t) => t.date >= baselineStart && t.date <= baselineEnd);
  const baselineDaysMap: Record<string, number> = {};
  let baselineTotal = 0;

  baselineExpenses.forEach((t) => {
    const d = new Date(t.date);
    const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    baselineDaysMap[dayKey] = (baselineDaysMap[dayKey] || 0) + t.amount;
    baselineTotal += t.amount;
  });

  const activeDaysCount = Object.keys(baselineDaysMap).length;

  // Today's expenses
  const todayExpenses = validExpenses.filter((t) => t.date >= startOfToday && t.date <= endOfToday);
  const todayTotal = todayExpenses.reduce((sum, t) => sum + t.amount, 0);

  // 1. Detect DAILY_SPIKE:
  // Requires at least 3 active baseline days and meaningful baseline spending
  if (activeDaysCount >= 3 && baselineTotal > 0) {
    const dailyAverage = baselineTotal / Math.max(activeDaysCount, 7);

    // Spike condition: >= 2.5x daily average AND nominal jump >= 100k
    if (todayTotal >= 2.5 * dailyAverage && todayTotal - dailyAverage >= 100_000) {
      const ratio = todayTotal / dailyAverage;
      const todayDateStr = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-${String(refDay).padStart(2, '0')}`;
      anomalies.push({
        id: `spike-${todayDateStr}`,
        type: 'DAILY_SPIKE',
        title: 'High Daily Spending Detected',
        description: `Today's spending is ${ratio.toFixed(1)}x higher than your recent daily average.`,
        amount: todayTotal,
        baselineAmount: dailyAverage,
        ratio,
        date: startOfToday,
        severity: 'warning',
      });
    }
  }

  // 2. Detect UNUSUAL_TRANSACTION:
  // Check transactions within the last 3 days (from startOfToday - 2 days to endOfToday)
  const recentWindowStart = startOfToday - 2 * 24 * 60 * 60 * 1000;
  const recentExpenses = validExpenses.filter((t) => t.date >= recentWindowStart && t.date <= endOfToday);

  if (baselineExpenses.length >= 5) {
    const avgTxAmount = baselineTotal / baselineExpenses.length;

    // Find any recent transaction >= 3.5x average transaction size AND >= 150k
    const unusualTxs = recentExpenses
      .filter((t) => t.amount >= 3.5 * avgTxAmount && t.amount >= 150_000)
      .sort((a, b) => b.amount - a.amount);

    if (unusualTxs.length > 0) {
      const topOutlier = unusualTxs[0];
      const ratio = topOutlier.amount / avgTxAmount;
      const targetLabel = topOutlier.payee?.trim() || topOutlier.note?.trim() || 'Uncategorized Expense';

      anomalies.push({
        id: `outlier-${topOutlier.id || topOutlier.date}`,
        type: 'UNUSUAL_TRANSACTION',
        title: 'Unusual Outlier Expense',
        description: `A transaction of "${targetLabel}" is ${ratio.toFixed(1)}x larger than your typical transaction size.`,
        amount: topOutlier.amount,
        baselineAmount: avgTxAmount,
        ratio,
        date: topOutlier.date,
        severity: 'caution',
      });
    }
  }

  return anomalies;
}
