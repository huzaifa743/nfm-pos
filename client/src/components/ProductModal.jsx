import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/api';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

export default function ProductModal({
  open,
  onClose,
  categories = [],
  editingProduct = null,
  onSuccess,
  submitLabel,
  initialCategoryId,
  suppressToast = false,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    price: '',
    category_id: '',
    description: '',
    add_expiry_date: false,
    expiry_date: '',
    add_barcode: false,
    barcode: '',
    stock_tracking_enabled: false,
    stock_quantity: '0',
    purchase_rate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      setForm({
        name: editingProduct.name,
        price: String(editingProduct.price),
        category_id: editingProduct.category_id || '',
        description: editingProduct.description || '',
        add_expiry_date: !!editingProduct.expiry_date,
        expiry_date: editingProduct.expiry_date ? String(editingProduct.expiry_date).slice(0, 10) : '',
        add_barcode: !!editingProduct.barcode,
        barcode: editingProduct.barcode || '',
        stock_tracking_enabled: editingProduct.stock_tracking_enabled === 1 || editingProduct.stock_tracking_enabled === true,
        stock_quantity: String(editingProduct.stock_quantity || 0),
        purchase_rate: editingProduct.purchase_rate ? String(editingProduct.purchase_rate) : '',
      });
    } else {
      setForm({
        name: '',
        price: '',
        category_id: initialCategoryId || '',
        description: '',
        add_expiry_date: false,
        expiry_date: '',
        add_barcode: false,
        barcode: '',
        stock_tracking_enabled: false,
        stock_quantity: '0',
        purchase_rate: '',
      });
    }
  }, [open, editingProduct, initialCategoryId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.price) {
      toast.error(t('inventory.nameRequired') + ' and ' + t('inventory.priceRequired'));
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      toast.error(t('inventory.priceRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('price', String(price));
      formData.append('category_id', form.category_id || '');
      formData.append('description', form.description || '');
      formData.append(
        'expiry_date',
        form.add_expiry_date && form.expiry_date ? form.expiry_date : ''
      );
      formData.append(
        'barcode',
        form.add_barcode && form.barcode ? form.barcode : ''
      );
      formData.append('stock_tracking_enabled', form.stock_tracking_enabled ? 'true' : 'false');
      formData.append('stock_quantity', form.stock_tracking_enabled ? String(form.stock_quantity || 0) : '0');
      formData.append('purchase_rate', form.purchase_rate ? String(form.purchase_rate) : '');

      let product;
      if (editingProduct) {
        const res = await api.put(`/products/${editingProduct.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        product = res.data;
        if (!suppressToast) toast.success('Product updated successfully');
      } else {
        const res = await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        product = res.data;
        if (!suppressToast) toast.success('Product added successfully');
      }
      onSuccess?.(product);
      onClose();
      setForm({
        name: '',
        price: '',
        category_id: '',
        description: '',
        add_expiry_date: false,
        expiry_date: '',
        add_barcode: false,
        barcode: '',
        stock_tracking_enabled: false,
        stock_quantity: '0',
        purchase_rate: '',
      });
    } catch (err) {
      console.error('Product save error:', err);
      toast.error(err.response?.data?.error || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setForm({
      name: '',
      price: '',
      category_id: '',
      description: '',
      image: null,
      add_expiry_date: false,
      expiry_date: '',
      add_barcode: false,
      barcode: '',
      stock_tracking_enabled: false,
      stock_quantity: '0',
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {editingProduct ? t('inventory.editProduct') : t('inventory.addProduct')}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('inventory.productName')} *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('inventory.productPrice')} *
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('inventory.category')}
              </label>
              <select
                value={form.category_id}
                onChange={(e) => handleChange('category_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Rate (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.purchase_rate}
              onChange={(e) => handleChange('purchase_rate', e.target.value)}
              placeholder="Enter purchase/cost price"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Cost price of the product. Used for profit calculations in reports.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('inventory.description')}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.add_expiry_date}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((prev) => ({
                    ...prev,
                    add_expiry_date: checked,
                    ...(checked ? {} : { expiry_date: '' }),
                  }));
                }}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Add Expiry Date</span>
            </label>
            {form.add_expiry_date && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => handleChange('expiry_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.add_barcode}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((prev) => ({
                    ...prev,
                    add_barcode: checked,
                    ...(checked ? {} : { barcode: '' }),
                  }));
                }}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Add Barcode</span>
            </label>
            {form.add_barcode && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Barcode (Optional)</label>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) => handleChange('barcode', e.target.value)}
                  placeholder="Enter barcode"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.stock_tracking_enabled}
                onChange={(e) => handleChange('stock_tracking_enabled', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable Stock Tracking (Optional)</span>
            </label>
            {form.stock_tracking_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Initial Stock Quantity *</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required={form.stock_tracking_enabled}
                  value={form.stock_quantity}
                  onChange={(e) => handleChange('stock_quantity', e.target.value)}
                  placeholder="Enter initial stock quantity"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Stock will be automatically deducted when this product is sold.
                </p>
              </div>
            )}
            {!form.stock_tracking_enabled && (
              <p className="text-xs text-gray-500 ml-6">
                When enabled, stock quantity will be automatically deducted when this product is sold.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {submitLabel || (editingProduct ? t('common.save') : t('inventory.addProduct'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
