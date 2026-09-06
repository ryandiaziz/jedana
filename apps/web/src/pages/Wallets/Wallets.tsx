import { useState, type SubmitEvent } from 'react';
import { WalletService } from '../../features/wallets/services/wallet.service';
import { Wallet as WalletIcon, Plus } from 'lucide-react';

export default function Wallets() {
  const wallets = WalletService.useWallets();
  const [newWalletName, setNewWalletName] = useState('');

  const handleAddWallet = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    try {
      await WalletService.addWallet(newWalletName.trim());
      setNewWalletName('');
    } catch (error) {
      console.error("Failed to add wallet:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-500 pb-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Wallets & Envelopes</h2>
        <p className="text-muted-foreground text-xs sm:text-sm font-medium">Manage your financial envelopes and segregated spending accounts</p>
      </header>

      {/* Add Wallet Card */}
      <div className="bg-card border border-border/80 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col gap-3">
        <h3 className="font-bold text-base tracking-tight">Create New Wallet</h3>
        <form onSubmit={handleAddWallet} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            placeholder="Wallet name (e.g., Daily Expenses, Travel Fund)"
            className="flex-1 bg-background border border-border/80 rounded-xl px-4 py-3 min-h-[44px] text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
            required
          />
          <button 
            type="submit"
            className="bg-primary text-primary-foreground flex items-center justify-center px-6 py-3 min-h-[44px] rounded-xl font-bold text-sm hover:bg-primary/90 active:scale-95 transition-all whitespace-nowrap gap-2 cursor-pointer shadow-md shadow-primary/25"
          >
            <Plus size={18} />
            Add Wallet
          </button>
        </form>
      </div>

      {/* Wallets Grid */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-base md:text-lg tracking-tight">Active Wallets</h3>
          {wallets && (
            <span className="text-xs font-medium text-muted-foreground">
              {wallets.length} envelope{wallets.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {!wallets ? (
          <div className="text-muted-foreground text-sm animate-pulse p-4">Loading wallets...</div>
        ) : wallets.length === 0 ? (
          <div className="bg-card border border-border/80 border-dashed rounded-2xl p-8 text-center text-muted-foreground text-sm">
            No wallets yet. Create one above to start segregating your money.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {wallets.map(wallet => (
              <div 
                key={wallet.id} 
                className="bg-card border border-border/80 p-5 rounded-2xl flex items-center gap-4 hover:border-primary/40 hover:shadow-md transition-all duration-200 group shadow-xs"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <WalletIcon size={22} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-base md:text-lg truncate group-hover:text-primary transition-colors">
                    {wallet.name}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Created {new Date(wallet.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
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
