import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { BarChart3, TrendingUp, FileDown, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Reports() {
  const { t } = useTranslation();
  const { formatCurrency } = useSettings();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('sales');
  const [profitLossReport, setProfitLossReport] = useState(null);
  
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const d = new Date();
  const [startDate, setStartDate] = useState(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(d.toISOString().slice(0, 10));
  const [month, setMonth] = useState(MONTHS[d.getMonth()]);
  const [year, setYear] = useState(d.getFullYear());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  
  const [salesReport, setSalesReport] = useState(null);
  const [productReport, setProductReport] = useState(null);
  const [usersReport, setUsersReport] = useState(null);
  const [monthlySalaryReport, setMonthlySalaryReport] = useState(null);
  const [ledgerReport, setLedgerReport] = useState(null);
  const [expenseReport, setExpenseReport] = useState(null);
  const [cashReport, setCashReport] = useState(null);
  const [supplierLedgerReport, setSupplierLedgerReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/employees').then(r => setEmployees(r.data)).catch(() => {});
      api.get('/suppliers').then(r => setSuppliers(r.data.filter(s => s.status !== 'inactive'))).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'sales' || activeTab === 'products' || activeTab === 'users') {
      if (startDate && endDate) fetchReports();
    } else if (activeTab === 'monthly-salary') {
      fetchMonthlySalary();
    } else if (activeTab === 'ledger') {
      if (employeeId && startDate && endDate) fetchLedgerReport();
    } else if (activeTab === 'expenses') {
      if (startDate && endDate) fetchExpenseReport();
    } else if (activeTab === 'cash') {
      if (startDate && endDate) fetchCashReport();
    } else if (activeTab === 'supplier-ledger') {
      if (supplierId) fetchSupplierLedger();
    } else if (activeTab === 'profit-loss') {
      if (startDate && endDate) fetchProfitLossReport();
    }
  }, [activeTab, startDate, endDate, month, year, paymentMethod, employeeId, supplierId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = { start_date: startDate, end_date: endDate };
      if (activeTab === 'sales') {
        if (paymentMethod) params.payment_method = paymentMethod;
        const res = await api.get('/reports/sales', { params });
        setSalesReport(res.data);
      } else if (activeTab === 'products') {
        const res = await api.get('/reports/products', { params });
        setProductReport(res.data);
      } else if (activeTab === 'users') {
        const res = await api.get('/reports/users', { params });
        setUsersReport(res.data);
      }
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySalary = async () => {
    setLoading(true);
    try {
      const res = await api.get('/salary-reports/monthly', { params: { month, year } });
      setMonthlySalaryReport(res.data);
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const fetchLedgerReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/salary-reports/ledger', { params: { employee_id: employeeId, start_date: startDate, end_date: endDate } });
      setLedgerReport(res.data);
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/expenses/report', { params: { start_date: startDate, end_date: endDate } });
      setExpenseReport(res.data);
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const fetchCashReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cash/report', { params: { start_date: startDate, end_date: endDate } });
      setCashReport(res.data);
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierLedger = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/suppliers/${supplierId}/ledger`, { params: { start_date: startDate, end_date: endDate } });
      setSupplierLedgerReport(res.data);
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitLossReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/profit-loss', { params: { start_date: startDate, end_date: endDate } });
      setProfitLossReport(res.data);
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    let headers = [], rows = [], filename = '';
    const escapeCsvCell = (val) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    if (activeTab === 'sales' && salesReport?.sales?.length) {
      headers = ['Sale #', 'Date', 'Customer', 'Items', 'Total', 'Payment Method'];
      rows = salesReport.sales.map(s => [s.sale_number, new Date(s.created_at).toLocaleDateString(), s.customer_name || 'Walk-in', s.item_count, s.total, s.payment_method || '']);
      filename = `sales-report-${startDate}-to-${endDate}.csv`;
    } else if (activeTab === 'products' && productReport?.products?.length) {
      headers = ['Product', 'Category', 'Price', 'Purchase Rate', 'Quantity Sold', 'Total Revenue', 'Total Cost', 'Profit'];
      rows = productReport.products.map(p => [p.name, p.category_name || 'Uncategorized', p.price, p.purchase_rate || '', p.total_quantity, p.total_revenue, p.total_cost, p.total_profit]);
      filename = `products-report-${startDate}-to-${endDate}.csv`;
    } else if (activeTab === 'users' && usersReport?.users?.length) {
      headers = ['User', 'Role', 'Total Sales', 'Total Revenue', 'Total Discount', 'Total VAT', 'Items Sold'];
      rows = usersReport.users.map(u => [u.full_name || u.username, u.role, u.total_sales, u.total_revenue, u.total_discount, u.total_vat, u.total_items_sold]);
      filename = `users-report-${startDate}-to-${endDate}.csv`;
    } else if (activeTab === 'monthly-salary' && monthlySalaryReport?.records?.length) {
      headers = ['Employee', 'Month', 'Year', 'Basic', 'Additions', 'Deductions', 'Net Pay', 'Paid', 'Remaining', 'Status'];
      rows = monthlySalaryReport.records.map(r => [r.employee_name, r.month, r.year, r.basic_salary, (parseFloat(r.commission_amount||0)+parseFloat(r.other_additions||0)), (parseFloat(r.advance_deduction||0)+parseFloat(r.other_deductions||0)), r.net_pay, r.paid_amount, r.remaining_amount, r.status]);
      filename = `monthly-salary-${month}-${year}.csv`;
    } else if (activeTab === 'ledger' && ledgerReport?.ledger?.length) {
      headers = ['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance'];
      rows = ledgerReport.ledger.map(l => [l.created_at, l.type, l.description||l.reason||'', l.debit||0, l.credit||0, l.balance]);
      filename = `ledger-${ledgerReport.employee?.name}-${startDate}-${endDate}.csv`;
    } else if (activeTab === 'expenses' && expenseReport?.expenses?.length) {
      headers = ['Date', 'Category', 'Amount', 'Description', 'Payment Method'];
      rows = expenseReport.expenses.map(e => [e.expense_date, e.category_name||'Uncategorized', e.amount, e.description||'', e.payment_method]);
      filename = `expenses-${startDate}-${endDate}.csv`;
    } else if (activeTab === 'cash' && cashReport?.transactions?.length) {
      headers = ['Date', 'Type', 'Amount', 'Description', 'Balance'];
      rows = cashReport.transactions.map(t => [t.created_at, t.type, t.amount, t.description||'', t.balance_after]);
      filename = `cash-report-${startDate}-${endDate}.csv`;
    } else if (activeTab === 'supplier-ledger' && supplierLedgerReport?.ledger?.length) {
      headers = ['Date', 'Type', 'Description', 'Amount', 'Balance'];
      rows = supplierLedgerReport.ledger.map(t => [t.created_at, t.type, t.description||'', t.amount, t.balance_after]);
      filename = `supplier-ledger-${supplierLedgerReport.supplier?.name}-${startDate}-${endDate}.csv`;
    } else if (activeTab === 'profit-loss' && profitLossReport) {
      headers = ['Item', 'Amount'];
      rows = [
        ['Revenue', profitLossReport.revenue || 0],
        ['Cost of Goods Sold', (profitLossReport.cogs || 0) * -1],
        ['Gross Profit', profitLossReport.grossProfit || 0],
        ['', ''],
        ['Expenses', (profitLossReport.expenses || 0) * -1],
        ['Salaries', (profitLossReport.salaries || 0) * -1],
        ['Total Operating Expenses', (profitLossReport.totalOperating || 0) * -1],
        ['', ''],
        ['Net Profit', profitLossReport.netProfit || 0],
      ];
      filename = `profit-loss-${startDate}-to-${endDate}.csv`;
    }

    if (!rows.length) {
      toast.error('No data to export');
      return;
    }
    const csv = [headers.map(escapeCsvCell).join(','), ...rows.map(r => r.map(escapeCsvCell).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Exported');
  };

  const exportPdf = () => {
    let title = '', tableHeaders = [], tableRows = [];
    const escapeHtml = (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    if (activeTab === 'sales' && salesReport) {
      title = `Sales Report (${startDate} to ${endDate})`;
      tableHeaders = ['Sale #', 'Date', 'Customer', 'Items', 'Total', 'Payment'];
      tableRows = (salesReport.sales || []).map(s => [s.sale_number, new Date(s.created_at).toLocaleDateString(), s.customer_name || 'Walk-in', String(s.item_count ?? 0), formatCurrency(s.total), s.payment_method || '']);
    } else if (activeTab === 'products' && productReport) {
      title = `Products Report (${startDate} to ${endDate})`;
      tableHeaders = ['Product', 'Category', 'Price', 'Purchase Rate', 'Qty Sold', 'Revenue', 'Cost', 'Profit'];
      tableRows = (productReport.products || []).map(p => [p.name, p.category_name || 'Uncategorized', formatCurrency(p.price), p.purchase_rate ? formatCurrency(p.purchase_rate) : '—', String(p.total_quantity ?? 0), formatCurrency(p.total_revenue), p.purchase_rate ? formatCurrency(p.total_cost || 0) : '—', p.purchase_rate ? formatCurrency(p.total_profit || 0) : '—']);
    } else if (activeTab === 'users' && usersReport) {
      title = `Sales by Users Report (${startDate} to ${endDate})`;
      tableHeaders = ['User', 'Role', 'Total Sales', 'Revenue', 'Discount', 'VAT', 'Items Sold'];
      tableRows = (usersReport.users || []).map(u => [u.full_name || u.username, u.role || '', String(u.total_sales ?? 0), formatCurrency(u.total_revenue ?? 0), formatCurrency(u.total_discount ?? 0), formatCurrency(u.total_vat ?? 0), String(u.total_items_sold ?? 0)]);
    } else if (activeTab === 'monthly-salary' && monthlySalaryReport) {
      title = `Monthly Salary Report - ${month} ${year}`;
      tableHeaders = ['Employee', 'Basic', 'Deductions', 'Net Pay', 'Paid', 'Remaining', 'Status'];
      tableRows = (monthlySalaryReport.records || []).map(r => [r.employee_name, formatCurrency(r.basic_salary), formatCurrency((r.advance_deduction||0)+(r.other_deductions||0)), formatCurrency(r.net_pay), formatCurrency(r.paid_amount), formatCurrency(r.remaining_amount), r.status]);
    } else if (activeTab === 'ledger' && ledgerReport) {
      title = `Employee Ledger - ${ledgerReport.employee?.name}`;
      tableHeaders = ['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance'];
      tableRows = (ledgerReport.ledger || []).map(l => [new Date(l.created_at).toLocaleDateString(), l.type, l.description||l.reason||'-', l.debit?formatCurrency(l.debit):'-', l.credit?formatCurrency(l.credit):'-', formatCurrency(l.balance)]);
    } else if (activeTab === 'expenses' && expenseReport) {
      title = `Expense Report - ${startDate} to ${endDate}`;
      tableHeaders = ['Date', 'Category', 'Amount', 'Description'];
      tableRows = (expenseReport.expenses || []).map(e => [e.expense_date, e.category_name||'-', formatCurrency(e.amount), e.description||'-']);
    } else if (activeTab === 'cash' && cashReport) {
      title = `Cash Report - ${startDate} to ${endDate}`;
      tableHeaders = ['Date', 'Type', 'Amount', 'Description', 'Balance'];
      tableRows = (cashReport.transactions || []).map(t => [new Date(t.created_at).toLocaleString(), t.type, t.type==='in'?'+':'-'+formatCurrency(t.amount), t.description||'-', formatCurrency(t.balance_after)]);
    } else if (activeTab === 'supplier-ledger' && supplierLedgerReport) {
      title = `Supplier Ledger - ${supplierLedgerReport.supplier?.name}`;
      tableHeaders = ['Date', 'Type', 'Description', 'Amount', 'Balance'];
      tableRows = (supplierLedgerReport.ledger || []).map(t => [new Date(t.created_at).toLocaleDateString(), t.type, t.description||'-', t.type==='payment'?'-':'+'+formatCurrency(t.amount), formatCurrency(t.balance_after)]);
    } else if (activeTab === 'profit-loss' && profitLossReport) {
      title = `Profit & Loss Report (${startDate} to ${endDate})`;
      tableHeaders = ['Item', 'Amount'];
      tableRows = [
        ['Revenue', formatCurrency(profitLossReport.revenue || 0)],
        ['Cost of Goods Sold', '-' + formatCurrency(profitLossReport.cogs || 0)],
        ['Gross Profit', formatCurrency(profitLossReport.grossProfit || 0)],
        ['', ''],
        ['Operating Expenses', ''],
        ['  Expenses', '-' + formatCurrency(profitLossReport.expenses || 0)],
        ['  Salaries', '-' + formatCurrency(profitLossReport.salaries || 0)],
        ['Total Operating Expenses', '-' + formatCurrency(profitLossReport.totalOperating || 0)],
        ['', ''],
        ['Net Profit', formatCurrency(profitLossReport.netProfit || 0)],
      ];
    }

    if (!tableRows.length) {
      toast.error('No data to export');
      return;
    }

    const th = tableHeaders.map(h => `<th style="border:1px solid #ddd;padding:8px;background:#f5f5f5">${escapeHtml(h)}</th>`).join('');
    const tr = tableRows.map(row => `<tr>${row.map(cell => `<td style="border:1px solid #ddd;padding:8px">${escapeHtml(String(cell))}</td>`).join('')}</tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title></head><body style="font-family:system-ui;padding:20px"><h1>${escapeHtml(title)}</h1><table style="border-collapse:collapse;width:100%"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table><p style="margin-top:20px;color:#666">Generated ${new Date().toLocaleString()}</p></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 250);
    toast.success('Print opened');
  };

  const tabs = [
    { id: 'sales', label: 'Sales Report' },
    { id: 'products', label: 'Products Report' },
    { id: 'users', label: 'Users Report' },
    ...(user?.role === 'admin' ? [
      { id: 'profit-loss', label: 'Profit & Loss' },
      { id: 'monthly-salary', label: 'Monthly Salary' },
      { id: 'ledger', label: 'Employee Ledger' },
      { id: 'expenses', label: 'Expense Report' },
      { id: 'cash', label: 'Cash Report' },
      { id: 'supplier-ledger', label: 'Supplier Ledger' },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">{t('reports.title')}</h1>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap -mb-px px-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {(activeTab === 'sales' || activeTab === 'products' || activeTab === 'users' || activeTab === 'profit-loss' || activeTab === 'ledger' || activeTab === 'expenses' || activeTab === 'cash' || activeTab === 'supplier-ledger') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </>
            )}
            {activeTab === 'monthly-salary' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg">
                    {[year, year-1].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </>
            )}
            {activeTab === 'sales' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="online">Online</option>
                  <option value="payAfterDelivery">Pay After Delivery</option>
                </select>
              </div>
            )}
            {activeTab === 'ledger' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select Employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
            {activeTab === 'supplier-ledger' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={exportCsv} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><FileDown className="w-5 h-5" />Export CSV</button>
            <button onClick={exportPdf} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"><FileText className="w-5 h-5" />Print PDF</button>
          </div>
        </div>
      </div>

      {loading && <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>}

      {/* Sales Report */}
      {activeTab === 'sales' && salesReport && (
        <div className="bg-white rounded-lg shadow-md border p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Sales</p><p className="text-2xl font-bold">{salesReport.summary?.totalSales || 0}</p></div>
            <div className="bg-green-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Revenue</p><p className="text-2xl font-bold">{formatCurrency(salesReport.summary?.totalRevenue || 0)}</p></div>
            <div className="bg-orange-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Discount</p><p className="text-2xl font-bold">{formatCurrency(salesReport.summary?.totalDiscount || 0)}</p></div>
            <div className="bg-purple-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total VAT</p><p className="text-2xl font-bold">{formatCurrency(salesReport.summary?.totalVAT || 0)}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200">
                {(salesReport.sales || []).map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{s.sale_number}</td>
                    <td className="px-6 py-4 text-sm">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">{s.customer_name || 'Walk-in'}</td>
                    <td className="px-6 py-4 text-sm">{s.item_count}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{formatCurrency(s.total)}</td>
                    <td className="px-6 py-4 text-sm capitalize">{s.payment_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products Report */}
      {activeTab === 'products' && productReport && (
        <div className="bg-white rounded-lg shadow-md border p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Products</p><p className="text-2xl font-bold">{productReport.summary?.totalProducts || 0}</p></div>
            <div className="bg-green-50 rounded-lg p-4"><p className="text-sm text-gray-600">Quantity Sold</p><p className="text-2xl font-bold">{productReport.summary?.totalQuantitySold || 0}</p></div>
            <div className="bg-purple-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Revenue</p><p className="text-2xl font-bold">{formatCurrency(productReport.summary?.totalRevenue || 0)}</p></div>
            <div className="bg-orange-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Cost</p><p className="text-2xl font-bold">{formatCurrency(productReport.summary?.totalCost || 0)}</p></div>
            <div className="bg-yellow-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Profit</p><p className={`text-2xl font-bold ${(productReport.summary?.totalProfit || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(productReport.summary?.totalProfit || 0)}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200">
                {(productReport.products || []).map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{p.name}</td>
                    <td className="px-6 py-4 text-sm">{p.category_name || 'Uncategorized'}</td>
                    <td className="px-6 py-4 text-sm">{formatCurrency(p.price)}</td>
                    <td className="px-6 py-4 text-sm">{p.total_quantity}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{formatCurrency(p.total_revenue)}</td>
                    <td className="px-6 py-4 text-sm">{p.purchase_rate ? formatCurrency(p.total_cost || 0) : '—'}</td>
                    <td className={`px-6 py-4 text-sm font-semibold ${p.total_profit > 0 ? 'text-green-600' : p.total_profit < 0 ? 'text-red-600' : ''}`}>{p.purchase_rate ? formatCurrency(p.total_profit || 0) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Report */}
      {activeTab === 'users' && usersReport && (
        <div className="bg-white rounded-lg shadow-md border p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Users</p><p className="text-2xl font-bold">{usersReport.summary?.totalUsers || 0}</p></div>
            <div className="bg-green-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Sales</p><p className="text-2xl font-bold">{usersReport.summary?.totalSales || 0}</p></div>
            <div className="bg-purple-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Revenue</p><p className="text-2xl font-bold">{formatCurrency(usersReport.summary?.totalRevenue || 0)}</p></div>
            <div className="bg-orange-50 rounded-lg p-4"><p className="text-sm text-gray-600">Items Sold</p><p className="text-2xl font-bold">{usersReport.summary?.totalItemsSold || 0}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">VAT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items Sold</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200">
                {(usersReport.users || []).map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{u.full_name || u.username}</td>
                    <td className="px-6 py-4 text-sm capitalize">{u.role}</td>
                    <td className="px-6 py-4 text-sm">{u.total_sales || 0}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{formatCurrency(u.total_revenue || 0)}</td>
                    <td className="px-6 py-4 text-sm">{formatCurrency(u.total_discount || 0)}</td>
                    <td className="px-6 py-4 text-sm">{formatCurrency(u.total_vat || 0)}</td>
                    <td className="px-6 py-4 text-sm">{u.total_items_sold || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Salary Report */}
      {activeTab === 'monthly-salary' && monthlySalaryReport && (
        <div className="bg-white rounded-lg shadow-md border p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Records</p><p className="text-2xl font-bold">{monthlySalaryReport.summary?.totalRecords || 0}</p></div>
            <div className="bg-green-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Net Pay</p><p className="text-2xl font-bold">{formatCurrency(monthlySalaryReport.summary?.totalNetPay || 0)}</p></div>
            <div className="bg-purple-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Paid</p><p className="text-2xl font-bold">{formatCurrency(monthlySalaryReport.summary?.totalPaid || 0)}</p></div>
            <div className="bg-orange-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Remaining</p><p className="text-2xl font-bold">{formatCurrency(monthlySalaryReport.summary?.totalRemaining || 0)}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200">
                {(monthlySalaryReport.records || []).map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{r.employee_name}</td>
                    <td className="px-6 py-4 text-sm">{formatCurrency(r.basic_salary)}</td>
                    <td className="px-6 py-4 text-sm">{formatCurrency((r.advance_deduction||0)+(r.other_deductions||0))}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{formatCurrency(r.net_pay)}</td>
                    <td className="px-6 py-4 text-sm text-green-600">{formatCurrency(r.paid_amount)}</td>
                    <td className="px-6 py-4 text-sm">{formatCurrency(r.remaining_amount)}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${r.status==='paid'?'bg-green-100':r.status==='partial'?'bg-yellow-100':'bg-gray-100'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Ledger Report */}
      {activeTab === 'ledger' && ledgerReport && (
        <div className="bg-white rounded-lg shadow-md border p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Ledger - {ledgerReport.employee?.name}</h3>
            <p className="text-sm text-gray-600">Closing Balance: 
              <span className={`ml-2 font-bold ${ledgerReport.closingBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {ledgerReport.closingBalance >= 0 
                  ? `You owe: ${formatCurrency(ledgerReport.closingBalance)}`
                  : `You are owed: ${formatCurrency(Math.abs(ledgerReport.closingBalance))}`
                }
              </span>
            </p>
          </div>
          {ledgerReport.ledger && ledgerReport.ledger.length > 0 && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Debit:</span>
                  <span className="ml-2 font-semibold text-red-600">
                    {formatCurrency(ledgerReport.ledger.reduce((s, t) => s + parseFloat(t.debit || 0), 0))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Total Credit:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    {formatCurrency(ledgerReport.ledger.reduce((s, t) => s + parseFloat(t.credit || 0), 0))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Net Balance:</span>
                  <span className={`ml-2 font-bold ${ledgerReport.closingBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(ledgerReport.closingBalance))}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200">
                {(!ledgerReport.ledger || ledgerReport.ledger.length === 0) ? (
                  <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No transactions found</td></tr>
                ) : (
                  ledgerReport.ledger.map((l, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">{new Date(l.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                          l.type==='advance'?'bg-orange-100 text-orange-800':
                          l.type==='salary'?'bg-green-100 text-green-800':
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {l.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{l.description||l.reason||'-'}</td>
                      <td className="px-6 py-4">
                        {l.status && (
                          <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                            l.status==='paid'?'bg-green-100 text-green-800':
                            l.status==='deducted'?'bg-blue-100 text-blue-800':
                            l.status==='pending'?'bg-yellow-100 text-yellow-800':
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {l.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-red-600">{l.debit && parseFloat(l.debit) > 0 ? formatCurrency(l.debit) : '-'}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-green-600">{l.credit && parseFloat(l.credit) > 0 ? formatCurrency(l.credit) : '-'}</td>
                      <td className={`px-6 py-4 text-sm text-right font-semibold ${l.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {l.balance >= 0 ? formatCurrency(l.balance) : formatCurrency(Math.abs(l.balance))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Report */}
      {activeTab === 'expenses' && expenseReport && (
        <div className="bg-white rounded-lg shadow-md border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-red-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Expenses</p><p className="text-2xl font-bold">{formatCurrency(expenseReport.summary?.total || 0)}</p></div>
            <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-gray-600">Count</p><p className="text-2xl font-bold">{expenseReport.summary?.count || 0}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200">
                {(expenseReport.expenses || []).map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{e.expense_date}</td>
                    <td className="px-6 py-4 text-sm">{e.category_name || 'Uncategorized'}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{formatCurrency(e.amount)}</td>
                    <td className="px-6 py-4 text-sm">{e.description || '-'}</td>
                    <td className="px-6 py-4 text-sm capitalize">{e.payment_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cash Report */}
      {activeTab === 'cash' && cashReport && (
        <div className="bg-white rounded-lg shadow-md border p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total In</p><p className="text-2xl font-bold text-green-600">{formatCurrency(cashReport.summary?.totalIn || 0)}</p></div>
            <div className="bg-red-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Out</p><p className="text-2xl font-bold text-red-600">{formatCurrency(cashReport.summary?.totalOut || 0)}</p></div>
            <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-gray-600">Closing Balance</p><p className="text-2xl font-bold">{formatCurrency(cashReport.summary?.closingBalance || 0)}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200">
                {(cashReport.transactions || []).map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${t.type==='in'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{t.type}</span></td>
                    <td className={`px-6 py-4 text-sm font-semibold ${t.type==='in'?'text-green-600':'text-red-600'}`}>{t.type==='in'?'+':'-'}{formatCurrency(t.amount)}</td>
                    <td className="px-6 py-4 text-sm">{t.description || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right">{formatCurrency(t.balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supplier Ledger Report */}
      {activeTab === 'supplier-ledger' && supplierLedgerReport && (
        <div className="bg-white rounded-lg shadow-md border p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Supplier Ledger - {supplierLedgerReport.supplier?.name}</h3>
            <p className="text-sm text-gray-600">Balance: {formatCurrency(supplierLedgerReport.balance || 0)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200">
                {(supplierLedgerReport.ledger || []).map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full capitalize ${t.type==='payment'?'bg-green-100':'bg-blue-100'}`}>{t.type}</span></td>
                    <td className="px-6 py-4 text-sm">{t.description || '-'}</td>
                    <td className={`px-6 py-4 text-sm text-right font-semibold ${t.type==='payment'?'text-green-600':''}`}>{t.type==='payment'?'-':''}{formatCurrency(t.amount)}</td>
                    <td className="px-6 py-4 text-sm text-right">{formatCurrency(t.balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profit & Loss Report */}
      {activeTab === 'profit-loss' && profitLossReport && (
        <div className="bg-white rounded-lg shadow-md border p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Profit & Loss Statement</h2>
            <p className="text-sm text-gray-600">Period: {startDate} to {endDate}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Revenue</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(profitLossReport.revenue || 0)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Gross Profit</p>
              <p className={`text-2xl font-bold ${(profitLossReport.grossProfit || 0) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                {formatCurrency(profitLossReport.grossProfit || 0)}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm text-gray-600 mb-1">Total Operating</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(profitLossReport.totalOperating || 0)}</p>
            </div>
            <div className={`rounded-lg p-4 border ${(profitLossReport.netProfit || 0) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-sm text-gray-600 mb-1">Net Profit</p>
              <p className={`text-2xl font-bold ${(profitLossReport.netProfit || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {formatCurrency(profitLossReport.netProfit || 0)}
              </p>
            </div>
          </div>

          {/* P&L Statement */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Statement</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                  <span className="font-semibold text-gray-700">Revenue</span>
                  <span className="font-semibold text-green-700">{formatCurrency(profitLossReport.revenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center pl-4">
                  <span className="text-gray-600">Cost of Goods Sold</span>
                  <span className="text-red-600">-{formatCurrency(profitLossReport.cogs || 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t-2 border-gray-400 font-bold text-lg">
                  <span>Gross Profit</span>
                  <span className={profitLossReport.grossProfit >= 0 ? 'text-green-700' : 'text-red-600'}>
                    {formatCurrency(profitLossReport.grossProfit || 0)}
                  </span>
                </div>
                <div className="pt-4 space-y-2">
                  <div className="flex justify-between items-center font-semibold text-gray-700">
                    <span>Operating Expenses</span>
                    <span></span>
                  </div>
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-gray-600">Expenses</span>
                    <span className="text-red-600">-{formatCurrency(profitLossReport.expenses || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-gray-600">Salaries</span>
                    <span className="text-red-600">-{formatCurrency(profitLossReport.salaries || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300 font-semibold">
                    <span>Total Operating Expenses</span>
                    <span className="text-red-600">-{formatCurrency(profitLossReport.totalOperating || 0)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t-2 border-gray-400 font-bold text-xl">
                  <span>Net Profit</span>
                  <span className={profitLossReport.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}>
                    {formatCurrency(profitLossReport.netProfit || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Breakdown by Category */}
          {profitLossReport.expensesByCategory && profitLossReport.expensesByCategory.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {profitLossReport.expensesByCategory.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium">{cat.category}</td>
                        <td className="px-6 py-4 text-sm text-right">{cat.count}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(cat.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Salaries Breakdown */}
          {profitLossReport.salariesList && profitLossReport.salariesList.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Salaries Paid</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {profitLossReport.salariesList.map((s, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium">{s.employee_name}</td>
                        <td className="px-6 py-4 text-sm">{s.month} {s.year}</td>
                        <td className="px-6 py-4 text-sm">{s.paid_at ? new Date(s.paid_at).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(s.paid_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
