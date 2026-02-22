import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { Shield, Activity, Key, Building2, Plus, Pencil, Trash2 } from 'lucide-react';

const ACTION_LABELS = {
  tenant_created: 'Tenant created',
  tenant_request_created: 'Tenant request created',
  tenant_approved: 'Tenant approved',
  tenant_rejected: 'Tenant rejected',
  tenant_status_changed: 'Tenant status changed',
  credentials_changed: 'Credentials changed',
  admin_created: 'Platform admin created',
  admin_deleted: 'Platform admin deleted'
};

export default function Superadmin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('activity');
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [adminForm, setAdminForm] = useState({ username: '', password: '', full_name: '', email: '' });
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [adminEditForm, setAdminEditForm] = useState({ username: '', password: '' });
  const [ownerCredForm, setOwnerCredForm] = useState({ tenant_id: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [showOwnerCredModal, setShowOwnerCredModal] = useState(false);

  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    if (tab === 'activity') fetchActivity();
    if (tab === 'credentials') {
      fetchAdmins();
      fetchTenants();
    }
  }, [user, tab]);

  const fetchActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await api.get('/superadmin/activity');
      setActivity(res.data);
    } catch (e) {
      toast.error('Failed to load activity log');
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/superadmin/admins');
      setAdmins(res.data);
    } catch (e) {
      toast.error('Failed to load admins');
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await api.get('/tenants');
      setTenants(res.data);
    } catch (e) {
      toast.error('Failed to load tenants');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!adminForm.username || !adminForm.password) {
      toast.error('Username and password required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/superadmin/admins', adminForm);
      toast.success('Admin created');
      setAdminForm({ username: '', password: '', full_name: '', email: '' });
      setShowCreateAdminModal(false);
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    if (!editingAdminId) return;
    if (!adminEditForm.username && !adminEditForm.password) {
      toast.error('Enter username and/or password');
      return;
    }
    setLoading(true);
    try {
      await api.put(`/superadmin/admins/${editingAdminId}`, {
        username: adminEditForm.username || undefined,
        password: adminEditForm.password || undefined
      });
      toast.success('Admin updated');
      setEditingAdminId(null);
      setAdminEditForm({ username: '', password: '' });
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerCredSubmit = async (e) => {
    e.preventDefault();
    if (!ownerCredForm.tenant_id || !ownerCredForm.username || !ownerCredForm.password) {
      toast.error('Select tenant and enter new username and password');
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/tenants/${ownerCredForm.tenant_id}/owner-credentials`, {
        username: ownerCredForm.username,
        password: ownerCredForm.password
      });
      toast.success('Tenant owner credentials updated');
      setOwnerCredForm({ tenant_id: '', username: '', password: '' });
      setShowOwnerCredModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Access denied. Super admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-800">Superadmin</h1>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('activity')}
          className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 ${
            tab === 'activity' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Activity className="w-5 h-5" /> Activity Log
        </button>
        <button
          onClick={() => setTab('credentials')}
          className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 ${
            tab === 'credentials' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Key className="w-5 h-5" /> Credentials
        </button>
      </div>

      {tab === 'activity' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">All admin & superadmin activity</h2>
            <button
              onClick={fetchActivity}
              disabled={activityLoading}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Refresh
            </button>
          </div>
          {activityLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : activity.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No activity yet.</div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activity.map((row) => (
                    <tr key={row.id} className="bg-white">
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{row.actor_username}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${row.actor_type === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {row.actor_type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{ACTION_LABELS[row.action] || row.action}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{row.target_type}{row.target_id ? ` #${row.target_id}` : ''}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">{row.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'credentials' && (
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Platform admins</h2>
              <button
                type="button"
                onClick={() => setShowCreateAdminModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create admin
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Full name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {admins.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2 text-sm font-medium">{a.username}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{a.full_name || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{a.email || '—'}</td>
                      <td className="px-4 py-2">
                        {editingAdminId === a.id ? (
                          <form onSubmit={handleUpdateAdmin} className="flex flex-wrap gap-2 items-end">
                            <input
                              type="text"
                              value={adminEditForm.username}
                              onChange={(e) => setAdminEditForm((f) => ({ ...f, username: e.target.value }))}
                              className="w-32 px-2 py-1 border rounded text-sm"
                              placeholder="Username"
                            />
                            <input
                              type="password"
                              value={adminEditForm.password}
                              onChange={(e) => setAdminEditForm((f) => ({ ...f, password: e.target.value }))}
                              className="w-32 px-2 py-1 border rounded text-sm"
                              placeholder="New password"
                            />
                            <button type="submit" disabled={loading} className="text-sm px-2 py-1 bg-green-600 text-white rounded">Save</button>
                            <button type="button" onClick={() => { setEditingAdminId(null); setAdminEditForm({ username: '', password: '' }); }} className="text-sm px-2 py-1 bg-gray-200 rounded">Cancel</button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => { setEditingAdminId(a.id); setAdminEditForm({ username: a.username, password: '' }); }}
                              className="p-1.5 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded"
                              title="Edit"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm('Delete this admin?')) return;
                                try {
                                  await api.delete(`/superadmin/admins/${a.id}`);
                                  toast.success('Admin deleted');
                                  fetchAdmins();
                                } catch (err) {
                                  toast.error(err.response?.data?.error || 'Failed');
                                }
                              }}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create admin modal */}
          {showCreateAdminModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Create new admin</h3>
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={adminForm.username}
                      onChange={(e) => setAdminForm((f) => ({ ...f, username: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={adminForm.password}
                      onChange={(e) => setAdminForm((f) => ({ ...f, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                    <input
                      type="text"
                      value={adminForm.full_name}
                      onChange={(e) => setAdminForm((f) => ({ ...f, full_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Email"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      Create admin
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCreateAdminModal(false); setAdminForm({ username: '', password: '', full_name: '', email: '' }); }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Change tenant owner credentials
            </h2>
            <p className="text-sm text-gray-600 mb-4">Update the login username and password for a tenant owner.</p>
            <button
              type="button"
              onClick={() => setShowOwnerCredModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Key className="w-5 h-5" />
              Update tenant owner credentials
            </button>
          </div>

          {/* Update tenant owner credentials modal */}
          {showOwnerCredModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Update tenant owner credentials</h3>
                <form onSubmit={handleOwnerCredSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                    <select
                      required
                      value={ownerCredForm.tenant_id}
                      onChange={(e) => setOwnerCredForm((f) => ({ ...f, tenant_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select tenant</option>
                      {tenants.filter((t) => t.status !== 'pending').map((t) => (
                        <option key={t.id} value={t.id}>{t.restaurant_name} ({t.tenant_code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New username *</label>
                    <input
                      type="text"
                      required
                      value={ownerCredForm.username}
                      onChange={(e) => setOwnerCredForm((f) => ({ ...f, username: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New password *</label>
                    <input
                      type="password"
                      required
                      value={ownerCredForm.password}
                      onChange={(e) => setOwnerCredForm((f) => ({ ...f, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Password"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      Update credentials
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowOwnerCredModal(false); setOwnerCredForm({ tenant_id: '', username: '', password: '' }); }}
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
      )}
    </div>
  );
}
