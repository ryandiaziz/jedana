import React from 'react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 text-amber-500">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white">Konfirmasi Logout</h3>
        </div>

        <div className="space-y-3 text-sm text-zinc-300">
          <p>
            Sesuai aturan keamanan privasi <strong>Jedana (Offline-First)</strong>, seluruh data transaksi lokal di browser ini akan 
            <span className="text-red-400 font-semibold"> dihapus secara permanen dari IndexedDB</span> saat Anda keluar.
          </p>
          <p className="text-zinc-400 text-xs bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50">
            Pastikan data lokal Anda telah tersinkronkan ke server cloud sebelum melanjutkan.
          </p>
        </div>

        <div className="flex space-x-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors text-sm font-medium shadow-lg shadow-red-600/20 disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoading ? 'Menghapus & Keluar...' : 'Hapus Data & Logout'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
