import { useState, useEffect } from 'react';
import api from '../api/api';
import toast from 'react-hot-toast';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, X, Check, DollarSign, Package, FileDown, Printer, Search, Scan, ShoppingBag } from 'lucide-react';

export default function PurchaseOrders() {
  const { formatCurrency } = useSettings();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: '',
    items: [{ product_id: '', product_name: '', quantity: 1, unit_price: 0 }],
    discount_amount: 0,
    vat_amount: 0,
    notes: '',
  });
  const [payAmount, setPayAmount] = useState('');
  const [productSearch, setProductSearch] = useState({});
  const [barcodeInput, setBarcodeInput] = useState({});
  const [showProductSearch, setShowProductSearch] = useState({});
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierSearch, setShowSupplierSearch] = useState(false);

  useEffect(() => {
    fetchOrders();
    api.get('/suppliers').then(r => setSuppliers(r.data.filter(s => s.status !== 'inactive'))).catch(() => {});
    api.get('/products').then(r => setProducts(r.data)).catch(() => {});
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/purchase-orders');
      setOrders(res.data);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { product_id: '', product_name: '', quantity: 1, unit_price: 0 }] });
  };

  const removeItem = (i) => {
    const items = formData.items.filter((_, idx) => idx !== i);
    setFormData({ ...formData, items: items.length ? items : [{ product_id: '', product_name: '', quantity: 1, unit_price: 0 }] });
  };

  const handleBarcodeScan = (i, barcode) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      const items = [...formData.items];
      items[i] = { ...items[i], product_id: product.id, product_name: product.name, unit_price: product.purchase_rate || product.price || 0 };
      setFormData({ ...formData, items });
      setBarcodeInput({ ...barcodeInput, [i]: '' });
      toast.success(`Product found: ${product.name}`);
    } else {
      toast.error('Product not found with this barcode');
    }
  };

  const handleProductSearch = (i, searchTerm) => {
    setProductSearch({ ...productSearch, [i]: searchTerm });
    setShowProductSearch({ ...showProductSearch, [i]: true });
  };

  const selectProduct = (i, product) => {
    const items = [...formData.items];
    items[i] = { ...items[i], product_id: product.id, product_name: product.name, unit_price: product.purchase_rate || product.price || 0 };
    setFormData({ ...formData, items });
    setProductSearch({ ...productSearch, [i]: '' });
    setShowProductSearch({ ...showProductSearch, [i]: false });
  };

  const updateItem = (i, field, value) => {
    const items = [...formData.items];
    items[i] = { ...items[i], [field]: value };
    setFormData({ ...formData, items });
  };

  const filteredProducts = (i) => {
    const search = productSearch[i] || '';
    if (!search) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.barcode && p.barcode.includes(search))
    ).slice(0, 5);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = formData.items.filter(i => (i.product_id || i.product_name) && i.quantity > 0);
    if (!formData.supplier_id || !formData.order_date || !validItems.length) {
      toast.error('Supplier, date and at least one item required');
      return;
    }
    try {
      if (editingOrder) {
        await api.put(`/purchase-orders/${editingOrder.id}`, { ...formData, items: validItems });
        toast.success('Order updated');
      } else {
        await api.post('/purchase-orders', { ...formData, items: validItems });
        toast.success('Order created');
      }
      setShowModal(false);
      setEditingOrder(null);
      setFormData({ supplier_id: '', order_date: new Date().toISOString().slice(0, 10), expected_date: '', items: [{ product_id: '', product_name: '', quantity: 1, unit_price: 0 }], discount_amount: 0, vat_amount: 0, notes: '' });
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleConfirm = async (order) => {
    if (!window.confirm('Confirm this purchase order? This will add to supplier balance.')) return;
    try {
      await api.post(`/purchase-orders/${order.id}/confirm`);
      toast.success('Order confirmed');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await api.post(`/purchase-orders/${selectedOrder.id}/pay`, { amount: payAmount || undefined });
      toast.success('Payment recorded');
      setShowPayModal(false);
      setSelectedOrder(null);
      setPayAmount('');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleReceive = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await api.post(`/purchase-orders/${selectedOrder.id}/receive`);
      toast.success('Items received, stock updated');
      setShowReceiveModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (order) => {
    if (order.status !== 'draft') { toast.error('Only draft orders can be deleted'); return; }
    if (!window.confirm('Delete this order?')) return;
    try {
      await api.delete(`/purchase-orders/${order.id}`);
      toast.success('Order deleted');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const exportCsv = () => {
    const headers = ['PO#','Supplier','Date','Status','Total','Paid','Remaining'];
    const rows = orders.map(o => [o.po_number, o.supplier_name, o.order_date, o.status, o.total, o.paid_amount, (parseFloat(o.total||0)-parseFloat(o.paid_amount||0))]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'purchase-orders.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Exported');
  };

  const printOrder = (order) => {
    const html = `<!DOCTYPE html><html><head><title>PO ${order.po_number}</title></head><body style="font-family:system-ui;padding:20px"><h1>Purchase Order - ${order.po_number}</h1><p>Supplier: ${order.supplier_name}</p><p>Date: ${order.order_date}</p><table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;margin-top:20px"><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>${(order.items||[]).map(i=>`<tr><td>${i.product_name}</td><td>${i.quantity}</td><td>${formatCurrency(i.unit_price)}</td><td>${formatCurrency(i.total_price)}</td></tr>`).join('')}</table><p style="margin-top:20px;font-bold">Total: ${formatCurrency(order.total)}</p><p>Paid: ${formatCurrency(order.paid_amount)}</p><p>Remaining: ${formatCurrency((order.total||0)-(order.paid_amount||0))}</p></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  if (user?.role !== 'admin') {
    return <div className="flex justify-center items-center h-64"><p className="text-gray-500">Admin access required</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Purchase Orders</h1>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><FileDown className="w-5 h-5" />Export</button>
                  <button onClick={() => { setEditingOrder(null); setSupplierSearch(''); setFormData({ supplier_id: '', order_date: new Date().toISOString().slice(0, 10), expected_date: '', items: [{ product_id: '', product_name: '', quantity: 1, unit_price: 0 }], discount_amount: 0, vat_amount: 0, notes: '' }); setShowModal(true); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2"><Plus className="w-5 h-5" />New PO</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{o.po_number}</td>
                  <td className="px-6 py-4">{o.supplier_name}</td>
                  <td className="px-6 py-4">{o.order_date}</td>
                  <td className="px-6 py-4">{formatCurrency(o.total)}</td>
                  <td className="px-6 py-4 text-green-600">{formatCurrency(o.paid_amount)}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${o.status==='paid'?'bg-green-100':o.status==='confirmed'||o.status==='received'?'bg-blue-100':'bg-gray-100'}`}>{o.status}</span></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => printOrder(o)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Print"><Printer className="w-5 h-5" /></button>
                      {o.status === 'draft' && <button onClick={() => handleConfirm(o)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Confirm"><Check className="w-5 h-5" /></button>}
                      {(o.status === 'confirmed' || o.status === 'received') && parseFloat(o.total) > parseFloat(o.paid_amount||0) && <button onClick={() => { setSelectedOrder(o); setPayAmount((o.total||0)-(o.paid_amount||0)); setShowPayModal(true); }} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Pay"><DollarSign className="w-5 h-5" /></button>}
                      {o.status === 'confirmed' && <button onClick={() => { setSelectedOrder(o); setShowReceiveModal(true); }} className="p-2 text-orange-600 hover:bg-orange-50 rounded" title="Receive"><Package className="w-5 h-5" /></button>}
                      {o.status === 'draft' && <button onClick={() => { setEditingOrder(o); api.get(`/purchase-orders/${o.id}`).then(r => { const d = r.data; const supplier = suppliers.find(s => s.id == d.supplier_id); setSupplierSearch(supplier?.name || ''); setFormData({ supplier_id: d.supplier_id, order_date: d.order_date, expected_date: d.expected_date||'', items: (d.items||[]).length ? d.items.map(i=>({ product_id: i.product_id, product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price })) : [{ product_id: '', product_name: '', quantity: 1, unit_price: 0 }], discount_amount: d.discount_amount||0, vat_amount: d.vat_amount||0, notes: d.notes||'' }); setShowModal(true); }).catch(() => toast.error('Failed to load')); }} className="p-2 text-primary-600 hover:bg-primary-50 rounded"><Edit className="w-5 h-5" /></button>}
                      {o.status === 'draft' && user?.role === 'admin' && (
                        <button onClick={() => handleDelete(o)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-5 h-5" /></button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-4xl p-6 my-8">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold">{editingOrder ? 'Edit Purchase Order' : 'New Purchase Order'}</h2>
              <button onClick={() => { setShowModal(false); setSupplierSearch(''); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium mb-1">Supplier *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={supplierSearch || suppliers.find(s => s.id == formData.supplier_id)?.name || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSupplierSearch(val);
                        setShowSupplierSearch(true);
                        if (!val) {
                          setFormData({...formData, supplier_id: ''});
                        }
                      }}
                      onFocus={() => setShowSupplierSearch(true)}
                      placeholder="Search supplier..."
                      className="w-full px-4 py-2 border rounded-lg pr-10"
                    />
                    <ShoppingBag className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                    {showSupplierSearch && supplierSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                        {suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 ? (
                          <div className="px-4 py-2 text-sm text-gray-500">No supplier found</div>
                        ) : (
                          suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).map(s => (
                            <div
                              key={s.id}
                              onClick={() => {
                                setFormData({...formData, supplier_id: s.id});
                                setSupplierSearch(s.name);
                                setShowSupplierSearch(false);
                              }}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b"
                            >
                              <p className="font-medium">{s.name}</p>
                              {s.phone && <p className="text-xs text-gray-500">{s.phone}</p>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {formData.supplier_id && !supplierSearch && (
                    <input type="hidden" value={formData.supplier_id} />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Order Date *</label>
                  <input type="date" required value={formData.order_date} onChange={(e) => setFormData({...formData, order_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expected Date</label>
                <input type="date" value={formData.expected_date} onChange={(e) => setFormData({...formData, expected_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-medium">Order Items</label>
                  <button type="button" onClick={addItem} className="px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {formData.items.map((item, i) => (
                    <div key={i} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="relative">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Barcode Scanner</label>
                          <input
                            type="text"
                            placeholder="Scan barcode..."
                            value={barcodeInput[i] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBarcodeInput({ ...barcodeInput, [i]: val });
                              if (val.length >= 3) {
                                handleBarcodeScan(i, val);
                              }
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && barcodeInput[i]) {
                                e.preventDefault();
                                handleBarcodeScan(i, barcodeInput[i]);
                              }
                            }}
                            className="w-full px-3 py-2 border rounded-lg pr-10 text-sm"
                          />
                          <Scan className="absolute right-3 top-8 w-4 h-4 text-gray-400" />
                        </div>
                        <div className="relative">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Search Product</label>
                          <input
                            type="text"
                            placeholder="Search by name..."
                            value={productSearch[i] || ''}
                            onChange={(e) => handleProductSearch(i, e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg pr-10 text-sm"
                          />
                          <Search className="absolute right-3 top-8 w-4 h-4 text-gray-400" />
                          {showProductSearch[i] && filteredProducts(i).length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                              {filteredProducts(i).map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => selectProduct(i, p)}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b"
                                >
                                  <p className="font-medium text-sm">{p.name}</p>
                                  <p className="text-xs text-gray-500">{p.barcode ? `Barcode: ${p.barcode}` : 'No barcode'}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {item.product_name && (
                        <div className="mb-3 p-2 bg-green-50 rounded border border-green-200">
                          <p className="text-sm font-medium text-green-800">✓ Selected: {item.product_name}</p>
                          {item.product_id && <p className="text-xs text-green-600">ID: {item.product_id}</p>}
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                          <input type="number" step="0.01" min="0.01" required value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price</label>
                          <input type="number" step="0.01" min="0" required value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                        </div>
                        <div className="flex items-end">
                          <button type="button" onClick={() => removeItem(i)} className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors">
                            <Trash2 className="w-5 h-5 mx-auto" />
                          </button>
                        </div>
                      </div>
                      {item.quantity && item.unit_price && (
                        <div className="mt-2 text-right">
                          <span className="text-xs text-gray-600">Subtotal: </span>
                          <span className="font-semibold">{formatCurrency(parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0))}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount Amount</label>
                  <input type="number" step="0.01" value={formData.discount_amount} onChange={(e) => setFormData({...formData, discount_amount: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">VAT Amount</label>
                  <input type="number" step="0.01" value={formData.vat_amount} onChange={(e) => setFormData({...formData, vat_amount: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="3" className="w-full px-4 py-2 border rounded-lg" placeholder="Additional notes..." />
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => { setShowModal(false); setSupplierSearch(''); }} className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Save Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between mb-6"><h2 className="text-xl font-bold">Pay PO - {selectedOrder.po_number}</h2><button onClick={() => setShowPayModal(false)}><X className="w-6 h-6" /></button></div>
            <p className="text-gray-600 mb-2">Remaining: {formatCurrency((selectedOrder.total||0)-(selectedOrder.paid_amount||0))}</p>
            <form onSubmit={handlePay} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Amount (blank = full)</label><input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowPayModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg">Cancel</button><button type="submit" className="flex-1 py-2 bg-green-600 text-white rounded-lg">Pay</button></div>
            </form>
          </div>
        </div>
      )}

      {showReceiveModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between mb-6"><h2 className="text-xl font-bold">Receive Items - {selectedOrder.po_number}</h2><button onClick={() => setShowReceiveModal(false)}><X className="w-6 h-6" /></button></div>
            <p className="text-gray-600 mb-4">This will add all items to inventory and update stock.</p>
            <form onSubmit={handleReceive} className="space-y-4">
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowReceiveModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg">Cancel</button><button type="submit" className="flex-1 py-2 bg-orange-600 text-white rounded-lg">Receive All</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
