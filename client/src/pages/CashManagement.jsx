import { useState, useEffect } from 'react';
import api from '../api/api';
import toast from 'react-hot-toast';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, ArrowDownCircle, ArrowUpCircle, FileDown, FileText, Plus, X } from 'lucide-react';

export default function CashManagement() {
  const { formatCurrency } = useSettings();
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [report, setReport] = useState(null);
  const [showInModal, setShowInModal] = useState(false);
  const [showOutModal, setShowOutModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [inData, setInData] = useState({ amount: '', description: '' });
  const [outData, setOutData] = useState({ amount: '', description: '' });

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
    // Refresh balance every 30 seconds
    const interval = setInterval(() => {
      fetchBalance();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await api.get('/cash/balance');
      setBalance(res.data.balance);
    } catch (err) {
      toast.error('Failed to load balance');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/cash/transactions');
      setTransactions(res.data.transactions || []);
    } catch (err) {
      toast.error('Failed to load transactions');
    }
  };

  const fetchReport = async () => {
    try {
      const res = await api.get('/cash/report', { params: { start_date: startDate, end_date: endDate } });
      setReport(res.data);
      setShowReport(true);
    } catch (err) {
      toast.error('Failed to load report');
    }
  };

  const handleCashIn = async (e) => {
    e.preventDefault();
    const amount = parseFloat(inData.amount);
    if (!inData.amount || isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      const res = await api.post('/cash/in', { amount: amount, description: inData.description || 'Cash in' });
      toast.success('Cash in recorded successfully');
      setShowInModal(false);
      setInData({ amount: '', description: '' });
      await fetchBalance();
      await fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record cash in');
    }
  };

  const handleCashOut = async (e) => {
    e.preventDefault();
    const amount = parseFloat(outData.amount);
    if (!outData.amount || isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > balance) {
      toast.error(`Insufficient balance. Available: ${formatCurrency(balance)}`);
      return;
    }
    try {
      const res = await api.post('/cash/out', { amount: amount, description: outData.description || 'Cash out' });
      toast.success('Cash out recorded successfully');
      setShowOutModal(false);
      setOutData({ amount: '', description: '' });
      await fetchBalance();
      await fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record cash out');
    }
  };

  const exportCsv = () => {
    const headers = ['Date','Type','Amount','Description','Balance'];
    const data = report?.transactions || transactions;
    const rows = data.map(t => [t.created_at, t.type, t.amount, t.description||'', t.balance_after]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `cash-report-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Exported');
  };

  const exportPdf = () => {
    const data = report || { transactions, summary: { totalIn: 0, totalOut: 0, closingBalance: balance } };
    const html = `<!DOCTYPE html><html><head><title>Cash Report</title></head><body style="font-family:system-ui;padding:20px"><h1>Cash Report - ${startDate} to ${endDate}</h1><p><strong>Total In: ${formatCurrency(data.summary?.totalIn)}</strong></p><p><strong>Total Out: ${formatCurrency(data.summary?.totalOut)}</strong></p><p><strong>Closing Balance: ${formatCurrency(data.summary?.closingBalance)}</strong></p><table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;margin-top:20px"><tr><th>Date</th><th>Type</th><th>Amount</th><th>Description</th><th>Balance</th></tr>${(data.transactions||[]).map(t=>`<tr><td>${new Date(t.created_at).toLocaleString()}</td><td>${t.type}</td><td>${t.type==='in'?'+':'-'}${formatCurrency(t.amount)}</td><td>${t.description||'-'}</td><td>${formatCurrency(t.balance_after)}</td></tr>`).join('')}</table></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 250);
    toast.success('Print opened');
  };

  if (user?.role !== 'admin') {
    return <div className="flex justify-center items-center h-64"><p className="text-gray-500">Admin access required</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Cash Management</h1>
        <div className="flex gap-2">
          <button onClick={fetchReport} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Report</button>
          <button onClick={exportCsv} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><FileDown className="w-5 h-5" />Export</button>
          <button onClick={exportPdf} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"><FileText className="w-5 h-5" />Print</button>
          <button onClick={() => { setInData({ amount: '', description: '' }); setShowInModal(true); }} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><ArrowDownCircle className="w-5 h-5" />Cash In</button>
          <button onClick={() => { setOutData({ amount: '', description: '' }); setShowOutModal(true); }} className="px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center gap-2"><ArrowUpCircle className="w-5 h-5" />Cash Out</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-3xl font-bold text-primary-600">{formatCurrency(balance)}</p>
              <p className="text-xs text-gray-500 mt-1">Including cash sales</p>
            </div>
            <Wallet className="w-12 h-12 text-primary-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Total Cash In (Today)</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(transactions.filter(t => t.type === 'in' && new Date(t.created_at).toDateString() === new Date().toDateString()).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0))}
              </p>
            </div>
            <ArrowDownCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Total Cash Out (Today)</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(transactions.filter(t => t.type === 'out' && new Date(t.created_at).toDateString() === new Date().toDateString()).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0))}
              </p>
            </div>
            <ArrowUpCircle className="w-10 h-10 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border overflow-hidden">
        <h3 className="px-6 py-4 font-semibold border-b">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No transactions found</td></tr>
              ) : (
                transactions.slice(0, 50).map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${t.type==='in'?'bg-green-100 text-green-800':'bg-orange-100 text-orange-800'}`}>
                        {t.reference_type === 'sale' ? 'Sale' : t.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-semibold ${t.type==='in'?'text-green-600':'text-orange-600'}`}>
                      {t.type==='in'?'+':'-'}{formatCurrency(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm">{t.description || '-'}</td>
                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(t.balance_after || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Cash In</h2>
              <button onClick={() => setShowInModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(balance)}</p>
            </div>
            <form onSubmit={handleCashIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  min="0.01"
                  value={inData.amount} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val || parseFloat(val) >= 0) {
                      setInData({...inData, amount: val});
                    }
                  }} 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" 
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  value={inData.description} 
                  onChange={(e) => setInData({...inData, description: e.target.value})} 
                  rows="2"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" 
                  placeholder="Reason for cash in..."
                />
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowInModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Add Cash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Cash Out</h2>
              <button onClick={() => setShowOutModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(balance)}</p>
            </div>
            <form onSubmit={handleCashOut} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  min="0.01"
                  max={balance}
                  value={outData.amount} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val || (parseFloat(val) >= 0 && parseFloat(val) <= balance)) {
                      setOutData({...outData, amount: val});
                    }
                  }} 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum: {formatCurrency(balance)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  value={outData.description} 
                  onChange={(e) => setOutData({...outData, description: e.target.value})} 
                  rows="2"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                  placeholder="Reason for cash out..."
                />
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowOutModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">Deduct Cash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReport && report && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-5xl p-6 my-8 shadow-xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold">Cash Report</h2>
              <button onClick={() => setShowReport(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-6 h-6" /></button>
            </div>
            <div className="mb-4 flex gap-4 items-end">
              <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded-lg" /></div>
              <button onClick={fetchReport} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Refresh</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600 mb-1">Total Cash In</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(report.summary?.totalIn || 0)}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-sm text-gray-600 mb-1">Total Cash Out</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(report.summary?.totalOut || 0)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">Closing Balance</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(report.summary?.closingBalance || 0)}</p>
              </div>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.transactions.length === 0 ? (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No transactions found</td></tr>
                  ) : (
                    report.transactions.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{new Date(t.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full capitalize ${t.type==='in'?'bg-green-100 text-green-800':'bg-orange-100 text-orange-800'}`}>
                            {t.reference_type === 'sale' ? 'Sale' : t.type}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${t.type==='in'?'text-green-600':'text-orange-600'}`}>
                          {t.type==='in'?'+':'-'}{formatCurrency(t.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm">{t.description||'-'}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(t.balance_after || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
