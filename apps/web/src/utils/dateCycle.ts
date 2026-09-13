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
 * If startDay === 1: 1st of month to end of month.
 * If startDay > 1 (e.g. 28): 28th of previous month to 27th of target month.
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
    // Starts on safeStartDay of previous month (e.g. 28 Aug 00:00:00)
    start = new Date(year, month - 1, safeStartDay, 0, 0, 0, 0);
    // Ends on (safeStartDay - 1) of target month (e.g. 27 Sep 23:59:59.999)
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
      isCalendarMonth: true,
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
    isCalendarMonth: false,
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
