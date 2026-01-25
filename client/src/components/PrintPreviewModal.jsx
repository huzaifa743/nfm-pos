import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Printer } from 'lucide-react';
import ReceiptPrint from './ReceiptPrint';

export default function PrintPreviewModal({ open, onClose, sale, onPrint }) {
  const { t } = useTranslation();

  if (!open || !sale) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-800">Print Preview</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onPrint}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
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

        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div className="bg-white max-w-md mx-auto shadow-lg" id="receipt-preview-content">
            <div className="p-6">
              <ReceiptPrint sale={sale} onClose={onClose} onPrint={onPrint} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
