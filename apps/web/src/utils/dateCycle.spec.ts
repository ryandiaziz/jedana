import { describe, it, expect, beforeEach } from 'vitest';
import {
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
