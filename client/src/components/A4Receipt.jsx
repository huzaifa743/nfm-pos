import React from 'react';
import { X, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getImageURL } from '../utils/api';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { numberToWords } from '../utils/numberToWords';

const A4Receipt = ({ sale, onClose, onPrint }) => {
  const { settings, formatCurrency } = useSettings();
  const { user } = useAuth();

  const company = {
    name: settings?.restaurant_name || 'POS SYSTEM',
    logo: settings?.restaurant_logo ? getImageURL(settings.restaurant_logo) : null,
    address: settings?.restaurant_address || 'Your Location',
    phone: settings?.restaurant_phone || '0300-1234567',
    email: settings?.restaurant_email || '',
    trn: settings?.trn,
  };

  const customer = {
    name: sale.customer_name || 'Walk-in Customer',
    address: sale.customer_address || 'N/A',
    phone: sale.customer_phone || 'N/A'
  };

  const INVOICE_BLUE = '#1e40af';

  const formatDate = (dateString) => {
    if (!dateString) return formatDate(new Date().toISOString());
    
    try {
      let date;
      // Handle SQLite datetime format: "YYYY-MM-DD HH:MM:SS"
      if (typeof dateString === 'string' && dateString.includes(' ')) {
        // Convert SQLite format to ISO format for proper parsing
        const isoString = dateString.replace(' ', 'T');
        date = new Date(isoString);
      } else {
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Fallback to current date if invalid
        date = new Date();
      }
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = String(date.getDate()).padStart(2, '0');
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      // Fallback to current date
      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = String(now.getDate()).padStart(2, '0');
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      return `${day}-${month}-${year}`;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return formatTime(new Date().toISOString());
    
    try {
      let date;
      // Handle SQLite datetime format: "YYYY-MM-DD HH:MM:SS"
      if (typeof dateString === 'string' && dateString.includes(' ')) {
        // Convert SQLite format to ISO format for proper parsing
        const isoString = dateString.replace(' ', 'T');
        date = new Date(isoString);
      } else {
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Fallback to current time if invalid
        date = new Date();
      }
      
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const seconds = date.getSeconds();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      
      return `${displayHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      // Fallback to current time
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
    }
  };

  const invoice = {
    number: sale.sale_number || 'N/A',
    date: sale.created_at ? formatDate(sale.created_at) : formatDate(new Date()),
    time: sale.created_at ? formatTime(sale.created_at) : formatTime(new Date()),
    user: sale.user_name || user?.username || 'Admin User',
  };

  const paymentMethodLabel = (sale.payment_method || 'cash')
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/Payafterdelivery/gi, 'Pay After Delivery')
    .replace(/Cash Sale/gi, 'Cash');

  const saleType = paymentMethodLabel;
  
  const totalQuantity = (sale.items || []).reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    return sum + qty;
  }, 0);

  // VAT-inclusive display: ensure subtotal + VAT = total (e.g. total 10, 5% VAT → subtotal 9.52, VAT 0.48)
  const totalNum = parseFloat(sale.total || 0);
  const vatPct = parseFloat(sale.vat_percentage || 0);
  const displaySubtotal = vatPct > 0 && totalNum > 0
    ? Math.round((totalNum / (1 + vatPct / 100)) * 100) / 100
    : parseFloat(sale.subtotal ?? 0);
  const displayVat = vatPct > 0 && totalNum > 0 ? totalNum - displaySubtotal : parseFloat(sale.vat_amount ?? 0);

  const amountInWords = numberToWords(parseFloat(sale.total || 0));
  
  const paymentStatus = () => {
    const paid = parseFloat(sale.payment_amount || 0);
    const total = parseFloat(sale.total || 0);
    const change = parseFloat(sale.change_amount || 0);
    
    if (paid > total) return 'Overpaid';
    if (paid < total) return 'Underpaid';
    return 'Paid';
  };

  const getCompanyInitials = () => {
    const name = company.name || 'POS';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // QR Code data - ASCII only for reliable scanning, formatted for display when scanned
  const amountsLine = [
    `Subtotal:     ${formatCurrency(displaySubtotal)}`,
    displayVat > 0 ? `VAT (${sale.vat_percentage || 0}%):  ${formatCurrency(displayVat)}` : null,
    (sale.discount_amount || 0) > 0 ? `Discount:     -${formatCurrency(sale.discount_amount)}` : null,
    `Grand Total:  ${formatCurrency(sale.total)}`,
  ].filter(Boolean).join('\n   ');

  const qrData = [
    'INVOICE RECEIPT',
    '-------------------',
    'Invoice No: ' + invoice.number,
    'Date: ' + invoice.date,
    'Time: ' + invoice.time,
    'User: ' + invoice.user,
    '',
    'STORE: ' + company.name,
    'Location: ' + company.address,
    'Phone: ' + company.phone,
    '',
    'BILL TO: ' + customer.name,
    'Phone: ' + customer.phone,
    'Address: ' + customer.address,
    '',
    'AMOUNTS',
    amountsLine,
    '',
    'PAYMENT',
    'Method: ' + paymentMethodLabel,
    'Paid: ' + formatCurrency(sale.payment_amount || sale.total),
    'Change: ' + formatCurrency(sale.change_amount || 0),
    'Status: ' + paymentStatus(),
    'Items: ' + totalQuantity,
    '',
    'Thank you for your business!'
  ].join('\n');

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4 sm:p-6 receipt-modal-a4">
      <style>{`
        .receipt-modal-a4 {
          backdrop-filter: blur(2px);
        }

        @media print {
          html { zoom: 1 !important; }
          @page {
            size: A4;
            margin: 0;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 210mm !important;
            min-width: 210mm !important;
            overflow: hidden !important;
          }

          /* Hide everything except the receipt */
          body * {
            visibility: hidden !important;
          }

          .receipt-modal-a4,
          .receipt-modal-a4 * {
            visibility: visible !important;
          }

          /* Ensure receipt modal is visible and properly positioned */
          .receipt-modal-a4 {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            display: block !important;
            z-index: 999999 !important;
            overflow: visible !important;
          }

          .receipt-actions,
          button {
            display: none !important;
          }

          .receipt-preview-shell {
            max-height: none !important;
            overflow: hidden !important;
            border: 0 !important;
            background: white !important;
            border-radius: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
            visibility: visible !important;
          }

          .a4-scale-wrapper {
            width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: white !important;
            display: block !important;
            visibility: visible !important;
            zoom: 1 !important;
          }

          .a4-sheet {
            width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            transform: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 10mm !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
            font-family: Arial, sans-serif !important;
            font-size: 9pt !important;
            line-height: 1.2 !important;
            display: block !important;
            visibility: visible !important;
            page-break-after: auto !important;
            page-break-inside: avoid !important;
          }

          .a4-sheet * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            -webkit-font-smoothing: antialiased !important;
            text-rendering: optimizeLegibility !important;
          }

          /* Ensure all text elements are printable */
          .a4-sheet p,
          .a4-sheet span,
          .a4-sheet div,
          .a4-sheet h1,
          .a4-sheet h2,
          .a4-sheet h3,
          .a4-sheet td,
          .a4-sheet th {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            text-shadow: none !important;
            filter: none !important;
          }

          .a4-sheet table {
            border-collapse: collapse !important;
            width: 100% !important;
            table-layout: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .a4-sheet th,
          .a4-sheet td {
            padding: 8px 8px !important;
            text-align: left !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .a4-sheet th {
            background-color: #1e40af !important;
            color: white !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .a4-sheet img,
          .a4-sheet svg {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            max-width: 100% !important;
            height: auto !important;
          }
        }
      `}</style>

      <div className="w-full max-w-[980px]">
        <div className="flex justify-end items-center gap-2 receipt-actions mb-3">
          <button
            onClick={onPrint}
            className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
            title="Print"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="receipt-preview-shell bg-white border border-gray-200 rounded-xl shadow-xl max-h-[90vh] overflow-auto p-2 sm:p-3 flex justify-center items-start" style={{ scrollbarGutter: 'stable' }}>
          <div className="a4-scale-wrapper" style={{ 
            width: '210mm', 
            minHeight: '297mm',
            flexShrink: 0,
            aspectRatio: '210/297'
          }}>
            <div
              id="a4-receipt-content"
              className="a4-sheet bg-white text-gray-900"
              style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '10mm',
                fontFamily: 'Arial, sans-serif',
                boxSizing: 'border-box',
                fontSize: '9pt',
                lineHeight: '1.3',
              }}
            >
              {/* Header: Logo + Company left | INVOICE + details right */}
              <header className="flex justify-between items-start" style={{ marginBottom: '8px', paddingBottom: '6px' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center flex-shrink-0 text-white font-bold rounded-full overflow-hidden"
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: company.logo ? '#f8fafc' : INVOICE_BLUE,
                      fontSize: '14pt',
                      borderRadius: '50%',
                      border: company.logo ? '1px solid #e2e8f0' : 'none',
                    }}
                  >
                    {company.logo ? (
                      <img
                        src={company.logo}
                        alt="Logo"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          padding: '4px',
                          boxSizing: 'border-box',
                        }}
                      />
                    ) : (
                      getCompanyInitials()
                    )}
                  </div>
                  <div>
                    <h1 className="font-bold uppercase" style={{ color: INVOICE_BLUE, fontSize: '16pt', margin: 0, padding: 0, lineHeight: '1.2' }}>{company.name}</h1>
                    <p className="text-black" style={{ fontSize: '9pt', margin: '2px 0', padding: 0, lineHeight: '1.3' }}>Location: {company.address}</p>
                    <p className="text-black" style={{ fontSize: '9pt', margin: '2px 0', padding: 0, lineHeight: '1.3' }}>{company.phone}</p>
                    {company.trn && (
                      <p className="text-black" style={{ fontSize: '9pt', margin: '2px 0', padding: 0, lineHeight: '1.3' }}>TRN: {company.trn}</p>
                    )}
                    <p className="text-black" style={{ fontSize: '9pt', margin: '2px 0 0 0', padding: 0, lineHeight: '1.3' }}>Sale Type: {saleType}</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="font-bold uppercase" style={{ color: INVOICE_BLUE, fontSize: '16pt', margin: '0 0 4px 0', padding: 0, lineHeight: '1.2' }}>TAX INVOICE</h2>
                  <div className="text-black" style={{ fontSize: '9pt', lineHeight: '1.4' }}>
                    <p style={{ margin: '2px 0', padding: 0 }}>Invoice No: {invoice.number}</p>
                    <p style={{ margin: '2px 0', padding: 0 }}>Invoice Date: {invoice.date}</p>
                    <p style={{ margin: '2px 0', padding: 0 }}>Time: {invoice.time}</p>
                    <p style={{ margin: '2px 0', padding: 0 }}>User: {invoice.user}</p>
                  </div>
                </div>
              </header>

              {/* BILL TO: Customer (bold+underline) | Phone / Address right */}
              <section className="border-b border-gray-300" style={{ marginBottom: '6px', paddingBottom: '4px' }}>
                <div className="flex justify-between items-baseline">
                  <p className="text-black" style={{ fontSize: '9pt', margin: 0, padding: 0, lineHeight: '1.3' }}>
                    <span className="font-semibold">BILL TO: </span>
                    <span className="font-bold underline">{customer.name}</span>
                  </p>
                  <p className="text-black" style={{ fontSize: '9pt', margin: 0, padding: 0, lineHeight: '1.3' }}>
                    Phone: {customer.phone} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Address: {customer.address}
                  </p>
                </div>
              </section>

              {/* Items Table - dark blue header, full width, spacious row spacing */}
              <section style={{ marginTop: '10px', marginBottom: '8px', width: '100%' }}>
                <table className="w-full border-collapse" style={{ fontSize: '10pt', margin: '2px 0', width: '100%', tableLayout: 'auto' }}>
                  <thead>
                    <tr style={{ backgroundColor: INVOICE_BLUE, color: 'white' }}>
                      <th className="text-left font-semibold" style={{ padding: '6px 8px', fontSize: '10pt', lineHeight: '1.3', width: '8%', whiteSpace: 'nowrap' }}>Sr. No:</th>
                      <th className="text-left font-semibold" style={{ padding: '6px 8px', fontSize: '10pt', lineHeight: '1.3', width: '38%' }}>Item Description</th>
                      <th className="text-right font-semibold" style={{ padding: '6px 8px', fontSize: '10pt', lineHeight: '1.3', width: '14%' }}>Unit Price</th>
                      <th className="text-right font-semibold" style={{ padding: '6px 8px', fontSize: '10pt', lineHeight: '1.3', width: '12%' }}>Discount</th>
                      <th className="text-right font-semibold" style={{ padding: '6px 8px', fontSize: '10pt', lineHeight: '1.3', width: '10%' }}>Qty</th>
                      <th className="text-right font-semibold" style={{ padding: '6px 8px', fontSize: '10pt', lineHeight: '1.3', width: '18%' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sale.items || []).map((item, index) => {
                      const hasUnitConversionFields = item.selected_unit && item.display_quantity && item.product_base_unit;
                      let baseProductName = item.product_name;
                      let unitConversionText = null;
                      if (hasUnitConversionFields) {
                        baseProductName = item.product_name.split(' (')[0];
                        const displayQty = parseFloat(item.display_quantity).toFixed(4).replace(/\.?0+$/, '');
                        const baseQty = parseFloat(item.quantity).toFixed(4).replace(/\.?0+$/, '');
                        unitConversionText = `${displayQty} ${item.selected_unit} = ${baseQty} ${item.product_base_unit}`;
                      } else if (item.product_name.includes(' (')) {
                        const parts = item.product_name.split(' (');
                        baseProductName = parts[0];
                        unitConversionText = parts[1] ? parts[1].replace(')', '') : null;
                      }
                      return (
                        <tr key={item.id || index} className="border-b border-gray-200">
                          <td className="text-black" style={{ padding: '8px 8px', fontSize: '10pt', lineHeight: '1.35' }}>{index + 1}</td>
                          <td className="text-black" style={{ padding: '8px 8px', fontSize: '10pt', lineHeight: '1.35' }}>
                            {baseProductName}
                            {unitConversionText && <div className="text-gray-600" style={{ fontSize: '9pt', marginTop: '2px', lineHeight: '1.3' }}>{unitConversionText}</div>}
                          </td>
                          <td className="text-right text-black" style={{ padding: '8px 8px', fontSize: '10pt', lineHeight: '1.35' }}>{formatCurrency(item.unit_price)}</td>
                          <td className="text-right text-black" style={{ padding: '8px 8px', fontSize: '10pt', lineHeight: '1.35' }}>0.00</td>
                          <td className="text-right text-black" style={{ padding: '8px 8px', fontSize: '10pt', lineHeight: '1.35' }}>
                            {hasUnitConversionFields ? `${parseFloat(item.display_quantity).toFixed(4).replace(/\.?0+$/, '')} ${item.selected_unit}` : item.quantity}
                          </td>
                          <td className="text-right text-black font-medium" style={{ padding: '8px 8px', fontSize: '10pt', lineHeight: '1.35' }}>{formatCurrency(item.total_price)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="text-right text-black" style={{ fontSize: '11pt', marginTop: '4px', lineHeight: '1.3' }}>Total Quantity: {totalQuantity}</div>
              </section>

              {/* Payment Summary: Left column (Payment) | Right column (Totals) */}
              <section style={{ marginBottom: '10px', marginTop: '4px' }}>
                <div className="grid grid-cols-2" style={{ gap: '24px', alignItems: 'stretch' }}>
                  {/* Payment Details */}
                  <div className="text-black" style={{ fontSize: '10pt', lineHeight: '1.5', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <div className="flex justify-between" style={{ margin: '6px 0' }}><span>Payment Method:</span><span>{paymentMethodLabel}</span></div>
                    <div className="flex justify-between" style={{ margin: '6px 0' }}><span>Amount Paid:</span><span>{formatCurrency(sale.payment_amount || sale.total)}</span></div>
                    <div className="flex justify-between" style={{ margin: '6px 0' }}><span>Amount Return:</span><span>{formatCurrency(sale.change_amount || 0)}</span></div>
                    <div className="flex justify-between" style={{ margin: '6px 0' }}><span>Payment Status:</span><span>{paymentStatus()}</span></div>
                  </div>
                  {/* Financial Summary */}
                  <div className="text-black" style={{ fontSize: '10pt', lineHeight: '1.5', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <div className="flex justify-between" style={{ margin: '6px 0' }}><span>Subtotal:</span><span>{formatCurrency(displaySubtotal)}</span></div>
                    {displayVat > 0 && (
                      <div className="flex justify-between" style={{ margin: '6px 0' }}>
                        <span>{sale.vat_percentage > 0 ? `VAT (${sale.vat_percentage}%)` : 'VAT'}:</span>
                        <span>{formatCurrency(displayVat)}</span>
                      </div>
                    )}
                    <div className="flex justify-between" style={{ margin: '6px 0' }}><span>Total Discount:</span><span>{formatCurrency(sale.discount_amount || 0)}</span></div>
                    <div className="flex justify-between text-white font-bold" style={{ backgroundColor: INVOICE_BLUE, marginTop: '8px', padding: '8px 10px', borderRadius: '4px', fontSize: '11pt' }}>
                      <span>Grand Total:</span>
                      <span>{formatCurrency(sale.total)}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Amount in Words */}
              <section style={{ marginBottom: '4px', fontSize: '9pt', lineHeight: '1.35' }}>
                <p className="text-black" style={{ margin: '2px 0', padding: 0 }}><span className="font-semibold">Amount In Words:</span> {amountInWords}</p>
              </section>

              {/* Note */}
              <section style={{ marginBottom: '8px', fontSize: '9pt', lineHeight: '1.35' }}>
                <p className="text-black" style={{ margin: '2px 0', padding: 0 }}>Note: {settings?.terms_conditions || 'All sales are final. Thank you for your purchase! Please check items before leaving the store.'}</p>
              </section>

              {/* QR code with signatures on left and right */}
              <div className="flex justify-between items-end" style={{ marginTop: '16px', marginBottom: '16px', gap: '16px' }}>
                <div className="flex flex-col items-center">
                  <div className="border-t-2 border-gray-400" style={{ width: '100px', marginTop: '2px' }} />
                  <p className="text-black" style={{ fontSize: '8pt', marginTop: '4px', lineHeight: '1.1' }}>Authorized Signature</p>
                </div>
                <div className="flex flex-col items-center">
                  <div style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
                    <QRCodeSVG value={qrData} size={128} level="L" marginSize={4} />
                  </div>
                  <p className="text-center font-bold text-black" style={{ fontSize: '11pt', margin: '12px 0 0 0', paddingBottom: '8px', borderBottom: '1px solid #000', lineHeight: '1.2' }}>Thank you for your business!</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="border-t-2 border-gray-400" style={{ width: '100px', marginTop: '2px' }} />
                  <p className="text-black" style={{ fontSize: '8pt', marginTop: '4px', lineHeight: '1.1' }}>Customer Signature</p>
                </div>
              </div>

              {/* Receipt info */}
              <p className="text-center text-black" style={{ fontSize: '9pt', margin: '4px 0 8px 0', padding: 0, lineHeight: '1.2' }}>
                Receipt Generated by: {company.name} | Print Date: {invoice.date} {invoice.time}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default A4Receipt;