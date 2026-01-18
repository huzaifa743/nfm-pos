import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { Save, Upload, Globe, DollarSign, Receipt, Building2 } from 'lucide-react';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { setSettings: updateContextSettings, fetchSettings: refetchSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    restaurant_name: '',
    restaurant_logo: '',
    restaurant_address: '',
    restaurant_phone: '',
    restaurant_email: '',
    currency: 'USD',
    language: 'en',
    vat_percentage: '0',
    receipt_auto_print: 'false',
    receipt_paper_size: '80mm',
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(prev => ({ ...prev, ...response.data }));
      if (response.data.restaurant_logo) {
        setLogoPreview(`http://localhost:5000${response.data.restaurant_logo}`);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLanguageChange = (lang) => {
    handleInputChange('language', lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      
      // Add logo file if selected
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      // Add all other settings
      Object.keys(settings).forEach(key => {
        if (key !== 'restaurant_logo') {
          formData.append(key, settings[key]);
        }
      });

      const response = await api.put('/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSettings(response.data);
      // Update the context with new settings - this will trigger re-renders
      updateContextSettings(response.data);
      
      if (response.data.restaurant_logo) {
        setLogoPreview(`http://localhost:5000${response.data.restaurant_logo}`);
      }
      
      // Update language if changed
      if (response.data.language && response.data.language !== i18n.language) {
        i18n.changeLanguage(response.data.language);
        localStorage.setItem('language', response.data.language);
      }

      toast.success('Settings saved successfully');
      setLogoFile(null);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const currencies = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'PKR', 'INR'];
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' },
    { code: 'ur', name: 'اردو' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">{t('settings.title')}</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Restaurant Information */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-800">{t('settings.restaurantInfo')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.restaurantName')} *
              </label>
              <input
                type="text"
                required
                value={settings.restaurant_name}
                onChange={(e) => handleInputChange('restaurant_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.restaurantLogo')}
              </label>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-20 h-20 object-contain rounded border border-gray-300"
                  />
                )}
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer">
                  <Upload className="w-5 h-5" />
                  <span>{logoPreview ? t('settings.changeLogo') : t('settings.uploadLogo')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.restaurantAddress')}
              </label>
              <textarea
                value={settings.restaurant_address || ''}
                onChange={(e) => handleInputChange('restaurant_address', e.target.value)}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.restaurantPhone')}
                </label>
                <input
                  type="tel"
                  value={settings.restaurant_phone || ''}
                  onChange={(e) => handleInputChange('restaurant_phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.restaurantEmail')}
                </label>
                <input
                  type="email"
                  value={settings.restaurant_email || ''}
                  onChange={(e) => handleInputChange('restaurant_email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Settings */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Receipt className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-800">{t('settings.receiptSettings')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.receiptPaperSize')}
              </label>
              <select
                value={settings.receipt_paper_size || '80mm'}
                onChange={(e) => handleInputChange('receipt_paper_size', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="80mm">80mm (3 inches)</option>
                <option value="58mm">58mm (2 inches)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.receipt_auto_print === 'true'}
                  onChange={(e) => handleInputChange('receipt_auto_print', e.target.checked ? 'true' : 'false')}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t('settings.autoPrintReceipt')}
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-8">
                {t('settings.autoPrintReceiptDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Tax Settings */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-800">{t('settings.taxSettings')}</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.vatPercentage')}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={settings.vat_percentage || '0'}
              onChange={(e) => handleInputChange('vat_percentage', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('settings.vatPercentageDesc')}
            </p>
          </div>
        </div>

        {/* Language & Currency */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-800">{t('settings.languageCurrency')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.language')}
              </label>
              <select
                value={settings.language || 'en'}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.currency')}
              </label>
              <select
                value={settings.currency || 'USD'}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {currencies.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
