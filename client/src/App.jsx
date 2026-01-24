import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import SalesHistory from './pages/SalesHistory';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Tenants from './pages/Tenants';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

function IndexRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'super_admin' ? '/tenants' : '/dashboard'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<IndexRedirect />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="billing" element={<Billing />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="sales-history" element={<SalesHistory />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
        <Route path="tenants" element={<Tenants />} />
      </Route>
    </Routes>
  );
}

function AppContent() {
  const { settings, loading: settingsLoading, fetchSettings } = useSettings();
  const [showLoading, setShowLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Show loading screen for at least 500ms (reduced from 1.5s)
    const timer = setTimeout(() => {
      if (!settingsLoading) {
        setShowLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [settingsLoading]);

  // Refetch settings when user logs in (to get tenant-specific settings)
  useEffect(() => {
    if (user?.tenant_code) {
      fetchSettings(true, user.tenant_code);
    }
  }, [user?.tenant_code, fetchSettings]);

  // Keep-alive mechanism: Ping server every 2 minutes to prevent Render from spinning down
  // Render free tier spins down after 15 minutes of inactivity
  useEffect(() => {
    if (!user) return; // Only ping when user is logged in

    const pingServer = async () => {
      try {
        const response = await fetch('/api/ping');
        if (!response.ok) {
          console.warn('Keep-alive ping failed');
        }
      } catch (error) {
        // Silently handle errors to avoid console spam
        // Network errors are expected when service is spinning up
      }
    };

    // Ping immediately, then every 2 minutes (120000ms) to keep service alive
    pingServer();
    const interval = setInterval(pingServer, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  if (showLoading || settingsLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <AppRoutes />
      <Toaster position="top-right" />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <AppContent />
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
