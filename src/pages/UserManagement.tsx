import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { User } from '../types';
import { Plus, RefreshCw, ShieldCheck, UserCog } from 'lucide-react';
import { isRequired, isValidEmail, isMinLength, hasErrors } from '../utils/validation';

export const UserManagement: React.FC = () => {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    username: '', full_name: '', email: '', password: '', role: 'STAFF' as 'STAFF' | 'ADMIN',
  });
  const [editData, setEditData] = useState({ full_name: '', email: '', role: 'STAFF' as 'STAFF' | 'ADMIN', is_active: true, password: '' });
  const [createErrors, setCreateErrors] = useState<Record<string, string | undefined>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string | undefined>>({});
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    const res = await fetchAPI<User[]>('/users');
    if (res.success && res.data) setUsers(res.data);
    else toast.error(res.error?.message || 'Failed to load users');
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors: Record<string, string | undefined> = {
      username: isRequired(formData.username, 'Username'),
      full_name: isRequired(formData.full_name, 'Full name'),
      email: isRequired(formData.email, 'Email') || isValidEmail(formData.email),
      password: isMinLength(formData.password, 8, 'Password'),
    };
    if (hasErrors(fieldErrors)) {
      setCreateErrors(fieldErrors);
      return;
    }

    setCreating(true);
    const res = await fetchAPI<User>('/users', { method: 'POST', body: JSON.stringify(formData) });
    setCreating(false);
    if (res.success) {
      setShowAddModal(false);
      setFormData({ username: '', full_name: '', email: '', password: '', role: 'STAFF' });
      setCreateErrors({});
      toast.success('User account created.');
      loadUsers();
    } else {
      toast.error(res.error?.message || 'Failed to create user');
    }
  };

  const openEdit = (u: User) => {
    setEditTarget(u);
    setEditData({ full_name: u.full_name, email: u.email, role: u.role, is_active: u.is_active ?? true, password: '' });
    setEditErrors({});
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    const fieldErrors: Record<string, string | undefined> = {
      email: isValidEmail(editData.email),
      password: editData.password ? isMinLength(editData.password, 8, 'Password') : undefined,
    };
    if (hasErrors(fieldErrors)) {
      setEditErrors(fieldErrors);
      return;
    }

    const payload: Record<string, unknown> = {
      full_name: editData.full_name, email: editData.email, role: editData.role, is_active: editData.is_active,
    };
    if (editData.password) payload.password = editData.password;

    setUpdating(true);
    const res = await fetchAPI<User>(`/users/${editTarget.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    setUpdating(false);
    if (res.success) {
      setEditTarget(null);
      setEditErrors({});
      toast.success('User account updated.');
      loadUsers();
    } else {
      toast.error(res.error?.message || 'Failed to update user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User &amp; Role Management</h2>
          <p className="text-xs text-slate-500">Manage staff and administrator accounts (Admin only)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add User
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">{isLoading ? 'Loading users...' : 'No users found'}</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{u.username}</td>
                    <td className="px-4 py-3 font-medium">{u.full_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 ${u.role === 'ADMIN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {u.role === 'ADMIN' && <ShieldCheck className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                        <UserCog className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add User Account</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
                <input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={formData.username} onChange={(e) => { setFormData({ ...formData, username: e.target.value }); setCreateErrors((prev) => ({ ...prev, username: undefined })); }} />
                {createErrors.username && <p className="text-xs text-rose-600 font-medium mt-1">{createErrors.username}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={formData.full_name} onChange={(e) => { setFormData({ ...formData, full_name: e.target.value }); setCreateErrors((prev) => ({ ...prev, full_name: undefined })); }} />
                {createErrors.full_name && <p className="text-xs text-rose-600 font-medium mt-1">{createErrors.full_name}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                <input type="email" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={formData.email} onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setCreateErrors((prev) => ({ ...prev, email: undefined })); }} />
                {createErrors.email && <p className="text-xs text-rose-600 font-medium mt-1">{createErrors.email}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                  <input type="password" required minLength={8} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.password} onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setCreateErrors((prev) => ({ ...prev, password: undefined })); }} />
                  {createErrors.password && <p className="text-xs text-rose-600 font-medium mt-1">{createErrors.password}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as 'STAFF' | 'ADMIN' })}>
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setCreateErrors({}); }}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={creating} disabled={creating}>Create User</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Edit User — {editTarget.username}</h3>
            <form onSubmit={handleUpdate} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input type="email" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={editData.email} onChange={(e) => { setEditData({ ...editData, email: e.target.value }); setEditErrors((prev) => ({ ...prev, email: undefined })); }} />
                {editErrors.email && <p className="text-xs text-rose-600 font-medium mt-1">{editErrors.email}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value as 'STAFF' | 'ADMIN' })}>
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={editData.is_active ? '1' : '0'} onChange={(e) => setEditData({ ...editData, is_active: e.target.value === '1' })}>
                    <option value="1">Active</option>
                    <option value="0">Deactivated</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reset Password (optional)</label>
                <input type="password" minLength={8} placeholder="Leave blank to keep current password"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={editData.password} onChange={(e) => { setEditData({ ...editData, password: e.target.value }); setEditErrors((prev) => ({ ...prev, password: undefined })); }} />
                {editErrors.password && <p className="text-xs text-rose-600 font-medium mt-1">{editErrors.password}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setEditTarget(null); setEditErrors({}); }}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={updating} disabled={updating}>Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
