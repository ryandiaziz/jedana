import React, { useEffect, useState } from 'react';
import { syncService } from '../features/sync/services/SyncService';
import { db } from '../db/db';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { LogOut } from 'lucide-react';
import { AuthContext, type User } from './authContextInstance';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Not authenticated');
      })
      .then(data => {
        setUser(data);
        // Automatically sync data upon successful auth detection
        syncService.syncAll();
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const logout = () => {
    setIsLogoutModalOpen(true);
  };

  const closeLogoutModal = () => {
    if (!isLoggingOut) {
      setIsLogoutModalOpen(false);
    }
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 1. Physically wipe all IndexedDB tables for privacy security (CONTEXT.md)
      await Promise.all(db.tables.map(table => table.clear()));
      localStorage.removeItem('lastSyncTime');

      // 2. Clear server auth cookie
      await fetch('/api/auth/logout');
      setUser(null);
    } catch (e) {
      console.error('Failed during logout data wipe:', e);
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        logout,
        confirmLogout,
        closeLogoutModal,
        isLogoutModalOpen,
      }}
    >
      {children}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
        isLoading={isLoggingOut}
        variant="danger"
        title="Confirm Logout"
        description={
          <div className="space-y-3">
            <p>
              In accordance with <strong>Jedana (Offline-First)</strong> privacy rules, all local transaction data in this browser will be{' '}
              <span className="text-destructive font-semibold">permanently deleted from IndexedDB</span> when you log out.
            </p>
            <p className="text-muted-foreground text-xs bg-muted/60 p-3 rounded-lg border border-border">
              Please ensure your local data has been synchronized to the cloud before continuing.
            </p>
          </div>
        }
        confirmLabel="Clear Data & Logout"
        confirmIcon={LogOut}
      />
    </AuthContext.Provider>
  );
}
