import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={isMenuOpen} onToggle={handleMenuToggle} />
      <div className="flex-1 flex flex-col overflow-hidden ml-0">
        <Header onMenuToggle={handleMenuToggle} isMenuOpen={isMenuOpen} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
