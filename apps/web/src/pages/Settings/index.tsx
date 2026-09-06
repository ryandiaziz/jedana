import { ApiKeyManager, McpInstructions } from '../../features/settings';
import { useAuth } from '../../context';
import { Settings as SettingsIcon, RefreshCw, LogOut, Loader2 } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import { db } from '../../db/db';

export default function Settings() {
  const { user, isLoading, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const handleResetSync = async () => {
    if (window.confirm("This will clear potentially corrupted local data and re-download your entire transaction history directly from the server. Continue?")) {
      await Promise.all(db.tables.map(table => table.clear()));
      localStorage.removeItem('lastSyncTime');
      window.location.reload();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-3">
          <SettingsIcon size={24} />
          Settings
        </h1>

        {/* Theme Toggle (mobile) */}
        <section className="p-4 md:p-6 bg-card border border-border rounded-lg md:hidden">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Appearance</h2>
          <ThemeToggle isSidebarOpen={true} />
        </section>

        <div className="px-4 py-8 bg-card border border-border rounded-lg text-center">
          <p className="text-muted-foreground">
            Login terlebih dahulu untuk mengakses Settings dan fitur MCP.
          </p>
          <a
            href="/api/auth/google"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Login via Google
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-500 pb-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <SettingsIcon size={20} />
          </div>
          Settings
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm font-medium">Manage preferences, sync status, and developer API keys</p>
      </header>

      {/* Account & Sync Section (mobile only — on desktop these are in the sidebar) */}
      <section className="p-5 sm:p-6 bg-card border border-border/80 rounded-2xl shadow-xs md:hidden">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Account & Sync</h2>
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="flex items-center gap-3 py-2 text-sm font-medium text-muted-foreground">
              <Loader2 size={18} className="shrink-0 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            <>
              <div className="flex flex-col px-3.5 py-2.5 bg-muted/60 border border-border/50 rounded-xl">
                <span className="text-[10px] text-muted-foreground font-semibold mb-0.5 uppercase tracking-wider">Synced as</span>
                <span className="text-sm font-semibold text-primary truncate" title={user.email}>
                  {user.email}
                </span>
              </div>
              
              <button 
                onClick={handleResetSync}
                className="flex items-center gap-3 px-3.5 py-3 min-h-[44px] rounded-xl transition-colors text-sm font-semibold text-blue-500 hover:bg-blue-500/10 active:scale-95 cursor-pointer"
              >
                <RefreshCw size={18} className="shrink-0" />
                <span>Force Sync Data</span>
              </button>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 px-3.5 py-3 min-h-[44px] rounded-xl transition-colors text-sm font-semibold text-red-500 hover:bg-red-500/10 active:scale-95 cursor-pointer"
              >
                <LogOut size={18} className="shrink-0" />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      </section>

      {/* Theme Toggle (mobile only) */}
      <section className="p-5 sm:p-6 bg-card border border-border/80 rounded-2xl shadow-xs md:hidden">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Appearance</h2>
        <ThemeToggle isSidebarOpen={true} />
      </section>

      {/* API Key Section */}
      <section className="p-5 sm:p-6 bg-card border border-border/80 rounded-2xl shadow-xs">
        <ApiKeyManager />
      </section>

      {/* MCP Setup Instructions */}
      <section className="p-5 sm:p-6 bg-card border border-border/80 rounded-2xl shadow-xs">
        <McpInstructions />
      </section>
    </div>
  );
}
