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
  Users,
  UserPlus,
  AlertTriangle,
  Clock,
  ArrowUp,
  ArrowDown,
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

const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#14b8a6', '#f97316'];

export default function Dashboard() {
  const { t } = useTranslation();
  const { formatCurrency } = useSettings();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, chartsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get(`/dashboard/charts?period=${period}`),
      ]);

      setStats(statsRes.data);
      setCharts(chartsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format payment method name for display
  const formatPaymentMethod = (method) => {
    if (!method) return 'Unknown';
    const methodMap = {
      'cash': 'Cash',
      'card': 'Card',
      'online': 'Online',
      'payAfterDelivery': 'Pay After Delivery'
    };
    if (methodMap[method]) {
      return methodMap[method];
    }
    return method
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Format date for chart display
  const formatChartDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Check if it's a time format (HH:00) or date format
      if (dateString.includes(':')) {
        return dateString;
      }
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      return dateString;
    }
  };

  // Format date and time for recent sales
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return dateString;
    }
  };

  // Get period label
  const getPeriodLabel = () => {
    const labels = {
      'today': 'Today',
      '7': 'Last 7 Days',
      '30': 'Last 30 Days',
      'month': 'This Month'
    };
    return labels[period] || 'Today';
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
      comparison: stats?.comparisons?.salesVsYesterday,
      comparisonLabel: 'vs Yesterday'
    },
    {
      title: t('dashboard.totalRevenueToday'),
      value: formatCurrency(stats?.totalRevenueToday || 0),
      icon: DollarSign,
      color: 'bg-green-500',
      comparison: stats?.comparisons?.revenueVsYesterday,
      comparisonLabel: 'vs Yesterday'
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
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white text-sm font-medium"
        >
          <option value="today">Today</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Comparison Metrics */}
      {stats?.comparisons && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Revenue vs Yesterday</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-800">
                    {stats.comparisons.revenueVsYesterday > 0 ? '+' : ''}
                    {stats.comparisons.revenueVsYesterday.toFixed(1)}%
                  </span>
                  {stats.comparisons.revenueVsYesterday >= 0 ? (
                    <ArrowUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDown className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Yesterday: {formatCurrency(stats.comparisons.yesterdayRevenue || 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Sales vs Yesterday</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-800">
                    {stats.comparisons.salesVsYesterday > 0 ? '+' : ''}
                    {stats.comparisons.salesVsYesterday.toFixed(1)}%
                  </span>
                  {stats.comparisons.salesVsYesterday >= 0 ? (
                    <ArrowUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDown className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Yesterday: {stats.comparisons.yesterdaySales || 0} sales
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Revenue vs Last Week (Avg)</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-800">
                    {stats.comparisons.revenueVsLastWeek > 0 ? '+' : ''}
                    {stats.comparisons.revenueVsLastWeek.toFixed(1)}%
                  </span>
                  {stats.comparisons.revenueVsLastWeek >= 0 ? (
                    <ArrowUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDown className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Last Week Avg: {formatCurrency(stats.comparisons.lastWeekAvgRevenue || 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Sales vs Last Week (Avg)</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-800">
                    {stats.comparisons.salesVsLastWeek > 0 ? '+' : ''}
                    {stats.comparisons.salesVsLastWeek.toFixed(1)}%
                  </span>
                  {stats.comparisons.salesVsLastWeek >= 0 ? (
                    <ArrowUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDown className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Last Week Avg: {(stats.comparisons.lastWeekAvgSales || 0).toFixed(1)} sales/day
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                  {card.comparison !== undefined && (
                    <div className="flex items-center gap-1 mt-1">
                      {card.comparison >= 0 ? (
                        <ArrowUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-red-500" />
                      )}
                      <span className={`text-xs ${card.comparison >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {card.comparison > 0 ? '+' : ''}{card.comparison.toFixed(1)}% {card.comparisonLabel}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Customers</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.totalCustomers || 0}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">New Customers Today</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.newCustomersToday || 0}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Over Time */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Sales Over Time - {getPeriodLabel()}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={charts?.salesOverTime || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatChartDate}
                angle={period === 'today' ? 0 : -45}
                textAnchor={period === 'today' ? 'middle' : 'end'}
                height={period === 'today' ? 40 : 60}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'Revenue') {
                    return [formatCurrency(value), name];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => formatChartDate(label)}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="count"
                stroke="#0ea5e9"
                name="Sales Count"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                name="Revenue"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Payment Method */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Revenue by Payment Method - {getPeriodLabel()}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={charts?.revenueByPayment || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ payment_method, percent }) =>
                  `${formatPaymentMethod(payment_method)} ${(percent * 100).toFixed(0)}%`
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
              <Tooltip 
                formatter={(value, name, props) => [
                  formatCurrency(value),
                  formatPaymentMethod(props.payload.payment_method)
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Categories Chart */}
      {charts?.topCategories && charts.topCategories.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Top Categories by Revenue - {getPeriodLabel()}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={charts.topCategories}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#0ea5e9" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Sales and Low Stock Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Recent Sales</h3>
          </div>
          {stats?.recentSales && stats.recentSales.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {formatCurrency(sale.total)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-500">
                        {sale.customer_name || 'Walk-in Customer'}
                      </p>
                      <span className="text-gray-400">•</span>
                      <p className="text-sm text-gray-500">
                        {formatPaymentMethod(sale.payment_method)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(sale.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent sales</p>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-800">Low Stock Alerts</h3>
          </div>
          {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{product.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Stock: <span className={`font-semibold ${product.stock_quantity <= 5 ? 'text-red-600' : 'text-orange-600'}`}>
                        {product.stock_quantity}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">All products are well stocked</p>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {t('dashboard.highSellingProducts')} (Top 5) - Today
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
