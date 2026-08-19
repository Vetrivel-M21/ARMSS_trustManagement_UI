import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { fetchAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { uploadFile } from '../utils/upload';
import { isPositiveAmount, isNonNegativeAmount, isWithinLength, hasErrors } from '../utils/validation';
import type { BankAccount, BankClosingStatus, BankDaySummary, BankBreakdownRow } from '../types';
import { Landmark, Plus, RefreshCw, ArrowRightLeft, Lock, Unlock, CheckCircle2, AlertCircle, Upload, Check, Eye } from 'lucide-react';

const fmt = (n: number | undefined | null) =>
  '₹' + (n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const BankSummary: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [statuses, setStatuses] = useState<Record<number, BankClosingStatus>>({});
  const [daySummary, setDaySummary] = useState<BankDaySummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<{ row: BankBreakdownRow; type: 'CREDIT' | 'DEBIT' } | null>(null);
  const [actualInputs, setActualInputs] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCloseAllConfirm, setShowCloseAllConfirm] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<BankAccount | null>(null);
  const [unlockReason, setUnlockReason] = useState('');

  const [formData, setFormData] = useState({
    bank_name: '', account_name: '', account_number_masked: '', ifsc_code: '', branch: '', location: '', opening_balance: 0, qr_code_path: '',
  });
  const [uploadingQR, setUploadingQR] = useState(false);
  const [ifscLookupLoading, setIfscLookupLoading] = useState(false);
  const [addAccountErrors, setAddAccountErrors] = useState<Record<string, string | undefined>>({});
  const [addAccountSubmitting, setAddAccountSubmitting] = useState(false);
  const [transferErrors, setTransferErrors] = useState<Record<string, string | undefined>>({});
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [closingErrors, setClosingErrors] = useState<Record<number, string | undefined>>({});
  const [closingSubmitting, setClosingSubmitting] = useState(false);
  const [unlockReasonError, setUnlockReasonError] = useState<string | undefined>(undefined);
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);

  const handleQRUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingQR(true);
    const path = await uploadFile(file);
    setUploadingQR(false);
    if (path) {
      setFormData((prev) => ({ ...prev, qr_code_path: path }));
    } else {
      toast.error('Failed to upload QR code. Please try again.');
    }
  };

  // Auto-fills Bank Name / Branch / Location once a valid 11-char IFSC is
  // entered, via the free public Razorpay IFSC lookup (no API key required).
  // Fields stay editable afterward — this is a convenience prefill, not a lock.
  const handleIfscChange = async (rawValue: string) => {
    const ifsc = rawValue.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    setFormData((prev) => ({ ...prev, ifsc_code: ifsc }));
    if (ifsc.length !== 11) return;

    setIfscLookupLoading(true);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
      if (!res.ok) {
        toast.error('IFSC code not found. Please check it, or fill in the bank details manually.');
        return;
      }
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        bank_name: data.BANK || prev.bank_name,
        branch: data.BRANCH || prev.branch,
        location: [data.CITY, data.STATE].filter(Boolean).join(', ') || prev.location,
      }));
    } catch {
      toast.error('Could not reach the IFSC lookup service. Please fill in the bank details manually.');
    } finally {
      setIfscLookupLoading(false);
    }
  };
  const [transferData, setTransferData] = useState({
    from_account_id: 0, to_account_id: 0, amount: 0, reference_number: '', description: 'Inter-Bank Transfer',
  });

  const loadAll = async () => {
    setIsLoading(true);
    setStatusError(null);
    const accRes = await fetchAPI<BankAccount[]>('/bank-accounts');
    if (!accRes.success || !accRes.data) {
      setStatusError(accRes.error?.message || 'Failed to load bank accounts.');
      setIsLoading(false);
      return;
    }
    setAccounts(accRes.data);

    const [results, summaryRes] = await Promise.all([
      Promise.all(accRes.data.map((a) => fetchAPI<BankClosingStatus>(`/bank-accounts/${a.id}/closing-status?date=${date}`))),
      fetchAPI<BankDaySummary>(`/bank-accounts/day-summary?date=${date}`),
    ]);
    const next: Record<number, BankClosingStatus> = {};
    let anyFailed = false;
    results.forEach((r, idx) => {
      if (r.success && r.data) {
        next[accRes.data![idx].id] = r.data;
      } else {
        anyFailed = true;
      }
    });
    setStatuses(next);
    if (summaryRes.success && summaryRes.data) {
      setDaySummary(summaryRes.data);
      setSummaryError(null);
    } else {
      setDaySummary(null);
      setSummaryError(summaryRes.error?.message || 'Failed to load the credit/debit breakdown for this date.');
    }
    if (anyFailed) {
      setStatusError('Some bank accounts could not be reconciled for this date — figures below may be incomplete.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const grandOpening = accounts.reduce((s, a) => s + (statuses[a.id]?.opening_balance ?? 0), 0);
  const grandCredits = accounts.reduce((s, a) => s + (statuses[a.id]?.total_credits ?? 0), 0);
  const grandDebits = accounts.reduce((s, a) => s + (statuses[a.id]?.total_debits ?? 0), 0);
  const grandExpected = accounts.reduce((s, a) => s + (statuses[a.id]?.expected_closing ?? 0), 0);
  const grandStatement = accounts.reduce((s, a) => {
    const st = statuses[a.id];
    if (st?.status === 'CLOSED') return s + (st.actual_closing ?? 0);
    const entered = parseFloat(actualInputs[a.id] ?? '');
    return s + (isNaN(entered) ? 0 : entered);
  }, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors: Record<string, string | undefined> = {
      opening_balance: isNonNegativeAmount(formData.opening_balance, 'Opening balance'),
    };
    if (hasErrors(fieldErrors)) {
      setAddAccountErrors(fieldErrors);
      return;
    }

    setAddAccountSubmitting(true);
    const res = await fetchAPI<BankAccount>('/bank-accounts', { method: 'POST', body: JSON.stringify(formData) });
    setAddAccountSubmitting(false);
    if (res.success) {
      setShowAddModal(false);
      setFormData({ bank_name: '', account_name: '', account_number_masked: '', ifsc_code: '', branch: '', location: '', opening_balance: 0, qr_code_path: '' });
      setAddAccountErrors({});
      toast.success('Bank account added.');
      loadAll();
    } else {
      toast.error(res.error?.message || 'Failed to add bank account');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.from_account_id || !transferData.to_account_id) {
      toast.error('Select source and destination bank accounts');
      return;
    }
    if (transferData.from_account_id === transferData.to_account_id) {
      toast.error('Source and destination accounts must be different');
      return;
    }

    const fieldErrors: Record<string, string | undefined> = {
      amount: isPositiveAmount(transferData.amount, 'Transfer amount'),
    };
    if (hasErrors(fieldErrors)) {
      setTransferErrors(fieldErrors);
      return;
    }

    setTransferSubmitting(true);
    const res = await fetchAPI<unknown>('/bank-accounts/transfer', { method: 'POST', body: JSON.stringify(transferData) });
    setTransferSubmitting(false);
    if (res.success) {
      setShowTransferModal(false);
      setTransferErrors({});
      toast.success('Inter-bank transfer executed successfully.');
      loadAll();
    } else {
      toast.error(res.error?.message || 'Failed to execute transfer');
    }
  };

  const openAccounts = accounts.filter((a) => statuses[a.id]?.status !== 'CLOSED');

  const handleCloseAllBanks = async () => {
    const newClosingErrors: Record<number, string | undefined> = {};
    openAccounts.forEach((a) => {
      const raw = actualInputs[a.id] ?? '';
      newClosingErrors[a.id] = raw === '' ? 'Statement amount is required.' : isNonNegativeAmount(raw, 'Statement amount');
    });
    if (Object.values(newClosingErrors).some((v) => v !== undefined)) {
      setClosingErrors(newClosingErrors);
      toast.error('Enter a valid statement amount for every open bank account before closing.');
      return;
    }

    const closings = openAccounts.map((a) => ({ bank_account_id: a.id, actual_closing: parseFloat(actualInputs[a.id] ?? '') }));
    setClosingSubmitting(true);
    const res = await fetchAPI<unknown>('/bank-accounts/close-all', {
      method: 'POST',
      body: JSON.stringify({ business_date: date, closings }),
    });
    setClosingSubmitting(false);
    if (res.success) {
      toast.success(`${closings.length} bank account(s) closed for ${date}.`);
      setShowCloseAllConfirm(false);
      setClosingErrors({});
      loadAll();
    } else {
      toast.error(res.error?.message || 'Failed to close bank accounts for this date');
    }
  };

  const handleRequestUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockTarget) return;

    const err = isWithinLength(unlockReason, 500, 'Reason');
    if (err) {
      setUnlockReasonError(err);
      return;
    }

    setUnlockSubmitting(true);
    const res = await fetchAPI<unknown>('/unlock-requests', {
      method: 'POST',
      body: JSON.stringify({
        entity_type: 'BANK_DAY',
        bank_account_id: unlockTarget.id,
        business_date: date,
        reason: unlockReason,
      }),
    });
    setUnlockSubmitting(false);
    if (res.success) {
      toast.success('Unlock request submitted for Admin review.');
      setUnlockTarget(null);
      setUnlockReason('');
      setUnlockReasonError(undefined);
    } else {
      toast.error(res.error?.message || 'Failed to submit unlock request');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Bank Accounts &amp; Reconciliation</h2>
          <p className="text-xs text-slate-500">Credits by purpose, debits by category, and per-account closing — all banks, for the selected date</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={loadAll} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft className="w-4 h-4 mr-1.5" /> Inter-Bank Transfer
          </Button>
          {isAdmin && (
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Bank Account
            </Button>
          )}
        </div>
      </div>

      {statusError && (
        <div className="bg-amber-50 border-l-4 border-l-amber-500 px-4 py-2.5 rounded-lg text-xs font-medium text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {statusError}
        </div>
      )}

      {summaryError && (
        <div className="bg-amber-50 border-l-4 border-l-amber-500 px-4 py-2.5 rounded-lg text-xs font-medium text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> Could not load the credit/debit breakdown for this date: {summaryError}
        </div>
      )}

      {/* Unified stats strip — Opening/Credits/Debits/Net Position for the whole day, all banks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Opening Total (All Banks)</p>
          <p className="text-xl font-bold font-mono text-white">{fmt(daySummary?.opening_total)}</p>
        </div>
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Total Credits (All Banks)</p>
          <p className="text-xl font-bold font-mono text-emerald-400">{fmt(daySummary?.total_credits)}</p>
        </div>
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Total Debits (All Banks)</p>
          <p className="text-xl font-bold font-mono text-rose-400">{fmt(daySummary?.total_debits)}</p>
        </div>
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Net Position (Open+Cr−Dr)</p>
          <p className="text-xl font-bold font-mono text-emerald-400">{fmt(daySummary?.net_position)}</p>
        </div>
      </div>

      {/* Sections 1 & 2: Credits and Debits side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <Card title="Credits — Fund Received (All Banks)">
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-emerald-50 text-emerald-800 text-[11px] uppercase tracking-wider border-b border-emerald-100">
              <tr>
                <th className="px-3 py-2">Purpose</th>
                <th className="px-3 py-2">Food Type</th>
                <th className="px-3 py-2">Meal Type</th>
                <th className="px-3 py-2 text-center">Count</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!daySummary || daySummary.credit_breakdown.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400 italic text-xs">No credits recorded for this date.</td></tr>
              ) : (
                daySummary.credit_breakdown.map((r, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/40">
                    <td className="px-3 py-2 text-slate-700 font-medium">{r.label}</td>
                    <td className="px-3 py-2">
                      {r.food_type && r.food_type !== 'NA' ? (
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${r.food_type === 'VEG' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{r.food_type}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {r.meal_type && r.meal_type !== 'NA' ? (
                        <span className="px-1.5 py-0.5 rounded font-semibold text-[10px] bg-slate-100 text-slate-600">{r.meal_type}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-slate-500">{r.count}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{fmt(r.total_amount)}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1" onClick={() => setSelectedRow({ row: r, type: 'CREDIT' })}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {daySummary && daySummary.credit_breakdown.length > 0 && (
              <tfoot>
                <tr className="bg-emerald-800 text-white text-xs font-bold">
                  <td className="px-3 py-2.5 uppercase tracking-wide" colSpan={4}>Total Credits (All Banks)</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(daySummary?.total_credits)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Section 2: Debits — where money went, by category, across all banks */}
      <Card title="Debits — Fund Utilized (All Banks)">
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-rose-50 text-rose-800 text-[11px] uppercase tracking-wider border-b border-rose-100">
              <tr>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-center">Count</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!daySummary || daySummary.debit_breakdown.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400 italic text-xs">No debits recorded for this date.</td></tr>
              ) : (
                daySummary.debit_breakdown.map((r, idx) => (
                  <tr key={idx} className="hover:bg-rose-50/40">
                    <td className="px-3 py-2 text-slate-700 font-medium">{r.label}</td>
                    <td className="px-3 py-2 text-center font-mono text-slate-500">{r.count}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-rose-700">{fmt(r.total_amount)}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1" onClick={() => setSelectedRow({ row: r, type: 'DEBIT' })}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {daySummary && daySummary.debit_breakdown.length > 0 && (
              <tfoot>
                <tr className="bg-rose-800 text-white text-xs font-bold">
                  <td className="px-3 py-2.5 uppercase tracking-wide" colSpan={2}>Total Debits (All Banks)</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(daySummary?.total_debits)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
      </div>

      {/* Section 3: Reconciliation — per-account closing mechanics */}
      <Card
        title="Daily Reconciliation &amp; Closing"
        subtitle="Enter each bank's statement amount, then close all of them together in one action"
        action={isAdmin && openAccounts.length > 0 ? (
          <Button variant="primary" size="sm" onClick={() => setShowCloseAllConfirm(true)}>
            <Lock className="w-4 h-4 mr-1.5" /> Close All Banks
          </Button>
        ) : undefined}
      >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 text-left font-semibold">Bank / Account</th>
              <th className="px-3 py-2 text-right font-semibold">Opening</th>
              <th className="px-3 py-2 text-right font-semibold">Credits</th>
              <th className="px-3 py-2 text-right font-semibold">Debits</th>
              <th className="px-3 py-2 text-right font-semibold">Expected Closing</th>
              <th className="px-3 py-2 text-right font-semibold">Statement Amount</th>
              <th className="px-3 py-2 text-right font-semibold">Difference</th>
              <th className="px-3 py-2 text-center font-semibold">Status</th>
              <th className="px-3 py-2 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-400 italic">No bank accounts configured.</td></tr>
            ) : (
              accounts.map((a) => {
                const s = statuses[a.id];
                const isClosed = s?.status === 'CLOSED';
                const entered = parseFloat(actualInputs[a.id] ?? '');
                const diff = isClosed ? s?.difference ?? 0 : !isNaN(entered) ? entered - (s?.expected_closing ?? 0) : null;
                return (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800 leading-tight">{a.bank_name}</p>
                          <p className="text-[11px] text-slate-400 leading-tight">{a.account_name} · {a.account_number_masked}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{fmt(s?.opening_balance)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-700">{s ? fmt(s.total_credits) : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-rose-700">{s ? fmt(s.total_debits) : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">{fmt(s?.expected_closing)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {isClosed ? (
                        <span className="font-mono font-semibold text-slate-800">{fmt(s?.actual_closing)}</span>
                      ) : (
                        <>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Statement amount"
                            className="w-32 px-3 py-1.5 border border-slate-300 rounded-lg text-right font-mono text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                            value={actualInputs[a.id] ?? ''}
                            onChange={(e) => { setActualInputs({ ...actualInputs, [a.id]: e.target.value }); setClosingErrors((prev) => ({ ...prev, [a.id]: undefined })); }}
                          />
                          {closingErrors[a.id] && <p className="text-[10px] text-rose-600 font-medium mt-1">{closingErrors[a.id]}</p>}
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {diff === null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={diff === 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                          {diff > 0 ? '+' : ''}{fmt(diff)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {isClosed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 bg-slate-100 border border-slate-300 rounded px-2 py-0.5">
                          <Lock className="w-3 h-3" /> Closed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                          Open
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {isClosed && !isAdmin ? (
                        <Button variant="outline" size="sm" onClick={() => setUnlockTarget(a)}>
                          <Unlock className="w-3.5 h-3.5 mr-1" /> Request Unlock
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {accounts.length > 0 && (
            <tfoot>
              <tr className="bg-slate-800 text-white text-xs font-bold">
                <td className="px-3 py-2.5 uppercase tracking-wide">Total (All Banks)</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmt(grandOpening)}</td>
                <td className="px-3 py-2.5 text-right font-mono">+{fmt(grandCredits)}</td>
                <td className="px-3 py-2.5 text-right font-mono">−{fmt(grandDebits)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmt(grandExpected)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmt(grandStatement)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      </Card>

      {showCloseAllConfirm && (
        <ConfirmDialog
          title={`Close ${openAccounts.length} bank account(s) for ${date}?`}
          message={
            <div className="space-y-2">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_1.25rem] gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                  <span>Bank</span>
                  <span className="text-right">Expected</span>
                  <span className="text-right">Entered</span>
                  <span></span>
                </div>
                <div className="max-h-44 overflow-y-auto divide-y divide-slate-100">
                  {openAccounts.map((a) => {
                    const entered = parseFloat(actualInputs[a.id] ?? '0');
                    const expected = statuses[a.id]?.expected_closing ?? 0;
                    const mismatch = entered !== expected;
                    return (
                      <div
                        key={a.id}
                        className={`grid grid-cols-[1fr_auto_auto_1.25rem] gap-2 px-3 py-2 items-center text-xs ${mismatch ? 'bg-rose-50' : ''}`}
                      >
                        <span className="font-semibold text-slate-800 truncate">{a.bank_name}</span>
                        <span className="font-mono text-slate-600 text-right">{fmt(expected)}</span>
                        <span className={`font-mono font-semibold text-right ${mismatch ? 'text-rose-600' : 'text-emerald-700'}`}>{fmt(entered)}</span>
                        {mismatch ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-slate-500">If any account's amount doesn't match exactly, none of them will be closed.</p>
            </div>
          }
          confirmLabel="Close All Banks"
          confirmDisabled={closingSubmitting}
          onConfirm={handleCloseAllBanks}
          onCancel={() => setShowCloseAllConfirm(false)}
        />
      )}

      {unlockTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-600" /> Request Unlock — {unlockTarget.bank_name}
            </h3>
            <p className="text-xs text-slate-500">
              {unlockTarget.bank_name} is CLOSED for {date}. Submit a reason for an admin to review and unlock it before you can record new transactions for this date.
            </p>
            <form onSubmit={handleRequestUnlock} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Unlock *</label>
                <textarea
                  required
                  rows={3}
                  autoFocus
                  maxLength={500}
                  placeholder="State clear reason why this bank account's closed entry needs correction..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={unlockReason}
                  onChange={(e) => { setUnlockReason(e.target.value); setUnlockReasonError(undefined); }}
                />
                {unlockReasonError && <p className="text-xs text-rose-600 font-medium mt-1">{unlockReasonError}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setUnlockTarget(null); setUnlockReason(''); setUnlockReasonError(undefined); }}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={unlockSubmitting} disabled={unlockSubmitting}>Submit to Admin</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Breakdown drilldown — every contributing donor/payee behind one grouped row */}
      {selectedRow && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedRow.row.label}</h3>
                <p className="text-xs text-slate-500">
                  {selectedRow.row.count} {selectedRow.type === 'CREDIT' ? 'donor entr' : 'expense entr'}{selectedRow.row.count === 1 ? 'y' : 'ies'} | Total: {fmt(selectedRow.row.total_amount)}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedRow(null)}>Close</Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {selectedRow.row.entries.map((e, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{e.name}</p>
                    <p className="text-slate-500 text-[11px]">{e.purpose}</p>
                    {e.reference_number && <p className="text-slate-400 text-[10px] font-mono">Ref: {e.reference_number}</p>}
                    <p className="text-slate-400 text-[10px]">{e.business_date}</p>
                  </div>
                  <span className={`font-mono font-bold text-sm ${selectedRow.type === 'CREDIT' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {fmt(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Trust Bank Account</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter the IFSC code first to auto-fill the bank's details</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-5 items-start">
                <Card title="Bank Identification">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number (Masked) *</label>
                        <input type="text" required placeholder="**** **** 1234"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                          value={formData.account_number_masked} onChange={(e) => setFormData({ ...formData, account_number_masked: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code *</label>
                        <div className="relative">
                          <input type="text" required placeholder="SBIN0001234" maxLength={11}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
                            value={formData.ifsc_code} onChange={(e) => handleIfscChange(e.target.value)} />
                          {ifscLookupLoading && <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
                        </div>
                      </div>
                    </div>
                    {ifscLookupLoading && (
                      <p className="text-[11px] text-emerald-700 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Looking up bank details...</p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name *</label>
                        <input type="text" required placeholder="e.g. State Bank of India (SBI)"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                          value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name *</label>
                        <input type="text" required placeholder="Main Branch"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                          value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                      <input type="text" placeholder="City, State"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                        value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                    </div>
                  </div>
                </Card>

                <Card title="Account Details">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Account Name / Title *</label>
                      <input type="text" required placeholder="e.g. Trust Primary Operating Account"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                        value={formData.account_name} onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (₹) *</label>
                      <input type="number" step="0.01" min="0" required placeholder="100000"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                        value={formData.opening_balance} onChange={(e) => { setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 }); setAddAccountErrors((prev) => ({ ...prev, opening_balance: undefined })); }} />
                      {addAccountErrors.opening_balance && <p className="text-xs text-rose-600 font-medium mt-1">{addAccountErrors.opening_balance}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">UPI / Bank QR Code (optional)</label>
                      <label className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg bg-white text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 w-full">
                        {uploadingQR ? 'Uploading...' : formData.qr_code_path ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Uploaded</> : <><Upload className="w-3.5 h-3.5" /> Upload QR Code Image</>}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleQRUpload(e.target.files?.[0] ?? null)} />
                      </label>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setAddAccountErrors({}); }}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={addAccountSubmitting} disabled={addAccountSubmitting}>Save Bank Account</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inter-Bank Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-600" /> Inter-Bank Transfer
            </h3>
            <form onSubmit={handleTransfer} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Source Account (Debit) *</label>
                <select required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={transferData.from_account_id}
                  onChange={(e) => setTransferData({ ...transferData, from_account_id: Number(e.target.value) })}>
                  <option value={0}>-- Select Source --</option>
                  {accounts.map((b) => (
                    <option key={b.id} value={b.id}>{b.bank_name} – {b.account_name} ({fmt(b.current_balance)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Account (Credit) *</label>
                <select required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={transferData.to_account_id}
                  onChange={(e) => setTransferData({ ...transferData, to_account_id: Number(e.target.value) })}>
                  <option value={0}>-- Select Destination --</option>
                  {accounts.map((b) => (
                    <option key={b.id} value={b.id}>{b.bank_name} – {b.account_name} ({fmt(b.current_balance)})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Amount (₹) *</label>
                  <input type="number" step="0.01" min="0.01" required placeholder="10000"
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                    value={transferData.amount || ''} onChange={(e) => { setTransferData({ ...transferData, amount: parseFloat(e.target.value) || 0 }); setTransferErrors((prev) => ({ ...prev, amount: undefined })); }} />
                  {transferErrors.amount && <p className="text-xs text-rose-600 font-medium mt-1">{transferErrors.amount}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reference No</label>
                  <input type="text" placeholder="TRF-12345"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={transferData.reference_number} onChange={(e) => setTransferData({ ...transferData, reference_number: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setShowTransferModal(false); setTransferErrors({}); }}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={transferSubmitting} disabled={transferSubmitting}><CheckCircle2 className="w-4 h-4 mr-1.5" />Execute Transfer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
