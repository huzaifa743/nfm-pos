import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { getReceiptPrintStyles } from '../utils/receiptPrintStyles';
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  X,
  UserPlus,
  Tag,
  FileText,
  Receipt,
} from 'lucide-react';
import CheckoutModal from '../components/CheckoutModal';
import CustomerModal from '../components/CustomerModal';
import ReceiptPrint from '../components/ReceiptPrint';
import DiscountModal from '../components/DiscountModal';
import VATModal from '../components/VATModal';

export default function Billing() {
  const { t } = useTranslation();
  const { settings, formatCurrency } = useSettings();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showVATModal, setShowVATModal] = useState(false);
  const [orderType, setOrderType] = useState('dine-in');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed');
  // Initialize VAT from settings and persist across sales
  const [vatPercentage, setVatPercentage] = useState(() => {
    return settings.vat_percentage ? parseFloat(settings.vat_percentage) : 0;
  });
  const [noVat, setNoVat] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchTerm]);

  // Initialize VAT from settings when settings are loaded
  useEffect(() => {
    if (settings.vat_percentage && parseFloat(settings.vat_percentage) > 0 && vatPercentage === 0 && !noVat) {
      setVatPercentage(parseFloat(settings.vat_percentage));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.vat_percentage]);

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

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.product_id === product.id);

    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      setCart([
        ...cart,
        {
          id: Date.now(),
          product_id: product.id,
          product_name: product.name,
          product_image: product.image,
          category_name: product.category_name,
          unit_price: parseFloat(product.price),
          quantity: 1,
          total_price: parseFloat(product.price),
        },
      ]);
      toast.success('Product added to cart');
    }
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setCart(
      cart.map((item) => {
        if (item.id === id) {
          const newTotal = item.unit_price * quantity;
          return { ...item, quantity, total_price: newTotal };
        }
        return item;
      })
    );
  };

  const updatePrice = (id, price) => {
    setCart(
      cart.map((item) => {
        if (item.id === id) {
          const newTotal = price * item.quantity;
          return { ...item, unit_price: price, total_price: newTotal };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
    toast.success('Product removed from cart');
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
    const discount =
      discountType === 'percentage'
        ? (subtotal * discountAmount) / 100
        : discountAmount;
    const afterDiscount = subtotal - discount;
    const vat = noVat ? 0 : (afterDiscount * vatPercentage) / 100;
    const total = afterDiscount + vat;

    return { subtotal, discount, vat, total };
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setShowCheckoutModal(true);
  };

  const handlePayment = async (paymentData) => {
    try {
      const { subtotal, discount, vat, total } = calculateTotals();

      const saleData = {
        customer_id: selectedCustomer?.id || null,
        items: cart.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        subtotal,
        discount_amount: discount,
        discount_type: discountType,
        vat_percentage: noVat ? 0 : vatPercentage,
        vat_amount: vat,
        total,
        payment_method: paymentData.method,
        payment_amount: paymentData.amount,
        change_amount: paymentData.change || 0,
        order_type: paymentData.orderType || orderType,
      };
      
      // Update orderType state if changed in modal
      if (paymentData.orderType) {
        setOrderType(paymentData.orderType);
      }

      const response = await api.post('/sales', saleData);
      setCompletedSale(response.data);
      setShowCheckoutModal(false);
      setShowReceipt(true);
      setCart([]);
      setSelectedCustomer(null);
      setDiscountAmount(0);
      // VAT persists - don't reset it
      // setVatPercentage(0);
      // setNoVat(false);
      toast.success('Sale completed successfully');
      
      // Auto print if enabled
      if (settings.receipt_auto_print === 'true') {
        setTimeout(() => {
          handlePrintReceipt();
        }, 500);
      }
    } catch (error) {
      console.error('Error completing sale:', error);
      toast.error('Failed to complete sale');
    }
  };

  const handlePrintReceipt = () => {
    if (!completedSale) return;
    
    const paperSize = settings.receipt_paper_size || '80mm';
    const receiptContent = document.getElementById('receipt-content');
    if (!receiptContent) return;
    
    // Create a hidden iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);
    
    const printDoc = printFrame.contentDocument || printFrame.contentWindow.document;
    printDoc.open();
    printDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt</title>
          <style>
            ${getReceiptPrintStyles(paperSize)}
          </style>
        </head>
        <body>
          ${receiptContent.innerHTML}
        </body>
      </html>
    `);
    printDoc.close();
    
    printFrame.contentWindow.focus();
    setTimeout(() => {
      printFrame.contentWindow.print();
      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 100);
    }, 250);
  };

  const { subtotal, discount, vat, total } = calculateTotals();

  return (
    <div className="flex h-full gap-6">
      {/* Cart Section - Left Side */}
      <div className="w-96 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t('billing.cart')}
            </h2>
            {/* Select Customer Button - In cart row */}
            <button
              onClick={() => setShowCustomerModal(true)}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              {selectedCustomer
                ? selectedCustomer.name.length > 10 
                  ? selectedCustomer.name.substring(0, 10) + '...'
                  : selectedCustomer.name
                : t('billing.selectCustomer')}
            </button>
          </div>

        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {t('billing.emptyCart')}
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-start gap-3 mb-2">
                    {item.product_image && (
                      <img
                        src={`http://localhost:5000${item.product_image}`}
                        alt={item.product_name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-gray-500">{item.category_name}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty input for continuous typing
                          if (value === '' || value === '.') {
                            updatePrice(item.id, 0);
                            return;
                          }
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue) && numValue >= 0) {
                            updatePrice(item.id, numValue);
                          }
                        }}
                        onBlur={(e) => {
                          // Ensure value is set on blur if empty
                          const value = parseFloat(e.target.value) || 0;
                          updatePrice(item.id, value);
                        }}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                      <span className="font-semibold text-gray-800 min-w-[60px] text-right">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('billing.subtotal')}:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('billing.discount')}:</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(discount)}
                </span>
              </div>
            )}
            {vat > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('billing.vat')}:</span>
                <span className="font-medium">{formatCurrency(vat)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
              <span>{t('billing.total')}:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Discount and VAT Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDiscountModal(true)}
                className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold flex items-center justify-center gap-2 text-sm"
              >
                <Tag className="w-4 h-4" />
                {discountAmount > 0 
                  ? `Discount: ${formatCurrency(discount)}`
                  : 'Add Discount'
                }
              </button>
              <button
                onClick={() => setShowVATModal(true)}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                {noVat 
                  ? 'No VAT'
                  : vatPercentage > 0 
                    ? `${vatPercentage}% VAT`
                    : 'Add VAT'
                }
              </button>
            </div>

            {/* Checkout and Receipt Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCheckout}
                className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                {t('billing.checkout')}
              </button>
              <button
                onClick={() => setShowReceipt(true)}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Receipt className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Products Section - Right Side */}
      <div className="flex-1 bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            {/* Category Selection - Left Side, Bigger */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white text-sm font-medium min-w-[200px]"
            >
              <option value="all">{t('billing.allCategories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            
            {/* Search Product - Right Side */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('billing.searchProduct')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((product) => {
                const cartItem = cart.find((item) => item.product_id === product.id);
                return (
                  <div
                    key={product.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => addToCart(product)}
                  >
                    <div className="w-full h-32 bg-gray-200 rounded mb-3 flex items-center justify-center overflow-hidden">
                      {product.image ? (
                        <img
                          src={`http://localhost:5000${product.image}`}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <span className="text-gray-400 text-xs">No Image</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-800 text-sm mb-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {product.category_name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary-600">
                        {formatCurrency(product.price)}
                      </span>
                      {cartItem ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(cartItem.id, cartItem.quantity - 1);
                            }}
                            className="w-6 h-6 bg-primary-600 text-white rounded flex items-center justify-center text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center">
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(cartItem.id, cartItem.quantity + 1);
                            }}
                            className="w-6 h-6 bg-primary-600 text-white rounded flex items-center justify-center text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button className="w-6 h-6 bg-primary-600 text-white rounded flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No products found
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCustomerModal && (
        <CustomerModal
          onClose={() => setShowCustomerModal(false)}
          onSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerModal(false);
          }}
        />
      )}

      {showCheckoutModal && (
        <CheckoutModal
          total={total}
          orderType={orderType}
          onClose={() => setShowCheckoutModal(false)}
          onConfirm={handlePayment}
        />
      )}

      {showReceipt && completedSale && (
        <ReceiptPrint
          sale={completedSale}
          onClose={() => {
            setShowReceipt(false);
            setCompletedSale(null);
          }}
          onPrint={handlePrintReceipt}
        />
      )}

      {showDiscountModal && (
        <DiscountModal
          subtotal={subtotal}
          currentDiscount={discountAmount}
          currentDiscountType={discountType}
          onClose={() => setShowDiscountModal(false)}
          onApply={(discountData) => {
            // Store the value (percentage or fixed amount), not the calculated amount
            setDiscountAmount(discountData.value);
            setDiscountType(discountData.type);
            setShowDiscountModal(false);
            toast.success('Discount applied successfully');
          }}
        />
      )}

      {showVATModal && (
        <VATModal
          subtotal={subtotal}
          discount={discount}
          currentVAT={vatPercentage}
          noVAT={noVat}
          onClose={() => setShowVATModal(false)}
          onApply={(vatData) => {
            setVatPercentage(vatData.percentage);
            setNoVat(vatData.noVat);
            setShowVATModal(false);
            toast.success(vatData.noVat ? 'VAT removed' : 'VAT applied successfully');
          }}
        />
      )}
    </div>
  );
}
