import { useState, useEffect } from 'react';
import api from '../api/api';
import toast from 'react-hot-toast';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, Edit, Trash2, X, DollarSign, FileText, Printer, FileDown,
  Users, TrendingUp, AlertCircle, Check, Calendar, RefreshCw
} from 'lucide-react';
import SalarySlip from '../components/SalarySlip';
import { useState as useStateReports, useEffect as useEffectReports } from 'react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function SalaryReportsTab() {
  const { formatCurrency } = useSettings();
  const [reportType, setReportType] = useStateReports('monthly');
  const d = new Date();
  const [startDate, setStartDate] = useStateReports(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useStateReports(d.toISOString().slice(0, 10));
  const [month, setMonth] = useStateReports(MONTHS[d.getMonth()]);
  const [year, setYear] = useStateReports(d.getFullYear());
  const [employeeId, setEmployeeId] = useStateReports('');
  const [employees, setEmployees] = useStateReports([]);
  const [monthlyReport, setMonthlyReport] = useStateReports(null);
  const [ledgerReport, setLedgerReport] = useStateReports(null);
  const [loading, setLoading] = useStateReports(false);

  useEffectReports(() => {
    api.get('/employees').then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  useEffectReports(() => {
    if (reportType === 'monthly') {
      fetchMonthlySalary();
    } else if (reportType === 'ledger') {
      if (employeeId && startDate && endDate) fetchLedgerReport();
    }
  }, [reportType, month, year, startDate, endDate, employeeId]);

  // Refresh reports when window regains focus (user switches back to tab)
  useEffectReports(() => {
    const handleFocus = () => {
      if (reportType === 'monthly') {
        fetchMonthlySalary();
      } else if (reportType === 'ledger' && employeeId && startDate && endDate) {
        fetchLedgerReport();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [reportType, month, year, startDate, endDate, employeeId]);

  const fetchMonthlySalary = async () => {
    setLoading(true);
    try {
      const res = await api.get('/salary-reports/monthly', { params: { month, year } });
      setMonthlyReport(res.data);
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

  const exportCsv = () => {
    let headers = [], rows = [], filename = '';
    if (reportType === 'monthly' && monthlyReport?.records?.length) {
      headers = ['Employee','Month','Year','Basic','Additions','Deductions','Net Pay','Paid','Remaining','Status'];
      rows = monthlyReport.records.map(r => [r.employee_name, r.month, r.year, r.basic_salary, (parseFloat(r.commission_amount||0)+parseFloat(r.other_additions||0)), (parseFloat(r.advance_deduction||0)+parseFloat(r.other_deductions||0)), r.net_pay, r.paid_amount, r.remaining_amount, r.status]);
      filename = `monthly-salary-${month}-${year}.csv`;
    } else if (reportType === 'ledger' && ledgerReport?.ledger?.length) {
      headers = ['Date','Type','Description','Debit','Credit','Balance'];
      rows = ledgerReport.ledger.map(l => [l.created_at, l.type, l.description||l.reason||'', l.debit, l.credit, l.balance]);
      filename = `ledger-${ledgerReport.employee?.name}-${startDate}-${endDate}.csv`;
    }
    if (!rows.length) { toast.error('No data'); return; }
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
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
    if (reportType === 'monthly' && monthlyReport) {
      title = `Monthly Salary Report - ${month} ${year}`;
      tableHeaders = ['Employee','Basic','Deductions','Net Pay','Paid','Remaining','Status'];
      tableRows = (monthlyReport.records || []).map(r => [r.employee_name, formatCurrency(r.basic_salary), formatCurrency((r.advance_deduction||0)+(r.other_deductions||0)), formatCurrency(r.net_pay), formatCurrency(r.paid_amount), formatCurrency(r.remaining_amount), r.status]);
    } else if (reportType === 'ledger' && ledgerReport) {
      title = `Employee Ledger - ${ledgerReport.employee?.name}`;
      tableHeaders = ['Date','Type','Description','Debit','Credit','Balance'];
      tableRows = (ledgerReport.ledger || []).map(l => [new Date(l.created_at).toLocaleDateString(), l.type, l.description||l.reason||'-', l.debit?formatCurrency(l.debit):'-', l.credit?formatCurrency(l.credit):'-', formatCurrency(l.balance)]);
    }
    if (!tableRows.length) { toast.error('No data'); return; }
    const th = tableHeaders.map(h => `<th style="border:1px solid #ddd;padding:8px;background:#f5f5f5">${escapeHtml(h)}</th>`).join('');
    const tr = tableRows.map(row => `<tr>${row.map(cell => `<td style="border:1px solid #ddd;padding:8px">${escapeHtml(String(cell))}</td>`).join('')}</tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title></head><body style="font-family:system-ui;padding:20px"><h1>${escapeHtml(title)}</h1><table style="border-collapse:collapse;width:100%"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table><p style="margin-top:20px;color:#666">Generated ${new Date().toLocaleString()}</p></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 250);
    toast.success('Print opened');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Salary Reports</h2>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><FileDown className="w-5 h-5" />Export CSV</button>
          <button onClick={exportPdf} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"><FileText className="w-5 h-5" />Print PDF</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
              <option value="monthly">Monthly Salary Report</option>
              <option value="ledger">Employee Ledger</option>
            </select>
          </div>
          {reportType === 'monthly' && (
            <>
              <div><label className="block text-sm font-medium mb-1">Month</label><select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full px-4 py-2 border rounded-lg">{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Year</label><select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg">{[year, year-1].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
            </>
          )}
          {reportType === 'ledger' && (
            <>
              <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
            </>
          )}
          {reportType === 'ledger' && (
            <div><label className="block text-sm font-medium mb-1">Employee</label><select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full px-4 py-2 border rounded-lg"><option value="">Select</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
          )}
        </div>
      </div>

      {loading && <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>}

      {reportType === 'monthly' && monthlyReport && (
        <div className="bg-white rounded-lg shadow-md border p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Records</p><p className="text-2xl font-bold">{monthlyReport.summary?.totalRecords || 0}</p></div>
            <div className="bg-green-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Net Pay</p><p className="text-2xl font-bold">{formatCurrency(monthlyReport.summary?.totalNetPay || 0)}</p></div>
            <div className="bg-purple-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Paid</p><p className="text-2xl font-bold">{formatCurrency(monthlyReport.summary?.totalPaid || 0)}</p></div>
            <div className="bg-orange-50 rounded-lg p-4"><p className="text-sm text-gray-600">Total Remaining</p><p className="text-2xl font-bold">{formatCurrency(monthlyReport.summary?.totalRemaining || 0)}</p></div>
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
                {(monthlyReport.records || []).map(r => (
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

      {reportType === 'ledger' && ledgerReport && (
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
    </div>
  );
}

export default function EmployeesAndSalaries() {
  const { formatCurrency } = useSettings();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('employees');
  
  // Employees state
  const [employees, setEmployees] = useState([]);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '', phone: '', email: '', address: '', designation: '', basic_salary: '', commission_rate: '',
  });
  const [advanceData, setAdvanceData] = useState({ amount: '', reason: '' });

  // Salaries state
  const [dashboard, setDashboard] = useState(null);
  const [salaries, setSalaries] = useState([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [salarySlip, setSalarySlip] = useState(null);
  const [filterMonth, setFilterMonth] = useState(MONTHS[new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [generateMonth, setGenerateMonth] = useState(MONTHS[new Date().getMonth()]);
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [payType, setPayType] = useState('salary'); // 'salary' or 'advance'
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [deductionType, setDeductionType] = useState('fixed'); // 'fixed' or 'percentage'
  const [deductionAmount, setDeductionAmount] = useState('');
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [pendingAdvances, setPendingAdvances] = useState([]);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [nextMonthSalary, setNextMonthSalary] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'employees') {
      fetchEmployees();
      setLoading(false);
    } else if (activeTab === 'salaries') {
      fetchDashboard();
      fetchSalaries();
      fetchEmployees(); // Fetch employees for advance payment dropdown
      setLoading(false);
    } else if (activeTab === 'reports') {
      // Reports tab will handle its own data fetching via SalaryReportsTab component
      setLoading(false);
    }
  }, [activeTab, filterMonth, filterYear]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
      toast.error('Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/salaries/dashboard');
      setDashboard(res.data || {});
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      toast.error('Failed to load dashboard');
      setDashboard(null);
    }
  };

  const fetchSalaries = async () => {
    try {
      const res = await api.get('/salaries', { params: { month: filterMonth, year: filterYear } });
      setSalaries(res.data || []);
    } catch (err) {
      console.error('Failed to load salaries:', err);
      toast.error('Failed to load salaries');
      setSalaries([]);
    }
  };

  const fetchPendingAdvances = async (empId) => {
    try {
      const res = await api.get(`/employees/${empId}/advances`);
      setPendingAdvances(res.data.filter(a => a.status === 'pending' || a.status === 'paid'));
    } catch (err) {
      toast.error('Failed to load advances');
    }
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, employeeFormData);
        toast.success('Employee updated');
      } else {
        await api.post('/employees', employeeFormData);
        toast.success('Employee added');
      }
      setShowEmployeeModal(false);
      setEditingEmployee(null);
      setEmployeeFormData({ name: '', phone: '', email: '', address: '', designation: '', basic_salary: '', commission_rate: '' });
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };


  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');

  const fetchLedger = async (emp, startDate = null, endDate = null) => {
    setSelectedEmployee(emp);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await api.get(`/employees/${emp.id}/ledger`, { params });
      const ledgerData = res.data?.ledger || res.data || [];
      setLedger(Array.isArray(ledgerData) ? ledgerData : []);
      setShowLedgerModal(true);
    } catch (err) {
      console.error('Failed to load ledger:', err);
      toast.error('Failed to load ledger');
      setLedger([]);
    }
  };

  const handleEdit = (emp) => {
    setEditingEmployee(emp);
    setEmployeeFormData({
      name: emp.name, phone: emp.phone || '', email: emp.email || '', address: emp.address || '',
      designation: emp.designation || '', basic_salary: emp.basic_salary || '', commission_rate: emp.commission_rate || '',
    });
    setShowEmployeeModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee? This will permanently delete the employee and ALL related data including salaries and advances. This action cannot be undone.')) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success('Employee and all related data deleted successfully');
      await fetchEmployees();
      if (activeTab === 'salaries') {
        await fetchDashboard();
        await fetchSalaries();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete employee');
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/salaries/generate', { month: generateMonth, year: generateYear });
      toast.success(`Generated ${res.data.created} salary record(s) for ${generateMonth} ${generateYear}`);
      setShowGenerate(false);
      await Promise.all([
        fetchDashboard(),
        fetchSalaries(),
        fetchEmployees()
      ]);
      // Update filter to show the generated month
      setFilterMonth(generateMonth);
      setFilterYear(generateYear);
      
      // Force refresh after a delay to ensure all updates are reflected
      setTimeout(async () => {
        await Promise.all([
          fetchDashboard(),
          fetchSalaries(),
          fetchEmployees()
        ]);
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate');
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (payType === 'salary') {
      if (!selectedSalary) return;
      // Prevent duplicate payment if already fully paid
      if (selectedSalary.status === 'paid') {
        toast.error('This salary is already fully paid');
        return;
      }
      if (!payAmount || parseFloat(payAmount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      if (parseFloat(payAmount) > parseFloat(selectedSalary.remaining_amount)) {
        toast.error('Payment amount cannot exceed remaining amount');
        return;
      }
      
      // Validate deduction if provided
      if (deductionAmount && parseFloat(deductionAmount) > 0) {
        const remainingAmt = parseFloat(selectedSalary.remaining_amount || 0);
        const deductionValue = deductionType === 'fixed' 
          ? parseFloat(deductionAmount)
          : (remainingAmt * parseFloat(deductionAmount)) / 100;
        const netPayable = Math.max(0, remainingAmt - deductionValue);
        if (parseFloat(payAmount) > netPayable) {
          toast.error(`Payment amount cannot exceed net payable (${formatCurrency(netPayable)})`);
          return;
        }
        if (deductionType === 'percentage' && parseFloat(deductionAmount) > 100) {
          toast.error('Deduction percentage cannot exceed 100%');
          return;
        }
      }
      
      if (!payDate) {
        toast.error('Please select a payment date');
        return;
      }
    } else {
      if (!selectedEmployee || !payAmount || parseFloat(payAmount) <= 0) {
        toast.error('Please enter a valid advance amount');
        return;
      }
      if (!payDate) {
        toast.error('Please select a payment date');
        return;
      }
    }
    try {
      if (payType === 'salary') {
        const paymentData = {
          amount: payAmount || undefined,
          payment_date: payDate
        };
        
        // Add deduction data if provided (percentage is of remaining salary, not payment amount)
        if (deductionAmount && parseFloat(deductionAmount) > 0) {
          const remainingAmt = parseFloat(selectedSalary.remaining_amount || 0);
          const deductionValue = deductionType === 'fixed' 
            ? parseFloat(deductionAmount)
            : (remainingAmt * parseFloat(deductionAmount)) / 100;
          
          paymentData.deduction_type = deductionType;
          paymentData.deduction_amount = deductionValue;
        }
        
        await api.post(`/salaries/${selectedSalary.id}/pay`, paymentData);
        toast.success('Salary payment recorded');
      } else {
        // Pay advance directly to employee
        await api.post(`/employees/${selectedEmployee.id}/advances`, { amount: payAmount, reason: advanceData.reason || 'Direct advance payment', payment_date: payDate });
        toast.success('Advance payment recorded');
        setAdvanceData({ amount: '', reason: '' });
      }
      // Close modal and reset state
      setShowPayModal(false);
      setSelectedSalary(null);
      setSelectedEmployee(null);
      setSelectedAdvance(null);
      setEmployeeDetails(null);
      setNextMonthSalary(null);
      setPendingAdvances([]);
      setPayAmount('');
      setPayDate(new Date().toISOString().slice(0, 10));
      setAdvanceData({ amount: '', reason: '' });
      setPayType('salary');
      
      // Refresh all data immediately - especially important for advance payments to show in salary records
      await Promise.all([
        fetchDashboard(),
        fetchSalaries(),
        fetchEmployees()
      ]);
      
      // Force refresh again after a short delay to ensure backend updates are reflected
      setTimeout(async () => {
        await Promise.all([
          fetchDashboard(),
          fetchSalaries(),
          fetchEmployees()
        ]);
      }, 1000);
      
      // If paying advance, also refresh the current month filter to show the updated salary record
      if (payType === 'advance' && selectedEmployee) {
        const paymentDate = new Date(payDate);
        const paymentMonth = MONTHS[paymentDate.getMonth()];
        const paymentYear = paymentDate.getFullYear();
        
        // Update filter to show the month where advance was paid
        if (filterMonth !== paymentMonth || filterYear !== paymentYear) {
          setFilterMonth(paymentMonth);
          setFilterYear(paymentYear);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to pay');
    }
  };

  const handleDeleteSalary = async (id) => {
    if (!window.confirm('Are you sure you want to delete this salary record? All related advance deductions will be restored. This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/salaries/${id}`);
      toast.success('Salary record deleted successfully');
      await fetchDashboard();
      await fetchSalaries();
      await fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete salary record');
    }
  };

  const openPayModal = async (salary) => {
    setSelectedSalary(salary);
    setPayType('salary');
    setPayAmount(salary.remaining_amount || '');
    setPayDate(new Date().toISOString().slice(0, 10));
    setDeductionType('fixed');
    setDeductionAmount('');
    setAdvanceData({ amount: '', reason: '' });
    await fetchPendingAdvances(salary.employee_id);
    // Fetch employee details
    const emp = employees.find(e => e.id === salary.employee_id);
    if (emp) {
      setSelectedEmployee(emp);
      setEmployeeDetails(emp);
    } else {
      // If employee not found in list, fetch it
      try {
        const empRes = await api.get(`/employees/${salary.employee_id}`);
        setSelectedEmployee(empRes.data);
        setEmployeeDetails(empRes.data);
      } catch (err) {
        console.error('Failed to fetch employee details');
      }
    }
    // Check for next month's salary
    const currentMonthIndex = MONTHS.indexOf(salary.month);
    const nextMonth = currentMonthIndex === 11 ? MONTHS[0] : MONTHS[currentMonthIndex + 1];
    const nextYear = currentMonthIndex === 11 ? salary.year + 1 : salary.year;
    try {
      const nextRes = await api.get('/salaries', { params: { month: nextMonth, year: nextYear, employee_id: salary.employee_id } });
      if (nextRes.data && nextRes.data.length > 0) {
        setNextMonthSalary(nextRes.data[0]);
      } else {
        setNextMonthSalary(null);
      }
    } catch (err) {
      console.error('Failed to fetch next month salary');
      setNextMonthSalary(null);
    }
    setShowPayModal(true);
  };

  const exportCsv = () => {
    let headers = [], rows = [], filename = '';
    if (activeTab === 'salaries') {
      headers = ['Employee','Month','Year','Basic','Additions','Deductions','Net Pay','Paid','Remaining','Status'];
      rows = salaries.map(s => [
        s.employee_name, s.month, s.year, s.basic_salary, (parseFloat(s.commission_amount||0)+parseFloat(s.other_additions||0)),
        (parseFloat(s.advance_deduction||0)+parseFloat(s.other_deductions||0)), s.net_pay, s.paid_amount, s.remaining_amount, s.status
      ]);
      filename = `salary-report-${filterMonth}-${filterYear}.csv`;
    } else if (activeTab === 'employees') {
      headers = ['Name','Designation','Basic Salary','Commission %','Phone','Email'];
      rows = employees.map(e => [e.name, e.designation||'', e.basic_salary, e.commission_rate, e.phone||'', e.email||'']);
      filename = 'employees.csv';
    }
    if (!rows.length) { toast.error('No data'); return; }
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Exported');
  };

  if (user?.role !== 'admin') {
    return <div className="flex justify-center items-center h-64"><p className="text-gray-500">Admin access required</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Employees & Salaries</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md border">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap -mb-px px-4">
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'employees'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Employees
            </button>
            <button
              onClick={() => setActiveTab('salaries')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'salaries'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-5 h-5 inline mr-2" />
              Salaries
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'reports'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Reports
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Employees</h2>
                <div className="flex gap-2">
                  <button onClick={exportCsv} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><FileDown className="w-5 h-5" />Export</button>
                  <button onClick={() => { setEditingEmployee(null); setEmployeeFormData({ name: '', phone: '', email: '', address: '', designation: '', basic_salary: '', commission_rate: '' }); setShowEmployeeModal(true); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2"><Plus className="w-5 h-5" />Add Employee</button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>
              ) : (
                <div className="bg-white rounded-lg shadow-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission %</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Salary</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {employees.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                              No employees found. Click "Add Employee" to create one.
                            </td>
                          </tr>
                        ) : (
                          employees.map((emp) => {
                            const basicSalary = parseFloat(emp.basic_salary || 0);
                            const commissionRate = parseFloat(emp.commission_rate || 0);
                            const commissionAmount = commissionRate > 0 ? (basicSalary * commissionRate / 100) : 0;
                            const totalSalary = basicSalary + commissionAmount;
                            return (
                            <tr key={emp.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium text-gray-900">{emp.name}</td>
                              <td className="px-6 py-4 text-gray-600">{emp.phone || '-'}</td>
                              <td className="px-6 py-4 text-gray-600">{emp.email || '-'}</td>
                              <td className="px-6 py-4 text-gray-600">{emp.address || '-'}</td>
                              <td className="px-6 py-4 text-gray-600">{emp.designation || '-'}</td>
                              <td className="px-6 py-4 font-medium">{formatCurrency(basicSalary)}</td>
                              <td className="px-6 py-4 text-gray-600">{commissionRate || 0}%</td>
                              <td className="px-6 py-4 font-semibold text-green-600">{formatCurrency(totalSalary)}</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => fetchLedger(emp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="View Ledger"><FileText className="w-5 h-5" /></button>
                                  <button onClick={() => handleEdit(emp)} className="p-2 text-primary-600 hover:bg-primary-50 rounded" title="Edit"><Edit className="w-5 h-5" /></button>
                                  {user?.role === 'admin' && (
                                    <button onClick={() => handleDelete(emp.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-5 h-5" /></button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Salaries Tab */}
          {activeTab === 'salaries' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Salaries</h2>
                <div className="flex gap-2">
                  <button onClick={exportCsv} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><FileDown className="w-5 h-5" />Export</button>
                  <button onClick={async () => { await Promise.all([fetchDashboard(), fetchSalaries(), fetchEmployees()]); toast.success('Data refreshed'); }} className="px-4 py-2 bg-gray-600 text-white rounded-lg flex items-center gap-2 hover:bg-gray-700" title="Refresh"><RefreshCw className="w-5 h-5" />Refresh</button>
                  <button onClick={() => { setSelectedEmployee(null); setSelectedSalary(null); setPayType('advance'); setPayAmount(''); setPayDate(new Date().toISOString().slice(0, 10)); setAdvanceData({ amount: '', reason: '' }); setShowPayModal(true); }} className="px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center gap-2"><DollarSign className="w-5 h-5" />Pay Advance</button>
                  <button onClick={() => { setShowGenerate(true); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2"><Plus className="w-5 h-5" />Generate Salary</button>
                </div>
              </div>

              {dashboard && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
                  {/* 1. Total Employees - Overview */}
                  <div className="bg-white rounded-lg shadow-md p-6 border">
                    <div className="flex justify-between items-center">
                      <div><p className="text-sm text-gray-600">Total Employees</p><p className="text-2xl font-bold">{dashboard.totalEmployees}</p></div>
                      <Users className="w-10 h-10 text-primary-600" />
                    </div>
                  </div>
                  
                  {/* 2. Total Salary This Month - Gross Total */}
                  <div className="bg-white rounded-lg shadow-md p-6 border">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Total Salary This Month</p>
                        <p className="text-2xl font-bold">{formatCurrency(dashboard.totalSalaryThisMonth)}</p>
                        {dashboard.totalCommission > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Basic: {formatCurrency(dashboard.totalBasicSalary || 0)} + Commission: {formatCurrency(dashboard.totalCommission || 0)}
                          </p>
                        )}
                      </div>
                      <DollarSign className="w-10 h-10 text-green-600" />
                    </div>
                  </div>
                  
                  {/* 3. Deductions - What's being deducted */}
                  <div className="bg-white rounded-lg shadow-md p-6 border">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Total Deductions</p>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency((dashboard.totalDeductions || 0) + (dashboard.totalAdvanceDeduction || 0))}</p>
                        {(dashboard.totalAdvanceDeduction || 0) > 0 && (dashboard.totalDeductions || 0) > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Other: {formatCurrency(dashboard.totalDeductions || 0)} | Advance: {formatCurrency(dashboard.totalAdvanceDeduction || 0)}
                          </p>
                        )}
                      </div>
                      <DollarSign className="w-10 h-10 text-red-500 rotate-180" />
                    </div>
                  </div>
                  
                  {/* 4. Total Salaries Paid - What's been paid */}
                  <div className="bg-white rounded-lg shadow-md p-6 border">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Total Salaries Paid</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(dashboard.totalPaidThisMonth || 0)}</p>
                      </div>
                      <Check className="w-10 h-10 text-green-600" />
                    </div>
                  </div>
                  
                  {/* 5. Pending Salaries - What's still owed */}
                  <div className="bg-white rounded-lg shadow-md p-6 border">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Pending Salaries</p>
                        <p className="text-2xl font-bold text-orange-600">{formatCurrency(dashboard.pendingSalaries)}</p>
                      </div>
                      <AlertCircle className="w-10 h-10 text-orange-600" />
                    </div>
                  </div>
                  
                  {/* 6. Total Advances Given - Advances information */}
                  <div className="bg-white rounded-lg shadow-md p-6 border">
                    <div className="flex justify-between items-center">
                      <div><p className="text-sm text-gray-600">Total Advances Given</p><p className="text-2xl font-bold">{formatCurrency(dashboard.totalAdvancesGiven)}</p></div>
                      <TrendingUp className="w-10 h-10 text-orange-600" />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap gap-4 items-center mb-4">
                <div><label className="block text-sm text-gray-600 mb-1">Month</label><select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="px-3 py-2 border rounded-lg">{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div><label className="block text-sm text-gray-600 mb-1">Year</label><select value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg">{[filterYear, filterYear-1].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              </div>

              <div className="bg-white rounded-lg shadow-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Advances</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {salaries.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                            No salary records found for {filterMonth} {filterYear}. Click "Generate Salary" to create salary records.
                          </td>
                        </tr>
                      ) : (
                        salaries.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium">{s.employee_name}</td>
                          <td className="px-6 py-4">{formatCurrency(s.basic_salary)}</td>
                          <td className="px-6 py-4">
                            {s.commission_amount > 0 ? (
                              <div>
                                <div className="text-green-600 font-medium">{formatCurrency(s.commission_amount)}</div>
                                <div className="text-xs text-gray-500">{s.commission_rate || 0}%</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-orange-600">-{formatCurrency(s.advance_deduction)}</td>
                          <td className="px-6 py-4 text-red-600">-{formatCurrency(s.other_deductions)}</td>
                          <td className="px-6 py-4 font-semibold">{formatCurrency(s.net_pay)}</td>
                          <td className="px-6 py-4 text-green-600">{formatCurrency(s.paid_amount)}</td>
                          <td className="px-6 py-4">{formatCurrency(s.remaining_amount)}</td>
                          <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${s.status === 'paid' ? 'bg-green-100 text-green-800' : s.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{s.status}</span></td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setSalarySlip(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Salary Slip"><Printer className="w-5 h-5" /></button>
                              {s.status !== 'paid' && (
                                <button onClick={() => openPayModal(s)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Pay Salary/Advance"><DollarSign className="w-5 h-5" /></button>
                              )}
                              {user?.role === 'admin' && (
                                <button onClick={() => handleDeleteSalary(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-5 h-5" /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <SalaryReportsTab />
          )}
        </div>
      </div>

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h2><button onClick={() => setShowEmployeeModal(false)}><X className="w-6 h-6" /></button></div>
            <form onSubmit={handleEmployeeSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Name *</label><input type="text" required value={employeeFormData.name} onChange={(e) => setEmployeeFormData({...employeeFormData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Phone</label><input type="text" value={employeeFormData.phone} onChange={(e) => setEmployeeFormData({...employeeFormData, phone: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={employeeFormData.email} onChange={(e) => setEmployeeFormData({...employeeFormData, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div></div>
              <div><label className="block text-sm font-medium mb-1">Address</label><input type="text" value={employeeFormData.address} onChange={(e) => setEmployeeFormData({...employeeFormData, address: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Designation</label><input type="text" value={employeeFormData.designation} onChange={(e) => setEmployeeFormData({...employeeFormData, designation: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">Basic Salary *</label><input type="number" step="0.01" required value={employeeFormData.basic_salary} onChange={(e) => setEmployeeFormData({...employeeFormData, basic_salary: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div></div>
              <div><label className="block text-sm font-medium mb-1">Commission %</label><input type="number" step="0.01" value={employeeFormData.commission_rate} onChange={(e) => setEmployeeFormData({...employeeFormData, commission_rate: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowEmployeeModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg">Cancel</button><button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Save</button></div>
            </form>
          </div>
        </div>
      )}


      {/* Pay Modal - Combined for Salary and Advance */}
      {showPayModal && (selectedSalary || payType === 'advance') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {selectedSalary ? `Payment - ${selectedSalary.employee_name}` : payType === 'advance' ? 'Pay Advance' : 'Payment'}
              </h2>
              <button onClick={() => { 
                setShowLedgerModal(false);
                setSelectedEmployee(null);
                setLedger([]);
                setLedgerStartDate('');
                setLedgerEndDate('');
              }}><X className="w-6 h-6" /></button>
            </div>
            
            {/* Salary Details Summary - Only show if salary is selected */}
            {selectedSalary && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-600">Month/Year:</span> <span className="font-medium">{selectedSalary.month} {selectedSalary.year}</span></div>
                <div><span className="text-gray-600">Status:</span> <span className={`font-medium ${selectedSalary.status === 'paid' ? 'text-green-600' : selectedSalary.status === 'partial' ? 'text-yellow-600' : 'text-gray-600'}`}>{selectedSalary.status}</span></div>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-600">Basic Salary:</span> <span className="font-medium">{formatCurrency(selectedSalary.basic_salary)}</span></div>
                  <div>
                    <span className="text-gray-600">Commission:</span> 
                    <span className="font-medium text-green-600 ml-2">{formatCurrency(selectedSalary.commission_amount || 0)}</span>
                    {selectedSalary.commission_rate > 0 && (
                      <span className="text-xs text-gray-500 ml-2">({selectedSalary.commission_rate}%)</span>
                    )}
                  </div>
                  <div><span className="text-gray-600">Other Additions:</span> <span className="font-medium text-green-600">+{formatCurrency(selectedSalary.other_additions || 0)}</span></div>
                  <div><span className="text-gray-600">Advance Deductions:</span> <span className="font-medium text-orange-600">-{formatCurrency(selectedSalary.advance_deduction || 0)}</span></div>
                  <div><span className="text-gray-600">Other Deductions:</span> <span className="font-medium text-red-600">-{formatCurrency(selectedSalary.other_deductions || 0)}</span></div>
                  <div><span className="text-gray-600">Net Pay:</span> <span className="font-bold text-lg">{formatCurrency(selectedSalary.net_pay)}</span></div>
                </div>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-600">Paid Amount:</span> <span className="font-medium text-green-600">{formatCurrency(selectedSalary.paid_amount || 0)}</span></div>
                  <div>
                    <span className="text-gray-600">Remaining:</span> 
                    <span className="font-bold text-lg text-orange-600 ml-2">
                      {(() => {
                        const remainingAmt = parseFloat(selectedSalary.remaining_amount || 0);
                        if (deductionAmount && parseFloat(deductionAmount) > 0 && payAmount && parseFloat(payAmount) > 0) {
                          const deductionValue = deductionType === 'fixed' 
                            ? parseFloat(deductionAmount) 
                            : (remainingAmt * parseFloat(deductionAmount)) / 100;
                          const grossPay = parseFloat(selectedSalary.basic_salary || 0) + parseFloat(selectedSalary.commission_amount || 0) + parseFloat(selectedSalary.other_additions || 0);
                          const newOtherDed = parseFloat(selectedSalary.other_deductions || 0) + deductionValue;
                          const totalDed = parseFloat(selectedSalary.advance_deduction || 0) + newOtherDed;
                          const newNet = Math.max(0, grossPay - totalDed);
                          const newPaid = parseFloat(selectedSalary.paid_amount || 0) + parseFloat(payAmount);
                          return formatCurrency(Math.max(0, newNet - newPaid));
                        }
                        if (deductionAmount && parseFloat(deductionAmount) > 0) {
                          const deductionValue = deductionType === 'fixed' ? parseFloat(deductionAmount) : (remainingAmt * parseFloat(deductionAmount)) / 100;
                          return <span>{formatCurrency(remainingAmt)} → Net: {formatCurrency(Math.max(0, remainingAmt - deductionValue))}</span>;
                        }
                        return formatCurrency(remainingAmt);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              {pendingAdvances.length > 0 && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-sm font-medium mb-2 text-gray-700">Pending Advances:</p>
                  <ul className="text-sm space-y-1 bg-yellow-50 p-2 rounded">
                    {pendingAdvances.map(a => <li key={a.id} className="flex justify-between"><span>- {a.reason || 'No reason'}</span><span className="font-medium">{formatCurrency(a.amount)}</span></li>)}
                  </ul>
                </div>
              )}
            </div>
            )}

            {selectedSalary && selectedSalary.status === 'paid' ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium mb-2">✓ This salary is already fully paid.</p>
                  {nextMonthSalary ? (
                    <p className="text-sm text-green-700">Next month's salary ({nextMonthSalary.month} {nextMonthSalary.year}) is available. You can pay it from the salaries list.</p>
                  ) : (
                    <p className="text-sm text-green-700">Generate next month's salary to continue payments.</p>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handlePay} className="space-y-4">
                {/* Deduction Section - Only for salary payments */}
                {selectedSalary && payType === 'salary' && (
                  <div className="border-b pb-4 mb-4">
                    <label className="block text-sm font-medium mb-2">Additional Deduction (Optional)</label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Deduction Type</label>
                        <select 
                          value={deductionType} 
                          onChange={(e) => {
                            setDeductionType(e.target.value);
                            setDeductionAmount('');
                          }}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="fixed">Fixed Amount</option>
                          <option value="percentage">Percentage</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          {deductionType === 'fixed' ? 'Deduction Amount' : 'Deduction %'}
                        </label>
                        <input 
                          type="number" 
                          step={deductionType === 'fixed' ? '0.01' : '0.01'}
                          min="0"
                          max={deductionType === 'percentage' ? '100' : undefined}
                          value={deductionAmount} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (deductionType === 'percentage') {
                              if (!val || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                                setDeductionAmount(val);
                              }
                            } else {
                              if (!val || parseFloat(val) >= 0) {
                                setDeductionAmount(val);
                              }
                            }
                          }} 
                          placeholder={deductionType === 'fixed' ? '0.00' : '0'}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" 
                        />
                      </div>
                    </div>
                    {deductionAmount && parseFloat(deductionAmount) > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">Deduction Amount:</span>
                          <span className="font-semibold text-red-600">
                            {(() => {
                              const remainingAmt = parseFloat(selectedSalary.remaining_amount || 0);
                              const deductionValue = deductionType === 'fixed' 
                                ? parseFloat(deductionAmount)
                                : (remainingAmt * parseFloat(deductionAmount)) / 100;
                              return deductionType === 'fixed' 
                                ? formatCurrency(deductionValue)
                                : `${deductionAmount}% of ${formatCurrency(remainingAmt)} = ${formatCurrency(deductionValue)}`;
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-red-200">
                          <span className="text-gray-700 font-medium">Net Payable:</span>
                          <span className="font-bold text-green-600">
                            {(() => {
                              const remainingAmt = parseFloat(selectedSalary.remaining_amount || 0);
                              const deductionValue = deductionType === 'fixed' 
                                ? parseFloat(deductionAmount)
                                : (remainingAmt * parseFloat(deductionAmount)) / 100;
                              return formatCurrency(Math.max(0, remainingAmt - deductionValue));
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedSalary && (
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input type="radio" name="payType" value="salary" checked={payType === 'salary'} onChange={() => { setPayType('salary'); setPayAmount(selectedSalary.remaining_amount); }} className="mr-2" />
                      <span>Monthly Salary</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input type="radio" name="payType" value="advance" checked={payType === 'advance'} onChange={() => { setPayType('advance'); setPayAmount(''); setDeductionAmount(''); }} className="mr-2" />
                      <span>Advance Payment</span>
                    </label>
                  </div>
                </div>
                )}

                {!selectedSalary && payType === 'advance' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Employee *</label>
                    <select 
                      required
                      value={selectedEmployee?.id || ''} 
                      onChange={(e) => {
                        const empId = e.target.value;
                        const emp = employees.find(emp => emp.id == empId);
                        setSelectedEmployee(emp);
                        if (emp) {
                          fetchPendingAdvances(emp.id);
                        }
                      }} 
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">Select an employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} - {emp.designation || 'No designation'}</option>
                      ))}
                    </select>
                  </div>
                )}

                {payType === 'salary' && (() => {
                  const remainingAmt = parseFloat(selectedSalary.remaining_amount || 0);
                  const deductionVal = deductionAmount && parseFloat(deductionAmount) > 0
                    ? (deductionType === 'fixed'
                        ? parseFloat(deductionAmount)
                        : (remainingAmt * parseFloat(deductionAmount)) / 100)
                    : 0;
                  const netPayable = Math.max(0, remainingAmt - deductionVal);
                  const maxPayment = deductionVal > 0 ? netPayable : remainingAmt;
                  return (
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Amount * (Net payable)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0.01"
                      required 
                      max={maxPayment}
                      value={payAmount} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val || parseFloat(val) <= maxPayment) {
                          setPayAmount(val);
                        }
                      }} 
                      placeholder={maxPayment}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" 
                    />
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        Maximum: {formatCurrency(maxPayment)}
                        {deductionVal > 0 && <span className="text-red-600 ml-1">(after {formatCurrency(deductionVal)} deduction)</span>}
                      </p>
                      <button 
                        type="button" 
                        onClick={() => setPayAmount(maxPayment.toString())} 
                        className="text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        Pay Full Amount
                      </button>
                    </div>
                    
                    {/* Preview when deduction and payment amount are set */}
                    {deductionVal > 0 && payAmount && parseFloat(payAmount) > 0 && (
                      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-700">Gross (Remaining):</span>
                          <span className="font-medium">{formatCurrency(remainingAmt)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-700">Deduction ({deductionType === 'percentage' ? deductionAmount + '%' : 'Fixed'}):</span>
                          <span className="font-semibold text-red-600">-{formatCurrency(deductionVal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mb-2 pt-2 border-t border-blue-200">
                          <span className="text-gray-700 font-medium">Net Payable:</span>
                          <span className="font-bold text-green-600">{formatCurrency(netPayable)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-700">Payment Amount:</span>
                          <span className="font-medium">{formatCurrency(payAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-blue-200">
                          <span className="text-gray-700 font-medium">Remaining After Payment:</span>
                          <span className="font-bold text-orange-600">
                            {(() => {
                              const grossPay = parseFloat(selectedSalary.basic_salary || 0) + parseFloat(selectedSalary.commission_amount || 0) + parseFloat(selectedSalary.other_additions || 0);
                              const newOtherDed = parseFloat(selectedSalary.other_deductions || 0) + deductionVal;
                              const totalDed = parseFloat(selectedSalary.advance_deduction || 0) + newOtherDed;
                              const newNet = Math.max(0, grossPay - totalDed);
                              const newPaid = parseFloat(selectedSalary.paid_amount || 0) + parseFloat(payAmount);
                              return formatCurrency(Math.max(0, newNet - newPaid));
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}

                {payType === 'advance' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Advance Amount *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0.01"
                        required 
                        value={payAmount} 
                        onChange={(e) => setPayAmount(e.target.value)} 
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                        placeholder="Enter advance amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Reason</label>
                      <textarea 
                        value={advanceData.reason} 
                        onChange={(e) => setAdvanceData({...advanceData, reason: e.target.value})} 
                        placeholder="Reason for advance (optional)" 
                        rows="3"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                      />
                    </div>
                    {selectedEmployee && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">Employee:</span> {selectedEmployee.name} ({selectedEmployee.designation || 'No designation'})
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Basic Salary: {formatCurrency(selectedEmployee.basic_salary || 0)}</p>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Payment Date *</label>
                  <input type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => { 
      setShowPayModal(false); 
      setSelectedSalary(null); 
      setSelectedEmployee(null); 
      setPayType('salary'); 
      setPayAmount(''); 
      setPayDate(new Date().toISOString().slice(0, 10)); 
      setDeductionType('fixed');
      setDeductionAmount('');
      setAdvanceData({ amount: '', reason: '' }); 
      setPendingAdvances([]);
      setNextMonthSalary(null);
                    }} 
                    className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button type="submit" className={`flex-1 py-2 text-white rounded-lg ${payType === 'salary' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                    {payType === 'salary' ? 'Pay Salary' : 'Pay Advance'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">Generate Salary</h2><button onClick={() => setShowGenerate(false)}><X className="w-6 h-6" /></button></div>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Month</label><select value={generateMonth} onChange={(e) => setGenerateMonth(e.target.value)} className="w-full px-4 py-2 border rounded-lg" required>{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Year</label><select value={generateYear} onChange={(e) => setGenerateYear(parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" required>{[generateYear, generateYear-1].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowGenerate(false)} className="flex-1 py-2 bg-gray-200 rounded-lg">Cancel</button><button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Generate</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedgerModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
              <div>
                <h2 className="text-xl font-bold">Employee Ledger</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedEmployee.name} - {selectedEmployee.designation || 'Employee'}</p>
              </div>
              <button onClick={() => { 
                setShowLedgerModal(false);
                setSelectedEmployee(null);
                setLedger([]);
                setLedgerStartDate('');
                setLedgerEndDate('');
              }} className="p-2 hover:bg-gray-200 rounded"><X className="w-6 h-6" /></button>
            </div>
            <div className="overflow-auto p-6">
              <div className="mb-4 flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                  <input 
                    type="date" 
                    value={ledgerStartDate}
                    onChange={(e) => {
                      const start = e.target.value;
                      setLedgerStartDate(start);
                      fetchLedger(selectedEmployee, start, ledgerEndDate || undefined);
                    }} 
                    className="w-full px-3 py-2 border rounded-lg text-sm" 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">End Date</label>
                  <input 
                    type="date" 
                    value={ledgerEndDate}
                    onChange={(e) => {
                      const end = e.target.value;
                      setLedgerEndDate(end);
                      fetchLedger(selectedEmployee, ledgerStartDate || undefined, end);
                    }} 
                    className="w-full px-3 py-2 border rounded-lg text-sm" 
                  />
                </div>
                <button
                  onClick={() => {
                    setLedgerStartDate('');
                    setLedgerEndDate('');
                    fetchLedger(selectedEmployee);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                >
                  Clear Filters
                </button>
              </div>
              
              {ledger.length > 0 && (() => {
                const totalDebit = ledger.reduce((s, t) => s + parseFloat(t.debit || 0), 0);
                const totalCredit = ledger.reduce((s, t) => s + parseFloat(t.credit || 0), 0);
                const closingBal = ledger.length > 0 && ledger[ledger.length - 1].balance !== undefined 
                  ? ledger[ledger.length - 1].balance 
                  : totalDebit - totalCredit;
                return (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Debit:</span>
                        <span className="ml-2 font-semibold text-red-600">{formatCurrency(totalDebit)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Credit:</span>
                        <span className="ml-2 font-semibold text-green-600">{formatCurrency(totalCredit)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Closing Balance:</span>
                        <span className={`ml-2 font-bold text-lg ${closingBal >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {closingBal >= 0 ? `You owe: ${formatCurrency(closingBal)}` : `You are owed: ${formatCurrency(Math.abs(closingBal))}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Debit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Credit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ledger.length === 0 ? (
                    <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No transactions found</td></tr>
                  ) : (
                    ledger.map((t, i) => {
                      // Use balance from backend if available, otherwise calculate running balance
                      const balance = t.balance !== undefined ? t.balance : ledger.slice(0, i + 1).reduce((s, tr) => s + parseFloat(tr.debit || 0) - parseFloat(tr.credit || 0), 0);
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{new Date(t.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                              t.type==='advance'?'bg-orange-100 text-orange-800':
                              t.type==='salary'?'bg-green-100 text-green-800':
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{t.description || t.reason || '-'}</td>
                          <td className="px-4 py-3">
                            {t.status && (
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                t.status==='paid'?'bg-green-100 text-green-800':
                                t.status==='deducted'?'bg-blue-100 text-blue-800':
                                t.status==='pending'?'bg-yellow-100 text-yellow-800':
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {t.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-red-600">{t.debit && parseFloat(t.debit) > 0 ? formatCurrency(t.debit) : '-'}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-green-600">{t.credit && parseFloat(t.credit) > 0 ? formatCurrency(t.credit) : '-'}</td>
                          <td className={`px-4 py-3 text-right text-sm font-semibold ${balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {balance >= 0 ? formatCurrency(balance) : formatCurrency(Math.abs(balance))}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Salary Slip */}
      {salarySlip && <SalarySlip salary={salarySlip} format="a4" onClose={() => setSalarySlip(null)} onPrint={() => {}} />}
    </div>
  );
}
