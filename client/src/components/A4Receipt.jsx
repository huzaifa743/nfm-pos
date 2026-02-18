import React from 'react';
import { X, Printer } from 'lucide-react';
import { getImageURL } from '../utils/api';
import { useSettings } from '../contexts/SettingsContext';

const A4Receipt = ({ sale, onClose, onPrint }) => {
  const { settings, formatCurrency } = useSettings();
  const previewScale = 0.67;

  const company = {
    name: settings?.restaurant_name || 'NFM POS',
    logo: settings?.restaurant_logo ? getImageURL(settings.restaurant_logo) : null,
    address: settings?.restaurant_address || '123 Main St, Anytown, USA',
    phone: settings?.restaurant_phone || '+1 (555) 123-4567',
    email: settings?.restaurant_email || 'contact@nfmpos.com',
    trn: settings?.trn || 'Not Available'
  };

  const customer = {
    name: sale.customer_name || 'Walk-in Customer',
    address: sale.customer_address || '',
    phone: sale.customer_phone || ''
  };

  const invoice = {
    number: sale.sale_number,
    date: new Date(sale.created_at).toLocaleDateString(),
    time: new Date(sale.created_at).toLocaleTimeString(),
  };

  const paymentMethodLabel = (sale.payment_method || 'N/A')
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const previewDimensions = {
    width: `calc(210mm * ${previewScale})`,
    minHeight: `calc(297mm * ${previewScale})`,
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4 sm:p-6 receipt-modal-a4">
      <style>{`
        .receipt-modal-a4 {
          backdrop-filter: blur(2px);
        }

        @media print {
          .receipt-modal-a4 {
            position: static !important;
            inset: auto !important;
            background: none !important;
            display: block !important;
            padding: 0 !important;
          }

          .receipt-actions {
            display: none !important;
          }

          .receipt-preview-shell {
            max-height: none !important;
            overflow: visible !important;
            border: 0 !important;
            background: white !important;
            border-radius: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

          .a4-scale-wrapper {
            width: 210mm !important;
            min-height: 297mm !important;
          }

          .a4-sheet {
            width: 210mm !important;
            min-height: 297mm !important;
            transform: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
          }

          @page {
            size: A4;
            margin: 10mm;
          }

          body {
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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

        <div className="receipt-preview-shell bg-white border border-gray-200 rounded-xl shadow-xl max-h-[88vh] overflow-auto p-3 sm:p-4">
          <div className="a4-scale-wrapper mx-auto" style={previewDimensions}>
            <div
              id="a4-receipt-content"
              className="a4-sheet bg-white border border-gray-200 rounded-lg shadow-xl text-gray-800"
              style={{
                width: '210mm',
                minHeight: '297mm',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }}
            >
              <div className="h-full p-8">
                <header className="bg-white border border-gray-200 rounded-xl p-6 mb-7">
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                        {company.logo ? (
                          <img src={company.logo} alt="Company Logo" className="w-14 h-14 object-contain" />
                        ) : (
                          <span className="text-primary-700 font-bold text-xl">{company.name?.charAt(0) || 'N'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900 truncate">{company.name}</h1>
                        {company.address && <p className="text-sm text-gray-600 mt-1">{company.address}</p>}
                        <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                          {company.phone && <p>{company.phone}</p>}
                          {company.email && <p>{company.email}</p>}
                          {company.trn && <p>TRN: {company.trn}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-sm tracking-wide uppercase">Tax Invoice</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">#{invoice.number || 'N/A'}</p>
                      <p className="text-sm text-gray-600 mt-2">{invoice.date}</p>
                      <p className="text-sm text-gray-600">{invoice.time}</p>
                    </div>
                  </div>
                </header>

                <section className="grid grid-cols-2 gap-6 mb-7">
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bill To</h3>
                    <p className="font-semibold text-gray-900 mt-2 text-lg">{customer.name}</p>
                    {customer.address && <p className="text-gray-600 text-sm mt-1">{customer.address}</p>}
                    {customer.phone && <p className="text-gray-600 text-sm mt-1">{customer.phone}</p>}
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-4 text-right">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Due</h3>
                    <p className="font-bold text-3xl text-gray-900 mt-2">{formatCurrency(sale.total)}</p>
                    <p className="text-sm text-gray-600 mt-3">Payment: {paymentMethodLabel}</p>
                  </div>
                </section>

                <section className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 uppercase text-xs tracking-wide">
                        <th className="px-4 py-3 font-semibold w-14">#</th>
                        <th className="px-4 py-3 font-semibold">Item Description</th>
                        <th className="px-4 py-3 font-semibold text-right w-24">Qty</th>
                        <th className="px-4 py-3 font-semibold text-right w-32">Unit Price</th>
                        <th className="px-4 py-3 font-semibold text-right w-32">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sale.items || []).map((item, index) => (
                        <tr key={item.id || index} className="border-t border-gray-200">
                          <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                            {item.vat_percentage > 0 && (
                              <p className="text-xs text-gray-500 mt-1">VAT {item.vat_percentage}% included</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-sm">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section className="flex justify-end mt-7">
                  <div className="w-full max-w-sm border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
                    </div>
                    {sale.discount_amount > 0 && (
                      <div className="flex justify-between">
                        <span>
                          Discount {sale.discount_type === 'percentage' ? `(${sale.discount_percentage || 0}%)` : ''}
                        </span>
                        <span className="text-red-600">-{formatCurrency(sale.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>VAT ({sale.vat_percentage || 0}%)</span>
                      <span className="font-medium">{formatCurrency(sale.vat_amount)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-300 text-lg font-bold text-gray-900">
                      <span>Total</span>
                      <span>{formatCurrency(sale.total)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Amount Paid</span>
                      <span>{formatCurrency(sale.payment_amount)}</span>
                    </div>
                    {(parseFloat(sale.change_amount) || 0) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Change</span>
                        <span>{formatCurrency(sale.change_amount)}</span>
                      </div>
                    )}
                  </div>
                </section>

                <footer className="mt-10 pt-5 border-t border-gray-200 text-center text-gray-500 text-sm">
                  <p className="font-medium text-gray-700">Thank you for your business</p>
                  <p className="mt-1">Generated by NFM POS</p>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default A4Receipt;
