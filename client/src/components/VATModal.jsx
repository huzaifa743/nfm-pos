import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { X, FileText } from 'lucide-react';

export default function VATModal({ 
  subtotal, 
  discount = 0,
  onClose, 
  onApply, 
  currentVAT = 0,
  noVAT = false
}) {
  const { t } = useTranslation();
  const { formatCurrency, settings } = useSettings();
  const [vatPercentage, setVatPercentage] = useState(currentVAT || settings.vat_percentage || 0);
  const [noVatChecked, setNoVatChecked] = useState(noVAT);

  const calculateVAT = () => {
    if (noVatChecked || !vatPercentage || vatPercentage <= 0) return 0;
    const amountAfterDiscount = subtotal - discount;
    return (amountAfterDiscount * vatPercentage) / 100;
  };

  const vatAmount = calculateVAT();
  const amountAfterDiscount = subtotal - discount;
  const finalAmount = amountAfterDiscount + vatAmount;

  const handleApply = () => {
    if (noVatChecked) {
      onApply({ percentage: 0, amount: 0, noVat: true });
    } else {
      onApply({ 
        percentage: parseFloat(vatPercentage) || 0, 
        amount: vatAmount,
        noVat: false 
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {t('billing.vat')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* No VAT Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={noVatChecked}
              onChange={(e) => setNoVatChecked(e.target.checked)}
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label className="text-sm font-medium text-gray-700">
              {t('billing.noVat')}
            </label>
          </div>

          {/* VAT Percentage */}
          {!noVatChecked && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                VAT Percentage (%)
              </label>
              <input
                type="number"
                value={vatPercentage}
                onChange={(e) => setVatPercentage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Enter VAT percentage"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          )}

          {/* Results Preview */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount After Discount:</span>
              <span className="font-medium">{formatCurrency(amountAfterDiscount)}</span>
            </div>
            {!noVatChecked && vatAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT ({vatPercentage}%):</span>
                <span className="font-medium">{formatCurrency(vatAmount)}</span>
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
            Apply VAT
          </button>
        </div>
      </div>
    </div>
  );
}
