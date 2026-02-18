import axios from 'axios';

// Use environment variable, or relative URL in production, or localhost in development
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
