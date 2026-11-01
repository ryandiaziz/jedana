export const SIDEBAR_STORAGE_KEY = 'jedana-sidebar-open';

export function getInitialSidebarState(): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      return true;
    }
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    // Fallback gracefully if localStorage is restricted
  }
  return true;
}

export function saveSidebarState(isOpen: boolean): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen));
  } catch (e) {
    console.warn('Failed to save sidebar state to localStorage:', e);
  }
}
