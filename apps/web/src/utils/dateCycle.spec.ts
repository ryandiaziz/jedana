import { describe, it, expect } from 'vitest';
import { getCycleRange } from './dateCycle';

describe('dateCycle utility', () => {
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

  it('handles custom start day 28 for September (28 Aug - 27 Sep)', () => {
    const target = new Date(2026, 8, 5); // Sep 5, 2026
    const range = getCycleRange(target, 28);

    const start = new Date(range.startDate);
    const end = new Date(range.endDate);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7); // August
    expect(start.getDate()).toBe(28);
    expect(start.getHours()).toBe(0);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(8); // September
    expect(end.getDate()).toBe(27);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);

    expect(range.monthName).toBe('September 2026');
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
  });

  it('handles March target month with start day 28 (previous month February)', () => {
    const target = new Date(2026, 2, 10); // Mar 10, 2026
    const range = getCycleRange(target, 28);

    const start = new Date(range.startDate);
    const end = new Date(range.endDate);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(1); // February
    expect(start.getDate()).toBe(28);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(2); // March
    expect(end.getDate()).toBe(27);

    expect(range.monthName).toBe('March 2026');
  });

  it('clamps values below 1 or above 28', () => {
    const target = new Date(2026, 8, 1);
    const rangeUnder = getCycleRange(target, -5);
    expect(new Date(rangeUnder.startDate).getDate()).toBe(1);

    const rangeOver = getCycleRange(target, 50);
    expect(new Date(rangeOver.startDate).getDate()).toBe(28);
  });
});
