import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import api from '../api/api';
import {
  DollarSign,
  ShoppingBag,
  Package,
  Folder,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function Dashboard() {
  const { t } = useTranslation();
  const { formatCurrency } = useSettings();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, chartsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/charts?period=7'),
      ]);

      setStats(statsRes.data);
      setCharts(chartsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: t('dashboard.totalSalesToday'),
      value: stats?.totalSalesToday || 0,
      icon: ShoppingBag,
      color: 'bg-blue-500',
    },
    {
      title: t('dashboard.totalRevenueToday'),
      value: formatCurrency(stats?.totalRevenueToday || 0),
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: t('dashboard.totalProducts'),
      value: stats?.totalProducts || 0,
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      title: t('dashboard.totalCategories'),
      value: stats?.totalCategories || 0,
      icon: Folder,
      color: 'bg-orange-500',
    },
    {
      title: t('dashboard.avgSaleValue'),
      value: formatCurrency(stats?.avgSaleValue || 0),
      icon: TrendingUp,
      color: 'bg-pink-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">{t('dashboard.title')}</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Over Time */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Sales Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={charts?.salesOverTime || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#0ea5e9"
                name="Sales Count"
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Payment Method */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Revenue by Payment Method
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={charts?.revenueByPayment || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="total"
              >
                {(charts?.revenueByPayment || []).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {t('dashboard.highSellingProducts')} (Top 5)
        </h3>
        {stats?.topProducts && stats.topProducts.length > 0 ? (
          <div className="space-y-3">
            {stats.topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      Quantity: {product.total_quantity}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">
                    {formatCurrency(product.total_revenue || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No sales data available</p>
        )}
      </div>
    </div>
  );
}
