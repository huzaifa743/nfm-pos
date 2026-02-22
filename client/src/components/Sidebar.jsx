import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  BarChart3,
  Users,
  User,
  Settings,
  Building2,
  X,
  LogOut,
  Truck,
  UserCircle,
  FileText,
  ShoppingBag,
  Receipt,
  Banknote,
  TrendingDown,
  ArrowLeftRight,
  ChevronRight,
  Shield
} from 'lucide-react';

export default function Sidebar({ isOpen, onToggle }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const isPlatformAdmin = user?.role === 'super_admin' || (user?.role === 'admin' && !user?.tenant_code);
  const isSuperAdmin = user?.role === 'super_admin';

  // Group menu items by category
  const menuSections = isPlatformAdmin
    ? [
        {
          title: null,
          items: [
            { path: '/tenants', icon: Building2, label: 'Tenants' },
            ...(isSuperAdmin ? [{ path: '/superadmin', icon: Shield, label: 'Superadmin' }] : []),
            { path: '/settings', icon: Settings, label: 'Settings' }
          ]
        }
      ]
    : [
        {
          title: null,
          items: [
            { path: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
            { path: '/billing', icon: ShoppingCart, label: t('nav.billing') },
          ]
        },
        {
          title: 'Operations',
          items: [
            { path: '/inventory', icon: Package, label: t('nav.inventory') },
            { path: '/unit-conversions', icon: ArrowLeftRight, label: 'Unit Conversion' },
            { path: '/sales-history', icon: History, label: t('nav.salesHistory') },
            { path: '/deliveries', icon: Truck, label: 'Deliveries' },
          ]
        },
        {
          title: 'Management',
          items: [
            { path: '/delivery-boys', icon: User, label: 'Delivery Boys' },
            { path: '/employees', icon: UserCircle, label: 'Employees & Salaries' },
            { path: '/suppliers', icon: ShoppingBag, label: 'Suppliers' },
            { path: '/purchase-orders', icon: Receipt, label: 'Purchase Orders' },
          ]
        },
        {
          title: 'Finance',
          items: [
            { path: '/expenses', icon: TrendingDown, label: 'Expenses' },
            { path: '/cash', icon: Banknote, label: 'Cash' },
          ]
        },
        {
          title: 'System',
          items: [
            { path: '/reports', icon: BarChart3, label: t('nav.reports') },
            { path: '/users', icon: Users, label: t('nav.users') },
            { path: '/settings', icon: Settings, label: t('nav.settings') },
          ]
        }
      ];

  return (
    <>
      {/* Sidebar with smooth slide animation */}
      <aside
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-40 w-72 bg-white text-gray-800 transform transition-transform duration-300 ease-out shadow-2xl border-r border-gray-200`}
      >
        <div className="flex flex-col h-full">
          {/* Header with close button */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
            <button
              onClick={onToggle}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {menuSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-6 last:mb-0">
                {section.title && (
                  <div className="px-6 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                )}
                <div className="space-y-1 px-3">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `group flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                            isActive
                              ? 'bg-primary-50 text-primary-700 shadow-sm border-l-4 border-primary-600'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                          }`
                        }
                        onClick={onToggle}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                            'group-hover:scale-110'
                          }`} />
                          <span className="font-medium text-sm truncate">{item.label}</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-all duration-200 ${
                          'opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1'
                        }`} />
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer with Logout */}
          <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-red-600 hover:bg-red-50 hover:shadow-sm group"
            >
              <LogOut className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              <span className="font-medium text-sm">{t('common.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay with fade animation */}
      <div
        className={`fixed inset-0 bg-black z-30 transition-opacity duration-300 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onToggle}
      />
    </>
  );
}
