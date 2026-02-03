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
  
  const formatBillNumber = (saleNumber) => {
    // Format: /2/admin/BILL followed by a shorter, more readable version
    // For 80mm paper, use shorter format to prevent line wrapping issues
    if (!saleNumber) return '';
    // If sale number contains SALE-, extract just the numeric part
    let shortNumber;
    if (saleNumber.includes('SALE-')) {
      const parts = saleNumber.split('-');
      // Extract timestamp part (second element) and take last 10 digits
      if (parts.length >= 2 && parts[1]) {
        // Get last 10 digits of timestamp for readability
        const timestamp = parts[1];
        shortNumber = timestamp.length > 10 ? timestamp.slice(-10) : timestamp;
      } else {
        // Fallback: use first 12 characters without the "SALE-" prefix
        shortNumber = saleNumber.replace('SALE-', '').substring(0, 12);
      }
    } else {
      // For other formats, limit to 14 characters total
      shortNumber = saleNumber.substring(0, 14);
    }
    // Ensure total length including "/2/admin/BILL " fits on 80mm (max ~30 chars)
    const prefix = '/2/admin/BILL ';
    const maxNumberLength = 30 - prefix.length;
    if (shortNumber.length > maxNumberLength) {
      shortNumber = shortNumber.substring(0, maxNumberLength);
    }
    return `${prefix}${shortNumber}`;
  };

  const formatFullDateTime = (dateString) => {
    if (!dateString) return '';
    
    // SQLite returns date in format "YYYY-MM-DD HH:MM:SS"
    // If it's stored as UTC (showing 5 hours back), convert to local time
    let year, month, day, hours, minutes, seconds;
    
    try {
      // Parse the date string - if it's in UTC, treat it as UTC and convert to local
      // Format: "2026-01-18 08:50:30" (UTC) needs to show as "2026-01-18 1:50:30 PM" (local)
      const parts = dateString.trim().split(' ');
      
      if (parts.length >= 2) {
        // SQLite format "YYYY-MM-DD HH:MM:SS"
        // Convert to ISO format with Z (UTC) then parse to get local time
        const isoString = parts[0] + 'T' + parts[1] + 'Z';
        const date = new Date(isoString);
        
        if (!isNaN(date.getTime())) {
          // Get local time components from the UTC date
          year = date.getFullYear();
          month = date.getMonth() + 1;
          day = date.getDate();
          hours = date.getHours();
          minutes = date.getMinutes();
          seconds = date.getSeconds();
        } else {
          // Fallback: extract directly (treat as local)
          const dateComponents = parts[0].split('-').map(Number);
          const timeComponents = parts[1].split(':').map(Number);
          year = dateComponents[0];
          month = dateComponents[1];
          day = dateComponents[2];
          hours = timeComponents[0] || 0;
          minutes = timeComponents[1] || 0;
          seconds = Math.floor(timeComponents[2] || 0);
        }
      } else {
        // Single part or ISO format - use Date parsing
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        year = date.getFullYear();
        month = date.getMonth() + 1;
        day = date.getDate();
        hours = date.getHours();
        minutes = date.getMinutes();
        seconds = date.getSeconds();
      }
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return '';
    }
    
    // Format the output
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');
    
    // Convert to 12-hour format with correct AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12, 13 to 1, etc.
    
    return `${dayStr}-${monthStr}-${year} ${displayHours}:${minutesStr}:${secondsStr} ${ampm}`;
  };

  const formatPrice = (amount) => {
    const num = parseFloat(amount || 0);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

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
              {settings.trn && (
                <p className="receipt-trn">TRN: {settings.trn}</p>
              )}
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
                        )}              <div className="receipt-divider"></div>
            </div>

            {/* Bill Information */}
            <div className="receipt-order-type-wrapper">
              <div className="receipt-bill-number-line">{formatBillNumber(sale.sale_number)}</div>
            </div>

            {/* Bill Date */}
            <div className="receipt-bill-date-wrapper">
              <span className="receipt-bill-date">{formatFullDateTime(sale.created_at)}</span>
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
                return (
                  <div key={index}>
                    <div className="receipt-item-row">
                      <div className="item-col item-name">
                        <span className="item-name-text">{item.product_name}</span>
                      </div>
                      <div className="item-col item-rate">{formatPrice(item.unit_price)}</div>
                      <div className="item-col item-qty">{item.quantity}</div>
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
                <span className="receipt-value receipt-subtotal-value">{formatPrice(sale.subtotal)}</span>
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
              {sale.vat_amount > 0 && (
                <div className="receipt-row">
                  <span className="receipt-label">
                    {sale.vat_percentage > 0 ? `VAT (${sale.vat_percentage}%)` : 'VAT'}
                  </span>
                  <span className="receipt-spacer-rate"></span>
                  <span className="receipt-spacer-qty"></span>
                  <span className="receipt-value">{formatPrice(sale.vat_amount)}</span>
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
