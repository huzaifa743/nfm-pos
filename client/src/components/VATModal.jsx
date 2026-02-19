import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const VATModal = ({ subtotal, discount, currentVAT, noVAT, onClose, onApply }) => {
  const { settings } = useSettings();
  const [vatPercentage, setVatPercentage] = useState(currentVAT || 0);
  const [isNoVat, setIsNoVat] = useState(noVAT || false);
  const [vatAmount, setVatAmount] = useState(0);

  useEffect(() => {
    const vatRate = isNoVat ? 0 : parseFloat(vatPercentage) || 0;
    const amount = ((subtotal - discount) * vatRate) / 100;
    setVatAmount(amount);
  }, [subtotal, discount, vatPercentage, isNoVat]);

  const handleApply = () => {
    onApply({ percentage: parseFloat(vatPercentage) || 0, noVat: isNoVat });
  };

  const handlePresetVAT = (preset) => {
    setIsNoVat(false);
    setVatPercentage(preset);
  };
  
  const presetVATs = (settings?.preset_vats || '5,10,15').split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Apply VAT</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
            <label htmlFor="vat-percentage" className="text-gray-700 font-medium">VAT Percentage:</label>
            <input
              id="vat-percentage"
              type="number"
              value={isNoVat ? '0' : vatPercentage}
              onChange={(e) => {
                setIsNoVat(false);
                setVatPercentage(e.target.value);
              }}
              className="w-28 p-2 border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., 5"
              disabled={isNoVat}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="no-vat"
              checked={isNoVat}
              onChange={(e) => setIsNoVat(e.target.checked)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="no-vat" className="ml-2 text-gray-700">No VAT</label>
          </div>

          {presetVATs.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {presetVATs.map(preset => (
                <button
                  key={preset}
                  onClick={() => handlePresetVAT(preset)}
                  className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full hover:bg-primary-500 hover:text-white transition-colors text-sm"
                >
                  {preset}%
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span className="text-gray-600">VAT Amount:</span>
            <span className="text-primary-600">{vatAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold mt-2">
            <span className="text-gray-800">New Total:</span>
            <span className="text-gray-900">{(subtotal - discount + vatAmount).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default VATModal;
