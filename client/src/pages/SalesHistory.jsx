import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { Search, Eye, Printer } from 'lucide-react';
import ReceiptPrint from '../components/ReceiptPrint';
import { getReceiptPrintStyles } from '../utils/receiptPrintStyles';

export default function SalesHistory() {
  const { t } = useTranslation();
  const { settings, formatCurrency } = useSettings();
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, startDate, endDate, paymentMethod]);

  const fetchSales = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (paymentMethod) params.payment_method = paymentMethod;

      const response = await api.get('/sales', { params });
      setSales(response.data);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Failed to load sales history');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = async (saleId) => {
    try {
      const response = await api.get(`/sales/${saleId}`);
      setSelectedSale(response.data);
      setShowReceipt(true);
    } catch (error) {
      console.error('Error fetching sale details:', error);
      toast.error('Failed to load receipt');
    }
  };

  const handleReprint = async (saleId) => {
    try {
      const response = await api.get(`/sales/${saleId}`);
      setSelectedSale(response.data);
      setShowReceipt(true);
      // Auto print after a short delay
      setTimeout(() => {
        const paperSize = settings.receipt_paper_size || '80mm';
        const receiptContent = document.getElementById('receipt-content');
        if (!receiptContent) return;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt</title>
              <style>
                ${getReceiptPrintStyles(paperSize)}
              </style>
            </head>
            <body>
              ${receiptContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }, 500);
    } catch (error) {
      console.error('Error fetching sale details:', error);
      toast.error('Failed to load receipt');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">{t('salesHistory.title')}</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('salesHistory.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
            <option value="payAfterDelivery">Pay After Delivery</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('salesHistory.saleNumber')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('salesHistory.date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('salesHistory.customer')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('salesHistory.total')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('salesHistory.paymentMethod')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.sale_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(sale.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.customer_name || 'Walk-in'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded capitalize">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewReceipt(sale.id)}
                          className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          {t('salesHistory.viewReceipt')}
                        </button>
                        <button
                          onClick={() => handleReprint(sale.id)}
                          className="text-green-600 hover:text-green-900 flex items-center gap-1"
                        >
                          <Printer className="w-4 h-4" />
                          {t('salesHistory.reprint')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sales.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No sales found
            </div>
          )}
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && selectedSale && (
        <ReceiptPrint
          sale={selectedSale}
          onClose={() => {
            setShowReceipt(false);
            setSelectedSale(null);
          }}
          onPrint={() => {
            const paperSize = settings.receipt_paper_size || '80mm';
            const receiptContent = document.getElementById('receipt-content');
            if (!receiptContent) return;
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Receipt</title>
                  <style>
                    ${getReceiptPrintStyles(paperSize)}
                  </style>
                </head>
                <body>
                  ${receiptContent.innerHTML}
                </body>
              </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.print();
            }, 250);
          }}
        />
      )}
    </div>
  );
}
