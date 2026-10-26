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

interface FloatingActionsContextValue {
  actions: FloatingAction[];
  setActions: (next: FloatingAction[]) => void;
}

const EMPTY_ACTIONS: FloatingAction[] = [];

const FloatingActionsContext = createContext<FloatingActionsContextValue | undefined>(undefined);

export function FloatingActionsProvider({ children }: { children: ReactNode }): ReactElement {
  const [actions, setActions] = useState<FloatingAction[]>(EMPTY_ACTIONS);
  const value = useMemo(() => ({ actions, setActions }), [actions]);

  return (
    <FloatingActionsContext.Provider value={value}>
      {children}
    </FloatingActionsContext.Provider>
  );
}

/**
 * Registers page-level actions into the floating action bar.
 * IMPORTANT: The `actions` array MUST be memoized (`useMemo`) by the caller;
 * passing an unmemoized array literal will cause an infinite render loop.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useFloatingActions(actions: FloatingAction[]): void {
  const context = useContext(FloatingActionsContext);
  if (!context) {
    throw new Error('useFloatingActions must be used within a FloatingActionsProvider');
  }

  const setActionsRef = useRef(context.setActions);

  useEffect(() => {
    setActionsRef.current = context.setActions;
  }, [context.setActions]);

  useEffect(() => {
    setActionsRef.current(actions);
    return () => {
      setActionsRef.current(EMPTY_ACTIONS);
    };
  }, [actions]);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFloatingActionsState(): FloatingAction[] {
  const context = useContext(FloatingActionsContext);
  if (!context) {
    throw new Error('useFloatingActionsState must be used within a FloatingActionsProvider');
  }
  return context.actions;
}
