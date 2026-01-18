import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Bell, Globe, LogOut, User, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function Header({ onMenuToggle, isMenuOpen }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  ];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    setShowLanguageMenu(false);
    toast.success(t('common.success'));
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  useEffect(() => {
    // Simulate notifications - in real app, fetch from API
    setNotifications([
      { id: 1, message: 'New sale completed', time: '2 min ago' },
      { id: 2, message: 'Low stock alert: Product XYZ', time: '1 hour ago' },
    ]);
  }, []);

  return (
    <header className="bg-slate-900 shadow-sm border-b border-slate-700 relative">
      <div className="flex items-center justify-between w-full">
        {/* Hamburger Menu Button - Integrated in header background border */}
        <div className="flex items-center px-4 border-r border-slate-700 h-full">
          <button
            className={`p-2.5 rounded-lg transition-all duration-300 ${
              isMenuOpen
                ? 'opacity-0 scale-95 pointer-events-none'
                : 'opacity-100 scale-100 hover:bg-slate-800'
            }`}
            onClick={onMenuToggle}
            style={{ transitionDelay: isMenuOpen ? '0ms' : '300ms' }}
          >
            <Menu className="w-5 h-5 text-slate-300 hover:text-white transition-colors" />
          </button>
        </div>

        {/* Logo and Name Section with Dark Background - Full width */}
        <div className="flex items-center px-6 py-4 flex-1">
          {settings.restaurant_logo ? (
            <div className="mr-4 flex-shrink-0">
              <img
                src={`http://localhost:5000${settings.restaurant_logo}`}
                alt="Logo"
                className="h-10 w-auto object-contain max-w-[120px]"
              />
            </div>
          ) : (
            <div className="mr-4 flex-shrink-0 w-10 h-10 bg-slate-700 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">POS</span>
            </div>
          )}
          <h2 className="text-xl font-bold text-white truncate">
            {settings.restaurant_name || 'Restaurant POS'}
          </h2>
        </div>

        <div className="flex items-center space-x-4 px-6 py-4">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Globe className="w-5 h-5 text-slate-300" />
              <span className="text-sm font-medium text-slate-300">
                {languages.find((l) => l.code === i18n.language)?.flag || '🌐'}
              </span>
            </button>

            {showLanguageMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowLanguageMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg ${
                        i18n.language === lang.code ? 'bg-primary-50 text-primary-700' : ''
                      }`}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Bell className="w-5 h-5 text-slate-300" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">
                      {t('common.notifications')}
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="p-4 border-b border-gray-100 hover:bg-gray-50"
                        >
                          <p className="text-sm text-gray-800">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        {t('common.noNotifications')}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-300">
                {user?.full_name || user?.username}
              </span>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="p-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-800">
                      {user?.full_name || user?.username}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Role: {user?.role}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-b-lg flex items-center space-x-2 text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('common.logout')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
