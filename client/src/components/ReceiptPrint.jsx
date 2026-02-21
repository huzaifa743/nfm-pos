import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { getImageURL } from '../utils/api';
import { X, Printer } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

export default function ReceiptPrint({ sale, onClose, onPrint }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { settings, formatCurrency } = useSettings();
  const companyName = user?.tenant_code === 'DEMO' ? 'DEMO POS' : (settings.restaurant_name || 'NFM POS');

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    const displayHours = date.getHours() % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };

  const formatBillDateTime = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    const displayHours = date.getHours() % 12 || 12;
    return `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`;
  };
  
  const formatBillNumber = (saleNumber) => {
    if (!saleNumber) return '';
    let shortNumber;
    if (saleNumber.includes('SALE-')) {
      const parts = saleNumber.split('-');
      if (parts.length >= 2 && parts[1]) {
        const timestamp = parts[1];
        shortNumber = timestamp.length > 10 ? timestamp.slice(-10) : timestamp;
      } else {
        shortNumber = saleNumber.replace('SALE-', '').substring(0, 12);
      }
    } else {
      shortNumber = saleNumber.substring(0, 14);
    }
    return `Bill No: ${shortNumber}`;
  };

  const formatFullDateTime = (dateString) => {
    if (!dateString) return '';

    try {
      // The date string from SQLite can be "YYYY-MM-DD HH:MM:SS".
      // We must hint that this is UTC, otherwise the browser may interpret it as local time.
      // Replacing space with 'T' and appending 'Z' creates a valid ISO 8601 string in UTC.
      const isoDateString = dateString.replace(' ', 'T') + 'Z';
      const date = new Date(isoDateString);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if parsing fails
      }

      // Use the browser's internationalization API to format the date
      // This automatically converts it to the user's local timezone and locale format.
      const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };

      return new Intl.DateTimeFormat(navigator.language || 'en-US', options).format(date);
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return dateString; // Return original string on error
    }
  };

  const formatPrice = (amount) => {
    const num = parseFloat(amount || 0);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  // VAT-inclusive display: ensure subtotal + VAT = total (e.g. total 10, 5% VAT → subtotal 9.52, VAT 0.48)
  const totalNum = parseFloat(sale.total || 0);
  const vatPct = parseFloat(sale.vat_percentage || 0);
  const displaySubtotal = vatPct > 0 && totalNum > 0
    ? Math.round((totalNum / (1 + vatPct / 100)) * 100) / 100
    : parseFloat(sale.subtotal ?? 0);
  const displayVat = vatPct > 0 && totalNum > 0 ? totalNum - displaySubtotal : parseFloat(sale.vat_amount ?? 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-800">Receipt</h2>
          <div className="flex gap-2">
            <button
              onClick={onPrint}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div id="receipt-content" className="receipt-print overflow-y-auto flex-1">
          <div className="receipt-wrapper">
            {/* Header Section */}
            <div className="receipt-header">
              {settings.restaurant_logo && (
                <div className="receipt-logo">
                  <img
                    src={getImageURL(settings.restaurant_logo)}
                    alt="Logo"
                    className="logo-img"
                    onError={(e) => {
                      console.error('Receipt logo image failed to load:', settings.restaurant_logo, getImageURL(settings.restaurant_logo));
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <h1 className="receipt-title">{companyName}</h1>
              {settings.restaurant_address && (
                <p className="receipt-address">{settings.restaurant_address}</p>
              )}
              {(settings.restaurant_phone || settings.restaurant_email) && (
                <div className="receipt-contact" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  {settings.restaurant_phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <FaWhatsapp />
                      <span>{settings.restaurant_phone}</span>
                    </div>
                  )}
                  {settings.restaurant_email && <span>{settings.restaurant_email}</span>}
                </div>
              )}
              {settings.display_tax_invoice !== 'false' && (
                <p className="receipt-tax">Tax Invoice</p>
              )}
              {settings.trn && (
                <p className="receipt-trn">TRN: {settings.trn}</p>
              )}
              <div className="receipt-divider"></div>
            </div>

            {/* Bill Information */}
            <div className="receipt-order-type-wrapper">
              <div className="receipt-bill-number-line">{formatBillNumber(sale.sale_number)}</div>
            </div>

            {/* Bill Date */}
            <div className="receipt-bill-date-wrapper">
              <span className="receipt-bill-date">
                {formatBillDateTime(new Date())}
              </span>
            </div>

            <div className="receipt-divider"></div>

            {/* Items Section */}
            <div className="receipt-items">
              <div className="receipt-items-header">
                <div className="item-col item-name">Name</div>
                <div className="item-col item-rate">Rate</div>
                <div className="item-col item-qty">Qty</div>
                <div className="item-col item-amount">Amount</div>
              </div>

              {sale.items?.map((item, index) => {
                const vatPct = item.vat_percentage ?? 0;
                const vatAmt = item.vat_amount ?? 0;
                const hasVat = vatPct > 0 && vatAmt > 0;
                
                // Check if unit conversion info exists in separate fields
                const hasUnitConversionFields = item.selected_unit && item.display_quantity && item.product_base_unit;
                
                // Extract base product name and unit conversion info
                let baseProductName = item.product_name;
                let unitConversionText = null;
                
                if (hasUnitConversionFields) {
                  // Use separate fields if available
                  baseProductName = item.product_name.split(' (')[0]; // Remove any old format
                  const displayQty = parseFloat(item.display_quantity).toFixed(4).replace(/\.?0+$/, '');
                  const baseQty = parseFloat(item.quantity).toFixed(4).replace(/\.?0+$/, '');
                  unitConversionText = `${displayQty} ${item.selected_unit} = ${baseQty} ${item.product_base_unit}`;
                } else if (item.product_name.includes(' (')) {
                  // Fallback: extract from product_name if fields not available (old sales)
                  const parts = item.product_name.split(' (');
                  baseProductName = parts[0];
                  unitConversionText = parts[1] ? parts[1].replace(')', '') : null;
                }
                
                return (
                  <div key={index}>
                    <div className="receipt-item-row">
                      <div className="item-col item-name">
                        <span className="item-name-text">{baseProductName}</span>
                        {unitConversionText && (
                          <div className="text-xs text-gray-600 mt-0.5">
                            {unitConversionText}
                          </div>
                        )}
                      </div>
                      <div className="item-col item-rate">{formatPrice(item.unit_price)}</div>
                      <div className="item-col item-qty">
                        {hasUnitConversionFields ? `${parseFloat(item.display_quantity).toFixed(4).replace(/\.?0+$/, '')} ${item.selected_unit}` : item.quantity}
                      </div>
                      <div className="item-col item-amount">{formatPrice(item.total_price)}</div>
                    </div>

                  </div>
                );
              })}
            </div>

            <div className="receipt-divider"></div>

            {/* Summary Section */}
            <div className="receipt-totals">
              <div className="receipt-row receipt-subtotal">
                <span className="receipt-label receipt-subtotal-label">SUB TOTAL</span>
                <span className="receipt-spacer-rate"></span>
                <span className="receipt-spacer-qty"></span>
                <span className="receipt-value receipt-subtotal-value">{formatPrice(displaySubtotal)}</span>
              </div>
              <div className="receipt-divider-thick"></div>
              {sale.discount_amount > 0 && (
                <div className="receipt-row">
                  <span className="receipt-label">DISCOUNT</span>
                  <span className="receipt-spacer-rate"></span>
                  <span className="receipt-spacer-qty"></span>
                  <span className="receipt-value discount">-{formatPrice(sale.discount_amount)}</span>
                </div>
              )}
              {displayVat > 0 && (
                <div className="receipt-row">
                  <span className="receipt-label">
                    {sale.vat_percentage > 0 ? `VAT (${sale.vat_percentage}%)` : 'VAT'}
                  </span>
                  <span className="receipt-spacer-rate"></span>
                  <span className="receipt-spacer-qty"></span>
                  <span className="receipt-value">{formatPrice(displayVat)}</span>
                </div>
              )}
              <div className="receipt-row receipt-total">
                <span className="receipt-label">TOTAL</span>
                <span className="receipt-spacer-rate"></span>
                <span className="receipt-spacer-qty"></span>
                <span className="receipt-value total-amount">{formatPrice(sale.total)}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">CASH</span>
                <span className="receipt-spacer-rate"></span>
                <span className="receipt-spacer-qty"></span>
                <span className="receipt-value">{formatPrice(sale.payment_amount)}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">CHANGE</span>
                <span className="receipt-spacer-rate"></span>
                <span className="receipt-spacer-qty"></span>
                <span className="receipt-value">{formatPrice(sale.change_amount || 0)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="receipt-footer">
              <div className="receipt-divider"></div>
              <p className="receipt-thanks">THANKS FOR COMING {companyName?.toUpperCase() || 'POS'}</p>
              <p className="receipt-nice-day">Have a nice day!</p>
              <div className="receipt-divider"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
