import axios from 'axios';
import toast from 'react-hot-toast';

// Use /api so Vite proxy (dev) and same-origin (prod) avoid cross-origin network errors. Override with VITE_API_URL if needed.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error: no response (server down, CORS, or wrong URL)
    const isNetworkError = !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error');
    if (isNetworkError) {
      toast.error('Cannot reach server. Make sure the backend is running (e.g. npm run server on port 5000).');
      console.error('Network error:', error.message || error.code, error.config?.baseURL, error.config?.url);
    }

    if (error.response?.status === 401) {
      // Don't redirect for public endpoints (like settings GET)
      const isPublicEndpoint = error.config?.url?.includes('/settings') && error.config?.method === 'get';
      
      if (!isPublicEndpoint) {
        // Only redirect to login for protected endpoints
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    } else if (error.response?.status === 403) {
      // Handle 403 Forbidden errors
      const errorMessage = error.response?.data?.error || 'Access forbidden';
      console.error('403 Forbidden:', errorMessage, error.config?.url);
      
      // If token is invalid or expired, redirect to login
      if (errorMessage.includes('token') || errorMessage.includes('expired') || errorMessage.includes('Invalid')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      // For other 403 errors (like insufficient permissions), just log them
      // Don't redirect as the user might still be valid but just lacks permission
    }
    return Promise.reject(error);
  }
);

export default api;
