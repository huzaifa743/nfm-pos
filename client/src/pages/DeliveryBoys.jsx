import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X, User, Phone, Mail, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function DeliveryBoys() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBoy, setEditingBoy] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    status: 'active',
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDeliveryBoys();
    }
  }, [user]);

  const fetchDeliveryBoys = async () => {
    try {
      const response = await api.get('/delivery-boys');
      setDeliveryBoys(response.data);
    } catch (error) {
      console.error('Error fetching delivery boys:', error);
      toast.error('Failed to load delivery boys');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Delivery boy name is required');
      return;
    }

    try {
      if (editingBoy) {
        await api.put(`/delivery-boys/${editingBoy.id}`, formData);
        toast.success('Delivery boy updated successfully');
      } else {
        await api.post('/delivery-boys', formData);
        toast.success('Delivery boy added successfully');
      }

      setShowModal(false);
      setEditingBoy(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        status: 'active',
      });
      fetchDeliveryBoys();
    } catch (error) {
      console.error('Error saving delivery boy:', error);
      toast.error(error.response?.data?.error || 'Failed to save delivery boy');
    }
  };

  const handleEdit = (boy) => {
    setEditingBoy(boy);
    setFormData({
      name: boy.name || '',
      phone: boy.phone || '',
      email: boy.email || '',
      address: boy.address || '',
      status: boy.status || 'active',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this delivery boy?')) {
      return;
    }

    try {
      await api.delete(`/delivery-boys/${id}`);
      toast.success('Delivery boy deleted successfully');
      fetchDeliveryBoys();
    } catch (error) {
      console.error('Error deleting delivery boy:', error);
      toast.error(error.response?.data?.error || 'Failed to delete delivery boy');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You don't have permission to access this page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Delivery Boys Management</h1>
        <button
          onClick={() => {
            setEditingBoy(null);
            setFormData({
              name: '',
              phone: '',
              email: '',
              address: '',
              status: 'active',
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Delivery Boy
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveryBoys.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No delivery boys found. Add your first delivery boy to get started.
                    </td>
                  </tr>
                ) : (
                  deliveryBoys.map((boy) => (
                    <tr key={boy.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{boy.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {boy.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {boy.phone}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {boy.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {boy.email}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {boy.address ? (
                          <div className="flex items-start gap-1 max-w-xs">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="truncate">{boy.address}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            boy.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {boy.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(boy.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(boy)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(boy.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingBoy ? 'Edit Delivery Boy' : 'Add Delivery Boy'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingBoy(null);
                  setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                    status: 'active',
                  });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBoy(null);
                    setFormData({
                      name: '',
                      phone: '',
                      email: '',
                      address: '',
                      status: 'active',
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingBoy ? 'Update' : 'Add'} Delivery Boy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
