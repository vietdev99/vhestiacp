import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Users,
  Globe,
  Database,
  Mail,
  Clock,
  HardDrive,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ArrowLeftCircle,
  User,
  ChevronDown,
  ChevronRight,
  Package,
  Server,
  Leaf,
  Cylinder,
  Network
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import clsx from 'clsx';

// Navigation menu items - main items (not including Database submenu and Admin submenu)
const navigationItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users, adminOnly: true },
  { name: 'Web', href: '/web', icon: Globe },
  { name: 'DNS', href: '/dns', icon: Globe, service: 'dns' },
  { name: 'Mail', href: '/mail', icon: Mail, service: 'mail' },
  // Database is handled separately as submenu
  { name: 'Cron', href: '/cron', icon: Clock },
  { name: 'Backups', href: '/backups', icon: HardDrive },
  // Admin items (Packages, Services, Database Settings) handled separately as submenu
];

// Database submenu items - filtered by installed services
const databaseItems = [
  { name: 'MariaDB', href: '/databases?type=mysql', icon: Cylinder, service: 'mysql' },
  { name: 'PostgreSQL', href: '/databases?type=pgsql', icon: Database, service: 'pgsql' },
  { name: 'MongoDB', href: '/databases?type=mongodb', icon: Leaf, service: 'mongodb' },
];

// Admin submenu items
const adminItems = [
  { name: 'Packages', href: '/packages', icon: Package },
  { name: 'Install/Uninstall', href: '/services', icon: Server },
  { name: 'Database Settings', href: '/admin/database-settings', icon: Settings },
  { name: 'HAProxy', href: '/haproxy', icon: Network },
];

export default function Layout() {
  const { user, logout, isAdmin, previousUser, returnToPreviousUser, loginAsUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [dbMenuOpen, setDbMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Fetch system info to check installed services
  const { data: systemInfo } = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const res = await api.get('/api/system/info');
      return res.data;
    },
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Filter navigation based on admin role and installed services
  const filteredNav = useMemo(() => {
    return navigationItems.filter(item => {
      // Check admin-only items
      if (item.adminOnly && !isAdmin) return false;
      // Check if service is installed
      if (item.service && systemInfo?.installedServices) {
        return systemInfo.installedServices[item.service] !== false;
      }
      return true;
    });
  }, [isAdmin, systemInfo]);

  // Filter database items based on installed services
  const filteredDbItems = useMemo(() => {
    return databaseItems.filter(item => {
      if (item.service && systemInfo?.installedServices) {
        return systemInfo.installedServices[item.service] === true;
      }
      return true;
    });
  }, [systemInfo]);

  // Check if any database is installed
  const hasAnyDatabase = filteredDbItems.length > 0;

  const handleReturnToAdmin = () => {
    if (previousUser) {
      returnToPreviousUser();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border transform transition-transform duration-200 lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-semibold text-lg">VHestiaCP</span>
          </Link>
          <button
            className="lg:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-border"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info section */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
          <div
            className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 dark:text-primary-400 font-medium">
                {user?.name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || user?.username}</p>
              <p className="text-xs text-gray-500 dark:text-dark-muted truncate">{user?.email}</p>
              {isAdmin && (
                <span className="inline-block mt-1 px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 rounded">
                  Admin
                </span>
              )}
            </div>
            <ChevronDown className={clsx(
              'w-4 h-4 text-gray-400 transition-transform',
              userMenuOpen && 'rotate-180'
            )} />
          </div>

          {/* User dropdown menu */}
          {userMenuOpen && (
            <div className="mt-2 space-y-1">
              <Link
                to={`/users/${user?.username}/edit`}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                Edit Profile
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </div>
          )}

          {/* Return to previous account button */}
          {previousUser && (
            <button
              onClick={handleReturnToAdmin}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400 transition-colors"
            >
              <ArrowLeftCircle className="w-4 h-4" />
              Return to {previousUser.username}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-dark-text dark:hover:bg-dark-border'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}

          {/* Database submenu */}
          {hasAnyDatabase && (
            <div>
              <button
                onClick={() => setDbMenuOpen(!dbMenuOpen)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname.startsWith('/databases')
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-dark-text dark:hover:bg-dark-border'
                )}
              >
                <Database className="w-5 h-5" />
                <span className="flex-1 text-left">Databases</span>
                <ChevronRight className={clsx('w-4 h-4 transition-transform', dbMenuOpen && 'rotate-90')} />
              </button>
              {dbMenuOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-dark-border pl-3">
                  {filteredDbItems.map((item) => {
                    const isActive = location.pathname + location.search === item.href ||
                      (location.pathname === '/databases' && location.search === `?type=${item.service}`);
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                          isActive
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-dark-muted dark:hover:bg-dark-border'
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Admin submenu */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
              <button
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  (location.pathname.startsWith('/packages') || location.pathname.startsWith('/services') || location.pathname.startsWith('/admin') || location.pathname.startsWith('/haproxy'))
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-dark-text dark:hover:bg-dark-border'
                )}
              >
                <Settings className="w-5 h-5" />
                <span className="flex-1 text-left">Admin</span>
                <ChevronRight className={clsx('w-4 h-4 transition-transform', adminMenuOpen && 'rotate-90')} />
              </button>
              {adminMenuOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-dark-border pl-3">
                  {adminItems.map((item) => {
                    const isActive = location.pathname === item.href ||
                      (item.href !== '/' && location.pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                          isActive
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-dark-muted dark:hover:bg-dark-border'
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-border flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-dark-border dark:hover:bg-dark-border/80 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDark ? 'Light' : 'Dark'}
            </button>
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-600 dark:bg-dark-border dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content - no top navbar */}
      <div className="lg:pl-64 min-h-screen flex flex-col">
        {/* Mobile header - only hamburger button */}
        <header className="lg:hidden h-14 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border flex items-center px-4 sticky top-0 z-30">
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-3 font-semibold">VHestiaCP</span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
