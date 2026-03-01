import { Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pathToFeatureKey, isFeatureAllowed, DEFAULT_FEATURES } from '../constants/features';
import Sidebar from './Sidebar';
import Header from './Header';
import PremiumFeatureModal from './PremiumFeatureModal';

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isPlatformAdmin = user?.role === 'super_admin' || (user?.role === 'admin' && !user?.tenant_code);
  const allowedPlatformPaths = ['/tenants', '/superadmin', '/settings'];
  const isAllowedPath = allowedPlatformPaths.some(p => location.pathname.startsWith(p));
  const featureKey = pathToFeatureKey(location.pathname);
  // Use default features when missing/empty (e.g. old session before allowed_features existed)
  const allowedFeatures = (user?.allowed_features?.length ? user.allowed_features : DEFAULT_FEATURES);
  const isTenantUser = user?.tenant_code && !isPlatformAdmin;
  const isRestrictedRoute = isTenantUser && featureKey && !isFeatureAllowed(featureKey, allowedFeatures);

  if (isPlatformAdmin && !isAllowedPath) {
    return <Navigate to="/tenants" replace />;
  }

  // Redirect restricted routes to dashboard (avoid loop: do not redirect if already on dashboard)
  if (isRestrictedRoute && location.pathname !== '/dashboard') {
    const featureLabel = featureKey ? featureKey.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'This page';
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ showPremiumFeatureModal: true, premiumFeatureName: featureLabel }}
      />
    );
  }

  const showPremiumFromState = location.state?.showPremiumFeatureModal;
  const premiumFeatureNameFromState = location.state?.premiumFeatureName || 'This feature';

  const handleClosePremiumModal = () => {
    navigate(location.pathname, { replace: true, state: {} });
  };

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
      {showPremiumFromState && (
        <PremiumFeatureModal
          isOpen={true}
          onClose={handleClosePremiumModal}
          featureName={premiumFeatureNameFromState}
        />
      )}
    </div>
  );
}
