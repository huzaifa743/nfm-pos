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
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="billing" element={<Billing />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="sales-history" element={<SalesHistory />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function AppContent() {
  const { settings, loading: settingsLoading } = useSettings();
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    // Show loading screen for at least 1.5 seconds
    const timer = setTimeout(() => {
      if (!settingsLoading) {
        setShowLoading(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [settingsLoading]);

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
