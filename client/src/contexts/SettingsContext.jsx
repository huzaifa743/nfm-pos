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
    restaurant_name: 'Restaurant POS',
    restaurant_logo: '',
    restaurant_address: '',
    restaurant_phone: '',
    restaurant_email: '',
    currency: 'USD',
    language: 'en',
    vat_percentage: '0',
    receipt_auto_print: 'false',
    receipt_paper_size: '80mm',
  });
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  const fetchSettings = useCallback(async (force = false) => {
    if (hasFetchedRef.current && !force) return;
    
    if (force) {
      hasFetchedRef.current = false; // Reset to allow refetch
    }
    
    hasFetchedRef.current = true;
    setLoading(true);
    try {
      const response = await api.get('/settings');
      setSettings(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error('Error fetching settings:', error);
      hasFetchedRef.current = false; // Allow retry on error
      // Don't throw, just use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
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
