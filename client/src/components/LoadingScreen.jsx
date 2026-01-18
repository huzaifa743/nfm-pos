import { useEffect, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export default function LoadingScreen() {
  const { settings } = useSettings();
  const [showLogo, setShowLogo] = useState(true);

  useEffect(() => {
    // Hide logo after a short delay for smooth transition
    const timer = setTimeout(() => {
      setShowLogo(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!showLogo) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 z-50 flex items-center justify-center">
      <div className="flex flex-col items-center justify-center">
        {settings?.restaurant_logo ? (
          <img
            src={`http://localhost:5000${settings.restaurant_logo}`}
            alt={settings.restaurant_name || 'Restaurant Logo'}
            className="max-w-[200px] max-h-[150px] w-auto h-auto object-contain mb-4 animate-pulse"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}
        {(!settings?.restaurant_logo || !settings.restaurant_logo) && (
          <div className="w-32 h-32 bg-primary-600 rounded-lg flex items-center justify-center mb-4 animate-pulse shadow-lg">
            <span className="text-white text-2xl font-bold">POS</span>
          </div>
        )}
        {settings?.restaurant_name && (
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {settings.restaurant_name}
          </h2>
        )}
        <div className="flex items-center gap-2 mt-4">
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}
