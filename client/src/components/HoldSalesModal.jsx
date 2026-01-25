import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { X, Play, Trash2, Clock } from 'lucide-react';

export default function HoldSalesModal({ open, onClose, onResume }) {
  const { t } = useTranslation();
  const { formatCurrency } = useSettings();
  const [heldSales, setHeldSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchHeldSales();
    }
  }, [open]);

  const fetchHeldSales = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sales/held/list');
      setHeldSales(response.data);
    } catch (error) {
      console.error('Error fetching held sales:', error);
      toast.error('Failed to load held sales');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (heldSale) => {
    try {
      const cartData = JSON.parse(heldSale.cart_data);
      onResume({
        items: cartData,
        customer_id: heldSale.customer_id,
        subtotal: heldSale.subtotal,
        discount_amount: heldSale.discount_amount,
        discount_type: heldSale.discount_type,
        vat_percentage: heldSale.vat_percentage,
        vat_amount: heldSale.vat_amount,
        total: heldSale.total,
      });
      onClose();
      toast.success('Sale resumed successfully');
    } catch (error) {
      console.error('Error resuming sale:', error);
      toast.error('Failed to resume sale');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this held sale?')) {
      return;
    }
    try {
      await api.delete(`/sales/hold/${id}`);
      toast.success('Held sale deleted');
      fetchHeldSales();
    } catch (error) {
      console.error('Error deleting held sale:', error);
      toast.error('Failed to delete held sale');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return dateString;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-800">Held Sales</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : heldSales.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">No held sales</p>
            </div>
          ) : (
            <div className="space-y-3">
              {heldSales.map((sale) => {
                const itemCount = JSON.parse(sale.cart_data || '[]').length;
                return (
                  <div
                    key={sale.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-800">{sale.hold_number}</span>
                          <span className="text-xs text-gray-500">
                            {formatDate(sale.created_at)}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>Customer: {sale.customer_name || 'Walk-in'}</p>
                          <p>Items: {itemCount} • Total: {formatCurrency(sale.total)}</p>
                          {sale.notes && (
                            <p className="text-xs text-gray-500 italic">Note: {sale.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleResume(sale)}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Resume
                        </button>
                        <button
                          onClick={() => handleDelete(sale.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
