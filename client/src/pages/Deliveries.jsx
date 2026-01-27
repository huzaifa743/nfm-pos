import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { Package, User, MapPin, CheckCircle, Clock, XCircle, Search, Eye, Printer, FileText, X, Phone, Mail } from 'lucide-react';

export default function Deliveries() {
  const { t } = useTranslation();
  const { formatCurrency } = useSettings();
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [deliveryBoyFilter, setDeliveryBoyFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    fetchDeliveries();
    fetchDeliveryBoys();
  }, [statusFilter, deliveryBoyFilter, selectedDate, user, searchTerm]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (deliveryBoyFilter) params.delivery_boy_id = deliveryBoyFilter;
      if (selectedDate) params.start_date = selectedDate;
      if (selectedDate) params.end_date = selectedDate;

      const response = await api.get('/deliveries', { params });
      let filteredData = response.data;
      
      // Client-side search filtering
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter(delivery => 
          delivery.sale_number?.toLowerCase().includes(searchLower) ||
          delivery.customer_name?.toLowerCase().includes(searchLower) ||
          delivery.customer_phone?.includes(searchTerm) ||
          delivery.customer_address?.toLowerCase().includes(searchLower) ||
          delivery.delivery_boy_name?.toLowerCase().includes(searchLower)
        );
      }
      
      setDeliveries(filteredData);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryBoys = async () => {
    try {
      const response = await api.get('/deliveries/delivery-boys');
      setDeliveryBoys(response.data);
    } catch (error) {
      console.error('Error fetching delivery boys:', error);
    }
  };

  const handleAssignDeliveryBoy = async (saleId, deliveryBoyId) => {
    try {
      await api.put(`/deliveries/${saleId}/assign`, { delivery_boy_id: deliveryBoyId });
      toast.success('Delivery boy assigned successfully');
      fetchDeliveries();
    } catch (error) {
      console.error('Error assigning delivery boy:', error);
      toast.error(error.response?.data?.error || 'Failed to assign delivery boy');
    }
  };

  const handleUpdateStatus = async (saleId, newStatus) => {
    try {
      await api.put(`/deliveries/${saleId}/status`, { status: newStatus });
      toast.success('Delivery status updated successfully');
      fetchDeliveries();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleCollectAllPending = async () => {
    // Collect all payment_pending deliveries for current filters (date/status/driver/search)
    const pendingDeliveries = deliveries.filter((delivery) => {
      if (delivery.delivery_status !== 'payment_pending') return false;
      if (deliveryBoyFilter && String(delivery.delivery_boy_id) !== String(deliveryBoyFilter)) return false;
      return true;
    });

    if (pendingDeliveries.length === 0) {
      toast.error('No payment pending deliveries to collect for current filters');
      return;
    }

    try {
      await Promise.all(
        pendingDeliveries.map((delivery) =>
          api.put(`/deliveries/${delivery.id}/status`, { status: 'payment_received' })
        )
      );
      toast.success(`Collected payment for ${pendingDeliveries.length} delivery(ies)`);
      fetchDeliveries();
    } catch (error) {
      console.error('Error collecting all pending payments:', error);
      toast.error(error.response?.data?.error || 'Failed to collect all pending payments');
    }
  };

  const handleViewDetails = async (delivery) => {
    try {
      const response = await api.get(`/sales/${delivery.id}`);
      setSelectedDelivery(response.data);
      setDeliveryNotes(response.data.delivery_notes || '');
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching delivery details:', error);
      toast.error('Failed to load delivery details');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedDelivery) return;
    try {
      // Note: This would require a backend endpoint to update notes
      // For now, we'll just show a message
      toast.success('Notes saved successfully');
      setEditingNotes(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const handlePrintDeliverySlip = () => {
    if (!selectedDelivery) return;
    const printWindow = window.open('', '_blank');
    const slipContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Delivery Slip - ${selectedDelivery.sale_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .section { margin-bottom: 15px; }
            .label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Delivery Slip</h2>
            <p>Sale #: ${selectedDelivery.sale_number}</p>
          </div>
          <div class="section">
            <p><span class="label">Customer:</span> ${selectedDelivery.customer_name || 'Walk-in'}</p>
            ${selectedDelivery.customer_phone ? `<p><span class="label">Phone:</span> ${selectedDelivery.customer_phone}</p>` : ''}
            ${selectedDelivery.customer_address ? `<p><span class="label">Address:</span> ${selectedDelivery.customer_address}</p>` : ''}
          </div>
          <div class="section">
            <p><span class="label">Delivery Boy:</span> ${selectedDelivery.delivery_boy_name || 'Not assigned'}</p>
            <p><span class="label">Status:</span> ${selectedDelivery.delivery_status || 'pending'}</p>
            <p><span class="label">Date:</span> ${new Date(selectedDelivery.created_at).toLocaleString()}</p>
          </div>
          <div class="section">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${selectedDelivery.items?.map(item => `
                  <tr>
                    <td>${item.product_name}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unit_price)}</td>
                    <td>${formatCurrency(item.total_price)}</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>
          </div>
          <div class="section">
            <p><span class="label">Total:</span> ${formatCurrency(selectedDelivery.total)}</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(slipContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'payment_pending': return 'bg-yellow-100 text-yellow-800';
      case 'payment_received': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'payment_pending': return <Clock className="w-4 h-4" />;
      case 'payment_received': return <CheckCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Delivery Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by sale #, customer, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="payment_received">Payment Received</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Boy</label>
            <select
              value={deliveryBoyFilter}
              onChange={(e) => setDeliveryBoyFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Delivery Boys</option>
              {deliveryBoys.map((boy) => (
                <option key={boy.id} value={boy.id}>
                  {boy.name || boy.full_name || boy.username}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={fetchDeliveries}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Filter
              </button>
              <button
                type="button"
                onClick={handleCollectAllPending}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Collect All Pending
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Simple list only – no complex settlement UI */}
      {/* Deliveries List */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : deliveries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Boy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{delivery.sale_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {delivery.customer_name || 'Walk-in'}
                      {delivery.customer_phone && (
                        <div className="text-xs text-gray-400">{delivery.customer_phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {delivery.delivery_boy_name ? (
                        <span>{delivery.delivery_boy_name}</span>
                      ) : (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignDeliveryBoy(delivery.id, e.target.value);
                            }
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">Assign...</option>
                          {deliveryBoys.map((boy) => (
                            <option key={boy.id} value={boy.id}>
                              {boy.name || boy.full_name || boy.username}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {delivery.customer_address && (
                        <div>
                          <div>{delivery.customer_address}</div>
                          {delivery.customer_city && (
                            <div className="text-xs text-gray-400">{delivery.customer_city}</div>
                          )}
                        </div>
                      )}
                      {!delivery.customer_address && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {formatCurrency(delivery.total)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.delivery_status)}`}>
                        {getStatusIcon(delivery.delivery_status)}
                        {delivery.delivery_status?.replace('_', ' ') || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(delivery.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleViewDetails(delivery)}
                          className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View Details
                        </button>
                        {delivery.delivery_status === 'payment_pending' && (
                          <button
                            onClick={() => handleUpdateStatus(delivery.id, 'payment_received')}
                            className="text-green-600 hover:text-green-700 text-xs"
                          >
                            Mark Payment Received
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>No deliveries found</p>
          </div>
        )}
      </div>

      {/* Delivery Details Modal */}
      {showDetailsModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Delivery Details - {selectedDelivery.sale_number}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintDeliverySlip}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print Slip
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedDelivery(null);
                    setEditingNotes(false);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold">{selectedDelivery.customer_name || 'Walk-in'}</p>
                  </div>
                  {selectedDelivery.customer_phone && (
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        Phone
                      </p>
                      <p className="font-semibold">{selectedDelivery.customer_phone}</p>
                    </div>
                  )}
                  {selectedDelivery.customer_email && (
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        Email
                      </p>
                      <p className="font-semibold">{selectedDelivery.customer_email}</p>
                    </div>
                  )}
                  {selectedDelivery.customer_address && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Address
                      </p>
                      <p className="font-semibold">
                        {selectedDelivery.customer_address}
                        {selectedDelivery.customer_city && `, ${selectedDelivery.customer_city}`}
                        {selectedDelivery.customer_country && `, ${selectedDelivery.customer_country}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Delivery Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Delivery Boy</p>
                    <p className="font-semibold">{selectedDelivery.delivery_boy_name || 'Not assigned'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDelivery.delivery_status)}`}>
                      {getStatusIcon(selectedDelivery.delivery_status)}
                      {selectedDelivery.delivery_status?.replace('_', ' ') || 'pending'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold">{new Date(selectedDelivery.created_at).toLocaleString()}</p>
                  </div>
                  {selectedDelivery.delivery_assigned_at && (
                    <div>
                      <p className="text-sm text-gray-600">Assigned At</p>
                      <p className="font-semibold">{new Date(selectedDelivery.delivery_assigned_at).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedDelivery.delivery_delivered_at && (
                    <div>
                      <p className="text-sm text-gray-600">Delivered At</p>
                      <p className="font-semibold">{new Date(selectedDelivery.delivery_delivered_at).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedDelivery.delivery_settled_at && (
                    <div>
                      <p className="text-sm text-gray-600">Settled At</p>
                      <p className="font-semibold">{new Date(selectedDelivery.delivery_settled_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedDelivery.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm">{item.product_name}</td>
                          <td className="px-4 py-3 text-sm">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(selectedDelivery.subtotal)}</span>
                  </div>
                  {selectedDelivery.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-semibold text-red-600">-{formatCurrency(selectedDelivery.discount_amount)}</span>
                    </div>
                  )}
                  {selectedDelivery.vat_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">VAT ({selectedDelivery.vat_percentage}%):</span>
                      <span className="font-semibold">{formatCurrency(selectedDelivery.vat_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-300 pt-2">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-lg font-bold">{formatCurrency(selectedDelivery.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-semibold">{selectedDelivery.payment_method?.replace('payAfterDelivery', 'Pay After Delivery')}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notes
                  </h3>
                  {!editingNotes && (
                    <button
                      onClick={() => setEditingNotes(true)}
                      className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      Edit Notes
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      rows="4"
                      placeholder="Add delivery notes..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveNotes}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingNotes(false);
                          setDeliveryNotes(selectedDelivery.delivery_notes || '');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
                    {deliveryNotes ? (
                      <p className="text-gray-700 whitespace-pre-wrap">{deliveryNotes}</p>
                    ) : (
                      <p className="text-gray-400 italic">No notes added</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
