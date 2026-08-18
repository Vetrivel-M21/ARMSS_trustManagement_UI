import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, RefreshCw, Layers } from 'lucide-react';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { Scheme } from '../types';

export const Schemes: React.FC = () => {
  const toast = useToast();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER'] as const;
  const emptyPrices = () => ({
    VEG: { BREAKFAST: '', LUNCH: '', DINNER: '' },
    NON_VEG: { BREAKFAST: '', LUNCH: '', DINNER: '' },
  });

  const [formData, setFormData] = useState({
    description: '',
    prices: emptyPrices(),
  });

  const loadSchemes = async () => {
    setIsLoading(true);
    const res = await fetchAPI<Scheme[]>('/schemes');
    if (res.success && res.data) {
      setSchemes(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadSchemes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const cells = (['VEG', 'NON_VEG'] as const).flatMap((foodType) =>
      MEAL_TYPES.filter((mealType) => Number(formData.prices[foodType][mealType]) > 0).map((mealType) => ({
        food_type: foodType,
        meal_type: mealType,
        default_amount: Number(formData.prices[foodType][mealType]),
      }))
    );

    if (cells.length === 0) {
      toast.error('Enter at least one price to create a scheme.');
      return;
    }

    const res = await fetchAPI<Scheme[]>('/schemes/bulk', {
      method: 'POST',
      body: JSON.stringify({ description: formData.description, cells }),
    });

    if (res.success) {
      setShowAddModal(false);
      setFormData({ description: '', prices: emptyPrices() });
      loadSchemes();
      toast.success(`Created ${cells.length} scheme${cells.length === 1 ? '' : 's'}.`);
    } else {
      toast.error(res.error?.message || 'Failed to create scheme(s)');
    }
  };

  const handleToggleActive = async (s: Scheme) => {
    const res = await fetchAPI<Scheme>(`/schemes/${s.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !s.is_active }),
    });
    if (res.success) {
      loadSchemes();
    } else {
      toast.error(res.error?.message || 'Failed to update scheme status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Trust Schemes & Annadhanam Configuration</h2>
          <p className="text-xs text-slate-500">Manage sponsorship schemes, food options (Veg/Non-Veg), meal types, and default amounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadSchemes} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Create New Scheme
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Scheme Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Food Type</th>
                <th className="px-4 py-3">Meal Type</th>
                <th className="px-4 py-3 font-mono text-right">Default Amount (₹)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {schemes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                    {isLoading ? 'Loading schemes...' : 'No schemes configured yet'}
                  </td>
                </tr>
              ) : (
                schemes.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-semibold">{s.category}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-0.5 rounded font-semibold ${s.food_type === 'VEG' ? 'bg-emerald-50 text-emerald-700' : s.food_type === 'NON_VEG' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.food_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">{s.meal_type}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">₹{s.default_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleToggleActive(s)}>
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Scheme Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" /> Configure Meal Pricing
              </h3>
              <p className="text-xs text-slate-500 mt-1">Set a price for each meal you want to offer — leave a cell blank to skip it.</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {(['VEG', 'NON_VEG'] as const).map((foodType) => (
                    <div key={foodType} className={`rounded-lg border p-3 space-y-2 ${foodType === 'VEG' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${foodType === 'VEG' ? 'text-emerald-700' : 'text-rose-700'}`}>{foodType === 'VEG' ? 'Veg' : 'Non-Veg'}</p>
                      {MEAL_TYPES.map((mealType) => (
                        <div key={mealType} className="flex items-center justify-between gap-2">
                          <label className="text-xs text-slate-600 font-medium">{mealType.charAt(0) + mealType.slice(1).toLowerCase()}</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="—"
                            className="w-24 px-2 py-1 border rounded bg-white text-right font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                            value={formData.prices[foodType][mealType]}
                            onChange={(e) => setFormData({
                              ...formData,
                              prices: { ...formData.prices, [foodType]: { ...formData.prices[foodType], [mealType]: e.target.value } },
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional details regarding meals or sponsorship scope..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Save Scheme</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
