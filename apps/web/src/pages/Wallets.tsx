import { useState, type FormEvent } from 'react';
import { WalletService } from '../services/wallet.service';
import { Wallet as WalletIcon, Plus } from 'lucide-react';

export default function Wallets() {
  const wallets = WalletService.useWallets();
  const [newWalletName, setNewWalletName] = useState('');

  const handleAddWallet = async (e: FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    try {
      await WalletService.addWallet(newWalletName.trim());
      setNewWalletName('');
    } catch (error) {
      console.error("Gagal menambah dompet:", error);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight">Manajemen Dompet</h2>
        <p className="text-muted-foreground text-sm font-medium">Kelola "Amplop Anggaran" Anda</p>
      </header>

      <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-4">
        <h3 className="font-semibold text-lg tracking-tight">Tambah Dompet Baru</h3>
        <form onSubmit={handleAddWallet} className="flex gap-3">
          <input
            type="text"
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            placeholder="Nama dompet (mis: Dana Liburan)"
            className="flex-1 bg-background border border-border rounded-md px-4 py-2 focus:outline-none focus:border-primary transition-colors"
            required
          />
          <button 
            type="submit"
            className="bg-foreground text-background flex items-center justify-center px-6 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity whitespace-nowrap gap-2"
          >
            <Plus size={18} />
            Tambah
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-lg tracking-tight">Daftar Dompet</h3>
        
        {!wallets ? (
          <div className="text-muted-foreground text-sm animate-pulse">Memuat dompet...</div>
        ) : wallets.length === 0 ? (
          <div className="text-muted-foreground text-sm">Belum ada dompet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {wallets.map(wallet => (
              <div key={wallet.id} className="bg-card border border-border p-5 rounded-xl flex items-center gap-4 hover:border-muted-foreground/30 transition-colors group">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                  <WalletIcon size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg">{wallet.name}</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Dibuat {new Date(wallet.createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
