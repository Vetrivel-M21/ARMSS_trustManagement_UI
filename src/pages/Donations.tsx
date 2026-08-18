import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, RefreshCw, Receipt, Banknote, Landmark, Download, Upload, Check, FileText } from 'lucide-react';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import { downloadVoucherPdf } from '../utils/voucherPdf';
import { uploadFile } from '../utils/upload';
import { CASH_DENOMINATIONS } from '../constants';
import type { Donation, Donor, Scheme, BankAccount, Voucher } from '../types';

const emptyDonationForm = () => ({
  donor_id: 0,
  food_type: '' as '' | 'VEG' | 'NON_VEG',
  meal_type: '' as '' | 'BREAKFAST' | 'LUNCH' | 'DINNER',
  payment_mode: 'CASH',
  amount: 0,
  scheme_id: 0,
  bank_account_id: 0,
  reference_number: '',
  attachment_path: '',
  purpose: 'General Donation',
  notes: '',
});

export const Donations: React.FC = () => {
  const toast = useToast();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState<Voucher | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [formData, setFormData] = useState(emptyDonationForm());
  // Once the donor manually edits Purpose, stop auto-overwriting it from
  // scheme/food-meal selection — otherwise a custom purpose typed before
  // re-touching those dropdowns gets silently discarded.
  const [purposeTouched, setPurposeTouched] = useState(false);

  const matchingSchemes = formData.food_type && formData.meal_type
    ? schemes.filter((s) => s.food_type === formData.food_type && s.meal_type === formData.meal_type)
    : [];

  const applySchemeSelection = (schemeId: number) => {
    const selected = schemes.find((s) => s.id === schemeId);
    setFormData((prev) => ({
      ...prev,
      scheme_id: schemeId,
      amount: selected ? selected.default_amount : prev.amount,
      purpose: selected && !purposeTouched ? `${selected.name} Sponsorship` : prev.purpose,
    }));
  };

  const applyFoodMeal = (foodType: '' | 'VEG' | 'NON_VEG', mealType: '' | 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    const matches = foodType && mealType ? schemes.filter((s) => s.food_type === foodType && s.meal_type === mealType) : [];
    setFormData((prev) => ({
      ...prev,
      food_type: foodType,
      meal_type: mealType,
      scheme_id: matches.length === 1 ? matches[0].id : 0,
      amount: matches.length === 1 ? matches[0].default_amount : 0,
      purpose: matches.length === 1 && !purposeTouched ? `${matches[0].name} Sponsorship` : prev.purpose,
    }));
  };

  const amountLocked = formData.scheme_id > 0;

  const handleAttachmentUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingAttachment(true);
    const path = await uploadFile(file);
    setUploadingAttachment(false);
    if (path) {
      setFormData((prev) => ({ ...prev, attachment_path: path }));
    } else {
      toast.error('Failed to upload attachment. Please try again.');
    }
  };

  const [denominations, setDenominations] = useState<{ [key: number]: number }>(
    () => Object.fromEntries(CASH_DENOMINATIONS.map((v) => [v, 0]))
  );

  const loadInitialData = async () => {
    setIsLoading(true);
    const [donRes, donorRes, schemeRes, bankRes] = await Promise.all([
      fetchAPI<Donation[]>('/donations'),
      fetchAPI<Donor[]>('/donors'),
      fetchAPI<Scheme[]>('/schemes/active'),
      fetchAPI<BankAccount[]>('/bank-accounts/active'),
    ]);

    if (donRes.success && donRes.data) setDonations(donRes.data);
    if (donorRes.success && donorRes.data) setDonors(donorRes.data);
    if (schemeRes.success && schemeRes.data) setSchemes(schemeRes.data);
    if (bankRes.success && bankRes.data) setBankAccounts(bankRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const denomSum = Object.entries(denominations).reduce((acc, [val, qty]) => acc + Number(val) * Number(qty), 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.donor_id) {
      toast.error('Please select a donor');
      return;
    }

    if (formData.payment_mode === 'BANK' && !formData.bank_account_id) {
      toast.error('Please select a Bank Account for Bank Payment Mode');
      return;
    }

    const denomList = Object.entries(denominations)
      .filter(([_, qty]) => qty > 0)
      .map(([val, qty]) => ({ value: Number(val), quantity: Number(qty) }));

    const payload = {
      ...formData,
      donor_id: Number(formData.donor_id),
      scheme_id: formData.scheme_id ? Number(formData.scheme_id) : undefined,
      bank_account_id: formData.bank_account_id ? Number(formData.bank_account_id) : undefined,
      denominations: denomList,
    };

    const res = await fetchAPI<{ donation: Donation; voucher: Voucher }>('/donations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      setShowAddModal(false);
      setActiveVoucher(res.data.voucher);
      loadInitialData();
      toast.success('Donation recorded and voucher issued.');
    } else {
      toast.error(res.error?.message || 'Failed to record donation');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Donation Processing & Receipt Management</h2>
          <p className="text-xs text-slate-500">Record cash & bank donations, associate schemes/events, and issue instant vouchers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadInitialData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Record New Donation
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Donation No</th>
                <th className="px-4 py-3">Donor Name</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Purpose / Scheme</th>
                <th className="px-4 py-3">Payment Mode</th>
                <th className="px-4 py-3 font-mono text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {donations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                    {isLoading ? 'Loading donations...' : 'No donation records created yet'}
                  </td>
                </tr>
              ) : (
                donations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700">{d.donation_number}</td>
                    <td className="px-4 py-3 font-medium">{d.donor?.full_name || 'Anonymous'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{d.business_date ? String(d.business_date).substring(0, 10) : ''}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-slate-800">{d.purpose}</div>
                      {d.scheme && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-emerald-600 font-medium">{d.scheme.name}</span>
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${d.scheme.food_type === 'VEG' ? 'bg-emerald-100 text-emerald-800' : d.scheme.food_type === 'NON_VEG' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'}`}>
                            {d.scheme.food_type}
                          </span>
                          <span className="px-1.5 py-0.5 rounded font-semibold text-[10px] bg-slate-100 text-slate-600">{d.scheme.meal_type}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 ${d.payment_mode === 'CASH' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                        {d.payment_mode === 'CASH' ? <Banknote className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                        {d.payment_mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">₹{d.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Donation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" /> Record Donation Transaction
            </h3>

            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Donor *</label>
                <select
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={formData.donor_id}
                  onChange={(e) => setFormData({ ...formData, donor_id: Number(e.target.value) })}
                >
                  <option value={0}>-- Select Registered Donor --</option>
                  {donors.map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name} ({d.donor_code} - {d.phone})</option>
                  ))}
                </select>
              </div>

              {/* Food Type -> Meal Type -> Transaction Type -> Amount (auto-filled + locked once a scheme matches) */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-3">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Sponsorship Details</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Food Type</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white font-semibold text-sm"
                      value={formData.food_type}
                      onChange={(e) => applyFoodMeal(e.target.value as '' | 'VEG' | 'NON_VEG', formData.meal_type)}
                    >
                      <option value="">-- General (No Scheme) --</option>
                      <option value="VEG">🥦 VEG</option>
                      <option value="NON_VEG">🍗 NON-VEG</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Meal Type</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white font-semibold text-sm"
                      value={formData.meal_type}
                      onChange={(e) => applyFoodMeal(formData.food_type, e.target.value as '' | 'BREAKFAST' | 'LUNCH' | 'DINNER')}
                    >
                      <option value="">-- General --</option>
                      <option value="BREAKFAST">BREAKFAST</option>
                      <option value="LUNCH">LUNCH</option>
                      <option value="DINNER">DINNER</option>
                    </select>
                  </div>
                </div>

                {/* Disambiguation dropdown — only shown if more than one scheme shares this exact Food/Meal combo */}
                {matchingSchemes.length > 1 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Scheme (multiple match this combination)</label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                      value={formData.scheme_id}
                      onChange={(e) => applySchemeSelection(Number(e.target.value))}
                    >
                      <option value={0}>-- Select Scheme --</option>
                      {matchingSchemes.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} — ₹{s.default_amount.toLocaleString('en-IN')}</option>
                      ))}
                    </select>
                  </div>
                )}

                {amountLocked && (() => {
                  const sel = schemes.find((s) => s.id === formData.scheme_id);
                  return sel ? (
                    <div className="flex items-center gap-2 bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-[11px]">
                      <span className="font-semibold text-emerald-800">{sel.name}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-emerald-700 font-bold">₹{sel.default_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <span className="ml-auto text-slate-400 italic">Amount locked to scheme price</span>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Type *</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                  >
                    <option value="CASH">CASH (Physical Notes)</option>
                    <option value="BANK">BANK (Transfer / Cheque / Online)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Donation Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={amountLocked}
                    placeholder="5000"
                    className={`w-full px-3 py-2 border rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-500 ${amountLocked ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : ''}`}
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* BANK MODE: Select Admin Bank Account + optional reference number/attachment */}
              {formData.payment_mode === 'BANK' && (
                <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-blue-700" /> Select Trust Bank Account *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-500"
                      value={formData.bank_account_id}
                      onChange={(e) => setFormData({ ...formData, bank_account_id: Number(e.target.value) })}
                    >
                      <option value={0}>-- Select Active Bank Account --</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>{b.bank_name} - {b.account_name} ({b.account_number_masked})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-blue-900 mb-1">Transaction/Reference No. (optional)</label>
                      <input
                        type="text"
                        placeholder="UTR / Cheque No."
                        className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                        value={formData.reference_number}
                        onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-900 mb-1">Attachment (optional)</label>
                      <label className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg bg-white text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50">
                        {uploadingAttachment ? 'Uploading...' : formData.attachment_path ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Uploaded</> : <><Upload className="w-3.5 h-3.5" /> Upload</>}
                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleAttachmentUpload(e.target.files?.[0] ?? null)} />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* CASH MODE: Optional Cash Denomination Grid */}
              {formData.payment_mode === 'CASH' && (
                <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-900 flex items-center gap-1">
                      <Banknote className="w-4 h-4 text-amber-700" /> Physical Denomination Breakdown
                    </span>
                    <span className={`font-mono font-bold ${denomSum === formData.amount ? 'text-emerald-700' : 'text-amber-800'}`}>
                      Count Sum: ₹{denomSum} / ₹{formData.amount}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 text-xs">
                    {CASH_DENOMINATIONS.map((val) => (
                      <div key={val} className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-mono">₹{val}</span>
                        <input
                          type="number"
                          min="0"
                          className="w-full px-1.5 py-1 border rounded bg-white text-center font-mono"
                          value={denominations[val] || ''}
                          onChange={(e) => setDenominations({ ...denominations, [val]: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Purpose */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose Details</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={formData.purpose}
                  onChange={(e) => { setPurposeTouched(true); setFormData({ ...formData, purpose: e.target.value }); }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Submit &amp; Issue Receipt</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voucher PDF Receipt Modal */}
      {activeVoucher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border-t-8 border-t-emerald-600">
            <div className="text-center border-b pb-4">
              <h3 className="font-bold text-lg text-slate-900">TRUST DONATION RECEIPT</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{activeVoucher.voucher_number}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold text-slate-900">{activeVoucher.business_date ? String(activeVoucher.business_date).substring(0, 10) : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Received From:</span>
                <span className="font-bold text-slate-900">{activeVoucher.payee_or_donor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-mono font-bold text-emerald-700 text-base">₹{activeVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border text-[11px] font-medium text-slate-700">
                Amount in Words: <br />
                <span className="italic font-serif text-slate-900">{activeVoucher.amount_in_words}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => downloadVoucherPdf(activeVoucher)}>
                <Download className="w-4 h-4 mr-1" /> Download PDF
              </Button>
              <Link to={`/vouchers/${activeVoucher.id}`}>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-1" /> Open Full Receipt
                </Button>
              </Link>
              <Button variant="primary" size="sm" onClick={() => setActiveVoucher(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
