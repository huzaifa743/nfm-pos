import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  BarChart3,
  Users,
  Settings,
  Building2,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onToggle }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/billing', icon: ShoppingCart, label: t('nav.billing') },
    { path: '/inventory', icon: Package, label: t('nav.inventory') },
    { path: '/sales-history', icon: History, label: t('nav.salesHistory') },
    { path: '/reports', icon: BarChart3, label: t('nav.reports') },
    { path: '/users', icon: Users, label: t('nav.users') },
    { path: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  // Add Tenants menu for super admin
  if (user?.role === 'super_admin') {
    menuItems.splice(6, 0, { path: '/tenants', icon: Building2, label: 'Tenants' });
  }


  return (
    <>
      {/* Sidebar with smooth slide animation */}
      <aside
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-slate-800 to-slate-900 text-white transform transition-transform duration-300 ease-out shadow-2xl`}
      >
        <div className="flex flex-col h-full">
          {/* Header with close button */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Menu</h2>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`
                  }
                  onClick={onToggle}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700">
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Software By<br />
              <span className="font-semibold text-slate-300">NFM Services and Solutions</span><br />
              <span className="text-slate-400">0337-7249638</span>
            </p>
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
