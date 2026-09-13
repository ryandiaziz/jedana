export const FINANCIAL_MONTH_STORAGE_KEY = 'jedana_financial_month_start_day';
export const FINANCIAL_MONTH_CHANGED_EVENT = 'jedana_financial_month_changed';

/**
 * Gets the configured starting day of the financial cycle (1 to 28).
 * Defaults to 1 (calendar month: 1st to end of month).
 */
export function getFinancialMonthStartDay(): number {
  if (typeof window === 'undefined') return 1;
  const saved = localStorage.getItem(FINANCIAL_MONTH_STORAGE_KEY);
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
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FINANCIAL_MONTH_CHANGED_EVENT, { detail: sanitized }));
  }
}

export interface FinancialPeriod {
  startDate: number;      // Unix timestamp ms
  endDate: number;        // Unix timestamp ms
  periodLabel: string;    // Display label, e.g. "September 2026" or "25 Aug - 24 Sep 2026"
  monthInputKey: string;  // YYYY-MM for matching or stepper
  isCalendarMonth: boolean;
}

/**
 * Computes the financial period boundaries for a given reference date and startDay.
 * If startDay === 1: 1st 00:00:00 to last day of that month 23:59:59.999.
 * If startDay > 1:
 *   - If targetDate.getDate() < startDay:
 *       Starts on startDay of previous month, ends on (startDay - 1) of targetDate's month.
 *   - If targetDate.getDate() >= startDay:
 *       Starts on startDay of targetDate's month, ends on (startDay - 1) of next month.
 */
export function getFinancialPeriodRange(targetDate: Date, startDay: number = getFinancialMonthStartDay()): FinancialPeriod {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const date = targetDate.getDate();

  if (startDay <= 1) {
    const start = new Date(year, month, 1, 0, 0, 0, 0).getTime();
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
    const monthName = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const yyyy = year;
    const mm = String(month + 1).padStart(2, '0');

    return {
      startDate: start,
      endDate: end,
      periodLabel: monthName,
      monthInputKey: `${yyyy}-${mm}`,
      isCalendarMonth: true
    };
  }

  // Custom cycle (e.g. 25th)
  let periodStartYear: number;
  let periodStartMonth: number;
  let periodEndYear: number;
  let periodEndMonth: number;

  if (date < startDay) {
    // We are in the period that started last month
    const prevDate = new Date(year, month - 1, 1);
    periodStartYear = prevDate.getFullYear();
    periodStartMonth = prevDate.getMonth();
    periodEndYear = year;
    periodEndMonth = month;
  } else {
    // We are in the period that starts this month and ends next month
    const nextDate = new Date(year, month + 1, 1);
    periodStartYear = year;
    periodStartMonth = month;
    periodEndYear = nextDate.getFullYear();
    periodEndMonth = nextDate.getMonth();
  }

  const startObj = new Date(periodStartYear, periodStartMonth, startDay, 0, 0, 0, 0);
  const endObj = new Date(periodEndYear, periodEndMonth, startDay - 1, 23, 59, 59, 999);

  const startFmt = startObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const endFmt = endObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const label = `${startFmt} – ${endFmt}`;

  // Month input key represents the cycle anchor
  const anchorYyyy = periodStartYear;
  const anchorMm = String(periodStartMonth + 1).padStart(2, '0');

  return {
    startDate: startObj.getTime(),
    endDate: endObj.getTime(),
    periodLabel: label,
    monthInputKey: `${anchorYyyy}-${anchorMm}`,
    isCalendarMonth: false
  };
}

/**
 * Computes the immediately preceding period range for comparison calculations.
 */
export function getPreviousPeriodRange(targetDate: Date, startDay: number = getFinancialMonthStartDay()): { startDate: number; endDate: number } {
  if (startDay <= 1) {
    const prevMonthDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    return getFinancialPeriodRange(prevMonthDate, 1);
  }

  // Shift reference date backwards by 1 cycle (roughly 30 days)
  const current = getFinancialPeriodRange(targetDate, startDay);
  const refDate = new Date(current.startDate - 86400000); // 1 day before period start
  return getFinancialPeriodRange(refDate, startDay);
}
