import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { X } from 'lucide-react';
import api from '../api/api';

export default function CheckoutModal({ total, onClose, onConfirm, initialSaleDate }) {
  const { t } = useTranslation();
  const { formatCurrency } = useSettings();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState(total);
  const [customAmount, setCustomAmount] = useState('');
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('');
  const [loadingDeliveryBoys, setLoadingDeliveryBoys] = useState(false);

  const quickAmounts = [10, 20, 50, 100, 200, 500];

  useEffect(() => {
    if (paymentMethod === 'payAfterDelivery') {
      fetchDeliveryBoys();
    }
  }, [paymentMethod]);

  const fetchDeliveryBoys = async () => {
    setLoadingDeliveryBoys(true);
    try {
      const response = await api.get('/deliveries/delivery-boys');
      setDeliveryBoys(response.data);
    } catch (error) {
      console.error('Error fetching delivery boys:', error);
    } finally {
      setLoadingDeliveryBoys(false);
    }
  };

  const handleQuickAmount = (amount) => {
    setPaymentAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmount = (value) => {
    setCustomAmount(value);
    setPaymentAmount(parseFloat(value) || 0);
  };

  const changeAmount = paymentAmount - total;

  const handleConfirm = () => {
    if (paymentMethod === 'payAfterDelivery' && !selectedDeliveryBoy) {
      return; // Don't allow confirmation without selecting delivery boy
    }
    
    onConfirm({
      method: paymentMethod,
      amount: paymentAmount,
      change: changeAmount > 0 ? changeAmount : 0,
      delivery_boy_id: paymentMethod === 'payAfterDelivery' ? parseInt(selectedDeliveryBoy) : null,
      sale_date: initialSaleDate || new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{t('billing.checkout')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('billing.total')}:</span>
              <span className="text-2xl font-bold text-primary-600">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('billing.paymentMethod')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['cash', 'card', 'online', 'payAfterDelivery'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    paymentMethod === method
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {t(`billing.${method}`)}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod !== 'payAfterDelivery' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('billing.paymentAmount')}
              </label>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleQuickAmount(amount)}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                      paymentAmount === amount
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={customAmount}
                onChange={(e) => handleCustomAmount(e.target.value)}
                placeholder="Enter custom amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                step="0.01"
                min="0"
              />
            </div>
          )}

          {paymentMethod === 'payAfterDelivery' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Delivery Boy
              </label>
              {loadingDeliveryBoys ? (
                <div className="text-center py-4 text-gray-500">Loading delivery boys...</div>
              ) : (
                <select
                  value={selectedDeliveryBoy}
                  onChange={(e) => setSelectedDeliveryBoy(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">-- Select Delivery Boy --</option>
                  {deliveryBoys.map((boy) => (
                    <option key={boy.id} value={boy.id}>
                      {boy.name}
                    </option>
                  ))}
                </select>
              )}
              {paymentMethod === 'payAfterDelivery' && !selectedDeliveryBoy && (
                <p className="text-xs text-red-600 mt-1">Please select a delivery boy to continue</p>
              )}
            </div>
          )}

          {paymentMethod !== 'payAfterDelivery' && (
            <div className={`rounded-lg p-4 mb-4 ${
              changeAmount > 0 ? 'bg-green-50' : changeAmount < 0 ? 'bg-red-50' : 'bg-gray-50'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('billing.change')}:</span>
                <span className={`text-xl font-bold ${
                  changeAmount > 0 ? 'text-green-600' : changeAmount < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {formatCurrency(changeAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={paymentMethod === 'payAfterDelivery' && !selectedDeliveryBoy}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors font-semibold ${
              paymentMethod === 'payAfterDelivery' && !selectedDeliveryBoy
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
