import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../api/api';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    restaurant_name: 'NFM POS',
    restaurant_logo: '',
    restaurant_address: '',
    restaurant_phone: '',
    restaurant_email: '',
    trn: '',
    currency: 'USD',
    language: 'en',
    vat_percentage: '0',
    receipt_auto_print: 'false',
    receipt_paper_size: '80mm',
    invoice_type: 'thermal',
  });
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  const fetchSettings = useCallback(async (force = false, tenantCode = null) => {
    // Prevent multiple simultaneous fetches unless forced
    if (hasFetchedRef.current && !force) return;
    
    if (force) {
      hasFetchedRef.current = false; // Reset to allow refetch
    }
    
    hasFetchedRef.current = true;
    setLoading(true);
    try {
      // Get tenant_code from localStorage if not provided
      if (!tenantCode) {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            tenantCode = user.tenant_code;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      // Always call /settings - it will use tenant_code from token if authenticated
      // or from query param if provided
      const url = tenantCode ? `/settings?tenant_code=${tenantCode}` : '/settings';
      const response = await api.get(url);
      
      // Merge with existing settings to preserve any that might not be in response
      setSettings(prev => {
        const merged = { ...prev, ...response.data };
        return merged;
      });
    } catch (error) {
      // Handle 401 and other errors gracefully
      if (error.response?.status === 401) {
        // Settings endpoint should be public, but if auth is required, use defaults
        console.warn('Settings endpoint requires auth, using defaults');
      } else if (error.response?.status === 404) {
        // Tenant not found - use defaults silently
        console.warn('Tenant settings not found, using defaults');
      } else {
        console.error('Error fetching settings:', error);
      }
      hasFetchedRef.current = false; // Allow retry on error
      // Don't throw, just use defaults - keep current settings
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch settings on mount
    // Will be refetched when user logs in via App.jsx useEffect
    if (!hasFetchedRef.current) {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCurrency = useCallback((amount) => {
    const currencySymbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      SAR: 'ر.س', // Saudi Riyal
      AED: 'د.إ', // UAE Dirham
      PKR: '₨', // Pakistani Rupee
      INR: '₹', // Indian Rupee
    };
    const symbol = currencySymbols[settings.currency];
    if (symbol) {
      return `${symbol} ${parseFloat(amount || 0).toFixed(2)}`;
    }
    // Fallback: if currency not found, use currency code
    return `${settings.currency || 'USD'} ${parseFloat(amount || 0).toFixed(2)}`;
  }, [settings.currency]);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    hasFetchedRef.current = true; // Mark as fetched when manually updated
  }, []);

  const value = useMemo(() => ({
    settings,
    setSettings: updateSettings,
    fetchSettings,
    formatCurrency,
    loading
  }), [settings, updateSettings, fetchSettings, formatCurrency, loading]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
