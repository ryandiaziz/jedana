import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SIDEBAR_STORAGE_KEY,
  getInitialSidebarState,
  saveSidebarState,
} from './sidebarState';

describe('sidebarState', () => {
  let store: Record<string, string> = {};
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = String(val);
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
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
  });

  describe('getInitialSidebarState', () => {
    it('returns true by default when localStorage is empty', () => {
      expect(getInitialSidebarState()).toBe(true);
    });

    it('returns false when sidebar state is stored as "false"', () => {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, 'false');
      expect(getInitialSidebarState()).toBe(false);
    });

    it('returns true when sidebar state is stored as "true"', () => {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true');
      expect(getInitialSidebarState()).toBe(true);
    });

    it('falls back to true when localStorage throws an error', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      expect(getInitialSidebarState()).toBe(true);
    });

    it('returns true if localStorage is undefined', () => {
      // @ts-expect-error testing undefined environment
      delete globalThis.localStorage;
      expect(getInitialSidebarState()).toBe(true);
    });
  });

  describe('saveSidebarState', () => {
    it('persists true to localStorage', () => {
      saveSidebarState(true);
      expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('true');
    });

    it('persists false to localStorage', () => {
      saveSidebarState(false);
      expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('false');
    });

    it('gracefully handles localStorage write failures without throwing', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => saveSidebarState(false)).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('handles undefined localStorage gracefully without throwing', () => {
      // @ts-expect-error testing undefined environment
      delete globalThis.localStorage;
      expect(() => saveSidebarState(false)).not.toThrow();
    });
  });
});
