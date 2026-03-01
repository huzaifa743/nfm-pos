import { X, Sparkles } from 'lucide-react';

export default function PremiumFeatureModal({ isOpen, onClose, featureName = 'This feature' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-amber-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-modal-title"
      >
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-amber-700">
              <Sparkles className="w-8 h-8 text-amber-500" aria-hidden="true" />
              <span className="text-sm font-semibold uppercase tracking-wider">Premium</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-white/80 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 id="premium-modal-title" className="text-xl font-bold text-gray-800 mb-2">
            {featureName} is a Premium Feature
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Unlock this feature for your business by contacting your administrator. They can enable it for your account from Tenant Management.
          </p>
        </div>
        <div className="px-6 py-4 bg-white border-t border-gray-100 space-y-3">
          <p className="text-xs text-center text-gray-500">
            Your administrator can enable this feature for your account from Tenant Management.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
