// Use relative URLs so Vite proxy (dev) and same-origin (prod) work. Avoids ERR_CONNECTION_REFUSED to localhost:5000.
export const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl.startsWith('http')) {
      return apiUrl.replace(/\/api\/?$/, '');
    }
    if (apiUrl.startsWith('/')) return '';
    return apiUrl.replace(/\/api\/?$/, '');
  }
  return ''; // Relative: /api and /uploads go through proxy (dev) or same origin (prod)
};

// Helper to get full URL for uploads/images
export const getImageURL = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path; // Already full URL
  if (path.startsWith('data:')) return path; // Data URL (base64)
  
  const baseURL = getBaseURL();
  // Ensure path starts with / if baseURL is empty (relative path)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // If baseURL is empty, return relative path
  if (!baseURL) {
    return normalizedPath;
  }
  
  // Combine baseURL and path, avoiding double slashes
  const url = `${baseURL}${normalizedPath}`;
  return url;
};
