import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Wallet, LayoutDashboard, Tags as TagsIcon, PieChart, ChevronLeft, ChevronRight, Cloud, LogOut, Loader2, RefreshCw } from 'lucide-react';
import ThemeToggle from '../../common/ThemeToggle';
import { useAuth } from '../../../context';
import { db } from '../../../db/db';

export default function Sidebar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoading, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const handleResetSync = async () => {
    if (window.confirm("This will clear potentially corrupted local data and re-download your entire transaction history directly from the server. Continue?")) {
      // Wipe IndexedDB Data
      await Promise.all(db.tables.map(table => table.clear()));
      
      // Wipe localStorage sync state
      localStorage.removeItem('lastSyncTime');
      
      // Force reload to trigger a fresh sync on boot without logging out
      window.location.reload();
    }
  };

  return (
    <aside className={`bg-card border-b md:border-b-0 md:border-r border-border p-4 flex flex-col gap-6 md:h-screen md:sticky md:top-0 overflow-y-auto transition-all duration-300 ${isSidebarOpen ? 'w-full md:w-64' : 'w-full md:w-18'}`}>
      <div className="flex items-center gap-2 px-1">
        {/* Desktop Logo */}
        <button 
          onClick={() => !isSidebarOpen && setIsSidebarOpen(true)}
          className={`group w-8 h-8 rounded-full bg-foreground hidden md:flex items-center justify-center shrink-0 ${!isSidebarOpen ? 'hover:bg-primary transition-colors cursor-pointer' : 'cursor-default'}`}
          title={!isSidebarOpen ? "Expand Sidebar" : undefined}
        >
          <span className={`text-background font-bold ${!isSidebarOpen && 'group-hover:hidden'}`}>J</span>
          {!isSidebarOpen && (
            <ChevronRight size={18} className="text-primary-foreground hidden group-hover:block" />
          )}
        </button>

        {/* Mobile Logo */}
        <div className="w-8 h-8 rounded-full bg-foreground flex md:hidden items-center justify-center shrink-0">
          <span className="text-background font-bold">J</span>
        </div>

        {isSidebarOpen && <h1 className="font-bold text-xl tracking-tight transition-opacity duration-300 truncate">Jedana</h1>}
        
        {/* Collapse button */}
        {isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="ml-auto hidden md:flex p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>
      <nav className="flex flex-col gap-2">
        <NavLink to="/" title="Dashboard" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
          <LayoutDashboard size={18} className="shrink-0" />
          {isSidebarOpen && <span className="truncate">Dashboard</span>}
        </NavLink>
        <NavLink to="/statistics" title="Statistics" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
          <PieChart size={18} className="shrink-0" />
          {isSidebarOpen && <span className="truncate">Statistics</span>}
        </NavLink>
        <NavLink to="/wallets" title="Wallets" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
          <Wallet size={18} className="shrink-0" />
          {isSidebarOpen && <span className="truncate">Wallets</span>}
        </NavLink>
        <NavLink to="/tags" title="Tags & Archives" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
          <TagsIcon size={18} className="shrink-0" />
          {isSidebarOpen && <span className="truncate">Tags & Archives</span>}
        </NavLink>
      </nav>
      <div className="mt-auto flex flex-col gap-4 border-t border-border pt-4">
        {isLoading ? (
          <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground">
            <Loader2 size={18} className="shrink-0 animate-spin" />
            {isSidebarOpen && <span className="truncate">Loading...</span>}
          </div>
        ) : user ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col px-3 py-2 bg-muted/50 rounded-md">
              {isSidebarOpen && <span className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wider">Synced as</span>}
              <span className={`text-sm font-medium text-primary ${!isSidebarOpen && 'hidden'}`} title={user.email}>
                <span className="truncate block">{user.email}</span>
              </span>
              {!isSidebarOpen && <Cloud size={18} className="text-primary mx-auto" />}
            </div>
            
            <button 
              onClick={handleResetSync}
              title="Force Pull Data" 
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-blue-500 hover:bg-blue-500/10 cursor-pointer"
            >
              <RefreshCw size={18} className="shrink-0" />
              {isSidebarOpen && <span className="truncate">Force Sync Data</span>}
            </button>

            <button 
              onClick={handleLogout}
              title="Logout & Wipe Data" 
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-500 hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut size={18} className="shrink-0" />
              {isSidebarOpen && <span className="truncate">Logout</span>}
            </button>
          </div>
        ) : (
          <a 
            href="/api/auth/google" 
            title="Sync via Google" 
            className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400"
          >
            <Cloud size={18} className="shrink-0" />
            {isSidebarOpen && <span className="truncate">Sync via Google</span>}
          </a>
        )}
        <div className="hidden md:block">
          <ThemeToggle isSidebarOpen={isSidebarOpen} />
        </div>
      </div>
    </aside>
  );
}
