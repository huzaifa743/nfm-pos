import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { X, Plus, Trash2 } from 'lucide-react';

export default function SplitPaymentModal({ open, onClose, total, onConfirm }) {
  const { t } = useTranslation();
  const { formatCurrency } = useSettings();
  const [splitPayments, setSplitPayments] = useState([
    { method: 'cash', amount: total }
  ]);

  useEffect(() => {
    if (open) {
      setSplitPayments([{ method: 'cash', amount: total }]);
    }
  }, [open, total]);

  const paymentMethods = ['cash', 'card', 'online', 'payAfterDelivery'];

  const formatPaymentMethod = (method) => {
    const methodMap = {
      'cash': 'Cash',
      'card': 'Card',
      'online': 'Online',
      'payAfterDelivery': 'Pay After Delivery'
    };
    return methodMap[method] || method;
  };

  const addPayment = () => {
    setSplitPayments([...splitPayments, { method: 'cash', amount: 0 }]);
  };

  const removePayment = (index) => {
    if (splitPayments.length > 1) {
      setSplitPayments(splitPayments.filter((_, i) => i !== index));
    }
  };

  const updatePayment = (index, field, value) => {
    const updated = [...splitPayments];
    updated[index] = { ...updated[index], [field]: value };
    setSplitPayments(updated);
  };

  const totalPaid = splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const remaining = total - totalPaid;
  const change = totalPaid > total ? totalPaid - total : 0;

  const handleConfirm = () => {
    if (totalPaid < total) {
      alert(`Total paid (${formatCurrency(totalPaid)}) is less than total (${formatCurrency(total)}). Please add more payments.`);
      return;
    }
    onConfirm({
      split_payments: splitPayments,
      payment_method: splitPayments.length === 1 ? splitPayments[0].method : 'split',
      payment_amount: totalPaid,
      change: change
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Split Payment</h2>
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
              <span className="text-lg font-medium text-gray-700">Total:</span>
              <span className="text-2xl font-bold text-primary-600">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {splitPayments.map((payment, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <select
                  value={payment.method}
                  onChange={(e) => updatePayment(index, 'method', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>
                      {formatPaymentMethod(method)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={payment.amount}
                  onChange={(e) => updatePayment(index, 'amount', parseFloat(e.target.value) || 0)}
                  placeholder="Amount"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  step="0.01"
                  min="0"
                />
                {splitPayments.length > 1 && (
                  <button
                    onClick={() => removePayment(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addPayment}
            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Payment Method
          </button>
        </div>

        <div className="space-y-2 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Paid:</span>
            <span className="font-medium">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Remaining:</span>
            <span className={`font-medium ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(remaining))}
            </span>
          </div>
          {change > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Change:</span>
              <span className="font-medium text-green-600">{formatCurrency(change)}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={remaining > 0}
            className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
}
