export const FINANCIAL_MONTH_STORAGE_KEY = 'jedana_financial_month_start_day';
export const CYCLE_START_DAY_KEY = 'jedana-cycle-start-day';
export const FINANCIAL_MONTH_CHANGED_EVENT = 'jedana_financial_month_changed';

/**
 * Gets the configured starting day of the financial cycle (1 to 28).
 * Defaults to 1 (calendar month: 1st to end of month).
 */
export function getFinancialMonthStartDay(): number {
  if (typeof window === 'undefined') return 1;
  const saved = localStorage.getItem(CYCLE_START_DAY_KEY) || localStorage.getItem(FINANCIAL_MONTH_STORAGE_KEY);
  if (!saved) return 1;
  const day = parseInt(saved, 10);
  return !isNaN(day) && day >= 1 && day <= 28 ? day : 1;
}

/**
 * Updates the financial cycle start day and notifies subscribers.
 */
export function setFinancialMonthStartDay(day: number): void {
  const sanitized = Math.max(1, Math.min(28, Math.floor(day)));
  localStorage.setItem(FINANCIAL_MONTH_STORAGE_KEY, String(sanitized));
  localStorage.setItem(CYCLE_START_DAY_KEY, String(sanitized));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FINANCIAL_MONTH_CHANGED_EVENT, { detail: sanitized }));
  }
}

export interface CycleRange {
  startDate: number;
  endDate: number;
  monthName: string;
  monthInputValue: string;
  rangeLabel: string;
}

/**
 * Formats start and end timestamps into a friendly range string (e.g., "28 Agu – 27 Sep 2026").
 */
export function formatCycleDateRange(startTimestamp: number, endTimestamp: number): string {
  const start = new Date(startTimestamp);
  const end = new Date(endTimestamp);

  const startDay = start.getDate();
  const startMonth = start.toLocaleDateString('id-ID', { month: 'short' });
  const endDay = end.getDate();
  const endMonth = end.toLocaleDateString('id-ID', { month: 'short' });
  const endYear = end.getFullYear();

  if (start.getFullYear() !== end.getFullYear()) {
    const startYear = start.getFullYear();
    return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
  }

  if (start.getMonth() === end.getMonth()) {
    return `${startDay} – ${endDay} ${endMonth} ${endYear}`;
  }

  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;
}

/**
 * Calculates the cycle date boundaries based on target month and startDay (1-28).
 * - If startDay === 1: 1st of target month to end of target month (e.g. 1 Oct – 31 Oct 2026).
 * - If startDay > 1 (e.g. 28): starts on startDay of previous month (e.g. 28 Sep 00:00:00)
 *   and ends on (startDay - 1) of target month (e.g. 27 Oct 23:59:59.999).
 *   Example: Target month October 2026 with startDay 28 -> "28 Sep – 27 Okt 2026"
 */
export function getCycleRange(targetDate: Date, startDay: number = 1): CycleRange {
  const safeStartDay = Math.max(1, Math.min(28, Math.floor(startDay || 1)));
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth(); // 0-11

  let start: Date;
  let end: Date;

  if (safeStartDay === 1) {
    start = new Date(year, month, 1, 0, 0, 0, 0);
    end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  } else {
    // Starts on safeStartDay of previous month (e.g. 28 Sep 00:00:00 for October)
    start = new Date(year, month - 1, safeStartDay, 0, 0, 0, 0);
    // Ends on (safeStartDay - 1) of target month (e.g. 27 Oct 23:59:59.999 for October)
    end = new Date(year, month, safeStartDay - 1, 23, 59, 59, 999);
  }

  const monthName = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const monthInputValue = `${yyyy}-${mm}`;

  const rangeLabel = formatCycleDateRange(start.getTime(), end.getTime());

  return {
    startDate: start.getTime(),
    endDate: end.getTime(),
    monthName,
    monthInputValue,
    rangeLabel,
  };
}

/**
 * Resolves the reference anchor date (year/month) for the current active cycle based on reference date (today).
 * If startDay === 1: returns the current month.
 * If startDay > 1:
 *   - If today.getDate() >= startDay: cycle belongs to next month (e.g. 28 Sep belongs to October 2026: 28 Sep - 27 Oct).
 *   - If today.getDate() < startDay: cycle belongs to current month (e.g. 10 Sep belongs to September 2026: 28 Aug - 27 Sep).
 */
export function getCurrentCycleDate(today: Date = new Date(), startDay: number = 1): Date {
  const safeStartDay = Math.max(1, Math.min(28, Math.floor(startDay || 1)));
  if (safeStartDay === 1) {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const year = today.getFullYear();
  const month = today.getMonth();
  const date = today.getDate();

  if (date >= safeStartDay) {
    return new Date(year, month + 1, 1);
  } else {
    return new Date(year, month, 1);
  }
}

export interface FinancialPeriod {
  startDate: number;      // Unix timestamp ms
  endDate: number;        // Unix timestamp ms
  periodLabel: string;    // Display label, e.g. "September 2026" or "28 Sep – 27 Okt 2026"
  monthInputKey: string;  // YYYY-MM for matching or stepper
  isCalendarMonth: boolean;
}

/**
 * Computes the financial period boundaries for a given reference date and startDay.
 * Uses the payday pattern anchored on startDay.
 */
export function getFinancialPeriodRange(targetDate: Date, startDay: number = getFinancialMonthStartDay()): FinancialPeriod {
  const safeStartDay = Math.max(1, Math.min(28, Math.floor(startDay || 1)));
  const anchorDate = getCurrentCycleDate(targetDate, safeStartDay);
  const cycle = getCycleRange(anchorDate, safeStartDay);
  const isCalendar = safeStartDay === 1;

  return {
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    periodLabel: isCalendar ? cycle.monthName : cycle.rangeLabel,
    monthInputKey: cycle.monthInputValue,
    isCalendarMonth: isCalendar,
  };
}

/**
 * Computes the immediately preceding period range for comparison calculations.
 */
export function getPreviousPeriodRange(targetDate: Date, startDay: number = getFinancialMonthStartDay()): { startDate: number; endDate: number } {
  const safeStartDay = Math.max(1, Math.min(28, Math.floor(startDay || 1)));
  const prevMonthDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
  const prevCycle = getCycleRange(prevMonthDate, safeStartDay);
  return {
    startDate: prevCycle.startDate,
    endDate: prevCycle.endDate,
  };
}
