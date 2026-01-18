import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { X, Tag } from 'lucide-react';

export default function DiscountModal({ 
  subtotal, 
  onClose, 
  onApply, 
  currentDiscount = 0, 
  currentDiscountType = 'fixed' 
}) {
  const { t } = useTranslation();
  const { formatCurrency } = useSettings();
  const [discountType, setDiscountType] = useState(currentDiscountType);
  const [discountValue, setDiscountValue] = useState(currentDiscount || '');

  const calculateDiscount = () => {
    if (!discountValue || discountValue <= 0) return 0;
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    }
    return Math.min(discountValue, subtotal);
  };

  const discountAmount = calculateDiscount();
  const finalAmount = subtotal - discountAmount;

  const handleApply = () => {
    if (discountValue && discountValue > 0) {
      // For percentage, return the percentage value; for fixed, return the amount
      const value = parseFloat(discountValue);
      onApply({
        amount: discountAmount, // Calculated discount amount
        value: value, // Original input value (percentage or fixed amount)
        type: discountType
      });
    } else {
      onApply({ amount: 0, value: 0, type: discountType });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Tag className="w-6 h-6" />
            {t('billing.discount')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Discount Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDiscountType('fixed')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  discountType === 'fixed'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                Fixed Amount
              </button>
              <button
                onClick={() => setDiscountType('percentage')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  discountType === 'percentage'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                Percentage (%)
              </button>
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
            </label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder={discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
              min="0"
              max={discountType === 'percentage' ? '100' : subtotal}
              step={discountType === 'percentage' ? '0.1' : '0.01'}
            />
          </div>

          {/* Results Preview */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(discountAmount)}
                </span>
              </div>
            )}
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-800">Final Amount:</span>
                <span className="font-bold text-lg text-primary-600">
                  {formatCurrency(finalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            Apply Discount
          </button>
        </div>
      </div>
    </div>
  );
}
