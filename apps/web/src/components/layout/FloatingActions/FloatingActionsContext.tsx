import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

export interface FloatingAction {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  primary?: boolean;
  desktopOnly?: boolean;
}

export interface FloatingActionsOptions {
  /** Page-owned context UI rendered on the left of the bar (e.g. period stepper). */
  leading?: ReactNode;
}

interface FloatingRegistration {
  actions: FloatingAction[];
  leading?: ReactNode;
}

interface FloatingActionsContextValue {
  actions: FloatingAction[];
  leading?: ReactNode;
  setRegistration: (next: FloatingRegistration) => void;
}

const EMPTY_ACTIONS: FloatingAction[] = [];
const EMPTY_REGISTRATION: FloatingRegistration = {
  actions: EMPTY_ACTIONS,
  leading: undefined,
};

const FloatingActionsContext = createContext<FloatingActionsContextValue | undefined>(undefined);

export function FloatingActionsProvider({ children }: { children: ReactNode }): ReactElement {
  const [registration, setRegistration] = useState<FloatingRegistration>(EMPTY_REGISTRATION);
  const value = useMemo(
    () => ({
      actions: registration.actions,
      leading: registration.leading,
      setRegistration,
    }),
    [registration.actions, registration.leading]
  );

  return (
    <FloatingActionsContext.Provider value={value}>
      {children}
    </FloatingActionsContext.Provider>
  );
}

/**
 * Registers page-level actions into the floating action bar.
 * IMPORTANT: The `actions` array and `options?.leading` node MUST be memoized (`useMemo`)
 * by the caller; passing unmemoized literals will cause an infinite render loop.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useFloatingActions(
  actions: FloatingAction[],
  options?: FloatingActionsOptions
): void {
  const context = useContext(FloatingActionsContext);
  if (!context) {
    throw new Error('useFloatingActions must be used within a FloatingActionsProvider');
  }

  const setRegistrationRef = useRef(context.setRegistration);

  useEffect(() => {
    setRegistrationRef.current = context.setRegistration;
  }, [context.setRegistration]);

  const leading = options?.leading;

  useEffect(() => {
    setRegistrationRef.current({ actions, leading });
    return () => {
      setRegistrationRef.current(EMPTY_REGISTRATION);
    };
  }, [actions, leading]);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFloatingActionsState(): FloatingAction[] {
  const context = useContext(FloatingActionsContext);
  if (!context) {
    throw new Error('useFloatingActionsState must be used within a FloatingActionsProvider');
  }
  return context.actions;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFloatingLeading(): ReactNode {
  const context = useContext(FloatingActionsContext);
  if (!context) {
    throw new Error('useFloatingLeading must be used within a FloatingActionsProvider');
  }
  return context.leading;
}
