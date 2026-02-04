import {
  useState,
  useEffect
} from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { getImageURL } from '../utils/api';
import api from '../api/api';
import toast from 'react-hot-toast';
import { getReceiptPrintStyles } from '../utils/receiptPrintStyles';
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  UserPlus,
  Tag,
  Receipt,
  Save,
  Eye,
  CreditCard,
} from 'lucide-react';
import CheckoutModal from '../components/CheckoutModal';
import CustomerModal from '../components/CustomerModal';
import ReceiptPrint from '../components/ReceiptPrint';
import DiscountModal from '../components/DiscountModal';
import ProductModal from '../components/ProductModal';
import HoldSalesModal from '../components/HoldSalesModal';
import SplitPaymentModal from '../components/SplitPaymentModal';

export default function Billing() {
  const { t } = useTranslation();
  const { settings, formatCurrency } = useSettings();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed');

  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showHoldSalesModal, setShowHoldSalesModal] = useState(false);
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Safety: whenever a sale is completed, make sure cart and related state are cleared
  useEffect(() => {
    if (completedSale) {
      setCart([]);
      setSelectedCustomer(null);
      setDiscountAmount(0);
      setDiscountType('fixed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedSale]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchTerm]);

  // Re-apply VAT when items are added/removed or when discount changes
  useEffect(() => {
    const newCart = cart.map((item) => {
      const base = item.unit_price * item.quantity;
      const vatPct = item.vat_percentage || 0;
      const itemVat = base * (vatPct / 100);
      const newTotal = base + itemVat;
      return { ...item, vat_amount: itemVat, total_price: newTotal };
    });

    if (JSON.stringify(newCart) !== JSON.stringify(cart)) {
      setCart(newCart);
    }
  }, [cart, setCart]);


  const fetchProducts = async () => {
    try {
      const params = {};
      if (selectedCategory !== 'all') params.category_id = selectedCategory;
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/products', { params });
      setProducts(response.data);

      // Update cart items with latest stock information.
      // Use functional update to avoid using a stale `cart` snapshot,
      // so if the cart was cleared after a completed sale it stays empty.
      setCart((prevCart) => {
        if (prevCart.length === 0) return prevCart;

        return prevCart.map((cartItem) => {
          const product = response.data.find((p) => p.id === cartItem.product_id);
          if (product) {
            const vatPct = parseFloat(product.vat_percentage) || 0;
            const lineBase = cartItem.unit_price * cartItem.quantity;
            const lineVat = lineBase * (vatPct / 100);
            return {
              ...cartItem,
              stock_tracking_enabled: product.stock_tracking_enabled || 0,
              stock_quantity:
                product.stock_quantity !== null && product.stock_quantity !== undefined
                  ? product.stock_quantity
                  : null,
              has_weight: product.has_weight === 1 || product.has_weight === true ? 1 : 0,
              weight_unit: product.weight_unit || 'gram',
              vat_percentage: vatPct,
              vat_amount: lineVat,
              total_price: lineBase + lineVat,
            };
          }
          return cartItem;
        });
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      console.error('Error fetching products:', errorMessage, error);
      if (error.response?.status !== 403) {
        toast.error('Failed to load products');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      console.error('Error fetching categories:', errorMessage, error);
    }
  };

  const addToCart = (product, silent = false) => {
    // Check if product has stock tracking enabled and if stock is available
    if (product.stock_tracking_enabled === 1 && product.stock_quantity !== null && product.stock_quantity <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    const existingItem = cart.find((item) => item.product_id === product.id);

    if (existingItem) {
      // Check stock before increasing quantity
      if (product.stock_tracking_enabled === 1 && product.stock_quantity !== null) {
        const currentCartQty = cart.reduce((sum, item) => {
          if (item.product_id === product.id) return sum + item.quantity;
          return sum;
        }, 0);
        if (currentCartQty >= product.stock_quantity) {
          toast.error(`Only ${product.stock_quantity} units available in stock`);
          return;
        }
      }
      const hasWeight = product.has_weight === 1 || product.has_weight === true;
      const increment = hasWeight ? 0.1 : 1; // 100g for weighted
      updateQuantity(existingItem.id, parseFloat((existingItem.quantity + increment).toFixed(4)));
    } else {
      const hasWeight = product.has_weight === 1 || product.has_weight === true;
      const initialQty = hasWeight ? 0.1 : 1; // 100g default for weighted products
      const unitPrice = parseFloat(product.price);
      const vatPct = parseFloat(product.vat_percentage) || 0;
      const lineBase = unitPrice * initialQty;
      const lineVat = lineBase * (vatPct / 100);
      const lineTotal = lineBase + lineVat;
      setCart([
        ...cart,
        {
          id: Date.now(),
          product_id: product.id,
          product_name: product.name,
          product_image: product.image,
          category_name: product.category_name || '',
          unit_price: unitPrice,
          quantity: initialQty,
          vat_percentage: vatPct,
          vat_amount: lineVat,
          total_price: parseFloat(lineTotal.toFixed(2)),
          stock_tracking_enabled: product.stock_tracking_enabled || 0,
          stock_quantity: product.stock_quantity || null,
          has_weight: hasWeight ? 1 : 0,
          weight_unit: product.weight_unit || 'gram',
        },
      ]);
      if (!silent) toast.success('Product added to cart');
    }
  };

  const handleBarcodeScan = async (barcode) => {
    if (!barcode || !barcode.trim()) return;

    try {
      const response = await api.get('/products', { params: { barcode: barcode.trim() } });
      
      if (response.data && response.data.length > 0) {
        const product = response.data[0];
        addToCart(product, false);
        setBarcodeInput(''); // Clear barcode input after successful scan
        toast.success(`${product.name} added to cart`);
      } else {
        toast.error('Product not found with this barcode');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      toast.error('Failed to scan barcode');
    }
  };

  const handleBarcodeInputChange = (e) => {
    const value = e.target.value;
    setBarcodeInput(value);
    
    // Auto-trigger search when Enter is pressed or barcode is complete (assuming barcode scanners send Enter)
    if (e.nativeEvent.inputType === 'insertLineBreak' || (value.length > 8 && value.includes('\n'))) {
      const barcode = value.trim().replace(/\n/g, '');
      if (barcode) {
        handleBarcodeScan(barcode);
      }
    }
  };

  const handleBarcodeKeyPress = (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      e.preventDefault();
      handleBarcodeScan(barcodeInput);
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
          // Check stock availability if stock tracking is enabled
          if (item.stock_tracking_enabled === 1 && item.stock_quantity !== null && item.stock_quantity !== undefined) {
            // Calculate total quantity of this product in cart (excluding current item)
            const otherItemsQty = cart
              .filter(cartItem => cartItem.product_id === item.product_id && cartItem.id !== id)
              .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
            
            const requestedTotalQty = otherItemsQty + quantity;
            if (requestedTotalQty > item.stock_quantity) {
              toast.error(`Only ${item.stock_quantity} units available in stock`);
              return item; // Return unchanged item
            }
          }
          
          const vatPct = item.vat_percentage || 0;
          const lineBase = item.unit_price * quantity;
          const lineVat = lineBase * (vatPct / 100);
          const newTotal = parseFloat((lineBase + lineVat).toFixed(2));
          return { ...item, quantity: parseFloat(quantity.toFixed(2)), vat_amount: lineVat, total_price: newTotal };
        }
        return item;
      })
    );
  };

  const updatePrice = (id, price) => {
    setCart(
      cart.map((item) => {
        if (item.id === id) {
          const vatPct = item.vat_percentage || 0;
          const lineBase = price * item.quantity;
          const lineVat = lineBase * (vatPct / 100);
          const newTotal = parseFloat((lineBase + lineVat).toFixed(2));
          return { ...item, unit_price: price, vat_amount: lineVat, total_price: newTotal };
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
    const totalVat = cart.reduce((sum, item) => sum + (item.vat_amount || 0), 0);
    const discount =
      discountType === 'percentage'
        ? (subtotal * discountAmount) / 100
        : discountAmount;
    const total = subtotal - discount;

    return { subtotal, discount, vat: totalVat, total };
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setShowCheckoutModal(true);
  };

  const handleHoldSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      const { subtotal, discount, vat, total } = calculateTotals();
      const notes = window.prompt('Add a note for this held sale (optional):') || null;

      const holdData = {
        customer_id: selectedCustomer?.id || null,
        cart_data: cart,
        subtotal: cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
        discount_amount: discount,
        discount_type: discountType,
        vat_percentage: 0,
        vat_amount: vat,
        total,
        notes
      };

      await api.post('/held-sales', holdData);
      toast.success('Sale held successfully');
      // Clear cart and reset all related state
      setCart([]);
      setSelectedCustomer(null);
      setDiscountAmount(0);
      setDiscountType('fixed');
    } catch (error) {
      console.error('Error holding sale:', error);
      toast.error(error.response?.data?.error || 'Failed to hold sale');
    }
  };

  const handleSelectHold = async (cartData, heldSale) => {
    try {
      // Ensure cart items have vat_percentage and vat_amount (for legacy held sales)
      const normalizedCart = cartData.map((item) => ({
        ...item,
        vat_percentage: item.vat_percentage ?? 0,
        vat_amount: item.vat_amount ?? (item.unit_price * item.quantity * ((item.vat_percentage ?? 0) / 100)),
      }));
      setCart(normalizedCart);
      if (heldSale.customer_id) {
        setSelectedCustomer({ id: heldSale.customer_id, name: heldSale.customer_name });
      }
      setDiscountAmount(heldSale.discount_amount || 0);
      setDiscountType(heldSale.discount_type || 'fixed');
      
      // Delete the held sale after retrieving it
      await api.delete(`/held-sales/${heldSale.id}`);
      toast.success('Held sale loaded and removed from list');
    } catch (error) {
      console.error('Error loading held sale:', error);
      toast.error('Failed to load held sale');
    }
  };

  const handleSplitPayment = async (paymentData) => {
    try {
      if (cart.length === 0) {
        toast.error('Cart is empty');
        return;
      }

      const { subtotal, discount, vat, total } = calculateTotals();

      // Validate stock before proceeding
      for (const item of cart) {
        if (item.stock_tracking_enabled === 1 && item.stock_quantity !== null && item.stock_quantity !== undefined) {
          if (item.quantity > item.stock_quantity) {
            toast.error(`${item.product_name} is out of stock. Available: ${item.stock_quantity}`);
            return;
          }
        }
      }
      
      // Final stock validation - fetch latest stock from server
      for (const item of cart) {
        try {
          const productResponse = await api.get(`/products/${item.product_id}`);
          const product = productResponse.data;
          if (product.stock_tracking_enabled === 1 && product.stock_quantity !== null && product.stock_quantity !== undefined) {
            if (item.quantity > product.stock_quantity) {
              toast.error(`${item.product_name} is out of stock. Available: ${product.stock_quantity}`);
              return;
            }
          }
        } catch (error) {
          if (error.response?.status === 404) {
            toast.error(`Product ${item.product_name} not found`);
            return;
          }
        }
      }

      // For split payment, we'll use the first payment method as primary
      // and store all payments in a notes field or create multiple payment records
      const primaryPayment = paymentData.payments[0];

      const saleData = {
        customer_id: selectedCustomer?.id || null,
        items: cart.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          vat_percentage: parseFloat(item.vat_percentage) || 0,
          vat_amount: parseFloat(item.vat_amount) || 0,
        })),
        subtotal: parseFloat(cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)),
        discount_amount: parseFloat(discount),
        discount_type: discountType,
        vat_percentage: 0,
        vat_amount: parseFloat(vat),
        total: parseFloat(total),
        payment_method: `split:${paymentData.payments.map(p => `${p.method}:${p.amount}`).join(',')}`,
        payment_amount: parseFloat(paymentData.totalPaid),
        change_amount: parseFloat(paymentData.change || 0),
        sale_date: paymentData.sale_date || null,
      };

      const response = await api.post('/sales', saleData);
      setCompletedSale(response.data);
      setShowSplitPaymentModal(false);
      setShowReceipt(true);
      // Clear cart and reset all related state immediately
      setCart([]);
      setSelectedCustomer(null);
      setDiscountAmount(0);
      setDiscountType('fixed');
      
      // Refresh products to update stock quantities
      await fetchProducts();
      
      toast.success('Sale completed successfully with split payment');
      
      // Auto print if enabled
      if (settings.receipt_auto_print === 'true') {
        setTimeout(() => {
          handlePrintReceipt();
        }, 500);
      }
    } catch (error) {
      console.error('Error completing split payment sale:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to complete sale';
      toast.error(errorMessage);
    }
  };

  const handlePayment = async (paymentData) => {
    try {
      if (cart.length === 0) {
        toast.error('Cart is empty');
        return;
      }

      const { subtotal, discount, vat, total } = calculateTotals();

      // Validate cart items and check stock availability
      const validatedItems = cart.map((item) => {
        if (!item.product_id || !item.product_name) {
          throw new Error(`Invalid item: missing product information`);
        }
        if (!item.quantity || item.quantity <= 0) {
          throw new Error(`Invalid quantity for ${item.product_name}`);
        }
        if (!item.unit_price || item.unit_price < 0) {
          throw new Error(`Invalid price for ${item.product_name}`);
        }
        
        // Check stock availability if stock tracking is enabled
        if (item.stock_tracking_enabled === 1 && item.stock_quantity !== null && item.stock_quantity !== undefined) {
          if (item.quantity > item.stock_quantity) {
            throw new Error(`${item.product_name} is out of stock. Available: ${item.stock_quantity}`);
          }
        }
        
        return {
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          vat_percentage: parseFloat(item.vat_percentage) || 0,
          vat_amount: parseFloat(item.vat_amount) || 0,
        };
      });
      
      // Final stock validation - fetch latest stock from server
      for (const item of validatedItems) {
        try {
          const productResponse = await api.get(`/products/${item.product_id}`);
          const product = productResponse.data;
          if (product.stock_tracking_enabled === 1 && product.stock_quantity !== null && product.stock_quantity !== undefined) {
            if (item.quantity > product.stock_quantity) {
              throw new Error(`${item.product_name} is out of stock. Available: ${product.stock_quantity}`);
            }
          }
        } catch (error) {
          if (error.response?.status === 404) {
            throw new Error(`Product ${item.product_name} not found`);
          }
          if (error.message.includes('out of stock')) {
            throw error;
          }
        }
      }

      const saleData = {
        customer_id: selectedCustomer?.id || null,
        items: validatedItems,
        subtotal: parseFloat(cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)),
        discount_amount: parseFloat(discount),
        discount_type: discountType,
        vat_percentage: 0,
        vat_amount: parseFloat(vat),
        total: parseFloat(total),
        payment_method: paymentData.method,
        payment_amount: parseFloat(paymentData.amount),
        change_amount: parseFloat(paymentData.change || 0),
        delivery_boy_id: paymentData.delivery_boy_id || null,
        sale_date: paymentData.sale_date || null,
      };

      const response = await api.post('/sales', saleData);
      setCompletedSale(response.data);
      setShowCheckoutModal(false);
      setShowReceipt(true);
      // Clear cart and reset all related state immediately
      setCart([]);
      setSelectedCustomer(null);
      setDiscountAmount(0);
      setDiscountType('fixed');
      // VAT persists - don't reset it
      // setVatPercentage(0);
      // setNoVat(false);
      
      // Refresh products to update stock quantities
      await fetchProducts();
      
      toast.success('Sale completed successfully');
      
      // Auto print if enabled
      if (settings.receipt_auto_print === 'true') {
        setTimeout(() => {
          handlePrintReceipt();
        }, 500);
      }
    } catch (error) {
      console.error('Error completing sale:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to complete sale';
      toast.error(errorMessage);
    }
  };

  const generateCartPreview = () => {
    const { subtotal, discount, vat, total } = calculateTotals();
    return {
      sale_number: 'PREVIEW',
      created_at: new Date().toISOString(),
      items: cart.map((item) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        vat_percentage: item.vat_percentage ?? 0,
        vat_amount: item.vat_amount ?? 0,
      })),
      subtotal,
      discount_amount: discount,
      discount_type: discountType,
      vat_percentage: 0,
      vat_amount: vat,
      total,
      payment_method: 'preview',
      payment_amount: total,
      change_amount: 0,
      customer_name: selectedCustomer?.name || null,
    };
  };

  const handlePrintReceipt = () => {
    const saleToPrint = completedSale || generateCartPreview();
    if (!saleToPrint) return; 
    
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
    <div className="flex flex-1 min-h-0 overflow-hidden gap-6">
      {/* Cart Section - Left Side - Stays fixed */}
      <div className="w-96 flex-shrink-0 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t('billing.cart')}
            </h2>
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
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
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
                  {/* Row 1: Product name (left) | For weighted: Unit price + Total + Delete; For non-weighted: Total + Delete only */}
                  <div className="flex items-center gap-2 mb-2">
                    {item.product_image && (
                      <img
                        src={getImageURL(item.product_image)}
                        alt={item.product_name}
                        className="w-10 h-10 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm leading-tight truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{item.category_name}</p>
                      {(item.vat_percentage > 0 && item.vat_amount > 0) && (
                        <p className="text-xs text-blue-600">incl. VAT {formatCurrency(item.vat_amount)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {(item.has_weight === 1 || item.has_weight === true) ? (
                        <>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || value === '.') {
                                updatePrice(item.id, 0);
                                return;
                              }
                              const numValue = parseFloat(value);
                              if (!isNaN(numValue) && numValue >= 0) updatePrice(item.id, numValue);
                            }}
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              updatePrice(item.id, value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 px-1.5 py-1 border border-gray-300 rounded text-xs text-right focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            step="0.01"
                            min="0"
                            placeholder="0"
                          />
                          <span className="font-semibold text-gray-800 text-sm min-w-[52px] text-right">
                            {formatCurrency(item.total_price)}
                          </span>
                        </>
                      ) : null}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCart(item.id);
                        }}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Quantity controls | For non-weighted only: Unit price + Total */}
                  <div className="flex items-center justify-between gap-2 flex-nowrap border-t border-gray-200 pt-2 mt-0.5">
                    <div className="flex items-center gap-1.5 flex-nowrap min-h-[28px]">
                      <button
                        onClick={() => {
                          const step = item.has_weight ? 0.1 : 1;
                          const minQty = item.has_weight ? 0.001 : 0.01;
                          const newQty = Math.max(minQty, parseFloat((item.quantity - step).toFixed(4)));
                          updateQuantity(item.id, newQty);
                        }}
                        className="w-7 h-7 flex-shrink-0 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      {item.has_weight ? (
                        <>
                          <input
                            type="number"
                            step={item.weight_unit === 'kg' ? 0.1 : 1}
                            min="0"
                            value={item.weight_unit === 'kg' ? item.quantity : Math.round(item.quantity * 1000)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '' || raw === '.') return;
                              const num = parseFloat(raw);
                              if (isNaN(num) || num < 0) return;
                              const cartUnit = item.weight_unit || 'gram';
                              const qtyKg = cartUnit === 'kg' ? num : num / 1000;
                              if (qtyKg > 0) updateQuantity(item.id, parseFloat(qtyKg.toFixed(4)));
                            }}
                            onBlur={(e) => {
                              const raw = e.target.value;
                              const num = parseFloat(raw);
                              if (isNaN(num) || num <= 0) updateQuantity(item.id, 0.001);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-20 h-7 flex-shrink-0 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            placeholder={item.weight_unit === 'kg' ? 'kg' : 'g'}
                          />
                          <button
                            onClick={() => {
                              const newQty = parseFloat((item.quantity + 0.1).toFixed(4));
                              updateQuantity(item.id, newQty);
                            }}
                            className="w-7 h-7 flex-shrink-0 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap self-center">
                            {item.quantity >= 1
                              ? `= ${item.quantity} kg`
                              : `= ${Math.round(item.quantity * 1000)} g`}
                          </span>
                          <select
                            value={item.weight_unit || 'gram'}
                            onChange={(e) => {
                              const newUnit = e.target.value;
                              setCart(cart.map((c) => (c.id === item.id ? { ...c, weight_unit: newUnit } : c)));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-7 flex-shrink-0 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 w-14"
                          >
                            <option value="gram">g</option>
                            <option value="kg">kg</option>
                          </select>
                        </>
                      ) : (
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || value === '.') {
                              setCart(cart.map((c) => (c.id === item.id ? { ...c, quantity: value === '' ? '' : '.' } : c)));
                              return;
                            }
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && numValue > 0) updateQuantity(item.id, numValue);
                            else if (numValue === 0) setCart(cart.map((c) => (c.id === item.id ? { ...c, quantity: 0 } : c)));
                          }}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value);
                            if (isNaN(value) || value <= 0) updateQuantity(item.id, 0.01);
                            else updateQuantity(item.id, value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-14 h-7 px-1.5 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-primary-500 focus:outline-none"
                          step="0.01"
                          min="0.01"
                          placeholder="0"
                        />
                      )}
                      {!item.has_weight && (
                        <button
                          onClick={() => {
                            const newQty = parseFloat((item.quantity + 1).toFixed(4));
                            updateQuantity(item.id, newQty);
                          }}
                          className="w-7 h-7 flex-shrink-0 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {!item.has_weight && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || value === '.') {
                              updatePrice(item.id, 0);
                              return;
                            }
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && numValue >= 0) updatePrice(item.id, numValue);
                          }}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updatePrice(item.id, value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 h-7 px-1.5 py-1 border border-gray-300 rounded text-xs text-right focus:ring-2 focus:ring-primary-500 focus:outline-none"
                          step="0.01"
                          min="0"
                          placeholder="0"
                        />
                        <span className="font-semibold text-gray-800 text-sm min-w-[52px] text-right">
                          {formatCurrency(item.total_price)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 font-bold">{t('billing.subtotal')}:</span>
              <span className="font-bold">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-bold">{t('billing.discount')}:</span>
                <span className="font-bold text-red-600">
                  -{formatCurrency(discount)}
                </span>
              </div>
            )}
            {vat > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-bold">{t('billing.vat')}:</span>
                <span className="font-bold">{formatCurrency(vat)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-gray-300 pt-1.5">
              <span>{t('billing.total')}:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="space-y-2">
            {/* Discount and VAT Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDiscountModal(true)}
                className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold flex items-center justify-center gap-1.5 text-xs"
              >
                <Tag className="w-3.5 h-3.5" />
                {discountAmount > 0 
                  ? `Discount: ${formatCurrency(discount)}`
                  : 'Add Discount'
                }
              </button>
            </div>

            {/* Checkout and Receipt Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCheckout}
                className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                {t('billing.checkout')}
              </button>
              <button
                onClick={() => {
                  if (completedSale || cart.length > 0) {
                    setShowReceipt(true);
                  } else {
                    toast.error('Cart is empty. Add items to view receipt preview.');
                  }
                }}
                disabled={!completedSale && cart.length === 0}
                className={`px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold ${ (completedSale || cart.length > 0)
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                `}
              >
                <Receipt className="w-4 h-4" />
                View Receipt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section - Right Side - Scrolls only */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="flex-shrink-0 p-4 pb-0">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {/* Sale Date - Left end of row */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sale Date</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            {/* Category Selection */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white text-sm font-bold min-w-[200px]"
            >
              <option value="all">{t('billing.allCategories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Barcode Scanner and Search - Middle */}
            <div className="flex-1 flex items-center gap-2">
              {/* Barcode Scanner */}
              <div className="relative w-48">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Scan Barcode"
                  value={barcodeInput}
                  onChange={handleBarcodeInputChange}
                  onKeyPress={handleBarcodeKeyPress}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                  autoComplete="off"
                />
              </div>
              {/* Search Product */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('billing.searchProduct')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductModal(true)}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors border border-primary-600"
                title="Add product"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Products Grid - Only this scrolls */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 pt-3">
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
                    className={`flex flex-col h-full bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow ${ product.stock_tracking_enabled === 1 && product.stock_quantity !== null && product.stock_quantity <= 0
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'}
                    `}
                    onClick={() => {
                      if (product.stock_tracking_enabled === 1 && product.stock_quantity !== null && product.stock_quantity <= 0) {
                        toast.error(`${product.name} is out of stock`);
                        return;
                      }
                      addToCart(product);
                    }}
                  >
                    <div className="flex-1 min-h-0">
                      <h3 className="font-medium text-gray-800 text-sm mb-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-1">
                        {product.category_name}
                      </p>
                      {/* Product Details: Barcode, Expiry, Stock */}
                      <div className="space-y-1 mb-2">
                        {product.barcode && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Tag className="w-3 h-3" />
                            <span className="truncate">Barcode: {product.barcode}</span>
                          </div>
                        )}
                        {product.expiry_date && (
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Expiry:</span> {new Date(product.expiry_date).toLocaleDateString()}
                          </div>
                        )}
                        {product.stock_tracking_enabled === 1 && (
                          <div className="text-xs">
                            <span className={`font-medium ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {product.stock_quantity > 0 ? `Stock: ${product.stock_quantity}` : 'Out of Stock'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto flex-shrink-0">
                      <div>
                        <span className="font-semibold text-primary-600">
                          {formatCurrency(product.price)}
                        </span>
                        {(product.vat_percentage && parseFloat(product.vat_percentage) > 0) && (
                          <p className="text-xs text-gray-500">
                            +{product.vat_percentage}% VAT = {formatCurrency(product.price * (1 + parseFloat(product.vat_percentage) / 100))}
                          </p>
                        )}
                      </div>
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
                          <span className="text-sm font-medium min-w-[2.5rem] text-center">
                            {cartItem.has_weight
                              ? cartItem.quantity >= 1
                                ? `${cartItem.quantity} kg`
                                : `${Math.round(cartItem.quantity * 1000)}g`
                              : cartItem.quantity}
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

        {/* Bottom Action Buttons Bar */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={handleHoldSale}
              disabled={cart.length === 0}
              className={`flex-1 px-4 py-2.5 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 text-sm ${ cart.length > 0
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
              `}
            >
              <Save className="w-4 h-4" />
              Hold Sale
            </button>
            <button
              onClick={() => setShowHoldSalesModal(true)}
              className="flex-1 px-4 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-semibold flex items-center justify-center gap-2 text-sm"
            >
              <Eye className="w-4 h-4" />
              View Hold Sale
            </button>
            <button
              onClick={() => {
                if (cart.length === 0) {
                  toast.error('Cart is empty');
                  return;
                }
                setShowSplitPaymentModal(true);
              }}
              disabled={cart.length === 0}
              className={`flex-1 px-4 py-2.5 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 text-sm ${ cart.length > 0
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
              `}
            >
              <CreditCard className="w-4 h-4" />
              Split Payment
            </button>
          </div>
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
          initialSaleDate={saleDate}
          onClose={() => setShowCheckoutModal(false)}
          onConfirm={handlePayment}
        />
      )}

      {showReceipt && (completedSale || cart.length > 0) && (
        <ReceiptPrint
          sale={completedSale || generateCartPreview()}
          onClose={() => {
            setShowReceipt(false);
            // Don't clear completedSale so receipt can be viewed again
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

      <ProductModal
        open={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        categories={categories}
        editingProduct={null}
        suppressToast
        submitLabel="Add and add to cart"
        onSuccess={(product) => {
          addToCart(
            {
              ...product,
              id: product.id,
              name: product.name,
              image: product.image,
              category_name: product.category_name || '',
              price: parseFloat(product.price),
              has_weight: product.has_weight === 1 || product.has_weight === true ? 1 : 0,
              weight_unit: product.weight_unit || 'gram',
            },
            true
          );
          fetchProducts();
          toast.success('Product added and placed in cart');
        }}
      />

      {showHoldSalesModal && (
        <HoldSalesModal
          onClose={() => setShowHoldSalesModal(false)}
          onSelectHold={handleSelectHold}
        />
      )}

      {showSplitPaymentModal && (
        <SplitPaymentModal
          total={calculateTotals().total}
          initialSaleDate={saleDate}
          onClose={() => setShowSplitPaymentModal(false)}
          onConfirm={handleSplitPayment}
        />
      )}
    </div>
  );
}