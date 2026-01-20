import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'

// Suppress osano.js SVG viewBox errors and preload warnings (harmless third-party warnings)
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Filter console.error for osano.js SVG errors
  console.error = function(...args) {
    const message = args[0]?.toString() || '';
    const fullMessage = args.join(' ').toLowerCase();
    
    // Filter out osano.js SVG viewBox errors - they're harmless warnings from external library
    if (
      (message.includes('viewBox') && message.includes('Expected number')) ||
      fullMessage.includes('osano') ||
      (fullMessage.includes('viewbox') && fullMessage.includes('expected number')) ||
      (message.includes('<svg>') && message.includes('attribute viewBox'))
    ) {
      return; // Suppress these harmless errors
    }
    originalError.apply(console, args);
  };
  
  // Filter console.warn for osano.js SVG errors and preload warnings
  console.warn = function(...args) {
    const message = args[0]?.toString() || '';
    const fullMessage = args.join(' ').toLowerCase();
    
    // Filter osano.js SVG viewBox warnings
    if (
      (message.includes('viewBox') && message.includes('Expected number')) ||
      fullMessage.includes('osano') ||
      (fullMessage.includes('viewbox') && fullMessage.includes('expected number')) ||
      (message.includes('<svg>') && message.includes('attribute viewBox'))
    ) {
      return; // Suppress these harmless warnings
    }
    
    // Filter preload warnings (harmless browser warnings)
    if (message.includes('preloaded using link preload but not used')) {
      return; // Suppress preload warnings
    }
    
    originalWarn.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
