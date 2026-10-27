import { describe, it, expect } from 'vitest';
import {
  FLOATING_SHOW_AT,
  FLOATING_HIDE_AT,
  resolveFloatingVisible,
  resolveBackToTopVisible,
} from './scroll';

describe('scroll threshold utilities', () => {
  it('returns false at initial scroll position 0', () => {
    expect(resolveFloatingVisible(0, false)).toBe(false);
    expect(resolveFloatingVisible(FLOATING_SHOW_AT, false)).toBe(false);
  });

  it('shows floating header after crossing FLOATING_SHOW_AT (120px)', () => {
    expect(resolveFloatingVisible(121, false)).toBe(true);
  });

  it('keeps floating header visible in hysteresis zone (24px < scrollY <= 120px)', () => {
    expect(resolveFloatingVisible(60, true)).toBe(true);
    expect(resolveFloatingVisible(100, true)).toBe(true);
    expect(resolveFloatingVisible(FLOATING_HIDE_AT + 1, true)).toBe(true);
  });

  it('hides floating header when scrolling back to or below FLOATING_HIDE_AT (24px)', () => {
    expect(resolveFloatingVisible(FLOATING_HIDE_AT, true)).toBe(false);
    expect(resolveFloatingVisible(10, true)).toBe(false);
  });

  it('shows back-to-top only after scrolling at least 1 viewport height', () => {
    expect(resolveBackToTopVisible(599, 600)).toBe(false);
    expect(resolveBackToTopVisible(600, 600)).toBe(true);
    expect(resolveBackToTopVisible(850, 600)).toBe(true);
  });

  it('returns false for NaN, Infinity, or negative inputs', () => {
    expect(resolveFloatingVisible(Number.NaN, false)).toBe(false);
    expect(resolveFloatingVisible(Number.NaN, true)).toBe(false);
    expect(resolveFloatingVisible(-10, true)).toBe(false);
    expect(resolveBackToTopVisible(Number.NaN, 600)).toBe(false);
    expect(resolveBackToTopVisible(600, Number.NaN)).toBe(false);
  });
});
