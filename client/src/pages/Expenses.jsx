import { useState, useEffect } from 'react';
import api from '../api/api';
import toast from 'react-hot-toast';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, X, FolderOpen, FileDown, FileText } from 'lucide-react';

export default function Expenses() {
  const { formatCurrency } = useSettings();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [report, setReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [formData, setFormData] = useState({ category_id: '', amount: '', description: '', expense_date: new Date().toISOString().slice(0, 10), payment_method: 'cash', reference: '' });
  const [categoryData, setCategoryData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/expenses/categories');
      setCategories(res.data);
    } catch (err) {
      toast.error('Failed to load categories');
    }
  };

  const fetchReport = async () => {
    try {
      const res = await api.get('/expenses/report', { params: { start_date: startDate, end_date: endDate } });
      setReport(res.data);
      setShowReport(true);
    } catch (err) {
      toast.error('Failed to load report');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, formData);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', formData);
        toast.success('Expense added');
      }
      setShowModal(false);
      setEditingExpense(null);
      setFormData({ category_id: '', amount: '', description: '', expense_date: new Date().toISOString().slice(0, 10), payment_method: 'cash', reference: '' });
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses/categories', categoryData);
      toast.success('Category added');
      setShowCategoryModal(false);
      setCategoryData({ name: '', description: '' });
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category? Expenses with this category will have no category.')) return;
    try {
      await api.delete(`/expenses/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const exportCsv = () => {
    const headers = ['Date','Category','Amount','Description','Payment'];
    const rows = (report?.expenses || expenses).map(e => [e.expense_date, e.category_name||'Uncategorized', e.amount, e.description||'', e.payment_method]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `expenses-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Exported');
  };

  const exportPdf = () => {
    const data = report || { expenses, summary: { total: expenses.reduce((s,e)=>s+parseFloat(e.amount||0),0) } };
    const html = `<!DOCTYPE html><html><head><title>Expense Report</title></head><body style="font-family:system-ui;padding:20px"><h1>Expense Report - ${startDate} to ${endDate}</h1><p><strong>Total: ${formatCurrency(data.summary?.total||0)}</strong></p><table border="1" cellpadding="8" style="border-collapse:collapse;width:100%"><tr><th>Date</th><th>Category</th><th>Amount</th><th>Description</th></tr>${(data.expenses||[]).map(e=>`<tr><td>${e.expense_date}</td><td>${e.category_name||'-'}</td><td>${formatCurrency(e.amount)}</td><td>${e.description||'-'}</td></tr>`).join('')}</table></body></html>`;
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
        <h1 className="text-3xl font-bold text-gray-800">Expenses</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCategoryModal(true)} className="px-4 py-2 bg-gray-600 text-white rounded-lg flex items-center gap-2"><FolderOpen className="w-5 h-5" />Categories</button>
          <button onClick={fetchReport} className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2">Report</button>
          <button onClick={exportCsv} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><FileDown className="w-5 h-5" />Export</button>
          <button onClick={exportPdf} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"><FileText className="w-5 h-5" />Print</button>
          <button onClick={() => { setEditingExpense(null); setFormData({ category_id: '', amount: '', description: '', expense_date: new Date().toISOString().slice(0, 10), payment_method: 'cash', reference: '' }); setShowModal(true); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2"><Plus className="w-5 h-5" />Add Expense</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{e.expense_date}</td>
                  <td className="px-6 py-4">{e.category_name || 'Uncategorized'}</td>
                  <td className="px-6 py-4 font-semibold">{formatCurrency(e.amount)}</td>
                  <td className="px-6 py-4">{e.description || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setEditingExpense(e); setFormData({ category_id: e.category_id||'', amount: e.amount, description: e.description||'', expense_date: e.expense_date, payment_method: e.payment_method||'cash', reference: e.reference||'' }); setShowModal(true); }} className="p-2 text-primary-600 hover:bg-primary-50 rounded"><Edit className="w-5 h-5" /></button>
                    {user?.role === 'admin' && (
                      <button onClick={() => handleDelete(e.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-5 h-5" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between mb-6"><h2 className="text-xl font-bold">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2><button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button></div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Category</label><select value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} className="w-full px-4 py-2 border rounded-lg"><option value="">Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Amount *</label><input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Date *</label><input type="date" required value={formData.expense_date} onChange={(e) => setFormData({...formData, expense_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Payment Method</label><select value={formData.payment_method} onChange={(e) => setFormData({...formData, payment_method: e.target.value})} className="w-full px-4 py-2 border rounded-lg"><option value="cash">Cash</option><option value="card">Card</option><option value="online">Online</option></select></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg">Cancel</button><button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between mb-6"><h2 className="text-xl font-bold">Expense Categories</h2><button onClick={() => setShowCategoryModal(false)}><X className="w-6 h-6" /></button></div>
            <ul className="space-y-2 mb-4">{categories.map(c => <li key={c.id} className="flex justify-between items-center p-2 bg-gray-50 rounded"><span>{c.name}</span>{user?.role === 'admin' && <button onClick={() => handleDeleteCategory(c.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>}</li>)}</ul>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">New Category Name</label><input type="text" value={categoryData.name} onChange={(e) => setCategoryData({...categoryData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded-lg">Add Category</button>
            </form>
          </div>
        </div>
      )}

      {showReport && report && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between mb-6"><h2 className="text-xl font-bold">Expense Report</h2><button onClick={() => setShowReport(false)}><X className="w-6 h-6" /></button></div>
            <div className="mb-4 flex gap-4"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /><button onClick={fetchReport} className="px-4 py-2 bg-primary-600 text-white rounded">Refresh</button></div>
            <p className="font-bold text-lg mb-4">Total: {formatCurrency(report.summary?.total)}</p>
            <table className="w-full"><thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Category</th><th className="px-4 py-2 text-left">Amount</th><th className="px-4 py-2 text-left">Description</th></tr></thead><tbody>{(report.expenses||[]).map(e=><tr key={e.id} className="border-b"><td className="px-4 py-2">{e.expense_date}</td><td className="px-4 py-2">{e.category_name||'-'}</td><td className="px-4 py-2">{formatCurrency(e.amount)}</td><td className="px-4 py-2">{e.description||'-'}</td></tr>)}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
