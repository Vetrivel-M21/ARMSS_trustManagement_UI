import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Download,
  RefreshCw,
  Eye,
  FileText,
  Plus,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Layers,
  Landmark,
  Banknote,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  FolderPlus,
  Clock,
} from 'lucide-react';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { downloadVoucherPdf } from '../utils/voucherPdf';
import { uploadFile } from '../utils/upload';
import type {
  Voucher,
  VoucherType,
  Ledger,
  VoucherTitle,
  BankAccount,
  VoucherReportSummary,
  LedgerSummaryItem,
} from '../types';

export const Vouchers: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // State
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [summary, setSummary] = useState<VoucherReportSummary | null>(null);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummaryItem[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [titles, setTitles] = useState<VoucherTitle[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterLedger, setFilterLedger] = useState<string>('ALL');
  const [filterTitle, setFilterTitle] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingVoucherId, setCancellingVoucherId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Approval & Rejection states
  const [approvingVoucher, setApprovingVoucher] = useState<Voucher | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [rejectingVoucher, setRejectingVoucher] = useState<Voucher | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Create Voucher Form
  const [voucherType, setVoucherType] = useState<VoucherType>('EXPENSE');
  const [createForm, setCreateForm] = useState({
    title_id: 0,
    ledger_id: 0,
    business_date: new Date().toISOString().split('T')[0],
    payment_mode: 'CASH' as 'CASH' | 'BANK',
    bank_account_id: 0,
    from_bank_account_id: 0,
    to_bank_account_id: 0,
    payee_or_donor_name: '',
    amount: '',
    details: '',
    attachment_path: '',
    auto_approve: false,
  });

  const loadData = async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filterType && filterType !== 'ALL') params.set('type', filterType);
    if (filterLedger && filterLedger !== 'ALL') params.set('ledger_id', filterLedger);
    if (filterTitle && filterTitle !== 'ALL') params.set('title_id', filterTitle);
    if (filterMode && filterMode !== 'ALL') params.set('payment_mode', filterMode);
    if (filterStatus && filterStatus !== 'ALL') params.set('status', filterStatus);
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);

    const [reportRes, ledgersRes, titlesRes, banksRes] = await Promise.all([
      fetchAPI<{ summary: VoucherReportSummary; ledger_summary: LedgerSummaryItem[]; vouchers: Voucher[] }>(
        `/reports/vouchers?${params.toString()}`
      ),
      fetchAPI<Ledger[]>('/ledgers?active_only=true'),
      fetchAPI<VoucherTitle[]>('/titles?active_only=true'),
      fetchAPI<BankAccount[]>('/bank-accounts/active'),
    ]);

    if (reportRes.success && reportRes.data) {
      setVouchers(reportRes.data.vouchers || []);
      setSummary(reportRes.data.summary);
      setLedgerSummary(reportRes.data.ledger_summary || []);
    }
    if (ledgersRes.success && ledgersRes.data) setLedgers(ledgersRes.data);
    if (titlesRes.success && titlesRes.data) setTitles(titlesRes.data);
    if (banksRes.success && banksRes.data) setBankAccounts(banksRes.data);

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [filterType, filterLedger, filterTitle, filterMode, filterStatus, fromDate, toDate]);

  // When voucher type changes in Create modal, reset title/ledger and filter matching titles
  const matchingTitles = titles.filter((t) => t.voucher_type === voucherType);

  const handleTitleSelect = (titleId: number) => {
    const selected = titles.find((t) => t.id === titleId);
    if (selected) {
      setCreateForm((prev) => ({
        ...prev,
        title_id: selected.id,
        ledger_id: selected.ledger_id,
      }));
    } else {
      setCreateForm((prev) => ({ ...prev, title_id: 0, ledger_id: 0 }));
    }
  };

  const handleAttachmentUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingAttachment(true);
    const path = await uploadFile(file);
    setUploadingAttachment(false);
    if (path) {
      setCreateForm((prev) => ({ ...prev, attachment_path: path }));
      toast.success('Document uploaded successfully');
    } else {
      toast.error('Failed to upload document');
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(createForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount greater than zero.');
      return;
    }

    if (voucherType !== 'SELF_TRANSFER' && !createForm.title_id) {
      toast.error('Please select a voucher title.');
      return;
    }

    if (voucherType === 'SELF_TRANSFER') {
      if (!createForm.from_bank_account_id && !createForm.to_bank_account_id) {
        toast.error('Please select source or destination accounts for self transfer.');
        return;
      }
      if (
        createForm.from_bank_account_id &&
        createForm.to_bank_account_id &&
        createForm.from_bank_account_id === createForm.to_bank_account_id
      ) {
        toast.error('Source and destination accounts cannot be identical.');
        return;
      }
    } else if (createForm.payment_mode === 'BANK' && !createForm.bank_account_id) {
      toast.error('Please select a bank account.');
      return;
    }

    const payload: any = {
      voucher_type: voucherType,
      business_date: createForm.business_date,
      payment_mode: voucherType === 'SELF_TRANSFER' ? 'BANK' : createForm.payment_mode,
      amount: amt,
      payee_or_donor_name: createForm.payee_or_donor_name,
      details: createForm.details,
      attachment_path: createForm.attachment_path,
      auto_approve: createForm.auto_approve,
    };

    if (createForm.title_id) payload.title_id = createForm.title_id;
    if (createForm.ledger_id) payload.ledger_id = createForm.ledger_id;

    if (voucherType === 'SELF_TRANSFER') {
      if (createForm.from_bank_account_id) payload.from_bank_account_id = createForm.from_bank_account_id;
      if (createForm.to_bank_account_id) payload.to_bank_account_id = createForm.to_bank_account_id;
    } else if (createForm.payment_mode === 'BANK') {
      payload.bank_account_id = createForm.bank_account_id;
    }

    const res = await fetchAPI<Voucher>('/vouchers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      if (createForm.auto_approve) {
        toast.success(`Voucher ${res.data.voucher_number} created and approved directly!`);
      } else {
        toast.success(`Voucher ${res.data.voucher_number} submitted in PENDING status for Admin approval.`);
      }
      setShowCreateModal(false);
      setCreateForm({
        title_id: 0,
        ledger_id: 0,
        business_date: new Date().toISOString().split('T')[0],
        payment_mode: 'CASH',
        bank_account_id: 0,
        from_bank_account_id: 0,
        to_bank_account_id: 0,
        payee_or_donor_name: '',
        amount: '',
        details: '',
        attachment_path: '',
        auto_approve: false,
      });
      loadData();
    } else {
      toast.error(res.error?.message || 'Failed to create voucher');
    }
  };

  const handleApproveVoucher = async () => {
    if (!approvingVoucher) return;
    setIsApproving(true);
    const res = await fetchAPI(`/vouchers/${approvingVoucher.id}/approve`, {
      method: 'POST',
    });
    if (res.success) {
      toast.success(`Voucher ${approvingVoucher.voucher_number} approved and posted to ledger successfully!`);
      setApprovingVoucher(null);
      loadData();
    } else {
      toast.error(res.error?.message || 'Failed to approve voucher');
    }
    setIsApproving(false);
  };

  const handleRejectVoucher = async () => {
    if (!rejectingVoucher) return;
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    setIsRejecting(true);
    const res = await fetchAPI(`/vouchers/${rejectingVoucher.id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: rejectionReason.trim() }),
    });
    if (res.success) {
      toast.success(`Voucher ${rejectingVoucher.voucher_number} rejected.`);
      setRejectingVoucher(null);
      setRejectionReason('');
      loadData();
    } else {
      toast.error(res.error?.message || 'Failed to reject voucher');
    }
    setIsRejecting(false);
  };

  const handleCancelVoucher = async () => {
    if (!cancellingVoucherId) return;
    if (!cancelReason.trim()) {
      toast.error('Please enter a cancellation reason.');
      return;
    }

    const res = await fetchAPI(`/vouchers/${cancellingVoucherId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: cancelReason.trim() }),
    });

    if (res.success) {
      toast.success('Voucher cancelled and ledger reversed successfully.');
      setShowCancelModal(false);
      setCancellingVoucherId(null);
      setCancelReason('');
      loadData();
    } else {
      toast.error(res.error?.message || 'Failed to cancel voucher');
    }
  };

  // Filter vouchers by search text
  const filteredVouchers = vouchers.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.voucher_number.toLowerCase().includes(q) ||
      (v.payee_or_donor_name || '').toLowerCase().includes(q) ||
      (v.details || '').toLowerCase().includes(q) ||
      (v.title?.title || '').toLowerCase().includes(q) ||
      (v.ledger?.ledger_name || '').toLowerCase().includes(q)
    );
  });

  const selectedLedgerObj = ledgers.find((l) => l.id === createForm.ledger_id);

  const typeBadgeColor: Record<string, string> = {
    INCOME: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DONATION_RECEIPT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    EXPENSE: 'bg-rose-50 text-rose-700 border-rose-200',
    EXPENSE_VOUCHER: 'bg-rose-50 text-rose-700 border-rose-200',
    ASSET: 'bg-blue-50 text-blue-700 border-blue-200',
    LIABILITY: 'bg-amber-50 text-amber-700 border-amber-200',
    SELF_TRANSFER: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900">Voucher & Financial Register</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade double-entry register for Income, Expense, Assets, Liabilities & Self Transfers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/ledgers">
            <Button variant="outline" size="sm">
              <FolderPlus className="w-4 h-4 mr-1 text-emerald-600" /> Chart of Accounts
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Voucher
          </Button>
        </div>
      </div>

      {/* Financial Summary Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3 bg-emerald-50/50 border-emerald-200">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
              <span>Total Income</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-base font-bold font-mono text-emerald-700">
              ₹{summary.total_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </Card>

          <Card className="p-3 bg-rose-50/50 border-rose-200">
            <div className="flex items-center justify-between text-xs text-rose-800 font-semibold mb-1">
              <span>Total Expense</span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-base font-bold font-mono text-rose-700">
              ₹{summary.total_expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </Card>

          <Card className="p-3 bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-800 font-semibold mb-1">
              <span>Net Cash Flow</span>
              <ArrowRightLeft className="w-4 h-4 text-slate-600" />
            </div>
            <p
              className={`text-base font-bold font-mono ${
                summary.net_cash_flow >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              ₹{summary.net_cash_flow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </Card>

          <Card className="p-3 bg-blue-50/50 border-blue-200">
            <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
              <span>Capital Assets</span>
              <Landmark className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-base font-bold font-mono text-blue-700">
              ₹{summary.total_assets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </Card>

          <Card className="p-3 bg-amber-50/50 border-amber-200">
            <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
              <span>Liabilities / Loans</span>
              <Banknote className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-base font-bold font-mono text-amber-700">
              ₹{summary.total_liabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </Card>

          <Card className="p-3 bg-purple-50/50 border-purple-200">
            <div className="flex items-center justify-between text-xs text-purple-800 font-semibold mb-1">
              <span>Self Transfers</span>
              <ArrowRightLeft className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-base font-bold font-mono text-purple-700">
              ₹{summary.total_self_transfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </Card>
        </div>
      )}

      {/* Filter Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-emerald-600" /> Filters & Reporting Scope
          </div>
          <button
            type="button"
            onClick={() => {
              setFilterType('ALL');
              setFilterLedger('ALL');
              setFilterTitle('ALL');
              setFilterMode('ALL');
              setFilterStatus('ALL');
              setFromDate('');
              setToDate('');
              setSearchQuery('');
            }}
            className="text-xs text-emerald-700 font-medium hover:underline"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Voucher Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="SELF_TRANSFER">Self Transfer</option>
              <option value="DONATION_RECEIPT">Donation Receipt</option>
              <option value="EXPENSE_VOUCHER">Expense Voucher</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Master Ledger</label>
            <select
              value={filterLedger}
              onChange={(e) => setFilterLedger(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Ledgers</option>
              {ledgers.map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {l.ledger_name} ({l.ledger_no})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Payment Mode</label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="ISSUED">Issued</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Live text search */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search by voucher no, payee, title name, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </Card>

      {/* Ledger Breakdown Widget (if any) */}
      {ledgerSummary.length > 0 && (
        <Card className="p-4 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" /> Ledger Financial Summary
            </h3>
            <span className="text-xs text-slate-400 font-medium">{ledgerSummary.length} active ledgers</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b">
                  <th className="py-2 px-3">Ledger No</th>
                  <th className="py-2 px-3">Ledger Name</th>
                  <th className="py-2 px-3 text-right">Debit (₹)</th>
                  <th className="py-2 px-3 text-right">Credit (₹)</th>
                  <th className="py-2 px-3 text-right">Net Flow (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerSummary.map((ls) => (
                  <tr key={ls.ledger_id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono font-semibold text-emerald-700">{ls.ledger_no || '—'}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{ls.ledger_name}</td>
                    <td className="py-2 px-3 text-right font-mono text-rose-700">
                      ₹{ls.total_debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700">
                      ₹{ls.total_credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono font-bold ${
                        ls.net_amount >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      ₹{ls.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Main Voucher Register Table */}
      <Card>
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 p-3 border-b border-slate-200 overflow-x-auto bg-slate-50/50">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            All Vouchers ({vouchers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('PENDING')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Approval ({vouchers.filter((v) => v.status === 'PENDING').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('APPROVED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'APPROVED' || filterStatus === 'ISSUED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved / Issued ({vouchers.filter((v) => v.status === 'APPROVED' || v.status === 'ISSUED').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('REJECTED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Rejected ({vouchers.filter((v) => v.status === 'REJECTED').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('CANCELLED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'CANCELLED'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            Cancelled ({vouchers.filter((v) => v.status === 'CANCELLED').length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Voucher No</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Payee / Account</th>
                <th className="px-4 py-3">Title & Ledger</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">
                    {isLoading ? 'Loading vouchers...' : 'No vouchers recorded matching the selected criteria.'}
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700">{v.voucher_number}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${
                          typeBadgeColor[v.voucher_type] || 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {v.voucher_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {v.business_date ? String(v.business_date).substring(0, 10) : ''}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <p className="text-slate-900 leading-tight">{v.payee_or_donor_name}</p>
                      {v.details && <p className="text-[11px] text-slate-400 truncate max-w-xs">{v.details}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {v.title ? (
                        <div>
                          <p className="font-semibold text-slate-800">{v.title.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {v.ledger?.ledger_name || ''} ({v.title.title_no})
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Direct Entry</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                      {v.payment_mode === 'BANK' && v.bank_account ? (
                        <div>
                          <span className="text-blue-700 font-bold">BANK</span>
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                            {v.bank_account.bank_name}
                          </p>
                        </div>
                      ) : (
                        v.payment_mode
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      ₹{v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                          v.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : v.status === 'APPROVED' || v.status === 'ISSUED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : v.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {v.status === 'PENDING' && <Clock className="w-3 h-3 text-amber-600" />}
                        {(v.status === 'APPROVED' || v.status === 'ISSUED') && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        )}
                        {v.status === 'REJECTED' && <XCircle className="w-3 h-3 text-rose-600" />}
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Approval actions for PENDING vouchers */}
                        {isAdmin && v.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setApprovingVoucher(v)}
                              className="px-2 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm flex items-center gap-1"
                              title="Approve Voucher & Post to Ledger"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingVoucher(v);
                                setRejectionReason('');
                              }}
                              className="px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded flex items-center gap-1"
                              title="Reject Voucher"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}

                        <Button variant="outline" size="sm" onClick={() => setSelectedVoucher(v)} title="Quick View">
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                        <Link to={`/vouchers/${v.id}`}>
                          <Button variant="primary" size="sm" title="Print/Download Official Receipt">
                            <FileText className="w-3.5 h-3.5 mr-1" /> Receipt
                          </Button>
                        </Link>
                        {isAdmin && v.status !== 'CANCELLED' && v.status !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingVoucherId(v.id);
                              setCancelReason('');
                              setShowCancelModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Cancel Voucher"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── CREATE VOUCHER MODAL (ALL 5 VOUCHER TYPES) ─────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border-t-4 border-t-emerald-600 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Create Financial Voucher</h3>
                <p className="text-xs text-slate-500">Record a verified transaction into the trust ledger</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-4 text-xs">
              {/* Voucher Type Tabs */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1.5">Voucher Classification *</label>
                <div className="grid grid-cols-5 gap-1.5 bg-slate-100 p-1 rounded-lg">
                  {(['EXPENSE', 'INCOME', 'ASSET', 'LIABILITY', 'SELF_TRANSFER'] as VoucherType[]).map((vt) => (
                    <button
                      key={vt}
                      type="button"
                      onClick={() => {
                        setVoucherType(vt);
                        setCreateForm((prev) => ({ ...prev, title_id: 0, ledger_id: 0 }));
                      }}
                      className={`py-1.5 px-2 rounded-md font-bold text-[11px] transition-all capitalize ${
                        voucherType === vt
                          ? 'bg-white text-emerald-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {vt.replace('_', ' ').toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Ledger Selection */}
              {voucherType !== 'SELF_TRANSFER' && (
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Select Voucher Title *</label>
                      <select
                        required
                        value={createForm.title_id}
                        onChange={(e) => handleTitleSelect(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value={0}>-- Select Title ({voucherType}) --</option>
                        {matchingTitles.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title} ({t.title_no})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Parent Master Ledger</label>
                      <input
                        type="text"
                        disabled
                        value={
                          selectedLedgerObj
                            ? `${selectedLedgerObj.ledger_name} (${selectedLedgerObj.ledger_no})`
                            : 'Auto-resolved from Title'
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-slate-100 text-slate-600 font-semibold cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Business Date & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Business Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.business_date}
                    onChange={(e) => setCreateForm({ ...createForm, business_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Payment Mode / Account Details */}
              {voucherType === 'SELF_TRANSFER' ? (
                /* Self-Transfer Accounts */
                <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-200 space-y-3">
                  <p className="font-bold text-purple-900 text-xs">Self Transfer (Contra Accounts):</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">From (Debit Source)</label>
                      <select
                        value={createForm.from_bank_account_id}
                        onChange={(e) => setCreateForm({ ...createForm, from_bank_account_id: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg font-semibold bg-white"
                      >
                        <option value={0}>Physical Cash In Hand</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bank_name} ({b.account_number_masked})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">To (Credit Destination)</label>
                      <select
                        value={createForm.to_bank_account_id}
                        onChange={(e) => setCreateForm({ ...createForm, to_bank_account_id: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg font-semibold bg-white"
                      >
                        <option value={0}>Physical Cash In Hand</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bank_name} ({b.account_number_masked})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Cash vs Bank */
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Payment Mode *</label>
                    <select
                      value={createForm.payment_mode}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, payment_mode: e.target.value as 'CASH' | 'BANK' })
                      }
                      className="w-full px-3 py-2 border rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="CASH">Cash (Cash Register)</option>
                      <option value="BANK">Bank Account</option>
                    </select>
                  </div>

                  {createForm.payment_mode === 'BANK' && (
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Select Bank Account *</label>
                      <select
                        required
                        value={createForm.bank_account_id}
                        onChange={(e) => setCreateForm({ ...createForm, bank_account_id: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value={0}>-- Select Bank Account --</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bank_name} - {b.account_number_masked}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Payee / Receiver Name */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {voucherType === 'INCOME'
                    ? 'Received From (Donor / Payer Name)'
                    : voucherType === 'EXPENSE' || voucherType === 'ASSET'
                    ? 'Paid To (Vendor / Payee Name)'
                    : 'Party / Payee Name'}
                </label>
                <input
                  type="text"
                  placeholder="Person, vendor, or institution name"
                  value={createForm.payee_or_donor_name}
                  onChange={(e) => setCreateForm({ ...createForm, payee_or_donor_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Details & Narration */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Narration / Details</label>
                <textarea
                  rows={2}
                  placeholder="State transaction purpose and invoice/bill details..."
                  value={createForm.details}
                  onChange={(e) => setCreateForm({ ...createForm, details: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Attachment upload */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Supporting Bill / Attachment</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleAttachmentUpload(e.target.files?.[0] || null)}
                    className="text-xs"
                    disabled={uploadingAttachment}
                  />
                  {uploadingAttachment && <span className="text-xs text-slate-400">Uploading...</span>}
                  {createForm.attachment_path && (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Attached
                    </span>
                  )}
                </div>
              </div>

              {/* Approval notice and Admin Auto-Approve */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <div className="flex items-start gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p>
                    {createForm.auto_approve
                      ? 'This voucher will be approved immediately and posted to the cash/bank register.'
                      : 'By default, vouchers are submitted in PENDING status for Admin verification before financial posting.'}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <input
                      type="checkbox"
                      id="voucher_auto_approve"
                      checked={createForm.auto_approve}
                      onChange={(e) => setCreateForm({ ...createForm, auto_approve: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="voucher_auto_approve" className="text-emerald-900 font-semibold cursor-pointer">
                      Directly Approve & Issue (Post to Bank/Cash immediately)
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={uploadingAttachment}>
                  {createForm.auto_approve ? 'Issue & Post Voucher' : 'Submit for Approval'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── QUICK VIEW MODAL (PRESERVED OFFICIAL DESIGN ACCESS) ───────────── */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border-t-8 border-t-emerald-600 animate-in fade-in zoom-in-95">
            <div className="text-center border-b pb-4">
              <h3 className="font-bold text-lg text-slate-900">
                {selectedVoucher.voucher_type.replace('_', ' ')} VOUCHER
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedVoucher.voucher_number}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Business Date:</span>
                <span className="font-semibold text-slate-900">
                  {selectedVoucher.business_date ? String(selectedVoucher.business_date).substring(0, 10) : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payee / Account:</span>
                <span className="font-bold text-slate-900">{selectedVoucher.payee_or_donor_name}</span>
              </div>
              {selectedVoucher.title && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Voucher Title:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedVoucher.title.title} ({selectedVoucher.title.title_no})
                  </span>
                </div>
              )}
              {selectedVoucher.ledger && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Master Ledger:</span>
                  <span className="font-semibold text-emerald-800">
                    {selectedVoucher.ledger.ledger_name} ({selectedVoucher.ledger.ledger_no})
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold text-slate-900">{selectedVoucher.payment_mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Voucher Amount:</span>
                <span className="font-mono font-bold text-emerald-700 text-base">
                  ₹{selectedVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border text-[11px] font-medium text-slate-700">
                Amount in Words: <br />
                <span className="italic font-serif text-slate-900">{selectedVoucher.amount_in_words}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => downloadVoucherPdf(selectedVoucher)}>
                <Download className="w-4 h-4 mr-1" /> Download PDF
              </Button>
              <Link to={`/vouchers/${selectedVoucher.id}`}>
                <Button variant="primary" size="sm">
                  <FileText className="w-4 h-4 mr-1" /> Open Full Receipt
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setSelectedVoucher(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CANCEL VOUCHER CONFIRMATION MODAL ──────────────────────────────── */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border-t-4 border-t-rose-600 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              Cancel Voucher
            </div>
            <p className="text-xs text-slate-600">
              Cancelling will reverse all associated cash and bank ledger balances. Please state the cancellation reason
              for the audit trail:
            </p>
            <textarea
              required
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Mandatory cancellation reason..."
              className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-rose-500 resize-none"
            />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)}>
                Go Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 font-semibold"
                onClick={handleCancelVoucher}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── APPROVE VOUCHER MODAL ────────────────────────────────────── */}
      {approvingVoucher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border-t-4 border-t-emerald-600 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
              <CheckCircle2 className="w-5 h-5" />
              Approve Voucher
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to approve voucher{' '}
              <strong className="font-mono text-emerald-800">{approvingVoucher.voucher_number}</strong>?
            </p>
            <div className="p-3 bg-slate-50 border rounded-lg text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Type:</span>
                <span className="font-semibold text-slate-800">{approvingVoucher.voucher_type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold font-mono text-emerald-700">
                  ₹{Number(approvingVoucher.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold text-slate-800">{approvingVoucher.payment_mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payee / Account:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                  {approvingVoucher.payee_or_donor_name}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Approving will automatically record the double-entry transaction and post funds to the bank/cash ledger.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setApprovingVoucher(null)} disabled={isApproving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={handleApproveVoucher}
                disabled={isApproving}
              >
                {isApproving ? 'Approving...' : 'Confirm Approval'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REJECT VOUCHER MODAL ─────────────────────────────────────── */}
      {rejectingVoucher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border-t-4 border-t-rose-600 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <XCircle className="w-5 h-5" />
              Reject Voucher
            </div>
            <p className="text-xs text-slate-600">
              Rejecting voucher{' '}
              <strong className="font-mono text-rose-800">{rejectingVoucher.voucher_number}</strong>. Please provide a mandatory rejection reason:
            </p>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State why this voucher is being rejected..."
              className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-rose-500 resize-none"
            />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setRejectingVoucher(null)} disabled={isRejecting}>
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 font-semibold"
                onClick={handleRejectVoucher}
                disabled={isRejecting}
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
