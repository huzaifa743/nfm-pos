import React from 'react';
import { X, Printer } from 'lucide-react';
import { getImageURL } from '../utils/api';
import { useSettings } from '../contexts/SettingsContext';

const SalarySlip = ({ salary, onClose, onPrint, format = 'a4' }) => {
  const { settings, formatCurrency } = useSettings();

  const company = {
    name: settings?.restaurant_name || 'Restaurant',
    logo: settings?.restaurant_logo ? getImageURL(settings.restaurant_logo) : null,
    address: settings?.restaurant_address || '',
    phone: settings?.restaurant_phone || '',
  };

  const grossPay = (parseFloat(salary.basic_salary) || 0) + (parseFloat(salary.commission_amount) || 0) + (parseFloat(salary.other_additions) || 0);
  const totalDeductions = (parseFloat(salary.advance_deduction) || 0) + (parseFloat(salary.other_deductions) || 0);

  const printContent = () => {
    onPrint?.();
    setTimeout(() => window.print(), 100);
  };

  if (format === 'thermal') {
    return (
      <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4">
          <div className="flex justify-end gap-2 mb-4">
            <button onClick={printContent} className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700">
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div id="salary-slip-thermal" className="text-sm font-mono" style={{ width: '80mm' }}>
            <div className="text-center border-b pb-2 mb-2">
              <p className="font-bold text-lg">{company.name}</p>
              <p className="text-xs">SALARY SLIP</p>
            </div>
            <p className="font-bold">{salary.employee_name}</p>
            <p className="text-xs">{salary.month} {salary.year}</p>
            <div className="border-t border-b my-2 py-2 space-y-1">
              <p>Basic: {formatCurrency(salary.basic_salary || 0)}</p>
              <p>Additions: {formatCurrency((salary.commission_amount || 0) + (salary.other_additions || 0))}</p>
              <p>Advances: -{formatCurrency(salary.advance_deduction || 0)}</p>
              <p>Deductions: -{formatCurrency(salary.other_deductions || 0)}</p>
            </div>
            <div className="flex justify-between font-bold">
              <span>Net Pay:</span>
              <span>{formatCurrency(salary.net_pay || 0)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Paid:</span>
              <span>{formatCurrency(salary.paid_amount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Remaining:</span>
              <span>{formatCurrency(salary.remaining_amount || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4 receipt-modal-a4">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .receipt-modal-a4, .receipt-modal-a4 * { visibility: visible !important; }
          .receipt-modal-a4 { position: fixed !important; inset: 0 !important; background: none !important; padding: 0 !important; }
          .receipt-actions { display: none !important; }
        }
      `}</style>
      <div className="w-full max-w-2xl">
        <div className="flex justify-end gap-2 receipt-actions mb-3">
          <button onClick={printContent} className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700">
            <Printer className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div id="salary-slip-a4" className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-xl">
          <header className="flex justify-between items-start pb-6 border-b-2 border-gray-300">
            <div>
              {company.logo && <img src={company.logo} alt="Logo" className="h-16 mb-2" />}
              <h1 className="text-2xl font-bold">{company.name}</h1>
              <p className="text-sm text-gray-600">{company.address}</p>
              <p className="text-sm text-gray-600">{company.phone}</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-800">SALARY SLIP</h2>
              <p className="text-gray-600 mt-2">{salary.month} {salary.year}</p>
            </div>
          </header>

          <section className="my-6">
            <h3 className="font-semibold text-gray-700 mb-2">Employee</h3>
            <p className="text-lg font-bold">{salary.employee_name}</p>
            {salary.designation && <p className="text-gray-600">{salary.designation}</p>}
          </section>

          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="px-4 py-2">Basic Salary</td><td className="px-4 py-2 text-right">{formatCurrency(salary.basic_salary || 0)}</td></tr>
              <tr className="border-b"><td className="px-4 py-2">Commission</td><td className="px-4 py-2 text-right">{formatCurrency(salary.commission_amount || 0)}</td></tr>
              <tr className="border-b"><td className="px-4 py-2">Other Additions</td><td className="px-4 py-2 text-right">{formatCurrency(salary.other_additions || 0)}</td></tr>
              <tr className="border-b"><td className="px-4 py-2 text-red-600">Advances Deducted</td><td className="px-4 py-2 text-right text-red-600">-{formatCurrency(salary.advance_deduction || 0)}</td></tr>
              <tr className="border-b"><td className="px-4 py-2 text-red-600">Other Deductions</td><td className="px-4 py-2 text-right text-red-600">-{formatCurrency(salary.other_deductions || 0)}</td></tr>
              <tr className="bg-gray-100 font-bold"><td className="px-4 py-3">Net Pay</td><td className="px-4 py-3 text-right">{formatCurrency(salary.net_pay || 0)}</td></tr>
              <tr className="border-b"><td className="px-4 py-2">Paid</td><td className="px-4 py-2 text-right text-green-600">{formatCurrency(salary.paid_amount || 0)}</td></tr>
              <tr><td className="px-4 py-2">Remaining</td><td className="px-4 py-2 text-right font-medium">{formatCurrency(salary.remaining_amount || 0)}</td></tr>
            </tbody>
          </table>

          <footer className="mt-8 pt-4 border-t text-center text-gray-500 text-sm">
            <p>Generated by {company.name}</p>
            <p>{new Date().toLocaleString()}</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default SalarySlip;
