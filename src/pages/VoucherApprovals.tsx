import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  Search,
  Check,
  Landmark,
  Banknote,
  Paperclip,
} from 'lucide-react';
import { fetchAPI, assetUrl } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { Voucher } from '../types';

type ApprovalTab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

export const VoucherApprovals: React.FC = () => {
  const toast = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ApprovalTab>('PENDING');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Approval modal state
  const [approvingVoucher, setApprovingVoucher] = useState<Voucher | null>(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // Rejection modal state
  const [rejectingVoucher, setRejectingVoucher] = useState<Voucher | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingRejection, setIsProcessingRejection] = useState(false);

  // Quick view modal
  const [viewingVoucher, setViewingVoucher] = useState<Voucher | null>(null);

  const loadVouchers = async () => {
    setIsLoading(true);
    const res = await fetchAPI<Voucher[]>('/vouchers');
    if (res.success && res.data) {
      setVouchers(res.data);
    } else {
      toast.error(res.error?.message || 'Failed to load vouchers');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  // Filtered lists
  const pendingVouchers = useMemo(() => vouchers.filter((v) => v.status === 'PENDING'), [vouchers]);
  const approvedVouchers = useMemo(
    () => vouchers.filter((v) => v.status === 'APPROVED' || v.status === 'ISSUED'),
    [vouchers]
  );
  const rejectedVouchers = useMemo(() => vouchers.filter((v) => v.status === 'REJECTED'), [vouchers]);

  const pendingTotal = useMemo(
    () => pendingVouchers.reduce((sum, v) => sum + Number(v.amount || 0), 0),
    [pendingVouchers]
  );
  const approvedTotal = useMemo(
    () => approvedVouchers.reduce((sum, v) => sum + Number(v.amount || 0), 0),
    [approvedVouchers]
  );

  // Filtered by tab, type, and search
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vouchers.filter((v) => {
      // Tab filter
      if (activeTab === 'PENDING' && v.status !== 'PENDING') return false;
      if (activeTab === 'APPROVED' && v.status !== 'APPROVED' && v.status !== 'ISSUED') return false;
      if (activeTab === 'REJECTED' && v.status !== 'REJECTED') return false;

      // Voucher Type filter
      if (typeFilter !== 'ALL' && v.voucher_type !== typeFilter) return false;

      // Text search
      if (q) {
        const matchNo = v.voucher_number.toLowerCase().includes(q);
        const matchPayee = (v.payee_or_donor_name || '').toLowerCase().includes(q);
        const matchTitle = (v.title?.title || '').toLowerCase().includes(q);
        const matchLedger = (v.ledger?.ledger_name || '').toLowerCase().includes(q);
        const matchDetails = (v.details || '').toLowerCase().includes(q);
        return matchNo || matchPayee || matchTitle || matchLedger || matchDetails;
      }
      return true;
    });
  }, [vouchers, activeTab, typeFilter, search]);

  const handleApprove = async () => {
    if (!approvingVoucher) return;
    setIsProcessingApproval(true);

    const res = await fetchAPI(`/vouchers/${approvingVoucher.id}/approve`, {
      method: 'POST',
    });

    if (res.success) {
      toast.success(`Voucher ${approvingVoucher.voucher_number} approved and posted to ledger!`);
      setApprovingVoucher(null);
      loadVouchers();
    } else {
      toast.error(res.error?.message || 'Failed to approve voucher');
    }
    setIsProcessingApproval(false);
  };

  const handleReject = async () => {
    if (!rejectingVoucher) return;
    if (!rejectionReason.trim()) {
      toast.error('Please enter a mandatory rejection reason');
      return;
    }

    setIsProcessingRejection(true);
    const res = await fetchAPI(`/vouchers/${rejectingVoucher.id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: rejectionReason.trim() }),
    });

    if (res.success) {
      toast.success(`Voucher ${rejectingVoucher.voucher_number} rejected`);
      setRejectingVoucher(null);
      setRejectionReason('');
      loadVouchers();
    } else {
      toast.error(res.error?.message || 'Failed to reject voucher');
    }
    setIsProcessingRejection(false);
  };

  const typeBadgeColor: Record<string, string> = {
    INCOME: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    EXPENSE: 'bg-rose-50 text-rose-700 border-rose-200',
    ASSET: 'bg-blue-50 text-blue-700 border-blue-200',
    LIABILITY: 'bg-amber-50 text-amber-700 border-amber-200',
    SELF_TRANSFER: 'bg-purple-50 text-purple-700 border-purple-200',
    DONATION_RECEIPT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    EXPENSE_VOUCHER: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900">Voucher Approvals</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Authorize pending financial vouchers before they deduct from bank accounts or post to daily cash figures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadVouchers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Link to="/vouchers">
            <Button variant="primary" size="sm">
              <FileText className="w-4 h-4 mr-1" /> All Vouchers Register
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-amber-50/50 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Awaiting Approval</p>
              <h3 className="text-2xl font-bold text-amber-900 mt-1">{pendingVouchers.length}</h3>
              <p className="text-xs font-mono font-medium text-amber-700 mt-0.5">
                Total ₹{pendingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Approved Vouchers</p>
              <h3 className="text-2xl font-bold text-emerald-900 mt-1">{approvedVouchers.length}</h3>
              <p className="text-xs font-mono font-medium text-emerald-700 mt-0.5">
                Total ₹{approvedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-rose-50/50 border-rose-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Rejected Vouchers</p>
              <h3 className="text-2xl font-bold text-rose-900 mt-1">{rejectedVouchers.length}</h3>
              <p className="text-xs text-rose-600 mt-0.5">Review rejection reasons</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Tab Bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending Queue ({pendingVouchers.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('APPROVED')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved ({approvedVouchers.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('REJECTED')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Rejected ({rejectedVouchers.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({vouchers.length})
            </button>
          </div>

          {/* Type Filter & Search */}
          <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Types</option>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="SELF_TRANSFER">Self Transfer</option>
            </select>

            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search by voucher #, payee, ledger..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Voucher No</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Payee / Account</th>
                <th className="px-4 py-3 font-semibold">Master Ledger & Title</th>
                <th className="px-4 py-3 font-semibold">Mode & Bank</th>
                <th className="px-4 py-3 text-right font-semibold">Amount (₹)</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Loading vouchers...</span>
                      </div>
                    ) : (
                      'No vouchers found in this category.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredList.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Voucher No */}
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700 whitespace-nowrap">
                      {v.voucher_number}
                    </td>

                    {/* Voucher Type */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                          typeBadgeColor[v.voucher_type] || 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {v.voucher_type.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {v.business_date ? String(v.business_date).substring(0, 10) : ''}
                    </td>

                    {/* Payee / Receiver */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 leading-tight">{v.payee_or_donor_name}</p>
                      {v.details && <p className="text-[11px] text-slate-400 truncate max-w-xs">{v.details}</p>}
                    </td>

                    {/* Ledger & Title */}
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

                    {/* Mode & Bank */}
                    <td className="px-4 py-3 text-xs">
                      {v.payment_mode === 'BANK' ? (
                        <div className="flex items-center gap-1 text-blue-700 font-bold">
                          <Landmark className="w-3.5 h-3.5" />
                          <span>{v.bank_account?.bank_name || 'Bank'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-emerald-700 font-bold">
                          <Banknote className="w-3.5 h-3.5" />
                          <span>CASH</span>
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      ₹{Number(v.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
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

                    {/* Action */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {v.status === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setApprovingVoucher(v)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1 transition-all"
                              title="Approve & Post to Ledger"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingVoucher(v);
                                setRejectionReason('');
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition-all"
                              title="Reject with Reason"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        ) : (
                          <Link to={`/vouchers/${v.id}`}>
                            <Button variant="outline" size="sm" className="text-xs py-1 h-auto">
                              <FileText className="w-3.5 h-3.5 mr-1" /> Receipt
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingVoucher(v)}
                          className="text-xs py-1 h-auto"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── APPROVE MODAL ─────────────────────────────────────────────────── */}
      {approvingVoucher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border-t-4 border-t-emerald-600 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
              <CheckCircle2 className="w-5 h-5" />
              Authorize & Approve Voucher
            </div>
            <p className="text-xs text-slate-600">
              You are about to authorize voucher{' '}
              <strong className="font-mono text-emerald-800">{approvingVoucher.voucher_number}</strong>.
            </p>

            <div className="p-3 bg-slate-50 border rounded-lg text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Voucher Type:</span>
                <span className="font-semibold text-slate-800">
                  {approvingVoucher.voucher_type.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold font-mono text-emerald-700 text-sm">
                  ₹{Number(approvingVoucher.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold text-slate-800">{approvingVoucher.payment_mode}</span>
              </div>
              {approvingVoucher.bank_account && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Account:</span>
                  <span className="font-semibold text-blue-700">
                    {approvingVoucher.bank_account.bank_name} ({approvingVoucher.bank_account.account_number_masked})
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Payee / Account:</span>
                <span className="font-semibold text-slate-800">{approvingVoucher.payee_or_donor_name}</span>
              </div>
              {approvingVoucher.title && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Title:</span>
                  <span className="font-semibold text-slate-800">
                    {approvingVoucher.title.title} ({approvingVoucher.title.title_no})
                  </span>
                </div>
              )}
            </div>

            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Double-entry financial action upon approval:
              </p>
              <p className="text-emerald-800">
                {approvingVoucher.payment_mode === 'CASH'
                  ? `Records Cash ${
                      approvingVoucher.voucher_type === 'EXPENSE' || approvingVoucher.voucher_type === 'ASSET'
                        ? 'OUTFLOW'
                        : 'INFLOW'
                    } in the daily cash register.`
                  : `Records Bank ${
                      approvingVoucher.voucher_type === 'EXPENSE' || approvingVoucher.voucher_type === 'ASSET'
                        ? 'DEBIT'
                        : 'CREDIT'
                    } and updates real-time bank balance.`}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApprovingVoucher(null)}
                disabled={isProcessingApproval}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={handleApprove}
                disabled={isProcessingApproval}
              >
                {isProcessingApproval ? 'Authorizing...' : 'Authorize & Post'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REJECT MODAL ──────────────────────────────────────────────────── */}
      {rejectingVoucher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border-t-4 border-t-rose-600 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <XCircle className="w-5 h-5" />
              Reject Voucher
            </div>
            <p className="text-xs text-slate-600">
              Rejecting voucher{' '}
              <strong className="font-mono text-rose-800">{rejectingVoucher.voucher_number}</strong>. Please enter the
              mandatory rejection reason for audit:
            </p>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State reason for rejecting this voucher..."
              className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-rose-500 resize-none"
            />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingVoucher(null)}
                disabled={isProcessingRejection}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 font-semibold"
                onClick={handleReject}
                disabled={isProcessingRejection}
              >
                {isProcessingRejection ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW MODAL ────────────────────────────────────────────────────── */}
      {viewingVoucher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border-t-8 border-t-emerald-600 animate-in fade-in zoom-in-95">
            <div className="text-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {viewingVoucher.voucher_type.replace('_', ' ')} VOUCHER
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{viewingVoucher.voucher_number}</p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold text-slate-800">
                  {viewingVoucher.business_date ? String(viewingVoucher.business_date).substring(0, 10) : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payee:</span>
                <span className="font-bold text-slate-900">{viewingVoucher.payee_or_donor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold font-mono text-emerald-700 text-sm">
                  ₹{Number(viewingVoucher.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount in Words:</span>
                <span className="font-semibold text-slate-800 text-right max-w-[220px]">
                  {viewingVoucher.amount_in_words}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-slate-800">{viewingVoucher.status}</span>
              </div>
              {viewingVoucher.rejection_reason && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800">
                  <strong>Rejection Reason:</strong> {viewingVoucher.rejection_reason}
                </div>
              )}
              {viewingVoucher.attachment_path && (
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-slate-500">Attachment:</span>
                  <a
                    href={assetUrl(viewingVoucher.attachment_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Paperclip className="w-3.5 h-3.5" /> View Document
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setViewingVoucher(null)}>
                Close
              </Button>
              <Link to={`/vouchers/${viewingVoucher.id}`}>
                <Button variant="primary" size="sm">
                  <FileText className="w-3.5 h-3.5 mr-1" /> Full Receipt
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
