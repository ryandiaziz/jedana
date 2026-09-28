import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCycleRange,
  getCurrentCycleDate,
  getFinancialMonthStartDay,
  setFinancialMonthStartDay,
  getFinancialPeriodRange,
  getPreviousPeriodRange,
} from './dateCycle';

describe('dateCycle utility', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      clear: () => {
        store = {};
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };

    // @ts-expect-error mocking global localStorage
    globalThis.localStorage = mockStorage;
    // @ts-expect-error mocking global window
    globalThis.window = {
      dispatchEvent: () => true,
    };
  });

  describe('getCycleRange', () => {
    it('handles standard 1st of month', () => {
      const target = new Date(2026, 8, 15); // Sep 15, 2026
      const range = getCycleRange(target, 1);

      const start = new Date(range.startDate);
      const end = new Date(range.endDate);

      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(8); // September
      expect(start.getDate()).toBe(1);
      expect(start.getHours()).toBe(0);

      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(8); // September (30 days in Sep)
      expect(end.getDate()).toBe(30);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);

      expect(range.monthName).toBe('September 2026');
    });

    it('handles custom start day 28 for October (28 Sep - 27 Oct)', () => {
      const target = new Date(2026, 9, 1); // October 2026
      const range = getCycleRange(target, 28);

      const start = new Date(range.startDate);
      const end = new Date(range.endDate);

      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(8); // September
      expect(start.getDate()).toBe(28);
      expect(start.getHours()).toBe(0);

      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(9); // October
      expect(end.getDate()).toBe(27);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);

      expect(range.monthName).toBe('October 2026');
      expect(range.rangeLabel).toBe('28 Sep – 27 Okt 2026');
    });

    it('handles custom start day 28 for November (28 Oct - 27 Nov)', () => {
      const target = new Date(2026, 10, 1); // November 2026
      const range = getCycleRange(target, 28);

      const start = new Date(range.startDate);
      const end = new Date(range.endDate);

      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(9); // October
      expect(start.getDate()).toBe(28);

      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(10); // November
      expect(end.getDate()).toBe(27);

      expect(range.monthName).toBe('November 2026');
      expect(range.rangeLabel).toBe('28 Okt – 27 Nov 2026');
    });

    it('handles January target month with start day 28 (wrapping to December of previous year)', () => {
      const target = new Date(2026, 0, 10); // Jan 10, 2026
      const range = getCycleRange(target, 28);

      const start = new Date(range.startDate);
      const end = new Date(range.endDate);

      expect(start.getFullYear()).toBe(2025);
      expect(start.getMonth()).toBe(11); // December
      expect(start.getDate()).toBe(28);

      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(0); // January
      expect(end.getDate()).toBe(27);

      expect(range.monthName).toBe('January 2026');
      expect(range.rangeLabel).toBe('28 Des 2025 – 27 Jan 2026');
    });

    it('clamps values below 1 or above 28', () => {
      const target = new Date(2026, 8, 1);
      const rangeUnder = getCycleRange(target, -5);
      expect(new Date(rangeUnder.startDate).getDate()).toBe(1);

      const rangeOver = getCycleRange(target, 50);
      expect(new Date(rangeOver.startDate).getDate()).toBe(28);
    });

    it('getCurrentCycleDate correctly identifies active cycle', () => {
      // 28 September 2026 (day of payday) -> starts October 2026 cycle (28 Sep - 27 Oct)
      const onPayday = new Date(2026, 8, 28);
      const anchorOn = getCurrentCycleDate(onPayday, 28);
      expect(anchorOn.getMonth()).toBe(9); // October
      expect(anchorOn.getFullYear()).toBe(2026);

      // 27 September 2026 (day before payday) -> belongs to September 2026 cycle (28 Aug - 27 Sep)
      const beforePayday = new Date(2026, 8, 27);
      const anchorBefore = getCurrentCycleDate(beforePayday, 28);
      expect(anchorBefore.getMonth()).toBe(8); // September
      expect(anchorBefore.getFullYear()).toBe(2026);

      // 5 October 2026 (before October payday) -> belongs to October 2026 cycle (28 Sep - 27 Oct)
      const inCycle = new Date(2026, 9, 5);
      const anchorIn = getCurrentCycleDate(inCycle, 28);
      expect(anchorIn.getMonth()).toBe(9); // October
      expect(anchorIn.getFullYear()).toBe(2026);

      // 28 October 2026 -> starts November 2026 cycle (28 Oct - 27 Nov)
      const octPayday = new Date(2026, 9, 28);
      const anchorOct = getCurrentCycleDate(octPayday, 28);
      expect(anchorOct.getMonth()).toBe(10); // November
      expect(anchorOct.getFullYear()).toBe(2026);

      // Standard calendar month (startDay === 1)
      const standardDate = new Date(2026, 8, 15);
      const anchorStandard = getCurrentCycleDate(standardDate, 1);
      expect(anchorStandard.getMonth()).toBe(8); // September
    });
  });

  describe('Financial Cycle Start Day & Period Range (Development)', () => {
    it('should default financial month start day to 1', () => {
      expect(getFinancialMonthStartDay()).toBe(1);
    });

    it('should update and clamp financial month start day', () => {
      setFinancialMonthStartDay(25);
      expect(getFinancialMonthStartDay()).toBe(25);

      setFinancialMonthStartDay(35);
      expect(getFinancialMonthStartDay()).toBe(28); // clamped to 28

      setFinancialMonthStartDay(0);
      expect(getFinancialMonthStartDay()).toBe(1); // clamped to 1
    });

    it('should compute standard calendar month range when startDay is 1', () => {
      const testDate = new Date(2026, 8, 15); // Sep 15, 2026
      const period = getFinancialPeriodRange(testDate, 1);

      const start = new Date(period.startDate);
      const end = new Date(period.endDate);

      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(8); // Sep
      expect(start.getDate()).toBe(1);

      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(8); // Sep
      expect(end.getDate()).toBe(30); // Sep has 30 days
      expect(period.isCalendarMonth).toBe(true);
    });

    it('should compute custom cycle range (e.g. 25th) correctly', () => {
      // Case 1: Date is after startDay (Sep 26, 2026) -> period is Sep 25 to Oct 24
      const dateAfter = new Date(2026, 8, 26);
      const periodAfter = getFinancialPeriodRange(dateAfter, 25);

      const startAfter = new Date(periodAfter.startDate);
      const endAfter = new Date(periodAfter.endDate);

      expect(startAfter.getDate()).toBe(25);
      expect(startAfter.getMonth()).toBe(8); // Sep
      expect(endAfter.getDate()).toBe(24);
      expect(endAfter.getMonth()).toBe(9); // Oct
      expect(periodAfter.isCalendarMonth).toBe(false);

      // Case 2: Date is before startDay (Sep 10, 2026) -> period is Aug 25 to Sep 24
      const dateBefore = new Date(2026, 8, 10);
      const periodBefore = getFinancialPeriodRange(dateBefore, 25);

      const startBefore = new Date(periodBefore.startDate);
      const endBefore = new Date(periodBefore.endDate);

      expect(startBefore.getDate()).toBe(25);
      expect(startBefore.getMonth()).toBe(7); // Aug
      expect(endBefore.getDate()).toBe(24);
      expect(endBefore.getMonth()).toBe(8); // Sep
    });

    it('should compute previous period correctly for comparison', () => {
      const testDate = new Date(2026, 8, 15); // Sep 15, 2026
      const prev = getPreviousPeriodRange(testDate, 1);

      const prevStart = new Date(prev.startDate);
      const prevEnd = new Date(prev.endDate);

      expect(prevStart.getMonth()).toBe(7); // Aug
      expect(prevStart.getDate()).toBe(1);
      expect(prevEnd.getMonth()).toBe(7); // Aug
      expect(prevEnd.getDate()).toBe(31);
    });
  });
});
