import { useLanguage } from '@/contexts/LanguageContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  ShoppingCart,
  Receipt,
  Wallet,
  FileText,
  Settings,
  Menu,
  X,
  CreditCard,
  DollarSign,
  PackageCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MenuVisibilitySettings } from '@/types/erp';
import { defaultMenuVisibilitySettings } from '@/data/mockData';

const allNavItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/' },
  { key: 'pos', icon: CreditCard, path: '/pos', label: 'POS' },
  { key: 'customers', icon: Users, path: '/customers' },
  { key: 'suppliers', icon: Truck, path: '/suppliers' },
  { key: 'items', icon: Package, path: '/items' },
  { key: 'sales', icon: ShoppingCart, path: '/sales' },
  { key: 'purchases', icon: Receipt, path: '/purchases' },
  { key: 'expenses', icon: DollarSign, path: '/expenses', label: 'Expenses' },
  { key: 'goods', icon: PackageCheck, path: '/goods' },
  { key: 'accounts', icon: Wallet, path: '/accounts' },
  { key: 'reports', icon: FileText, path: '/reports' },
] as const;

// Settings is always visible
const settingsNavItem = { key: 'settings', icon: Settings, path: '/settings' } as const;

export function AppSidebar() {
  const { t, isRTL } = useLanguage();
  const location = useLocation();
  const { collapsed, setCollapsed } = useSidebar();
  const [menuVisibility, setMenuVisibility] = useState<MenuVisibilitySettings>(() => {
    const saved = localStorage.getItem('menuVisibilitySettings');
    return saved ? JSON.parse(saved) : defaultMenuVisibilitySettings;
  });

  // Listen for settings changes
  useEffect(() => {
    const handleSettingChange = () => {
      const saved = localStorage.getItem('menuVisibilitySettings');
      setMenuVisibility(saved ? JSON.parse(saved) : defaultMenuVisibilitySettings);
    };
    window.addEventListener('menuVisibilityChanged', handleSettingChange);
    return () => window.removeEventListener('menuVisibilityChanged', handleSettingChange);
  }, []);

  // Filter nav items based on visibility settings
  const visibleNavItems = allNavItems.filter(item => {
    return menuVisibility[item.key as keyof MenuVisibilitySettings] !== false;
  });

  return (
    <aside
      className={cn(
        'fixed top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 ease-in-out z-40',
        collapsed ? 'w-[68px]' : 'w-64',
        'left-0'
      )}
    >
      {/* Header */}
      <div className={cn(
        "h-16 flex items-center justify-between px-4 border-b border-sidebar-border",
        isRTL && "flex-row-reverse"
      )}>
        {!collapsed && (
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">J</span>
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">JSERP</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          const label = 'label' in item ? item.label : t(item.key as any);

          return (
            <Link
              key={item.key}
              to={item.path}
              className={cn(
                'nav-item',
                isActive && 'active',
                collapsed && 'justify-center px-2',
                isRTL && !collapsed && 'flex-row-reverse'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className={cn(
                'h-5 w-5 flex-shrink-0 transition-transform duration-200',
                collapsed && 'mx-auto',
                isRTL && !collapsed && 'ml-3 mr-0'
              )} />
              {!collapsed && (
                <span className={cn(
                  "text-sm font-medium truncate",
                  isRTL && "text-right"
                )}>
                  {label}
                </span>
              )}
            </Link>
          );
        })}
        
        {/* Settings - Always visible */}
        <Link
          to={settingsNavItem.path}
          className={cn(
            'nav-item',
            location.pathname === settingsNavItem.path && 'active',
            collapsed && 'justify-center px-2',
            isRTL && !collapsed && 'flex-row-reverse'
          )}
          title={collapsed ? t('settings') : undefined}
        >
          <settingsNavItem.icon className={cn(
            'h-5 w-5 flex-shrink-0 transition-transform duration-200',
            collapsed && 'mx-auto',
            isRTL && !collapsed && 'ml-3 mr-0'
          )} />
          {!collapsed && (
            <span className={cn(
              "text-sm font-medium truncate",
              isRTL && "text-right"
            )}>
              {t('settings')}
            </span>
          )}
        </Link>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-muted">
            © 2026 JSERP
          </p>
        </div>
      )}
    </aside>
  );
}
