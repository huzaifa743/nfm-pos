import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import api from '../api/api';
import { getImageURL } from '../utils/api';
import toast from 'react-hot-toast';
import { Save, Upload, Globe, Receipt, Building2, Key } from 'lucide-react';

// Shared form input styles for consistency
const inputClass = 'w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent placeholder-gray-400';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
const helperClass = 'text-xs text-gray-500 mt-1';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { setSettings: updateContextSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    restaurant_name: '',
    restaurant_logo: '',
    restaurant_address: '',
    restaurant_phone: '',
    restaurant_email: '',
    trn: '',
    currency: 'USD',
    language: 'en',
    vat_percentage: '0',
    receipt_auto_print: 'false',
    receipt_paper_size: '80mm',
    invoice_type: 'thermal',
    display_tax_invoice: 'true',
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  // Platform admin (super_admin / admin with no tenant): options only, e.g. password change
  const isPlatformAdmin = user?.role === 'super_admin' || (user?.role === 'admin' && !user?.tenant_code);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ username: '', password: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!user.tenant_code) {
      setLoading(false);
      return;
    }
    fetchSettings();
  }, [user?.tenant_code]);

  const fetchSettings = async () => {
    if (!user?.tenant_code) return;
    try {
      const response = await api.get(`/settings?tenant_code=${user.tenant_code}`);
      setSettings(prev => ({ ...prev, ...response.data }));
      setLogoPreview(response.data.restaurant_logo ? getImageURL(response.data.restaurant_logo) : null);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.username && !passwordForm.password) {
      toast.error('Enter username and/or password');
      return;
    }
    setPasswordSaving(true);
    try {
      await api.patch('/superadmin/me', {
        username: passwordForm.username || undefined,
        password: passwordForm.password || undefined
      });
      toast.success('Credentials updated. Please log in again.');
      setPasswordForm({ username: '', password: '' });
      setShowPasswordModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setPasswordSaving(false);
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
      reader.onloadend = () => setLogoPreview(reader.result);
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
      if (logoFile) formData.append('logo', logoFile);
      Object.keys(settings).forEach(key => {
        if (key !== 'restaurant_logo') formData.append(key, settings[key]);
      });

      const response = await api.put('/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSettings(response.data);
      updateContextSettings(response.data);
      setLogoPreview(response.data.restaurant_logo ? getImageURL(response.data.restaurant_logo) : null);
      if (response.data.language && response.data.language !== i18n.language) {
        i18n.changeLanguage(response.data.language);
        localStorage.setItem('language', response.data.language);
      }
      toast.success('Settings saved successfully');
      setLogoFile(null);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Tenant users: require admin role. Platform admin (no tenant) see Options below.
  if (user?.tenant_code && user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-base">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  // Platform admin (no tenant): show Options page with password change
  if (isPlatformAdmin) {
    return (
      <div className="w-full pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Platform options</p>
        </div>

        {user?.role === 'super_admin' && (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 text-primary-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Change password or username</h2>
                  <p className="text-xs text-gray-500">Update your super admin login credentials</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Key className="w-5 h-5" />
                Change password or username
              </button>
            </div>
          </section>
        )}

        {user?.role === 'admin' && !user?.tenant_code && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <p className="text-gray-600">To change your password, contact the super admin.</p>
          </div>
        )}

        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Change Super Admin credentials</h3>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className={labelClass}>New username</label>
                  <input
                    type="text"
                    value={passwordForm.username}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, username: e.target.value }))}
                    className={inputClass}
                    placeholder="Leave empty to keep current"
                  />
                </div>
                <div>
                  <label className={labelClass}>New password</label>
                  <input
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))}
                    className={inputClass}
                    placeholder="Leave empty to keep current"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    Update credentials
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPasswordModal(false); setPasswordForm({ username: '', password: '' }); }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading settings...</p>
        </div>
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
    <div className="w-full pb-12">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('settings.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your restaurant and POS configuration</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. Business Information */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 text-primary-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{t('settings.restaurantInfo')}</h2>
                <p className="text-xs text-gray-500">Basic business details shown on receipts</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            {/* Row 1: Name and Logo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>{t('settings.restaurantName')} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={settings.restaurant_name}
                  onChange={(e) => handleInputChange('restaurant_name', e.target.value)}
                  className={inputClass}
                  placeholder="Enter restaurant name"
                />
              </div>
              <div>
                <label className={labelClass}>{t('settings.restaurantLogo')}</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-xs text-gray-400 text-center px-2">No logo</span>
                    )}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors border border-gray-200">
                    <Upload className="w-4 h-4" />
                    {logoPreview ? t('settings.changeLogo') : t('settings.uploadLogo')}
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Row 2: TRN (Tax), Phone, Email */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className={labelClass}>TRN (Tax Registration Number)</label>
                <input
                  type="text"
                  value={settings.trn || ''}
                  onChange={(e) => handleInputChange('trn', e.target.value)}
                  placeholder="Enter TRN"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('settings.restaurantPhone')}</label>
                <input
                  type="tel"
                  value={settings.restaurant_phone || ''}
                  onChange={(e) => handleInputChange('restaurant_phone', e.target.value)}
                  className={inputClass}
                  placeholder="+123 456 7890"
                />
              </div>
              <div>
                <label className={labelClass}>{t('settings.restaurantEmail')}</label>
                <input
                  type="email"
                  value={settings.restaurant_email || ''}
                  onChange={(e) => handleInputChange('restaurant_email', e.target.value)}
                  className={inputClass}
                  placeholder="info@restaurant.com"
                />
              </div>
            </div>

            {/* Row 3: Address and VAT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>{t('settings.restaurantAddress')}</label>
                <textarea
                  value={settings.restaurant_address || ''}
                  onChange={(e) => handleInputChange('restaurant_address', e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                  placeholder="Street, city, country"
                />
              </div>
              <div>
                <label className={labelClass}>{t('settings.vatPercentage')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={settings.vat_percentage || '0'}
                  onChange={(e) => handleInputChange('vat_percentage', e.target.value)}
                  className={inputClass}
                  placeholder="0"
                />
                <p className={helperClass}>{t('settings.vatPercentageDesc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Receipt & Invoice */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 text-primary-600">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Receipt & Invoice</h2>
                <p className="text-xs text-gray-500">Paper size, print behavior, and invoice format</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>{t('settings.receiptPaperSize')}</label>
                <select
                  value={settings.receipt_paper_size || '80mm'}
                  onChange={(e) => handleInputChange('receipt_paper_size', e.target.value)}
                  className={inputClass}
                >
                  <option value="80mm">80mm (3 inches)</option>
                  <option value="58mm">58mm (2 inches)</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Invoice Type</label>
                <select
                  value={settings.invoice_type || 'thermal'}
                  onChange={(e) => handleInputChange('invoice_type', e.target.value)}
                  className={inputClass}
                >
                  <option value="thermal">Thermal</option>
                  <option value="A4">A4</option>
                </select>
                <p className={helperClass}>Format for printed and preview receipts</p>
              </div>

              <div className="md:col-span-2 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={settings.receipt_auto_print === 'true'}
                    onChange={(e) => handleInputChange('receipt_auto_print', e.target.checked ? 'true' : 'false')}
                    className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{t('settings.autoPrintReceipt')}</span>
                    <p className={helperClass}>{t('settings.autoPrintReceiptDesc')}</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={settings.display_tax_invoice !== 'false'}
                    onChange={(e) => handleInputChange('display_tax_invoice', e.target.checked ? 'true' : 'false')}
                    className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Display &quot;TAX INVOICE&quot; on receipt</span>
                    <p className={helperClass}>When disabled, &quot;TAX INVOICE&quot; will not appear on A4 or thermal invoices</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Language & Currency */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 text-primary-600">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{t('settings.languageCurrency')}</h2>
                <p className="text-xs text-gray-500">Regional formatting for receipts and UI</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>{t('settings.language')}</label>
                <select
                  value={settings.language || 'en'}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className={inputClass}
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>{t('settings.currency')}</label>
                <select
                  value={settings.currency || 'USD'}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className={inputClass}
                >
                  {currencies.map((curr) => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
