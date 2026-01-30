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
    add_expiry_date: false,
    expiry_date: '',
    add_barcode: false,
    barcode: '',
    stock_tracking_enabled: false,
    stock_quantity: '0',
    purchase_rate: '',
    add_stock_quantity: false,
    has_weight: false,
    weight_unit: 'gram',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      setForm({
        name: editingProduct.name,
        price: String(editingProduct.price),
        category_id: editingProduct.category_id || '',
        add_expiry_date: !!editingProduct.expiry_date,
        expiry_date: editingProduct.expiry_date ? String(editingProduct.expiry_date).slice(0, 10) : '',
        add_barcode: !!editingProduct.barcode,
        barcode: editingProduct.barcode || '',
        stock_tracking_enabled: editingProduct.stock_tracking_enabled === 1 || editingProduct.stock_tracking_enabled === true,
        stock_quantity: String(editingProduct.stock_quantity || 0),
        purchase_rate: editingProduct.purchase_rate ? String(editingProduct.purchase_rate) : '',
        add_stock_quantity: editingProduct.stock_tracking_enabled === 1 || editingProduct.stock_tracking_enabled === true,
        has_weight: editingProduct.has_weight === 1 || editingProduct.has_weight === true,
        weight_unit: editingProduct.weight_unit === 'kg' ? 'kg' : 'gram',
      });
    } else {
      setForm({
        name: '',
        price: '',
        category_id: initialCategoryId || '',
        add_expiry_date: false,
        expiry_date: '',
        add_barcode: false,
        barcode: '',
        stock_tracking_enabled: false,
        stock_quantity: '0',
        purchase_rate: '',
        add_stock_quantity: false,
        has_weight: false,
        weight_unit: 'gram',
      });
    }
  }, [open, editingProduct, initialCategoryId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate name
    const trimmedName = form.name?.trim();
    if (!trimmedName) {
      toast.error(t('inventory.nameRequired') || 'Product name is required');
      return;
    }
    
    // Validate price
    const trimmedPrice = form.price?.toString().trim();
    if (!trimmedPrice || trimmedPrice === '') {
      toast.error(t('inventory.priceRequired') || 'Product price is required');
      return;
    }
    
    const price = parseFloat(trimmedPrice);
    if (isNaN(price) || price < 0) {
      toast.error(t('inventory.priceRequired') || 'Product price must be a valid number greater than or equal to 0');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', trimmedName);
      formData.append('price', String(price));
      formData.append('category_id', form.category_id || '');
      formData.append(
        'expiry_date',
        form.add_expiry_date && form.expiry_date ? form.expiry_date : ''
      );
      formData.append(
        'barcode',
        form.add_barcode && form.barcode ? form.barcode : ''
      );
      formData.append('stock_tracking_enabled', form.add_stock_quantity ? 'true' : 'false');
      formData.append('stock_quantity', form.add_stock_quantity ? String(form.stock_quantity || 0) : '0');
      formData.append('purchase_rate', form.purchase_rate ? String(form.purchase_rate) : '');
      formData.append('has_weight', form.has_weight ? 'true' : 'false');
      formData.append('weight_unit', form.has_weight ? form.weight_unit : '');

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
        add_expiry_date: false,
        expiry_date: '',
        add_barcode: false,
        barcode: '',
        stock_tracking_enabled: false,
        stock_quantity: '0',
        purchase_rate: '',
        add_stock_quantity: false,
        has_weight: false,
        weight_unit: 'gram',
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
      add_expiry_date: false,
      expiry_date: '',
      add_barcode: false,
      barcode: '',
      stock_tracking_enabled: false,
      stock_quantity: '0',
      purchase_rate: '',
      add_stock_quantity: false,
      has_weight: false,
      weight_unit: 'gram',
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
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
              {form.add_barcode ? (
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) => handleChange('barcode', e.target.value)}
                  placeholder="Enter barcode"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400">
                  Barcode disabled
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {form.has_weight ? (t('inventory.pricePerKg') || 'Price (per kg) *') : `${t('inventory.productPrice')} *`}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={form.has_weight}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      has_weight: checked,
                      ...(checked ? {} : { weight_unit: 'gram' }),
                    }));
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">{t('inventory.hasWeight') || 'Product has weight'}</span>
              </label>
              {form.has_weight ? (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('inventory.weightUnit') || 'Quantity unit in cart'}</label>
                  <select
                    value={form.weight_unit}
                    onChange={(e) => handleChange('weight_unit', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="gram">Gram (e.g. 100, 200)</option>
                    <option value="kg">Kilogram (e.g. 1, 2, 1.5)</option>
                  </select>
                </div>
              ) : (
                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm">
                  {t('inventory.noWeight') || 'Sold by piece'}
                </div>
              )}
            </div>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={form.add_stock_quantity}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      add_stock_quantity: checked,
                      stock_tracking_enabled: checked,
                      ...(checked ? {} : { stock_quantity: '0' }),
                    }));
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Add Stock Quantity</span>
              </label>
              {form.add_stock_quantity ? (
                <div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required={form.add_stock_quantity}
                    value={form.stock_quantity}
                    onChange={(e) => handleChange('stock_quantity', e.target.value)}
                    placeholder="Enter initial stock quantity"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  {form.stock_quantity === '0' || form.stock_quantity === 0 ? (
                    <p className="text-xs text-red-600 mt-1">Stock quantity is zero</p>
                  ) : null}
                </div>
              ) : (
                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400">
                  Stock quantity disabled
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
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
              {form.add_expiry_date ? (
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => handleChange('expiry_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400">
                  Expiry date disabled
                </div>
              )}
            </div>
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
