import React, { createContext, useContext, useState, useEffect } from 'react';

interface PreferencesContextType {
  startDayOfMonth: number;
  setStartDayOfMonth: (day: number) => void;
  isMultiWalletEnabled: boolean;
  setIsMultiWalletEnabled: (enabled: boolean) => void;
}

const CYCLE_START_DAY_KEY = 'jedana-cycle-start-day';
const MULTI_WALLET_KEY = 'jedana-multi-wallet-enabled';

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [startDayOfMonth, setStartDayState] = useState<number>(() => {
    const saved = localStorage.getItem(CYCLE_START_DAY_KEY);
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
  };

  const setIsMultiWalletEnabled = (enabled: boolean) => {
    setIsMultiWalletEnabledState(enabled);
    localStorage.setItem(MULTI_WALLET_KEY, String(enabled));
  };

  useEffect(() => {
    // Sync across tabs/windows if needed
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CYCLE_START_DAY_KEY && e.newValue) {
        const parsed = parseInt(e.newValue, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 28) {
          setStartDayState(parsed);
        }
      }
      if (e.key === MULTI_WALLET_KEY && e.newValue !== null) {
        setIsMultiWalletEnabledState(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
