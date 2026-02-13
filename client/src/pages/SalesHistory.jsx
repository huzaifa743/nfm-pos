import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { Search, Eye, Printer, Trash2, FileDown, FileUp, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReceiptPrint from '../components/ReceiptPrint';
import { getReceiptPrintStyles } from '../utils/receiptPrintStyles';

export default function SalesHistory() {
  const { t } = useTranslation();
  const { settings, formatCurrency } = useSettings();
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleDeleteSale = async (saleId) => {
    if (!window.confirm('Are you sure you want to delete this sale? This action cannot be undone and stock will be restored if applicable.')) {
      return;
    }

    try {
      await api.delete(`/sales/${saleId}`);
      toast.success('Sale deleted successfully');
      fetchSales(); // Refresh the list
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast.error(error.response?.data?.error || 'Failed to delete sale');
    }
  };

  const normalizeHeader = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');

  const headerMap = {
    salenumber: 'sale_number',
    saledate: 'sale_date',
    date: 'sale_date',
    customer: 'customer_name',
    paymentmethod: 'payment_method',
    subtotal: 'subtotal',
    discountamount: 'discount_amount',
    vat: 'vat_percentage',
    vatpercentage: 'vat_percentage',
    vatamount: 'vat_amount',
    total: 'total',
  };

  const mapRowToPayload = (row) => {
    const mapped = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      const normalized = normalizeHeader(key);
      const targetKey = headerMap[normalized];
      if (targetKey) {
        mapped[targetKey] = value;
      }
    });
    return mapped;
  };

  const handleDownloadTemplate = () => {
    const headers = [[
      'Sale Number',
      'Sale Date (YYYY-MM-DD)',
      'Customer',
      'Payment Method',
      'Subtotal',
      'Discount Amount',
      'VAT %',
      'VAT Amount',
      'Total',
    ]];
    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'sales-import-template.xlsx');
  };

  const handleExportExcel = () => {
    const headers = [
      'Sale Number',
      'Sale Date',
      'Customer',
      'Payment Method',
      'Subtotal',
      'Discount Amount',
      'VAT %',
      'VAT Amount',
      'Total',
    ];

    const rows = sales.map((sale) => [
      sale.sale_number || '',
      sale.created_at || '',
      sale.customer_name || 'Walk-in',
      sale.payment_method || '',
      sale.subtotal != null ? Number(sale.subtotal) : '',
      sale.discount_amount != null ? Number(sale.discount_amount) : 0,
      sale.vat_percentage != null ? Number(sale.vat_percentage) : 0,
      sale.vat_amount != null ? Number(sale.vat_amount) : 0,
      sale.total != null ? Number(sale.total) : '',
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    XLSX.writeFile(workbook, 'sales-history-export.xlsx');
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    doc.text(t('salesHistory.title'), 40, 40);

    const headers = [[
      'Sale Number',
      'Date',
      'Customer',
      'Payment',
      'Total',
    ]];

    const rows = sales.map((sale) => [
      sale.sale_number || '',
      formatDate(sale.created_at),
      sale.customer_name || 'Walk-in',
      sale.payment_method || '',
      sale.total != null ? formatCurrency(sale.total) : '',
    ]);

    autoTable(doc, {
      startY: 60,
      head: headers,
      body: rows,
      styles: { fontSize: 9 },
    });

    doc.save('sales-history-export.pdf');
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows.length) {
        toast.error(t('salesHistory.importEmpty'));
        return;
      }

      const rows = rawRows
        .map(mapRowToPayload)
        .filter((row) => Object.keys(row).length > 0);

      if (!rows.length) {
        toast.error(t('salesHistory.importNoColumns'));
        return;
      }

      const response = await api.post('/sales/import', { rows });
      if (response.data?.errors?.length) {
        toast.error(t('salesHistory.importPartial'));
      } else {
        toast.success(t('salesHistory.importSuccess'));
      }
      fetchSales();
    } catch (error) {
      console.error('Error importing sales:', error);
      toast.error(error.response?.data?.error || t('salesHistory.importFailed'));
    } finally {
      setImporting(false);
      event.target.value = '';
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
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <FileDown className="w-5 h-5" />
            {t('salesHistory.exportExcel')}
          </button>
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <FileText className="w-5 h-5" />
            {t('salesHistory.exportPdf')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FileUp className="w-5 h-5" />
            {t('salesHistory.importExcel')}
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2"
          >
            <FileDown className="w-5 h-5" />
            {t('salesHistory.downloadTemplate')}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImportExcel}
        className="hidden"
      />

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
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteSale(sale.id)}
                            className="text-red-600 hover:text-red-900 flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
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
