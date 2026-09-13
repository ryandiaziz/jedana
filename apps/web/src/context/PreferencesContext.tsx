import React, { createContext, useContext, useState, useEffect } from 'react';

interface PreferencesContextType {
  startDayOfMonth: number;
  setStartDayOfMonth: (day: number) => void;
  isMultiWalletEnabled: boolean;
  setIsMultiWalletEnabled: (enabled: boolean) => void;
}

const CYCLE_START_DAY_KEY = 'jedana-cycle-start-day';
const FINANCIAL_MONTH_STORAGE_KEY = 'jedana_financial_month_start_day';
const FINANCIAL_MONTH_CHANGED_EVENT = 'jedana_financial_month_changed';
const MULTI_WALLET_KEY = 'jedana-multi-wallet-enabled';

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [startDayOfMonth, setStartDayState] = useState<number>(() => {
    const saved = localStorage.getItem(CYCLE_START_DAY_KEY) || localStorage.getItem(FINANCIAL_MONTH_STORAGE_KEY);
    if (!saved) return 1;
    const parsed = parseInt(saved, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 28) return 1;
    return parsed;
  });

  const [isMultiWalletEnabled, setIsMultiWalletEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(MULTI_WALLET_KEY);
    if (saved === null) return false;
    return saved === 'true';
  });

  const setStartDayOfMonth = (day: number) => {
    const clamped = Math.max(1, Math.min(28, Math.floor(day)));
    setStartDayState(clamped);
    localStorage.setItem(CYCLE_START_DAY_KEY, String(clamped));
    localStorage.setItem(FINANCIAL_MONTH_STORAGE_KEY, String(clamped));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(FINANCIAL_MONTH_CHANGED_EVENT, { detail: clamped }));
    }
  };

  const setIsMultiWalletEnabled = (enabled: boolean) => {
    setIsMultiWalletEnabledState(enabled);
    localStorage.setItem(MULTI_WALLET_KEY, String(enabled));
  };

  useEffect(() => {
    // Sync across tabs/windows or custom events
    const handleStorage = (e: StorageEvent) => {
      if ((e.key === CYCLE_START_DAY_KEY || e.key === FINANCIAL_MONTH_STORAGE_KEY) && e.newValue) {
        const parsed = parseInt(e.newValue, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 28) {
          setStartDayState(parsed);
        }
      }
      if (e.key === MULTI_WALLET_KEY && e.newValue !== null) {
        setIsMultiWalletEnabledState(e.newValue === 'true');
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (customEvent.detail && customEvent.detail !== startDayOfMonth) {
        setStartDayState(customEvent.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(FINANCIAL_MONTH_CHANGED_EVENT, handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(FINANCIAL_MONTH_CHANGED_EVENT, handleCustomEvent);
    };
  }, [startDayOfMonth]);

  return (
    <PreferencesContext.Provider
      value={{
        startDayOfMonth,
        setStartDayOfMonth,
        isMultiWalletEnabled,
        setIsMultiWalletEnabled,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences(): PreferencesContextType {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
