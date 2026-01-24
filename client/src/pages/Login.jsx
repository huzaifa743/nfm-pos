import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(username, password, tenantCode);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-4 overflow-y-auto max-h-[95vh]">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-3">
              <ShoppingCart className="w-6 h-6 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">POS</h1>
            <p className="text-sm text-gray-600 mt-1">Point of Sale System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('common.username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('common.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter password"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tenant Code <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter tenant code"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for super admin
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2.5 text-sm rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('common.loading') : t('common.login')}
            </button>
          </form>

          <div className="mt-5 p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs">
            <p className="font-semibold mb-2 text-blue-900 text-xs">🔐 Demo Account</p>
            <div className="space-y-1.5">
              <div>
                <span className="font-medium text-blue-800 text-xs">Tenant:</span>
                <span className="font-mono ml-2 text-xs bg-white px-2 py-1 rounded border border-blue-200">DEMO</span>
              </div>
              <div>
                <span className="font-medium text-blue-800 text-xs">User:</span>
                <span className="font-mono ml-2 text-xs bg-white px-2 py-1 rounded border border-blue-200">demo</span>
              </div>
              <div>
                <span className="font-medium text-blue-800 text-xs">Pass:</span>
                <span className="font-mono ml-2 text-xs bg-white px-2 py-1 rounded border border-blue-200">demo123</span>
              </div>
            </div>
            
            <p className="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-700">
              <span className="font-medium">Cashier:</span> DEMO / cashier / cashier123
            </p>
            
            <p className="mt-2 text-xs text-blue-600">
              ⚠️ Demo data for testing only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
