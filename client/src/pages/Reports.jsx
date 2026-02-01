import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { BarChart3, TrendingUp, FileDown, FileText } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function Reports() {
  const { t } = useTranslation();
  const { formatCurrency } = useSettings();
  const [reportType, setReportType] = useState('sales');
  
  // Set default dates to today
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [salesReport, setSalesReport] = useState(null);
  const [productReport, setProductReport] = useState(null);
  const [usersReport, setUsersReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch reports on mount and when filters change
  useEffect(() => {
    if (startDate && endDate) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, startDate, endDate, paymentMethod]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
      };

      if (reportType === 'sales') {
        if (paymentMethod) params.payment_method = paymentMethod;
        const response = await api.get('/reports/sales', { params });
        setSalesReport(response.data);
        setProductReport(null);
        setUsersReport(null);
      } else if (reportType === 'products') {
        const response = await api.get('/reports/products', { params });
        setProductReport(response.data);
        setSalesReport(null);
        setUsersReport(null);
      } else if (reportType === 'users') {
        const response = await api.get('/reports/users', { params });
        setUsersReport(response.data);
        setSalesReport(null);
        setProductReport(null);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }
    fetchReports();
  };

  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // Escape CSV cell (wrap in quotes if contains comma or quote)
  const escapeCsvCell = (val) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const exportCsv = () => {
    let headers = [];
    let rows = [];
    let filename = '';

    if (reportType === 'sales' && salesReport?.sales?.length) {
      headers = ['Sale #', 'Date', 'Customer', 'Items', 'Total', 'Payment Method'];
      rows = salesReport.sales.map((s) => [
        s.sale_number,
        new Date(s.created_at).toLocaleDateString(),
        s.customer_name || 'Walk-in',
        s.item_count,
        (s.total ?? 0).toString(),
        s.payment_method || '',
      ]);
      filename = `sales-report-${startDate}-to-${endDate}.csv`;
    } else if (reportType === 'products' && productReport?.products?.length) {
      headers = ['Product', 'Category', 'Price', 'Purchase Rate', 'Quantity Sold', 'Total Revenue', 'Total Cost', 'Profit'];
      rows = productReport.products.map((p) => [
        p.name,
        p.category_name || 'Uncategorized',
        (p.price ?? 0).toString(),
        (p.purchase_rate ?? '').toString(),
        (p.total_quantity ?? 0).toString(),
        (p.total_revenue ?? 0).toString(),
        (p.total_cost ?? 0).toString(),
        (p.total_profit ?? 0).toString(),
      ]);
      filename = `products-report-${startDate}-to-${endDate}.csv`;
    } else if (reportType === 'users' && usersReport?.users?.length) {
      headers = ['User', 'Role', 'Total Sales', 'Total Revenue', 'Total Discount', 'Total VAT', 'Items Sold'];
      rows = usersReport.users.map((u) => [
        u.full_name || u.username,
        u.role || '',
        (u.total_sales ?? 0).toString(),
        (u.total_revenue ?? 0).toString(),
        (u.total_discount ?? 0).toString(),
        (u.total_vat ?? 0).toString(),
        (u.total_items_sold ?? 0).toString(),
      ]);
      filename = `users-report-${startDate}-to-${endDate}.csv`;
    }

    if (!rows.length) {
      toast.error('No data to export');
      return;
    }
    const csvContent = [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.map(escapeCsvCell).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportPdf = () => {
    let title = '';
    let summaryHtml = '';
    let tableHeaders = [];
    let tableRows = [];

    if (reportType === 'sales' && salesReport) {
      title = `Sales Report (${startDate} to ${endDate})`;
      summaryHtml = `
        <p><strong>Total Sales:</strong> ${salesReport.summary?.totalSales ?? 0}</p>
        <p><strong>Total Revenue:</strong> ${formatCurrency(salesReport.summary?.totalRevenue ?? 0)}</p>
        <p><strong>Total Discount:</strong> ${formatCurrency(salesReport.summary?.totalDiscount ?? 0)}</p>
        <p><strong>Total VAT:</strong> ${formatCurrency(salesReport.summary?.totalVAT ?? 0)}</p>
      `;
      tableHeaders = ['Sale #', 'Date', 'Customer', 'Items', 'Total', 'Payment'];
      tableRows = (salesReport.sales || []).map((s) => [
        s.sale_number,
        new Date(s.created_at).toLocaleDateString(),
        s.customer_name || 'Walk-in',
        String(s.item_count ?? 0),
        formatCurrency(s.total),
        s.payment_method || '',
      ]);
    } else if (reportType === 'products' && productReport) {
      title = `Products Report (${startDate} to ${endDate})`;
      summaryHtml = `
        <p><strong>Total Products:</strong> ${productReport.summary?.totalProducts ?? 0}</p>
        <p><strong>Quantity Sold:</strong> ${productReport.summary?.totalQuantitySold ?? 0}</p>
        <p><strong>Total Revenue:</strong> ${formatCurrency(productReport.summary?.totalRevenue ?? 0)}</p>
        <p><strong>Total Cost:</strong> ${formatCurrency(productReport.summary?.totalCost ?? 0)}</p>
        <p><strong>Total Profit:</strong> ${formatCurrency(productReport.summary?.totalProfit ?? 0)}</p>
      `;
      tableHeaders = ['Product', 'Category', 'Price', 'Purchase Rate', 'Qty Sold', 'Revenue', 'Cost', 'Profit'];
      tableRows = (productReport.products || []).map((p) => [
        p.name,
        p.category_name || 'Uncategorized',
        formatCurrency(p.price),
        p.purchase_rate ? formatCurrency(p.purchase_rate) : '—',
        String(p.total_quantity ?? 0),
        formatCurrency(p.total_revenue),
        p.purchase_rate ? formatCurrency(p.total_cost || 0) : '—',
        p.purchase_rate ? formatCurrency(p.total_profit || 0) : '—',
      ]);
    } else if (reportType === 'users' && usersReport) {
      title = `Sales by Users Report (${startDate} to ${endDate})`;
      summaryHtml = `
        <p><strong>Total Users:</strong> ${usersReport.summary?.totalUsers ?? 0}</p>
        <p><strong>Total Sales:</strong> ${usersReport.summary?.totalSales ?? 0}</p>
        <p><strong>Total Revenue:</strong> ${formatCurrency(usersReport.summary?.totalRevenue ?? 0)}</p>
        <p><strong>Total Items Sold:</strong> ${usersReport.summary?.totalItemsSold ?? 0}</p>
      `;
      tableHeaders = ['User', 'Role', 'Total Sales', 'Revenue', 'Discount', 'VAT', 'Items Sold'];
      tableRows = (usersReport.users || []).map((u) => [
        u.full_name || u.username,
        u.role || '',
        String(u.total_sales ?? 0),
        formatCurrency(u.total_revenue ?? 0),
        formatCurrency(u.total_discount ?? 0),
        formatCurrency(u.total_vat ?? 0),
        String(u.total_items_sold ?? 0),
      ]);
    }

    if (!tableRows.length) {
      toast.error('No data to export');
      return;
    }

    const thCells = tableHeaders.map((h) => `<th style="border:1px solid #ddd;padding:8px;text-align:left;background:#f5f5f5;">${escapeHtml(h)}</th>`).join('');
    const bodyRows = tableRows.map(
      (row) => `<tr>${row.map((cell) => `<td style="border:1px solid #ddd;padding:8px;">${escapeHtml(String(cell))}</td>`).join('')}</tr>`
    ).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
        <body style="font-family:system-ui,sans-serif;padding:20px;">
          <h1>${escapeHtml(title)}</h1>
          <div style="margin-bottom:20px;">${summaryHtml}</div>
          <table style="border-collapse:collapse;width:100%;">
            <thead><tr>${thCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
          <p style="margin-top:20px;color:#666;font-size:12px;">Generated on ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Please allow pop-ups to export PDF');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 250);
  };

  // Show export buttons when report has been loaded (even if empty)
  const showExportButtons = () => {
    if (reportType === 'sales' && salesReport !== null) return true;
    if (reportType === 'products' && productReport !== null) return true;
    if (reportType === 'users' && usersReport !== null) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">{t('reports.title')}</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="sales">{t('reports.salesReport')}</option>
              <option value="products">{t('reports.productReport')}</option>
              <option value="users">Sales by Users</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('reports.startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('reports.endDate')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {reportType === 'sales' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
                <option value="payAfterDelivery">Pay After Delivery</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleFilter}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <BarChart3 className="w-5 h-5" />
            {t('reports.filter')}
          </button>
          {showExportButtons() && (
            <>
              <button
                onClick={exportCsv}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
              >
                <FileDown className="w-5 h-5" />
                Export CSV/Excel
              </button>
              <button
                onClick={exportPdf}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
              >
                <FileText className="w-5 h-5" />
                Export PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sales Report */}
      {reportType === 'sales' && salesReport && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('reports.totalSales')}</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {salesReport.summary?.totalSales || 0}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('reports.totalRevenue')}</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(salesReport.summary?.totalRevenue || 0)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('reports.totalDiscount')}</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(salesReport.summary?.totalDiscount || 0)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('reports.totalVAT')}</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(salesReport.summary?.totalVAT || 0)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Sales Table */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sale #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salesReport.sales?.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {sale.sale_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {sale.customer_name || 'Walk-in'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {sale.item_count}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                        {sale.payment_method}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Product Report */}
      {reportType === 'products' && productReport && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Products</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {productReport.summary?.totalProducts || 0}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Quantity Sold</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {productReport.summary?.totalQuantitySold || 0}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(productReport.summary?.totalRevenue || 0)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(productReport.summary?.totalCost || 0)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Profit</p>
                  <p className={`text-2xl font-bold ${(productReport.summary?.totalProfit || 0) > 0 ? 'text-green-600' : (productReport.summary?.totalProfit || 0) < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                    {formatCurrency(productReport.summary?.totalProfit || 0)}
                  </p>
                </div>
                <TrendingUp className={`w-8 h-8 ${(productReport.summary?.totalProfit || 0) > 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {t('reports.productReport')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Purchase Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity Sold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Profit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productReport.products?.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {product.category_name || 'Uncategorized'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {product.purchase_rate ? formatCurrency(product.purchase_rate) : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {product.total_quantity}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(product.total_revenue)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.purchase_rate ? formatCurrency(product.total_cost || 0) : '—'}
                      </td>
                      <td className={`px-6 py-4 text-sm font-semibold ${product.total_profit > 0 ? 'text-green-600' : product.total_profit < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {product.purchase_rate ? formatCurrency(product.total_profit || 0) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Users Report */}
      {reportType === 'users' && usersReport && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Sales by Users
            </h3>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">
                  {usersReport.summary?.totalUsers || 0}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">
                  {usersReport.summary?.totalSales || 0}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(usersReport.summary?.totalRevenue || 0)}
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Items Sold</p>
                <p className="text-2xl font-bold text-orange-600">
                  {usersReport.summary?.totalItemsSold || 0}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Discount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total VAT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Items Sold
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usersReport.users?.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {user.full_name || user.username}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                        {user.role}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.total_sales || 0}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(user.total_revenue || 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatCurrency(user.total_discount || 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatCurrency(user.total_vat || 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.total_items_sold || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
