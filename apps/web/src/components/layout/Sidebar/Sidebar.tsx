import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Wallet, LayoutDashboard, Tags as TagsIcon, PieChart, ChevronLeft, ChevronRight, Cloud, LogOut, Loader2, RefreshCw, Settings } from 'lucide-react';
import ThemeToggle from '../../common/ThemeToggle';
import { useAuth } from '../../../context';
import { db } from '../../../db/db';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/statistics', icon: PieChart, label: 'Statistics' },
  { to: '/wallets', icon: Wallet, label: 'Wallets' },
  { to: '/tags', icon: TagsIcon, label: 'Tags' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

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
    <>
      {/* ==================== MOBILE BOTTOM TAB BAR ==================== */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border flex md:hidden items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {navItems.map(item => {
          const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground active:text-foreground'
              }`}
            >
              <item.icon size={20} className="shrink-0" />
              <span className="leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside className={`hidden md:flex bg-card border-r border-border p-4 flex-col gap-6 h-screen sticky top-0 overflow-y-auto transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-18'}`}>
        <div className="flex items-center gap-2 px-1">
          <button 
            onClick={() => !isSidebarOpen && setIsSidebarOpen(true)}
            className={`group w-8 h-8 rounded-full bg-foreground flex items-center justify-center shrink-0 ${!isSidebarOpen ? 'hover:bg-primary transition-colors cursor-pointer' : 'cursor-default'}`}
            title={!isSidebarOpen ? "Expand Sidebar" : undefined}
          >
            <span className={`text-background font-bold ${!isSidebarOpen && 'group-hover:hidden'}`}>J</span>
            {!isSidebarOpen && (
              <ChevronRight size={18} className="text-primary-foreground hidden group-hover:block" />
            )}
          </button>

          {isSidebarOpen && <h1 className="font-bold text-xl tracking-tight transition-opacity duration-300 truncate">Jedana</h1>}
          
          {/* Collapse button */}
          {isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="ml-auto flex p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Collapse Sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map(item => (
            <NavLink 
              key={item.to}
              to={item.to} 
              title={item.label} 
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              <item.icon size={18} className="shrink-0" />
              {isSidebarOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
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
          <ThemeToggle isSidebarOpen={isSidebarOpen} />
        </div>
      </aside>
    </>
  );
}
