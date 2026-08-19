import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { ExpenseCategory } from '../types';
import { Plus, RefreshCw, Tag } from 'lucide-react';
import { isValidCategoryName } from '../utils/validation';

export const ExpenseCategories: React.FC = () => {
  const toast = useToast();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseCategory | null>(null);

  const [newName, setNewName] = useState('');
  const [editData, setEditData] = useState({ name: '', is_active: true });
  const [newNameError, setNewNameError] = useState<string | undefined>(undefined);
  const [editNameError, setEditNameError] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadCategories = async () => {
    setIsLoading(true);
    const res = await fetchAPI<ExpenseCategory[]>('/expense-categories');
    if (res.success && res.data) setCategories(res.data);
    else toast.error(res.error?.message || 'Failed to load expense categories');
    setIsLoading(false);
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const err = isValidCategoryName(newName);
    if (err) {
      setNewNameError(err);
      return;
    }

    setCreating(true);
    const res = await fetchAPI<ExpenseCategory>('/expense-categories', { method: 'POST', body: JSON.stringify({ name: newName }) });
    setCreating(false);
    if (res.success) {
      setShowAddModal(false);
      setNewName('');
      setNewNameError(undefined);
      toast.success('Expense category created.');
      loadCategories();
    } else {
      toast.error(res.error?.message || 'Failed to create expense category');
    }
  };

  const openEdit = (cat: ExpenseCategory) => {
    setEditTarget(cat);
    setEditData({ name: cat.name, is_active: cat.is_active });
    setEditNameError(undefined);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    const err = isValidCategoryName(editData.name);
    if (err) {
      setEditNameError(err);
      return;
    }

    setUpdating(true);
    const res = await fetchAPI<ExpenseCategory>(`/expense-categories/${editTarget.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: editData.name, is_active: editData.is_active }),
    });
    setUpdating(false);
    if (res.success) {
      setEditTarget(null);
      setEditNameError(undefined);
      toast.success('Expense category updated.');
      loadCategories();
    } else {
      toast.error(res.error?.message || 'Failed to update expense category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Expense Category Management</h2>
          <p className="text-xs text-slate-500">Add, rename, and deactivate the categories available when recording an expense (Admin only)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadCategories} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Category
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Category Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {categories.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400 text-sm">{isLoading ? 'Loading categories...' : 'No expense categories configured'}</td></tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">{cat.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${cat.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {cat.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(cat)}>
                        <Tag className="w-3.5 h-3.5 mr-1" /> Edit
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
            <h3 className="text-lg font-bold text-slate-900">Add Expense Category</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                <input type="text" required autoFocus maxLength={50} placeholder="e.g. OFFICE_SUPPLIES"
                  pattern="[A-Z][A-Z0-9_]*" title="Uppercase letters, numbers, and underscores only"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={newName} onChange={(e) => { setNewName(e.target.value); setNewNameError(undefined); }} />
                {newNameError && <p className="text-xs text-rose-600 font-medium mt-1">{newNameError}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setNewNameError(undefined); }}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={creating} disabled={creating}>Create Category</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Edit Category — {editTarget.name}</h3>
            <form onSubmit={handleUpdate} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name</label>
                <input type="text" required maxLength={50}
                  pattern="[A-Z][A-Z0-9_]*" title="Uppercase letters, numbers, and underscores only"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={editData.name} onChange={(e) => { setEditData({ ...editData, name: e.target.value }); setEditNameError(undefined); }} />
                {editNameError && <p className="text-xs text-rose-600 font-medium mt-1">{editNameError}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={editData.is_active ? '1' : '0'} onChange={(e) => setEditData({ ...editData, is_active: e.target.value === '1' })}>
                  <option value="1">Active</option>
                  <option value="0">Deactivated</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-400">Deactivating hides this category from the expense-creation form — existing expenses already recorded against it are unaffected.</p>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setEditTarget(null); setEditNameError(undefined); }}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={updating} disabled={updating}>Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
