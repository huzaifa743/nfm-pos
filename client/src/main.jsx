import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'

// Suppress osano.js SVG viewBox errors and preload warnings (harmless third-party warnings)
if (typeof window !== 'undefined') {
  // Catch unhandled errors and rejections (for framework-thrown errors)
  window.addEventListener('error', function(event) {
    const message = (event.message || '').toString().toLowerCase();
    const source = (event.filename || '').toString().toLowerCase();
    if (
      (message.includes('viewbox') && message.includes('expected number')) ||
      source.includes('osano') ||
      (message.includes('<svg>') && message.includes('attribute viewbox'))
    ) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
  
  window.addEventListener('unhandledrejection', function(event) {
    const reason = (event.reason || '').toString().toLowerCase();
    if (
      (reason.includes('viewbox') && reason.includes('expected number')) ||
      reason.includes('osano')
    ) {
      event.preventDefault();
      return false;
    }
  });
  
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Filter console.error for osano.js SVG errors
  console.error = function(...args) {
    const message = (args[0]?.toString() || '').toLowerCase();
    const fullMessage = args.join(' ').toLowerCase();
    const stack = (args[0]?.stack || '').toLowerCase();
    
    // Filter out osano.js SVG viewBox errors - they're harmless warnings from external library
    if (
      (message.includes('viewbox') && message.includes('expected number')) ||
      (fullMessage.includes('viewbox') && fullMessage.includes('expected number')) ||
      message.includes('osano') ||
      stack.includes('osano') ||
      (message.includes('<svg>') && message.includes('attribute viewbox'))
    ) {
      return; // Suppress these harmless errors
    }
    originalError.apply(console, args);
  };
  
  // Filter console.warn for osano.js SVG errors and preload warnings
  console.warn = function(...args) {
    const message = (args[0]?.toString() || '').toLowerCase();
    const fullMessage = args.join(' ').toLowerCase();
    
    // Filter osano.js SVG viewBox warnings
    if (
      (message.includes('viewbox') && message.includes('expected number')) ||
      (fullMessage.includes('viewbox') && fullMessage.includes('expected number')) ||
      message.includes('osano') ||
      fullMessage.includes('osano')
    ) {
      return; // Suppress these harmless warnings
    }
    
    // Filter preload warnings (harmless browser warnings)
    if (
      message.includes('preloaded using link preload but not used') ||
      message.includes('railway.com')
    ) {
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
