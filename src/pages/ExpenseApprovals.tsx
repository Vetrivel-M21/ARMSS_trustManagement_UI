import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Banknote,
  Landmark,
  FileText,
  Download,
  Search,
  ExternalLink,
  ShieldCheck,
  Receipt,
  User,
  Check,
} from 'lucide-react';
import { fetchAPI, assetUrl } from '../api/client';
import { useToast } from '../context/ToastContext';
import { downloadVoucherPdf } from '../utils/voucherPdf';
import type { Expense, Voucher } from '../types';

type ApprovalTab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

export const ExpenseApprovals: React.FC = () => {
  const toast = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ApprovalTab>('PENDING');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Approval modal state
  const [approvingExpense, setApprovingExpense] = useState<Expense | null>(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // Rejection modal state
  const [rejectingExpense, setRejectingExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingRejection, setIsProcessingRejection] = useState(false);

  // Active voucher modal for viewing/printing
  const [activeVoucher, setActiveVoucher] = useState<Voucher | null>(null);

  const loadExpenses = async () => {
    setIsLoading(true);
    const res = await fetchAPI<Expense[]>('/expenses');
    if (res.success && res.data) {
      setExpenses(res.data);
    } else {
      toast.error(res.error?.message || 'Failed to load expenses');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // Summary counts and metrics
  const pendingExpenses = useMemo(() => expenses.filter((e) => e.status === 'PENDING'), [expenses]);
  const approvedExpenses = useMemo(
    () => expenses.filter((e) => e.status === 'APPROVED' || e.status === 'ACTIVE'),
    [expenses]
  );
  const rejectedExpenses = useMemo(() => expenses.filter((e) => e.status === 'REJECTED'), [expenses]);

  const pendingTotal = useMemo(
    () => pendingExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [pendingExpenses]
  );
  const approvedTotal = useMemo(
    () => approvedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [approvedExpenses]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [expenses]);

  // Filtered expenses based on active tab and search
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Tab filter
      if (activeTab === 'PENDING' && e.status !== 'PENDING') return false;
      if (activeTab === 'APPROVED' && e.status !== 'APPROVED' && e.status !== 'ACTIVE') return false;
      if (activeTab === 'REJECTED' && e.status !== 'REJECTED') return false;

      // Category filter
      if (categoryFilter && e.category !== categoryFilter) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNumber = e.expense_number?.toLowerCase().includes(q);
        const matchPayee = e.payee_name?.toLowerCase().includes(q);
        const matchCat = e.category?.toLowerCase().includes(q);
        const matchRef = e.reference_number?.toLowerCase().includes(q);
        if (!matchNumber && !matchPayee && !matchCat && !matchRef) return false;
      }

      return true;
    });
  }, [expenses, activeTab, categoryFilter, search]);

  const handleApprove = async () => {
    if (!approvingExpense) return;
    setIsProcessingApproval(true);

    const res = await fetchAPI<{ expense: Expense; voucher: Voucher }>(
      `/expenses/${approvingExpense.id}/approve`,
      { method: 'POST' }
    );

    setIsProcessingApproval(false);

    if (res.success && res.data) {
      toast.success(`Expense ${approvingExpense.expense_number} approved and voucher issued.`);
      setApprovingExpense(null);
      if (res.data.voucher) {
        setActiveVoucher(res.data.voucher);
      }
      loadExpenses();
    } else {
      toast.error(res.error?.message || 'Failed to approve expense');
    }
  };

  const handleReject = async () => {
    if (!rejectingExpense) return;
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }

    setIsProcessingRejection(true);

    const res = await fetchAPI<{ expense: Expense }>(`/expenses/${rejectingExpense.id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: rejectionReason.trim() }),
    });

    setIsProcessingRejection(false);

    if (res.success && res.data) {
      toast.success(`Expense ${rejectingExpense.expense_number} has been rejected.`);
      setRejectingExpense(null);
      setRejectionReason('');
      loadExpenses();
    } else {
      toast.error(res.error?.message || 'Failed to reject expense');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Expense Approvals & Authorization
          </h2>
          <p className="text-xs text-slate-500">
            Admin verification gate for outflow expenses — approving releases bank debits or cash outflows and generates vouchers
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadExpenses} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab('PENDING')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'PENDING'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-700 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Pending Approvals
            </span>
            <span className="bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
              {pendingExpenses.length}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₹{pendingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting administrative authorization</p>
        </div>

        <div
          onClick={() => setActiveTab('APPROVED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'APPROVED'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/40 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Approved Outflows
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
              {approvedExpenses.length}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₹{approvedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Debited to bank or deducted from cash</p>
        </div>

        <div
          onClick={() => setActiveTab('REJECTED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'REJECTED'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/40 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Rejected Requests
            </span>
            <span className="bg-rose-100 text-rose-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
              {rejectedExpenses.length}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {rejectedExpenses.length} <span className="text-xs font-normal text-slate-500 font-sans">requests</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Declined with recorded reasons</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
        <div className="flex gap-2">
          {(
            [
              { key: 'PENDING', label: 'Pending Approval', count: pendingExpenses.length },
              { key: 'APPROVED', label: 'Approved', count: approvedExpenses.length },
              { key: 'REJECTED', label: 'Rejected', count: rejectedExpenses.length },
              { key: 'ALL', label: 'All Expenses', count: expenses.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === tab.key ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-emerald-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Expense Details</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Payee / Vendor</th>
                <th className="px-4 py-3">Payment Mode</th>
                <th className="px-4 py-3 font-mono text-right">Amount (₹)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 text-xs">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Loading expense records...</span>
                      </div>
                    ) : (
                      <p>No expense entries found matching current filter</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono font-bold text-rose-700">{e.expense_number}</p>
                      {e.reference_number && (
                        <p className="text-[10px] text-slate-400 font-mono">Ref: {e.reference_number}</p>
                      )}
                      {e.created_by_user && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <User className="w-2.5 h-2.5" /> By {e.created_by_user.full_name || e.created_by_user.username}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                      {e.business_date ? String(e.business_date).substring(0, 10) : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded font-semibold whitespace-nowrap">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{e.payee_name}</p>
                      {e.description && (
                        <p className="text-[11px] text-slate-500 max-w-xs truncate" title={e.description}>
                          {e.description}
                        </p>
                      )}
                      {e.attachment_path && (
                        <a
                          href={assetUrl(e.attachment_path)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-900 underline mt-0.5"
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> View Receipt Document
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 ${
                          e.payment_mode === 'CASH'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {e.payment_mode === 'CASH' ? <Banknote className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                        {e.payment_mode}
                      </span>
                      {e.payment_mode === 'BANK' && e.bank_account && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {e.bank_account.bank_name} ({e.bank_account.account_number_masked})
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                      ₹{Number(e.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {e.status === 'PENDING' && (
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> PENDING
                        </span>
                      )}
                      {(e.status === 'APPROVED' || e.status === 'ACTIVE') && (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> APPROVED
                        </span>
                      )}
                      {e.status === 'REJECTED' && (
                        <div className="flex flex-col items-center">
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> REJECTED
                          </span>
                          {e.rejection_reason && (
                            <span className="text-[10px] text-rose-600 mt-0.5 max-w-[150px] truncate" title={e.rejection_reason}>
                              {e.rejection_reason}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {e.status === 'PENDING' && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setApprovingExpense(e)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-colors shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingExpense(e);
                              setRejectionReason('');
                            }}
                            className="border border-rose-300 text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      )}

                      {(e.status === 'APPROVED' || e.status === 'ACTIVE') && (
                        <div className="flex items-center justify-center gap-1.5">
                          {e.voucher ? (
                            <Button variant="outline" size="sm" onClick={() => setActiveVoucher(e.voucher!)}>
                              <Receipt className="w-3.5 h-3.5 mr-1 text-emerald-700" /> Voucher
                            </Button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-semibold">Authorized</span>
                          )}
                        </div>
                      )}

                      {e.status === 'REJECTED' && (
                        <span className="text-[11px] text-slate-400">Declined</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Approval Confirmation Modal */}
      {approvingExpense && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isProcessingApproval && setApprovingExpense(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Authorize & Approve Expense</h3>
                <p className="text-xs text-slate-500 font-mono">{approvingExpense.expense_number}</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Payee / Vendor:</span>
                <span className="font-bold text-slate-900">{approvingExpense.payee_name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Expense Category:</span>
                <span className="font-semibold text-slate-800">{approvingExpense.category}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Business Date:</span>
                <span className="font-mono text-slate-800">
                  {approvingExpense.business_date ? String(approvingExpense.business_date).substring(0, 10) : ''}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  {approvingExpense.payment_mode === 'CASH' ? <Banknote className="w-3.5 h-3.5 text-amber-600" /> : <Landmark className="w-3.5 h-3.5 text-blue-600" />}
                  {approvingExpense.payment_mode}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-sm bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700">Expense Outflow:</span>
                <span className="font-mono font-bold text-rose-700 text-base">
                  ₹{Number(approvingExpense.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Bank Balance Check Notice */}
              {approvingExpense.payment_mode === 'BANK' && approvingExpense.bank_account && (
                <div className="bg-blue-50/80 p-3 rounded-lg border border-blue-200 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-blue-900">
                    <span>Bank Account:</span>
                    <span className="font-bold">{approvingExpense.bank_account.bank_name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>Current Balance:</span>
                    <span>₹{Number(approvingExpense.bank_account.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-blue-900 font-mono font-bold pt-1 border-t border-blue-200/60">
                    <span>Balance After Debit:</span>
                    <span
                      className={
                        Number(approvingExpense.bank_account.current_balance || 0) < Number(approvingExpense.amount || 0)
                          ? 'text-rose-600'
                          : 'text-emerald-700'
                      }
                    >
                      ₹
                      {(
                        Number(approvingExpense.bank_account.current_balance || 0) - Number(approvingExpense.amount || 0)
                      ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {Number(approvingExpense.bank_account.current_balance || 0) < Number(approvingExpense.amount || 0) && (
                    <p className="text-rose-600 font-semibold flex items-center gap-1 pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Insufficient funds in this bank account to complete approval.
                    </p>
                  )}
                </div>
              )}

              {approvingExpense.payment_mode === 'CASH' && (
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-800">
                  <p className="font-medium">
                    Approving this expense will record an official Cash Outflow in the daily cash ledger and generate an Expense Voucher.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApprovingExpense(null)}
                disabled={isProcessingApproval}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                disabled={
                  isProcessingApproval ||
                  (approvingExpense.payment_mode === 'BANK' &&
                    approvingExpense.bank_account &&
                    Number(approvingExpense.bank_account.current_balance || 0) < Number(approvingExpense.amount || 0))
                }
              >
                {isProcessingApproval ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Authorizing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Confirm & Authorize
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingExpense && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isProcessingRejection && setRejectingExpense(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className="p-2.5 bg-rose-100 text-rose-800 rounded-xl">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reject Outflow Expense</h3>
                <p className="text-xs text-slate-500 font-mono">{rejectingExpense.expense_number}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Please provide the reason for rejecting the expense of{' '}
                <span className="font-bold text-slate-900">
                  ₹{Number(rejectingExpense.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>{' '}
                for <span className="font-bold text-slate-900">{rejectingExpense.payee_name}</span>. This will be visible to staff.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g., Incomplete invoice, incorrect vendor details, or duplicate claim..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 text-xs"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingExpense(null)}
                disabled={isProcessingRejection}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessingRejection || !rejectionReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {isProcessingRejection ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" /> Confirm Rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Voucher View / Print Modal */}
      {activeVoucher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border-t-8 border-t-emerald-600">
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
                <span className="font-mono font-bold text-rose-700 text-base">
                  ₹{Number(activeVoucher.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
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
              <Button variant="primary" size="sm" onClick={() => setActiveVoucher(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
