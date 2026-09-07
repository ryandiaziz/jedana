export interface CycleRange {
  startDate: number;
  endDate: number;
  monthName: string;
  monthInputValue: string;
  rangeLabel: string;
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
    rangeLabel
  };
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
