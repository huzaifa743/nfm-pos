import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { X, AlertTriangle } from 'lucide-react';

export default function RefundModal({ open, onClose, sale, onRefundComplete }) {
  const { t } = useTranslation();
  const { formatCurrency } = useSettings();
  const [refundType, setRefundType] = useState('full'); // 'full' or 'partial'
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open && sale) {
      setRefundType('full');
      setSelectedItems([]);
      setReason('');
    }
  }, [open, sale]);

  const handleItemToggle = (itemId) => {
    if (refundType === 'full') return;
    
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleQuantityChange = (itemId, quantity) => {
    if (refundType === 'full') return;
    
    setSelectedItems(prev => {
      const existing = prev.find(i => i.item_id === itemId);
      if (existing) {
        return prev.map(i => 
          i.item_id === itemId ? { ...i, quantity: Math.max(0.01, Math.min(quantity, sale.items.find(si => si.id === itemId)?.quantity || 0)) } : i
        );
      } else {
        const item = sale.items.find(si => si.id === itemId);
        return [...prev, { item_id: itemId, quantity: Math.min(quantity, item?.quantity || 0) }];
      }
    });
  };

  const calculateRefundAmount = () => {
    if (refundType === 'full') {
      return sale.total;
    }
    
    let amount = 0;
    for (const refundItem of selectedItems) {
      const item = sale.items.find(si => si.id === refundItem.item_id);
      if (item) {
        amount += item.unit_price * refundItem.quantity;
      }
    }
    return amount;
  };

  const handleRefund = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the refund');
      return;
    }

    if (refundType === 'partial' && selectedItems.length === 0) {
      toast.error('Please select items to refund');
      return;
    }

    try {
      setProcessing(true);
      const itemsToRefund = refundType === 'full' ? null : selectedItems;
      
      await api.post(`/sales/${sale.id}/refund`, {
        reason: reason.trim(),
        items_to_refund: itemsToRefund
      });

      toast.success('Refund processed successfully');
      onRefundComplete?.();
      onClose();
    } catch (error) {
      console.error('Refund error:', error);
      toast.error(error.response?.data?.error || 'Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };

  if (!open || !sale) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-800">Process Refund</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">Sale Number</p>
              <p className="font-semibold text-gray-800">{sale.sale_number}</p>
              <p className="text-sm text-gray-600 mt-2 mb-1">Original Total</p>
              <p className="text-xl font-bold text-primary-600">{formatCurrency(sale.total)}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Refund Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRefundType('full');
                    setSelectedItems([]);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    refundType === 'full'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Full Refund
                </button>
                <button
                  onClick={() => setRefundType('partial')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    refundType === 'partial'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Partial Refund
                </button>
              </div>
            </div>

            {refundType === 'partial' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Items to Refund</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sale.items?.map((item) => {
                    const refundItem = selectedItems.find(i => i.item_id === item.id);
                    const isSelected = !!refundItem;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border-2 ${
                          isSelected ? 'border-primary-600 bg-primary-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{item.product_name}</p>
                            <p className="text-sm text-gray-600">
                              {formatCurrency(item.unit_price)} × {item.quantity} = {formatCurrency(item.total_price)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {isSelected && (
                              <input
                                type="number"
                                value={refundItem.quantity}
                                onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                step="0.01"
                                min="0.01"
                                max={item.quantity}
                              />
                            )}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleItemToggle(item.id)}
                              className="w-5 h-5 rounded border-gray-300 text-primary-600"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refund Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for refund..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                rows="3"
              />
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-700">Refund Amount:</span>
                <span className="text-2xl font-bold text-orange-600">
                  {formatCurrency(calculateRefundAmount())}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={processing || !reason.trim() || (refundType === 'partial' && selectedItems.length === 0)}
            className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Process Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}
