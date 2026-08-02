import React, { useEffect, useState } from 'react';
import { syncService } from '../features/sync/services/SyncService';
import { db } from '../db/db';
import { LogoutConfirmModal } from '../components/common/LogoutConfirmModal';
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
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
        isLoading={isLoggingOut}
      />
    </AuthContext.Provider>
  );
}
