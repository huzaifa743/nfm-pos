import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    setLoading(false);
  }, []);

  const login = async (username, password, tenantCode = '') => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password,
        tenant_code: tenantCode || undefined
      });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);

      if (user.tenant_code) {
        localStorage.setItem('lastTenantCode', user.tenant_code);
      } else {
        localStorage.removeItem('lastTenantCode');
      }

      toast.success('Login successful');
      return { success: true, user };
    } catch (error) {
      const isNetworkError = !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error');
      const message = isNetworkError
        ? 'Cannot reach server. Make sure the backend is running (e.g. npm run server).'
        : (error.response?.data?.error || 'Login failed');
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  const clearLastTenantCode = () => {
    localStorage.removeItem('lastTenantCode');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, clearLastTenantCode }}>
      {children}
    </AuthContext.Provider>
  );
};
