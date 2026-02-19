import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X } from 'lucide-react';

const BASE_UNITS = [
  'kg', 'g', 'mg', 'ton',
  'piece', 'pcs', 'box', 'carton', 'pack', 'packet',
  'liter', 'ml', 'gallon',
  'meter', 'cm', 'mm', 'km',
  'dozen', 'pair', 'set', 'unit'
];

export default function UnitConversion() {
  const { user } = useAuth();
  const [conversions, setConversions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingConversion, setEditingConversion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    base_unit: '',
    operator: '*',
    operation_value: ''
  });

  useEffect(() => {
    fetchConversions();
  }, []);

  const fetchConversions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/unit-conversions');
      setConversions(response.data);
    } catch (error) {
      console.error('Error fetching conversions:', error);
      toast.error('Failed to load unit conversions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setEditingConversion(null);
    setFormData({
      code: '',
      name: '',
      base_unit: '',
      operator: '*',
      operation_value: ''
    });
    setShowModal(true);
  };

  const handleEdit = (conversion) => {
    setEditingConversion(conversion);
    setFormData({
      code: conversion.code,
      name: conversion.name,
      base_unit: conversion.base_unit,
      operator: conversion.operator,
      operation_value: conversion.operation_value
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this unit conversion?')) {
      return;
    }

    try {
      await api.delete(`/unit-conversions/${id}`);
      toast.success('Unit conversion deleted successfully');
      fetchConversions();
    } catch (error) {
      console.error('Error deleting conversion:', error);
      toast.error(error.response?.data?.error || 'Failed to delete unit conversion');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.code || !formData.name || !formData.base_unit || !formData.operation_value) {
      toast.error('All fields are required');
      return;
    }

    if (formData.operation_value <= 0) {
      toast.error('Operation value must be greater than 0');
      return;
    }

    try {
      if (editingConversion) {
        await api.put(`/unit-conversions/${editingConversion.id}`, formData);
        toast.success('Unit conversion updated successfully');
      } else {
        await api.post('/unit-conversions', formData);
        toast.success('Unit conversion added successfully');
      }
      setShowModal(false);
      fetchConversions();
    } catch (error) {
      console.error('Error saving conversion:', error);
      toast.error(error.response?.data?.error || 'Failed to save unit conversion');
    }
  };

  const calculateConversion = (conversion) => {
    const value = parseFloat(conversion.operation_value);
    if (conversion.operator === '*') {
      return `1 ${conversion.name} = ${value} ${conversion.base_unit}`;
    } else {
      return `1 ${conversion.name} = ${(1 / value).toFixed(4)} ${conversion.base_unit}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Unit Conversion</h1>
        {user?.role === 'admin' && (
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Conversion
          </button>
        )}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Base Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operation Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversion
                  </th>
                  {user?.role === 'admin' && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {conversions.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === 'admin' ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                      No unit conversions found. Click "Add New Conversion" to create one.
                    </td>
                  </tr>
                ) : (
                  conversions.map((conversion) => (
                    <tr key={conversion.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {conversion.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {conversion.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {conversion.base_unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                          {conversion.operator}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {conversion.operation_value}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {calculateConversion(conversion)}
                      </td>
                      {user?.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(conversion)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Edit"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(conversion.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      )}
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
                {editingConversion ? 'Edit Unit Conversion' : 'Add New Conversion'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., BOX001"
                />
              </div>

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
                  placeholder="e.g., Box"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Unit *
                </label>
                <select
                  required
                  value={formData.base_unit}
                  onChange={(e) => setFormData({ ...formData, base_unit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select base unit</option>
                  {BASE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operator *
                </label>
                <select
                  required
                  value={formData.operator}
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="*">Multiply (*)</option>
                  <option value="/">Divide (/)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operation Value *
                </label>
                <input
                  type="number"
                  required
                  min="0.0001"
                  step="0.0001"
                  value={formData.operation_value}
                  onChange={(e) => setFormData({ ...formData, operation_value: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., 20"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.operator === '*' 
                    ? `1 ${formData.name || '[Name]'} = ${formData.operation_value || '?'} ${formData.base_unit || '[Base Unit]'}`
                    : `1 ${formData.name || '[Name]'} = ${formData.operation_value ? (1 / parseFloat(formData.operation_value)).toFixed(4) : '?'} ${formData.base_unit || '[Base Unit]'}`
                  }
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingConversion ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
