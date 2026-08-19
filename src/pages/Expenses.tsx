import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, RefreshCw, Receipt, Banknote, Landmark, Download, Upload, Check, FileText } from 'lucide-react';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import { downloadVoucherPdf } from '../utils/voucherPdf';
import { uploadFile } from '../utils/upload';
import { isPositiveAmount, isRequired, isWithinLength, hasErrors } from '../utils/validation';
import type { Expense, BankAccount, ExpenseCategory, Voucher } from '../types';

const emptyExpenseForm = () => ({
  business_date: new Date().toISOString().split('T')[0],
  payment_mode: 'CASH',
  bank_account_id: 0,
  category: '',
  amount: 0,
  payee_name: '',
  description: '',
  reference_number: '',
  attachment_path: '',
});

export const Expenses: React.FC = () => {
  const toast = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState<Voucher | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [formData, setFormData] = useState(emptyExpenseForm());
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

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

  const loadData = async () => {
    setIsLoading(true);
    const [expRes, bankRes, catRes] = await Promise.all([
      fetchAPI<Expense[]>('/expenses'),
      fetchAPI<BankAccount[]>('/bank-accounts/active'),
      fetchAPI<ExpenseCategory[]>('/expense-categories/active'),
    ]);

    if (expRes.success && expRes.data) setExpenses(expRes.data);
    if (bankRes.success && bankRes.data) setBankAccounts(bankRes.data);
    if (catRes.success && catRes.data) {
      setCategories(catRes.data);
      setFormData((prev) => (prev.category ? prev : { ...prev, category: catRes.data![0]?.name ?? '' }));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const validateForm = (): Record<string, string | undefined> => ({
    amount: isPositiveAmount(formData.amount, 'Expense amount'),
    category: isRequired(formData.category, 'Category'),
    payee_name: isRequired(formData.payee_name, 'Payee/vendor name') || isWithinLength(formData.payee_name, 150, 'Payee/vendor name'),
    description: isWithinLength(formData.description, 255, 'Description'),
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors = validateForm();
    if (hasErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return;
    }

    if (formData.payment_mode === 'BANK' && !formData.bank_account_id) {
      toast.error('Please select a Bank Account for Bank Payment Mode');
      return;
    }

    setSubmitting(true);
    const payload = {
      ...formData,
      bank_account_id: formData.bank_account_id ? Number(formData.bank_account_id) : undefined,
    };

    const res = await fetchAPI<{ expense: Expense; voucher: Voucher }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (res.success && res.data) {
      setShowAddModal(false);
      setActiveVoucher(res.data.voucher);
      setFormData(emptyExpenseForm());
      setErrors({});
      loadData();
      toast.success('Expense recorded and voucher issued.');
    } else {
      toast.error(res.error?.message || 'Failed to record expense');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Expense Register & Outflow Ledgers</h2>
          <p className="text-xs text-slate-500">Record cash and bank outflow expenses, associate vendors/payees, and issue vouchers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Record Expense
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Expense No</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Payee / Vendor</th>
                <th className="px-4 py-3">Payment Mode</th>
                <th className="px-4 py-3 font-mono text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                    {isLoading ? 'Loading expenses...' : 'No expense entries created yet'}
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-rose-700">{e.expense_number}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{e.business_date ? String(e.business_date).substring(0, 10) : ''}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-semibold">{e.category}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{e.payee_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 ${e.payment_mode === 'CASH' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                        {e.payment_mode === 'CASH' ? <Banknote className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                        {e.payment_mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-rose-600" /> Record Outflow Expense
            </h3>

            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="1500"
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                    value={formData.amount || ''}
                    onChange={(e) => { setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 }); setErrors((prev) => ({ ...prev, amount: undefined })); }}
                  />
                  {errors.amount && <p className="text-xs text-rose-600 font-medium mt-1">{errors.amount}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.category}
                    onChange={(e) => { setFormData({ ...formData, category: e.target.value }); setErrors((prev) => ({ ...prev, category: undefined })); }}
                  >
                    {categories.length === 0 ? (
                      <option value="">-- No active categories --</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name.replace(/_/g, ' ')}</option>
                      ))
                    )}
                  </select>
                  {errors.category && <p className="text-xs text-rose-600 font-medium mt-1">{errors.category}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payee / Vendor Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    placeholder="Vendor / Payee Name"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.payee_name}
                    onChange={(e) => { setFormData({ ...formData, payee_name: e.target.value }); setErrors((prev) => ({ ...prev, payee_name: undefined })); }}
                  />
                  {errors.payee_name && <p className="text-xs text-rose-600 font-medium mt-1">{errors.payee_name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode *</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                  >
                    <option value="CASH">CASH (Physical Cash Outflow)</option>
                    <option value="BANK">BANK (Bank Debit)</option>
                  </select>
                </div>
              </div>

              {formData.payment_mode === 'BANK' && (
                <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 mb-1">Select Bank Account *</label>
                    <select
                      required
                      className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      value={formData.bank_account_id}
                      onChange={(e) => setFormData({ ...formData, bank_account_id: Number(e.target.value) })}
                    >
                      <option value={0}>-- Select Bank Account --</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>{b.bank_name} - {b.account_name} (Current: ₹{b.current_balance})</option>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  maxLength={255}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={formData.description}
                  onChange={(e) => { setFormData({ ...formData, description: e.target.value }); setErrors((prev) => ({ ...prev, description: undefined })); }}
                />
                {errors.description && <p className="text-xs text-rose-600 font-medium mt-1">{errors.description}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={submitting} disabled={submitting || categories.length === 0}>Save & Issue Voucher</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Voucher Modal */}
      {activeVoucher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border-t-8 border-t-rose-600">
            <div className="text-center border-b pb-4">
              <h3 className="font-bold text-lg text-slate-900">EXPENSE PAYMENT VOUCHER</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{activeVoucher.voucher_number}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Paid To:</span>
                <span className="font-bold text-slate-900">{activeVoucher.payee_or_donor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-mono font-bold text-rose-700 text-base">₹{activeVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
