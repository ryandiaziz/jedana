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
      {/* ==================== MOBILE BOTTOM TAB BAR (DOCK) ==================== */}
      <nav 
        className="fixed bottom-0 inset-x-0 z-40 glass-dock border-t border-border/80 flex md:hidden items-center justify-around px-2 h-16 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_-8px_30px_-4px_rgba(0,0,0,0.4)]" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Mobile Navigation"
      >
        {navItems.map(item => {
          const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              aria-label={item.label}
              className={`relative flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 h-full transition-all active:scale-90 duration-150 cursor-pointer ${
                isActive 
                  ? 'text-primary font-semibold' 
                  : 'text-muted-foreground hover:text-foreground active:text-foreground'
              }`}
            >
              <div className={`p-2 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary/15 text-primary scale-105 shadow-sm shadow-primary/20' : ''}`}>
                <item.icon size={22} className="shrink-0" />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight transition-opacity duration-150 ${isActive ? 'opacity-100 font-semibold' : 'opacity-70'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-primary/30" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside className={`hidden md:flex bg-card border-r border-border p-4 flex-col gap-6 h-screen sticky top-0 overflow-y-auto transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex items-center gap-2.5 px-1 py-1">
          <button 
            onClick={() => !isSidebarOpen && setIsSidebarOpen(true)}
            className={`group w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-primary text-white flex items-center justify-center shrink-0 shadow-sm shadow-primary/25 ${!isSidebarOpen ? 'hover:scale-105 transition-transform cursor-pointer' : 'cursor-default'}`}
            title={!isSidebarOpen ? "Expand Sidebar" : undefined}
          >
            <span className={`text-white font-bold text-sm ${!isSidebarOpen && 'group-hover:hidden'}`}>J</span>
            {!isSidebarOpen && (
              <ChevronRight size={18} className="text-white hidden group-hover:block" />
            )}
          </button>

          {isSidebarOpen && (
            <div className="flex flex-col">
              <h1 className="font-bold text-lg tracking-tight leading-none">Jedana</h1>
              <span className="text-[11px] text-muted-foreground font-medium">Finance Tracker</span>
            </div>
          )}
          
          {/* Collapse button */}
          {isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="ml-auto flex p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>
        <nav className="flex flex-col gap-1.5">
          {navItems.map(item => (
            <NavLink 
              key={item.to}
              to={item.to} 
              title={item.label} 
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium cursor-pointer ${isActive ? 'bg-primary/10 text-primary font-semibold shadow-xs' : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'}`}
            >
              <item.icon size={19} className="shrink-0" />
              {isSidebarOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
          {isLoading ? (
            <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground">
              <Loader2 size={18} className="shrink-0 animate-spin" />
              {isSidebarOpen && <span className="truncate">Loading...</span>}
            </div>
          ) : user ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col px-3 py-2 bg-muted/60 border border-border/50 rounded-xl">
                {isSidebarOpen && <span className="text-[10px] text-muted-foreground font-semibold mb-0.5 uppercase tracking-wider">Synced as</span>}
                <span className={`text-xs font-semibold text-primary truncate ${!isSidebarOpen && 'hidden'}`} title={user.email}>
                  {user.email}
                </span>
                {!isSidebarOpen && <Cloud size={18} className="text-primary mx-auto" />}
              </div>
              
              <button 
                onClick={handleResetSync}
                title="Force Pull Data" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs font-medium text-blue-500 hover:bg-blue-500/10 cursor-pointer"
              >
                <RefreshCw size={16} className="shrink-0" />
                {isSidebarOpen && <span className="truncate">Force Sync Data</span>}
              </button>

              <button 
                onClick={handleLogout}
                title="Logout & Wipe Data" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs font-medium text-red-500 hover:bg-red-500/10 cursor-pointer"
              >
                <LogOut size={16} className="shrink-0" />
                {isSidebarOpen && <span className="truncate">Logout</span>}
              </button>
            </div>
          ) : (
            <a 
              href="/api/auth/google" 
              title="Sync via Google" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
            >
              <Cloud size={18} className="shrink-0" />
              {isSidebarOpen && <span className="truncate font-semibold">Sync via Google</span>}
            </a>
          )}
          <ThemeToggle isSidebarOpen={isSidebarOpen} />
        </div>
      </aside>
    </>
  );
}
