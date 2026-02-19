import { useState, useEffect } from 'react';
import api from '../api/api';
import toast from 'react-hot-toast';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, X, DollarSign, FileText, FileDown } from 'lucide-react';

export default function Suppliers() {
  const { formatCurrency } = useSettings();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [ledger, setLedger] = useState({ ledger: [], supplier: null });
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', contact_person: '' });
  const [payData, setPayData] = useState({ amount: '', description: '' });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data.filter(s => s.status !== 'inactive'));
    } catch (err) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, formData);
        toast.success('Supplier updated');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Supplier added');
      }
      setShowModal(false);
      setEditingSupplier(null);
      setFormData({ name: '', phone: '', email: '', address: '', contact_person: '' });
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedSupplier || !payData.amount) return;
    try {
      await api.post(`/suppliers/${selectedSupplier.id}/pay`, payData);
      toast.success('Payment recorded');
      setShowPayModal(false);
      setPayData({ amount: '', description: '' });
      setSelectedSupplier(null);
      fetchSuppliers();
      if (showLedgerModal && selectedSupplier) fetchLedger(selectedSupplier);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const fetchLedger = async (sup) => {
    try {
      const res = await api.get(`/suppliers/${sup.id}/ledger`);
      setLedger(res.data);
      setSelectedSupplier(sup);
      setShowLedgerModal(true);
    } catch (err) {
      toast.error('Failed to load ledger');
    }
  };

  const handleEdit = (s) => {
    setEditingSupplier(s);
    setFormData({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', contact_person: s.contact_person || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this supplier?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Supplier deactivated');
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const exportCsv = () => {
    const headers = ['Name','Phone','Email','Balance'];
    const rows = suppliers.map(s => [s.name, s.phone||'', s.email||'', s.balance||0]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'suppliers.csv';
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
        <h1 className="text-3xl font-bold text-gray-800">Suppliers</h1>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><FileDown className="w-5 h-5" />Export</button>
          <button onClick={() => { setEditingSupplier(null); setFormData({ name: '', phone: '', email: '', address: '', contact_person: '' }); setShowModal(true); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2"><Plus className="w-5 h-5" />Add Supplier</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><p className="font-medium">{s.name}</p><p className="text-sm text-gray-500">{s.contact_person || '-'}</p></td>
                  <td className="px-6 py-4">{s.phone || s.email || '-'}</td>
                  <td className="px-6 py-4 font-semibold">{formatCurrency(s.balance || 0)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setSelectedSupplier(s); setPayData({ amount: '', description: '' }); setShowPayModal(true); }} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Pay"><DollarSign className="w-5 h-5" /></button>
                      <button onClick={() => fetchLedger(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Ledger"><FileText className="w-5 h-5" /></button>
                      <button onClick={() => handleEdit(s)} className="p-2 text-primary-600 hover:bg-primary-50 rounded"><Edit className="w-5 h-5" /></button>
                      {user?.role === 'admin' && (
                        <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-5 h-5" /></button>
                      )}
                    </div>
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
            <div className="flex justify-between mb-6"><h2 className="text-xl font-bold">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2><button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button></div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Name *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Address</label><input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Contact Person</label><input type="text" value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg">Cancel</button><button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {showPayModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between mb-6"><h2 className="text-xl font-bold">Pay Supplier - {selectedSupplier.name}</h2><button onClick={() => setShowPayModal(false)}><X className="w-6 h-6" /></button></div>
            <p className="text-gray-600 mb-2">Balance: {formatCurrency(selectedSupplier.balance || 0)}</p>
            <form onSubmit={handlePay} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Amount *</label><input type="number" step="0.01" required value={payData.amount} onChange={(e) => setPayData({...payData, amount: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><input type="text" value={payData.description} onChange={(e) => setPayData({...payData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowPayModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg">Cancel</button><button type="submit" className="flex-1 py-2 bg-green-600 text-white rounded-lg">Pay</button></div>
            </form>
          </div>
        </div>
      )}

      {showLedgerModal && ledger.supplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
              <div>
                <h2 className="text-xl font-bold">Supplier Ledger</h2>
                <p className="text-sm text-gray-600 mt-1">{ledger.supplier.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className={`text-2xl font-bold ${ledger.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(ledger.balance))}
                </p>
                <p className="text-xs text-gray-500">{ledger.balance >= 0 ? 'You owe' : 'You are owed'}</p>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="p-2 hover:bg-gray-200 rounded"><X className="w-6 h-6" /></button>
            </div>
            <div className="overflow-auto p-6">
              <div className="mb-4 flex gap-4">
                <input type="date" placeholder="Start Date" onChange={(e) => { const res = api.get(`/suppliers/${ledger.supplier.id}/ledger`, { params: { start_date: e.target.value, end_date: new Date().toISOString().slice(0, 10) } }).then(r => setLedger(r.data)).catch(() => {}); }} className="px-3 py-2 border rounded-lg text-sm" />
                <input type="date" placeholder="End Date" onChange={(e) => { const res = api.get(`/suppliers/${ledger.supplier.id}/ledger`, { params: { start_date: new Date(new Date().setMonth(new Date().getMonth()-1)).toISOString().slice(0, 10), end_date: e.target.value } }).then(r => setLedger(r.data)).catch(() => {}); }} className="px-3 py-2 border rounded-lg text-sm" />
              </div>
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Debit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Credit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ledger.ledger.length === 0 ? (
                    <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No transactions found</td></tr>
                  ) : (
                    (() => {
                      let runningBalance = parseFloat(ledger.balance || 0);
                      // Calculate opening balance (reverse from last transaction)
                      const lastTx = ledger.ledger[ledger.ledger.length - 1];
                      if (lastTx) {
                        runningBalance = parseFloat(lastTx.balance_after || 0);
                        // Reverse calculate opening balance
                        ledger.ledger.forEach(t => {
                          if (t.type === 'purchase') runningBalance -= parseFloat(t.amount || 0);
                          else runningBalance += parseFloat(t.amount || 0);
                        });
                      }
                      return ledger.ledger.map((t) => {
                        if (t.type === 'purchase') runningBalance += parseFloat(t.amount || 0);
                        else runningBalance -= parseFloat(t.amount || 0);
                        return (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{new Date(t.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full capitalize ${t.type==='payment'?'bg-green-100 text-green-800':'bg-blue-100 text-blue-800'}`}>{t.type}</span></td>
                            <td className="px-4 py-3 text-sm">{t.description||'-'}</td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-red-600">{t.type==='purchase'?formatCurrency(t.amount):'-'}</td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-green-600">{t.type==='payment'?formatCurrency(t.amount):'-'}</td>
                            <td className={`px-4 py-3 text-right text-sm font-semibold ${runningBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(runningBalance))}</td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan="3" className="px-4 py-3 text-right">Closing Balance:</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(ledger.ledger.filter(t => t.type === 'purchase').reduce((s, t) => s + parseFloat(t.amount || 0), 0))}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(ledger.ledger.filter(t => t.type === 'payment').reduce((s, t) => s + parseFloat(t.amount || 0), 0))}</td>
                    <td className={`px-4 py-3 text-right text-lg ${ledger.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(ledger.balance))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
