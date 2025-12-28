import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Bot, Settings, Menu, X, FileText, Users, Truck, Trash2, ChevronLeft, ChevronRight, Languages, Sun, Moon, Bell, Building2, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { AIAgent } from './AIAgent';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { DEFAULT_PERMISSIONS } from '../constants/permissions';
import { useClickOutside } from '../hooks/useClickOutside';

const SidebarItem = ({ to, icon: Icon, label, collapsed }: { to: string, icon: any, label: string, collapsed: boolean }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
      } ${collapsed ? 'justify-center px-2' : ''} `
    }
    title={collapsed ? label : ''}
  >
    <Icon size={20} />
    {!collapsed && <span className="font-medium animate-in fade-in duration-200">{label}</span>}
  </NavLink>
);

// --- Toast Notification Component ---
const Toast = ({ notification, onClose }: { notification: any, onClose: (id: string) => void }) => {
  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    // Entrance animation
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(notification.id), 300); // Wait for exit animation
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const getIcon = () => {
    switch (notification.type) {
      case 'SUCCESS': return <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0"><CheckCircle size={18} /></div>;
      case 'ERROR': return <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0"><XCircle size={18} /></div>;
      case 'WARNING': return <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0"><AlertTriangle size={18} /></div>;
      default: return <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0"><Info size={18} /></div>;
    }
  };

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 w-80 md:w-96 transform transition-all duration-300 ease-out ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
      }`}>
      {getIcon()}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-800 dark:text-white text-sm">{notification.message}</h4>
        {notification.details && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{notification.details}</p>}
      </div>
      <button onClick={() => { setIsVisible(false); setTimeout(() => onClose(notification.id), 300); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
        <X size={14} />
      </button>
    </div>
  );
};

