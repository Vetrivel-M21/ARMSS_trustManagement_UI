import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, RefreshCw, Layers, Trash2 } from 'lucide-react';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { isPositiveAmount, isWithinLength } from '../utils/validation';
import type { Scheme } from '../types';

// Each "other" row the user adds beneath the food matrix
interface OtherRow {
  id: number; // local key only
  name: string;
  amount: string;
  nameError?: string;
  amountError?: string;
}

let _rowKey = 0;
const newRow = (): OtherRow => ({ id: ++_rowKey, name: '', amount: '' });

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

  const [formData, setFormData] = useState({ description: '', prices: emptyPrices() });
  const [cellErrors, setCellErrors] = useState<Record<string, string | undefined>>({});
  const [descriptionError, setDescriptionError] = useState<string | undefined>(undefined);
  const [otherRows, setOtherRows] = useState<OtherRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Scheme | null>(null);

  const loadSchemes = async () => {
    setIsLoading(true);
    const res = await fetchAPI<Scheme[]>('/schemes');
    if (res.success && res.data) setSchemes(res.data);
    setIsLoading(false);
  };

  useEffect(() => { loadSchemes(); }, []);

  const resetModal = () => {
    setFormData({ description: '', prices: emptyPrices() });
    setCellErrors({});
    setDescriptionError(undefined);
    setOtherRows([]);
    setShowAddModal(false);
  };

  // Update a field in a specific other-row
  const updateRow = (id: number, field: 'name' | 'amount', value: string) => {
    setOtherRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, [field]: value, [`${field}Error`]: undefined }
          : r
      )
    );
  };

  const removeRow = (id: number) => setOtherRows((prev) => prev.filter((r) => r.id !== id));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Validate food matrix ────────────────────────────────────────────────
    const newCellErrors: Record<string, string | undefined> = {};
    (['VEG', 'NON_VEG'] as const).forEach((foodType) => {
      MEAL_TYPES.forEach((mealType) => {
        const raw = formData.prices[foodType][mealType];
        if (raw !== '') {
          newCellErrors[`${foodType}.${mealType}`] = isPositiveAmount(raw, 'Price');
        }
      });
    });
    const newDescriptionError = isWithinLength(formData.description, 255, 'Description');

    // ── Validate other rows ────────────────────────────────────────────────
    let otherRowsValid = true;
    const validatedRows = otherRows.map((r) => {
      const nameErr = r.name.trim() ? undefined : 'Scheme name is required';
      const amountErr =
        r.amount.trim() && Number(r.amount) <= 0 ? 'Amount must be greater than 0' : undefined;
      if (nameErr || amountErr) otherRowsValid = false;
      return { ...r, nameError: nameErr, amountError: amountErr };
    });

    if (
      Object.values(newCellErrors).some((v) => v !== undefined) ||
      newDescriptionError ||
      !otherRowsValid
    ) {
      setCellErrors(newCellErrors);
      setDescriptionError(newDescriptionError);
      setOtherRows(validatedRows);
      return;
    }

    // ── Check at least one entry ─────────────────────────────────────────────
    const foodCells = (['VEG', 'NON_VEG'] as const).flatMap((foodType) =>
      MEAL_TYPES.filter((mealType) => Number(formData.prices[foodType][mealType]) > 0).map(
        (mealType) => ({
          food_type: foodType,
          meal_type: mealType,
          default_amount: Number(formData.prices[foodType][mealType]),
        })
      )
    );

    if (foodCells.length === 0 && otherRows.length === 0) {
      toast.error('Enter at least one food price or add an other scheme row.');
      return;
    }

    setSubmitting(true);
    let createdCount = 0;
    let failed = false;

    // ── Save food matrix (bulk) ──────────────────────────────────────────────
    if (foodCells.length > 0) {
      const res = await fetchAPI<Scheme[]>('/schemes/bulk', {
        method: 'POST',
        body: JSON.stringify({ description: formData.description, cells: foodCells }),
      });
      if (res.success) {
        createdCount += foodCells.length;
      } else {
        toast.error(res.error?.message || 'Failed to create food schemes');
        failed = true;
      }
    }

    // ── Save other rows one-by-one ────────────────────────────────────────────
    for (const row of otherRows) {
      if (!row.name.trim()) continue;
      const res = await fetchAPI<Scheme>('/schemes', {
        method: 'POST',
        body: JSON.stringify({
          name: row.name.trim(),
          category: 'OTHER',
          default_amount: Number(row.amount) || 0,
          description: formData.description,
        }),
      });
      if (res.success) {
        createdCount += 1;
      } else {
        toast.error(res.error?.message || `Failed to create scheme "${row.name}"`);
        failed = true;
      }
    }

    setSubmitting(false);

    if (createdCount > 0) {
      toast.success(`Created ${createdCount} scheme${createdCount === 1 ? '' : 's'}.`);
      resetModal();
      loadSchemes();
    } else if (!failed) {
      toast.error('No schemes were created.');
    }
  };

  const handleToggleActive = async (s: Scheme) => {
    setTogglingId(s.id);
    const res = await fetchAPI<Scheme>(`/schemes/${s.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !s.is_active }),
    });
    setTogglingId(null);
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
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={togglingId === s.id}
                        onClick={() => (s.is_active ? setDeactivateTarget(s) : handleToggleActive(s))}
                      >
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

      {/* ── Create Scheme Modal ─────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" /> Create Trust Scheme
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Set food sponsorship meal rates in the matrix below. Use the button to also add other schemes (medicine, education, etc.).
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-sm">

              {/* ── Food / Annadhanam Meal Matrix ─────────────────────────── */}
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
                  Food / Annadhanam (Meal Matrix)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(['VEG', 'NON_VEG'] as const).map((foodType) => (
                    <div
                      key={foodType}
                      className={`rounded-lg border p-3 space-y-2 ${foodType === 'VEG' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}
                    >
                      <p className={`text-xs font-bold uppercase tracking-wide ${foodType === 'VEG' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {foodType === 'VEG' ? 'Veg' : 'Non-Veg'}
                      </p>
                      {MEAL_TYPES.map((mealType) => (
                        <div key={mealType} className="flex items-center justify-between gap-2">
                          <label className="text-xs text-slate-600 font-medium">
                            {mealType.charAt(0) + mealType.slice(1).toLowerCase()}
                          </label>
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="—"
                              className="w-24 px-2 py-1 border rounded bg-white text-right font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                              value={formData.prices[foodType][mealType]}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  prices: {
                                    ...formData.prices,
                                    [foodType]: { ...formData.prices[foodType], [mealType]: e.target.value },
                                  },
                                });
                                setCellErrors((prev) => ({ ...prev, [`${foodType}.${mealType}`]: undefined }));
                              }}
                            />
                            {cellErrors[`${foodType}.${mealType}`] && (
                              <p className="text-[10px] text-rose-600 font-medium mt-0.5 text-right">
                                {cellErrors[`${foodType}.${mealType}`]}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Other Scheme Rows ─────────────────────────────────────── */}
              {otherRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Other Schemes</p>
                  {otherRows.map((row, idx) => (
                    <div key={row.id} className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex gap-2">
                          {/* Scheme Name */}
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder={`Scheme name ${idx + 1}`}
                              className={`w-full px-2 py-1.5 border rounded text-xs focus:ring-2 focus:ring-emerald-500 ${row.nameError ? 'border-rose-400' : 'border-slate-300'}`}
                              value={row.name}
                              onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                            />
                            {row.nameError && (
                              <p className="text-[10px] text-rose-600 font-medium mt-0.5">{row.nameError}</p>
                            )}
                          </div>
                          {/* Amount */}
                          <div className="w-28">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="₹ Amount"
                              className={`w-full px-2 py-1.5 border rounded text-xs font-mono text-right focus:ring-2 focus:ring-emerald-500 ${row.amountError ? 'border-rose-400' : 'border-slate-300'}`}
                              value={row.amount}
                              onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                            />
                            {row.amountError && (
                              <p className="text-[10px] text-rose-600 font-medium mt-0.5">{row.amountError}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Remove row */}
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="mt-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Add Another Row Button ────────────────────────────────── */}
              <button
                type="button"
                onClick={() => setOtherRows((prev) => [...prev, newRow()])}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-500 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/40 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Other Scheme
              </button>

              {/* ── Description ──────────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description (optional)</label>
                <textarea
                  rows={2}
                  maxLength={255}
                  placeholder="Optional notes about this scheme..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    setDescriptionError(undefined);
                  }}
                />
                {descriptionError && <p className="text-xs text-rose-600 font-medium mt-1">{descriptionError}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={resetModal}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={submitting} disabled={submitting}>
                  Save Scheme
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title="Deactivate Scheme"
          message={`Deactivate "${deactivateTarget.name}"? Donors will no longer be able to select this scheme for new donations.`}
          confirmLabel="Deactivate"
          variant="danger"
          onCancel={() => setDeactivateTarget(null)}
          onConfirm={() => {
            handleToggleActive(deactivateTarget);
            setDeactivateTarget(null);
          }}
        />
      )}
    </div>
  );
};
