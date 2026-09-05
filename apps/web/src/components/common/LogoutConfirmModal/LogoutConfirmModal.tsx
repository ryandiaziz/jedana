import React, { useEffect } from 'react';
import { AlertTriangle, LogOut, X } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  // Lock background scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-5 md:p-6 shadow-2xl space-y-5 md:space-y-6 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 p-1.5 rounded-lg hover:bg-muted"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 text-amber-500">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Konfirmasi Logout</h3>
        </div>

        <div className="space-y-3 text-sm text-foreground/80">
          <p>
            Sesuai aturan keamanan privasi <strong>Jedana (Offline-First)</strong>, seluruh data transaksi lokal di browser ini akan 
            <span className="text-destructive font-semibold"> dihapus secara permanen dari IndexedDB</span> saat Anda keluar.
          </p>
          <p className="text-muted-foreground text-xs bg-muted/60 p-3 rounded-lg border border-border">
            Pastikan data lokal Anda telah tersinkronkan ke server cloud sebelum melanjutkan.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-3 sm:py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 px-4 py-3 sm:py-2.5 rounded-xl bg-destructive hover:opacity-90 active:opacity-80 text-destructive-foreground transition-all text-sm font-medium shadow-lg shadow-destructive/20 disabled:opacity-50 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoading ? 'Menghapus & Keluar...' : 'Hapus Data & Logout'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