export const Layout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { products, currentUser, logoutUser, theme, toggleTheme, notifications, addNotification } = useApp(); // Destructure notifications
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const userSwitcherRef = React.useRef<HTMLDivElement>(null);
  useClickOutside(userSwitcherRef, () => setIsUserSwitcherOpen(false));

  // Helper to remove notification (Note: AppContext actually appends, so we don't 'delete' from context usually, only hide. 
  // But for this UI we interpret the notification list. Ideally AppContext would support dismiss.
  // For now, we just visually hide them or let AppContext auto-trim. 
  // Actually, let's just make the Toast handle its own visual lifecycle.
  // But to support "removing" properly, we might need a dismiss in Context. 
  // Let's assume the Context cleans up or we just render the last 5 relevant ones?
  // Let's stick to rendering the latest ones that are within a timeframe? 
  // The provided AppContext snippet doesn't have `removeNotification`. 
  // We will trust the Toast component's internal timer for visual dismissal, 
  // but since we render *from* the context array, we need to filter out 'dismissed' ones locally if context doesn't support removal.
  // A better approach without changing Context: Render only recent notifications (filter by timestamp).
  // OR: Modify AppContext to allow dismissal. Let's do the latter if clean, or just use local state for "visible" toasts.
  // Actually, let's keep it simple: Render the top 3 most recent notifications if they are < 5 seconds old? 
  // Context stores history. We want real-time toasts. 
  // Simpler: Just rely on the Notifications list being a log, but for TOASTS, maybe we need a separate transient state?
  // The user requirement is "auto hide". The current context just logs history.
  // Let's refactor AppContext slightly or just Filter in Layout? 
  // Let's use a local effect to detect NEW notifications and push to a local toast queue.

  const [toasts, setToasts] = useState<any[]>([]);

  React.useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      // Simple dedup based on ID or timestamp check to strictly add NEW ones only
      // Since notifications is [new, ...old], checking index 0 is good enough IF it changes.
      // We can use a ref or just compare ID with last toasted ID.
      setToasts(current => {
        if (current.some(t => t.id === latest.id)) return current;
        return [...current, latest];
      });
    }
  }, [notifications]);

  const removeToast = (id: string) => {
    setToasts(current => current.filter(t => t.id !== id));
  };


  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  // ... (rest of logic) ...

  const hasAccess = (moduleId: string) => {
    if (!currentUser) return false;
    const perms = (currentUser.permissions && currentUser.permissions.length > 0)
      ? currentUser.permissions
      : DEFAULT_PERMISSIONS[currentUser.role];
    return perms ? perms.includes(moduleId) : false;
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-30 transform transition-all duration-300 ease-in-out flex flex-col ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
          } ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} `}
      >
        <div className={`p-6 border-b border-slate-100 dark:border-slate-700 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} `}>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="text-white" size={20} />
            </div>
            {!isSidebarCollapsed && (
              <h1 className="text-xl font-bold text-slate-800 dark:text-white animate-in fade-in duration-200 whitespace-nowrap">Hanuman<span className="text-indigo-600 dark:text-indigo-400">Trader</span></h1>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {hasAccess('dashboard') && <SidebarItem to="/" icon={LayoutDashboard} label={t('nav.dashboard')} collapsed={isSidebarCollapsed} />}

          {hasAccess('inventory') && (
            <div className="relative">
              <SidebarItem to="/inventory" icon={Package} label={t('nav.inventory')} collapsed={isSidebarCollapsed} />
            </div>
          )}

          {hasAccess('sales') && <SidebarItem to="/sales" icon={ShoppingCart} label={t('nav.sales')} collapsed={isSidebarCollapsed} />}
          {hasAccess('customers') && <SidebarItem to="/customers" icon={Users} label={t('nav.customers')} collapsed={isSidebarCollapsed} />}
          {hasAccess('suppliers') && <SidebarItem to="/suppliers" icon={Truck} label={t('nav.suppliers')} collapsed={isSidebarCollapsed} />}
          {hasAccess('reports') && <SidebarItem to="/gst-report" icon={FileText} label={t('nav.reports')} collapsed={isSidebarCollapsed} />}
          {hasAccess('analytics') && <SidebarItem to="/analytics" icon={BarChart3} label={t('nav.analytics')} collapsed={isSidebarCollapsed} />}

          {hasAccess('users') && (
            <SidebarItem to="/users" icon={Users} label="Users" collapsed={isSidebarCollapsed} />
          )}
          {hasAccess('trash') && <SidebarItem to="/trash" icon={Trash2} label={t('nav.trash')} collapsed={isSidebarCollapsed} />}

          {/* New Setup Link for Super Admins */}
          {currentUser?.role === 'SUPER_ADMIN' && (
            <SidebarItem to="/setup-warehouse" icon={Building2} label="New Sub-Warehouse" collapsed={isSidebarCollapsed} />
          )}

          {hasAccess('settings') && <SidebarItem to="/settings" icon={Settings} label={t('nav.settings')} collapsed={isSidebarCollapsed} />}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className={`w-full flex items-center mb-2 p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${isSidebarCollapsed ? 'justify-center' : 'space-x-3 px-4'} `}
            title="Switch Language"
          >
            <Languages size={20} className="text-indigo-600 dark:text-indigo-400" />
            {!isSidebarCollapsed && (
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {language === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center mb-4 p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${isSidebarCollapsed ? 'justify-center' : 'space-x-3 px-4'} `}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600 dark:text-indigo-400" />}
            {!isSidebarCollapsed && (
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>

          <div className="relative" ref={userSwitcherRef}>
            {/* Logout Button */}
            {isUserSwitcherOpen && !isSidebarCollapsed && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50">
                <button
                  onClick={() => { logoutUser(); setIsUserSwitcherOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                >
                  Sign Out
                </button>
              </div>
            )}

            <button
              onClick={() => setIsUserSwitcherOpen(!isUserSwitcherOpen)}
              className={`flex items-center w-full hover:bg-slate-100 rounded-lg transition-colors ${isSidebarCollapsed ? 'justify-center' : 'space-x-3 px-4 py-2'} `}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0 border border-indigo-200">
                {currentUser?.name?.charAt(0) || '?'}
              </div>
              {!isSidebarCollapsed && (
                <div className="text-left animate-in fade-in duration-200 overflow-hidden">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{currentUser?.name || 'Guest'}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{currentUser?.role?.replace('_', ' ') || ''}</p>
                </div>
              )}
            </button>
          </div>
          {/* Collapse Toggle (Desktop only) */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex w-full mt-4 items-center justify-center p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-md"
            >
              {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Package className="text-white" size={20} />
              </div>
              <span className="font-bold text-slate-800">Hanuman Trader</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-0">
          <div className="max-w-7xl mx-auto pb-20">
            <Outlet />
          </div>
        </main>

        {/* Floating AI Agent */}
        <AIAgent />
      </div>

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(notif => (
          <div key={notif.id} className="pointer-events-auto">
            <Toast notification={notif} onClose={removeToast} />
          </div>
        ))}
      </div>
    </div>
  );
};
