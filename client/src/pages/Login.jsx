import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const { t } = useTranslation();
  const { login, clearLastTenantCode } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [useStoredTenant, setUseStoredTenant] = useState(true);
  const [storedTenantCode, setStoredTenantCode] = useState('');

  useEffect(() => {
    setStoredTenantCode(localStorage.getItem('lastTenantCode') || '');
  }, []);

  const showTenantField = !useStoredTenant || !storedTenantCode;
  const effectiveTenantCode = showTenantField ? tenantCode : storedTenantCode;

  const handleUseDifferentTenant = () => {
    clearLastTenantCode();
    setStoredTenantCode('');
    setUseStoredTenant(false);
    setTenantCode('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(username, password, effectiveTenantCode);
    setLoading(false);
    if (result.success && result.user) {
      const u = result.user;
      if (u.role === 'super_admin' || (u.role === 'admin' && !u.tenant_code)) {
        navigate('/tenants');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-3 overflow-hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[calc(100vh-1.5rem)] flex flex-col">
        <div className="p-4 flex-1 min-h-0 overflow-y-auto">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-primary-100 rounded-full mb-2">
              <ShoppingCart className="w-5 h-5 text-primary-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">POS</h1>
            <p className="text-xs text-gray-600 mt-0.5">Point of Sale System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                {t('common.username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                {t('common.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter password"
              />
            </div>

            {showTenantField ? (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Tenant Code <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Leave empty for Super admin / Platform admin"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <span className="text-xs text-gray-600">
                  Tenant: <span className="font-mono font-medium">{storedTenantCode}</span>
                </span>
                <button
                  type="button"
                  onClick={handleUseDifferentTenant}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Use different tenant
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2 text-sm rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('common.loading') : t('common.login')}
            </button>
          </form>

          <div className="mt-3 p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-xs">
            <p className="font-semibold mb-1.5 text-blue-900 text-xs">🔐 Demo Account</p>
            <div className="space-y-1">
              <div>
                <span className="font-medium text-blue-800 text-xs">Tenant:</span>
                <span className="font-mono ml-2 text-xs bg-white px-2 py-0.5 rounded border border-blue-200">DEMO</span>
              </div>
              <div>
                <span className="font-medium text-blue-800 text-xs">User:</span>
                <span className="font-mono ml-2 text-xs bg-white px-2 py-0.5 rounded border border-blue-200">demo</span>
              </div>
              <div>
                <span className="font-medium text-blue-800 text-xs">Pass:</span>
                <span className="font-mono ml-2 text-xs bg-white px-2 py-0.5 rounded border border-blue-200">demo123</span>
              </div>
            </div>
            <p className="mt-2 pt-2 border-t border-blue-200 text-xs text-blue-700">
              <span className="font-medium">Cashier:</span> DEMO / cashier / cashier123
            </p>
            <p className="mt-1.5 text-xs text-blue-600">
              ⚠️ Demo data for testing only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
