import { useEffect, useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { Wallet, LayoutDashboard, Tags as TagsIcon, PieChart, ChevronLeft, ChevronRight, Cloud, LogOut, Loader2, RefreshCw, Settings, Repeat } from 'lucide-react';
import ThemeToggle from '../../common/ThemeToggle';
import Tooltip from '../../common/Tooltip';
import { ConfirmModal } from '../../common/ConfirmModal';
import { JedanaLogo } from '../../common/Logo';
import { useAuth, usePreferences } from '../../../context';
import { db } from '../../../db/db';
import { syncService } from '../../../features/sync/services/SyncService';
import { getInitialSidebarState, saveSidebarState, SIDEBAR_STORAGE_KEY } from './sidebarState';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/statistics', icon: PieChart, label: 'Statistics' },
  { to: '/wallets', icon: Wallet, label: 'Wallets' },
  { to: '/recurring', icon: Repeat, label: 'Recurring' },
  { to: '/tags', icon: TagsIcon, label: 'Tags' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(getInitialSidebarState);
  const [showResetSyncModal, setShowResetSyncModal] = useState(false);
  const [isResettingSync, setIsResettingSync] = useState(false);
  const { user, isLoading, logout } = useAuth();
  const { isMultiWalletEnabled } = usePreferences();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', isSidebarOpen ? '16rem' : '5rem');
    saveSidebarState(isSidebarOpen);
  }, [isSidebarOpen]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SIDEBAR_STORAGE_KEY && e.newValue !== null) {
        setIsSidebarOpen(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const filteredNavItems = navItems.filter(item => {
    if (item.to === '/wallets' && !isMultiWalletEnabled) return false;
    return true;
  });


  const handleLogout = () => {
    logout();
  };

  const handleResetSync = () => {
    setShowResetSyncModal(true);
  };

  const handleConfirmResetSync = async () => {
    setIsResettingSync(true);
    try {
      // Wipe IndexedDB Data
      await Promise.all(db.tables.map(table => table.clear()));
      
      // Wipe localStorage sync state
      syncService.reset();
      
      // Force reload to trigger a fresh sync on boot without logging out
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset sync:', err);
      setIsResettingSync(false);
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
        {filteredNavItems.map(item => {
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
          {isSidebarOpen ? (
            <>
              <Link 
                to="/" 
                className="flex items-center gap-2.5 group cursor-pointer" 
                title="Jedana Dashboard"
              >
                <JedanaLogo variant="mark" size={36} className="group-hover:scale-105 transition-transform" />
                <div className="flex flex-col">
                  <h1 className="font-bold text-lg tracking-tight leading-none text-foreground group-hover:text-primary transition-colors">
                    Jedana
                  </h1>
                  <span className="text-[11px] text-muted-foreground font-medium">Finance Tracker</span>
                </div>
              </Link>
              
              {/* Collapse button */}
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="ml-auto flex p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <ChevronLeft size={18} />
              </button>
            </>
          ) : (
            <Tooltip content="Expand Sidebar" side="right" enabled={!isSidebarOpen} wrapperClassName="w-auto mx-auto shrink-0">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="group relative flex items-center justify-center hover:scale-105 transition-transform cursor-pointer shrink-0"
                aria-label="Expand Sidebar"
              >
                <div className="group-hover:opacity-0 transition-opacity duration-150">
                  <JedanaLogo variant="mark" size={36} />
                </div>
                <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-primary/20 backdrop-blur-xs rounded-xl text-primary border border-primary/30 shadow-xs">
                  <ChevronRight size={18} />
                </div>
              </button>
            </Tooltip>
          )}
        </div>
        <nav className="flex flex-col gap-1.5">
          {filteredNavItems.map(item => (
            <Tooltip key={item.to} content={item.label} side="right" enabled={!isSidebarOpen}>
              <NavLink 
                to={item.to} 
                aria-label={item.label} 
                className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium cursor-pointer ${isActive ? 'bg-primary/10 text-primary font-semibold shadow-xs' : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'} ${!isSidebarOpen ? 'justify-center' : ''}`}
              >
                <item.icon size={19} className="shrink-0" />
                {isSidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            </Tooltip>
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
              {isSidebarOpen ? (
                <div className="flex flex-col px-3 py-2 bg-muted/60 border border-border/50 rounded-xl">
                  <span className="text-[10px] text-muted-foreground font-semibold mb-0.5 uppercase tracking-wider">Synced as</span>
                  <span className="text-xs font-semibold text-primary truncate" title={user.email}>
                    {user.email}
                  </span>
                </div>
              ) : (
                <Tooltip content={`Synced as: ${user.email}`} side="right" enabled={true}>
                  <div className="w-full flex items-center justify-center p-2.5 bg-muted/60 border border-border/50 rounded-xl cursor-default">
                    <Cloud size={18} className="text-primary mx-auto" />
                  </div>
                </Tooltip>
              )}
              
              <Tooltip content="Force Sync Data" side="right" enabled={!isSidebarOpen}>
                <button 
                  onClick={handleResetSync}
                  aria-label="Force Sync Data" 
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs font-medium text-blue-500 hover:bg-blue-500/10 cursor-pointer ${!isSidebarOpen ? 'justify-center' : ''}`}
                >
                  <RefreshCw size={16} className="shrink-0" />
                  {isSidebarOpen && <span className="truncate">Force Sync Data</span>}
                </button>
              </Tooltip>

              <Tooltip content="Logout" side="right" enabled={!isSidebarOpen}>
                <button 
                  onClick={handleLogout}
                  aria-label="Logout" 
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs font-medium text-red-500 hover:bg-red-500/10 cursor-pointer ${!isSidebarOpen ? 'justify-center' : ''}`}
                >
                  <LogOut size={16} className="shrink-0" />
                  {isSidebarOpen && <span className="truncate">Logout</span>}
                </button>
              </Tooltip>
            </div>
          ) : (
            <Tooltip content="Sync via Google" side="right" enabled={!isSidebarOpen}>
              <a 
                href="/api/auth/google" 
                aria-label="Sync via Google" 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer ${!isSidebarOpen ? 'justify-center' : ''}`}
              >
                <Cloud size={18} className="shrink-0" />
                {isSidebarOpen && <span className="truncate font-semibold">Sync via Google</span>}
              </a>
            </Tooltip>
          )}
          <Tooltip content="Toggle Theme" side="right" enabled={!isSidebarOpen}>
            <ThemeToggle isSidebarOpen={isSidebarOpen} />
          </Tooltip>
        </div>
      </aside>

      <ConfirmModal
        isOpen={showResetSyncModal}
        onClose={() => setShowResetSyncModal(false)}
        onConfirm={handleConfirmResetSync}
        isLoading={isResettingSync}
        title="Force Sync Data"
        description="This will clear local IndexedDB data and re-download your entire transaction history directly from the server. Are you sure you want to continue?"
        variant="warning"
        confirmLabel="Force Sync"
        confirmIcon={RefreshCw}
      />
    </>
  );
}
