import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (user?.role === 'super_admin' && !location.pathname.startsWith('/tenants')) {
    return <Navigate to="/tenants" replace />;
  }

  return (
    <div className="fixed inset-0 flex bg-gray-50">
      <Sidebar isOpen={isMenuOpen} onToggle={handleMenuToggle} />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden ml-0">
        <Header onMenuToggle={handleMenuToggle} isMenuOpen={isMenuOpen} />
        <main className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
