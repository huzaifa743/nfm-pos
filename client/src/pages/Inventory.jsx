import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, X, Folder, FileDown, FileUp, FileText, Trash } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ProductModal from '../components/ProductModal';

export default function Inventory() {
  const { t } = useTranslation();
  const { formatCurrency } = useSettings();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchTerm]);

  const fetchProducts = async () => {
    try {
      const params = {};
      if (selectedCategory !== 'all') params.category_id = selectedCategory;
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/products', { params });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();

    if (!categoryForm.name) {
      toast.error('Category name is required');
      return;
    }

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, categoryForm);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', categoryForm);
        toast.success('Category added successfully');
      }
      setCategoryForm({ name: '', description: '' });
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.error || 'Failed to save category');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(error.response?.data?.error || 'Failed to delete product');
    }
  };

  const handleClearAllInventory = async () => {
    if (!window.confirm('Are you sure you want to delete ALL products from inventory? This cannot be undone.')) {
      return;
    }

    try {
      await api.delete('/products/all');
      toast.success('All inventory cleared successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error clearing inventory:', error);
      toast.error(error.response?.data?.error || 'Failed to clear inventory');
    }
  };

  const normalizeHeader = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');

  const headerMap = {
    name: 'name',
    productname: 'name',
    category: 'category_name',
    categoryname: 'category_name',
    price: 'price',
    productprice: 'price',
    saleprice: 'price',
    sale_price: 'price',
    description: 'description',
    barcode: 'barcode',
    stocktracking: 'stock_tracking_enabled',
    stocktrackingenabled: 'stock_tracking_enabled',
    stockqty: 'stock_quantity',
    stockquantity: 'stock_quantity',
    expirydate: 'expiry_date',
    purchaserate: 'purchase_rate',
    hasweight: 'has_weight',
    weightunit: 'weight_unit',
    vat: 'vat_percentage',
    vatpercentage: 'vat_percentage',
    baseunit: 'product_base_unit',
    productbaseunit: 'product_base_unit',
    purchaseunit: 'product_purchase_unit',
    productpurchaseunit: 'product_purchase_unit',
    saleunit: 'product_sale_unit',
    productsaleunit: 'product_sale_unit',
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
      'Name',
      'Category',
      'Sale Price',
      'Description',
      'Barcode',
      'Stock Tracking',
      'Stock Qty',
      'Expiry Date (YYYY-MM-DD)',
      'Purchase Rate',
      'Has Weight',
      'Weight Unit',
      'VAT %',
      'Base Unit',
      'Purchase Unit',
      'Sale Unit',
    ]];
    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'inventory-import-template.xlsx');
  };

  const handleExportExcel = () => {
    const headers = [
      'Name',
      'Category',
      'Sale Price',
      'Description',
      'Barcode',
      'Stock Tracking',
      'Stock Qty',
      'Expiry Date',
      'Purchase Rate',
      'Has Weight',
      'Weight Unit',
      'VAT %',
      'Base Unit',
      'Purchase Unit',
      'Sale Unit',
    ];

    const rows = products.map((product) => [
      product.name || '',
      product.category_name || '',
      product.price != null ? Number(product.price) : '',
      product.description || '',
      product.barcode || '',
      product.stock_tracking_enabled === 1 || product.stock_tracking_enabled === true ? 'Yes' : 'No',
      product.stock_tracking_enabled === 1 || product.stock_tracking_enabled === true ? (product.stock_quantity || 0) : 0,
      product.expiry_date || '',
      product.purchase_rate != null ? Number(product.purchase_rate) : '',
      product.has_weight === 1 || product.has_weight === true ? 'Yes' : 'No',
      product.has_weight === 1 || product.has_weight === true ? (product.weight_unit || '') : '',
      product.vat_percentage != null ? Number(product.vat_percentage) : 0,
      product.product_base_unit || '',
      product.product_purchase_unit || '',
      product.product_sale_unit || '',
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    XLSX.writeFile(workbook, 'inventory-export.xlsx');
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    doc.text(t('inventory.title'), 40, 40);

    const headers = [[
      'Name',
      'Category',
      'Price',
      'Stock Qty',
      'Barcode',
      'VAT %',
    ]];

    const rows = products.map((product) => [
      product.name || '',
      product.category_name || '',
      product.price != null ? formatCurrency(product.price) : '',
      product.stock_tracking_enabled === 1 || product.stock_tracking_enabled === true ? (product.stock_quantity || 0) : '',
      product.barcode || '',
      product.vat_percentage != null ? Number(product.vat_percentage) : 0,
    ]);

    autoTable(doc, {
      startY: 60,
      head: headers,
      body: rows,
      styles: { fontSize: 9 },
    });

    doc.save('inventory-export.pdf');
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
        toast.error(t('inventory.importEmpty'));
        return;
      }

      const rows = rawRows
        .map(mapRowToPayload)
        .filter((row) => Object.keys(row).length > 0);

      if (!rows.length) {
        toast.error(t('inventory.importNoColumns'));
        return;
      }

      const response = await api.post('/products/import', { rows });
      if (response.data?.errors?.length) {
        toast.error(t('inventory.importPartial'));
      } else {
        toast.success(t('inventory.importSuccess'));
      }
      fetchProducts();
    } catch (error) {
      console.error('Error importing inventory:', error);
      toast.error(error.response?.data?.error || t('inventory.importFailed'));
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">{t('inventory.title')}</h1>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <Folder className="w-5 h-5" />
            {t('inventory.manageCategories')}
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <FileDown className="w-5 h-5" />
            {t('inventory.exportExcel')}
          </button>
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <FileText className="w-5 h-5" />
            {t('inventory.exportPdf')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FileUp className="w-5 h-5" />
            {t('inventory.importExcel')}
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2"
          >
            <FileDown className="w-5 h-5" />
            {t('inventory.downloadTemplate')}
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={handleClearAllInventory}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Trash className="w-5 h-5" />
              {t('inventory.clearAllInventory')}
            </button>
          )}
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowProductModal(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('inventory.addProduct')}
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

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('inventory.searchProduct')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">{t('billing.allCategories')}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

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
                    {t('inventory.productName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Tracking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('inventory.productPrice')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    VAT %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Has Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Base Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sale Unit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-sm text-gray-500">
                          {product.description.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category_name || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.barcode ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                          {product.barcode}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {product.stock_tracking_enabled === 1 || product.stock_tracking_enabled === true ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Enabled
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {product.stock_tracking_enabled === 1 || product.stock_tracking_enabled === true ? (
                        <span className={`font-medium ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.stock_quantity > 0 ? product.stock_quantity : 'Stock Qty Zero'}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.expiry_date ? new Date(product.expiry_date + 'T12:00:00').toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(product.price)}
                      {(product.vat_percentage && parseFloat(product.vat_percentage) > 0) && (
                        <span className="block text-xs text-blue-600">
                          → {formatCurrency(product.price * (1 + parseFloat(product.vat_percentage) / 100))} incl.
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.vat_percentage && parseFloat(product.vat_percentage) > 0 ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{product.vat_percentage}%</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {product.purchase_rate ? (
                        <span>{formatCurrency(product.purchase_rate)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {product.has_weight === 1 || product.has_weight === true ? (
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.has_weight === 1 || product.has_weight === true ? (
                        product.weight_unit === 'kg' ? 'kg' : 'gram'
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.product_base_unit ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {product.product_base_unit}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.product_purchase_unit ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          {product.product_purchase_unit}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.product_sale_unit ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                          {product.product_sale_unit}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProductModal
        open={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        categories={categories}
        editingProduct={editingProduct}
        initialCategoryId={selectedCategory !== 'all' ? selectedCategory : undefined}
        onSuccess={() => fetchProducts()}
      />

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {t('inventory.manageCategories')}
              </h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: '', description: '' });
                  setTimeout(() => {
                    document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add New Category
              </button>
            </div>

            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No categories found</p>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{category.name}</p>
                      {category.description && (
                        <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryForm({ name: category.name, description: category.description || '' });
                          // Scroll to form
                          setTimeout(() => {
                            document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                        className="text-primary-600 hover:text-primary-800"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
                            try {
                              await api.delete(`/categories/${category.id}`);
                              toast.success('Category deleted successfully');
                              fetchCategories();
                            } catch (error) {
                              console.error('Error deleting category:', error);
                              toast.error(error.response?.data?.error || 'Failed to delete category');
                            }
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
