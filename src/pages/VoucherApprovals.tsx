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
  Smartphone,
  Copy,
  Building2,
  AlertCircle,
  QrCode,
} from 'lucide-react';
import { fetchAPI, assetUrl } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useBranch } from '../context/BranchContext';
import type { Voucher, Donation, BankAccount } from '../types';

type ApprovalTab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';
type SectionMode = 'VOUCHERS' | 'DONATIONS';

export const VoucherApprovals: React.FC = () => {
  const toast = useToast();
  const { activeBranch, activeBranchId, isAllBranches } = useBranch();

  // Primary Section
  const [activeSection, setActiveSection] = useState<SectionMode>('VOUCHERS');

  // Vouchers state
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ApprovalTab>('PENDING');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Voucher Approval modal state
  const [approvingVoucher, setApprovingVoucher] = useState<Voucher | null>(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // Voucher Rejection modal state
  const [rejectingVoucher, setRejectingVoucher] = useState<Voucher | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingRejection, setIsProcessingRejection] = useState(false);

  // Voucher Quick view modal
  const [viewingVoucher, setViewingVoucher] = useState<Voucher | null>(null);

  // Online App Donations state
  const [pendingDonations, setPendingDonations] = useState<Donation[]>([]);
  const [isLoadingDonations, setIsLoadingDonations] = useState(false);
  const [donationSearch, setDonationSearch] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Donation Approval modal state
  const [approvingDonation, setApprovingDonation] = useState<Donation | null>(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | ''>('');
  const [isProcessingDonationApproval, setIsProcessingDonationApproval] = useState(false);

  // Donation Rejection modal state
  const [rejectingDonation, setRejectingDonation] = useState<Donation | null>(null);
  const [donationRejectionReason, setDonationRejectionReason] = useState('');
  const [isProcessingDonationRejection, setIsProcessingDonationRejection] = useState(false);

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

  const loadPendingDonations = async () => {
    setIsLoadingDonations(true);
    const res = await fetchAPI<Donation[]>('/donations/pending-verifications');
    if (res.success && res.data) {
      setPendingDonations(res.data);
    } else {
      toast.error(res.error?.message || 'Failed to load pending donations');
    }
    setIsLoadingDonations(false);
  };

  const loadBankAccounts = async () => {
    const res = await fetchAPI<BankAccount[]>('/bank-accounts/active');
    if (res.success && res.data) {
      setBankAccounts(res.data);
    }
  };

  useEffect(() => {
    loadVouchers();
    loadPendingDonations();
    loadBankAccounts();
  }, [activeBranchId]);

  const handleRefresh = () => {
    if (activeSection === 'VOUCHERS') {
      loadVouchers();
    } else {
      loadPendingDonations();
    }
  };

  // Vouchers Filtered lists
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

  const filteredVouchers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vouchers.filter((v) => {
      if (activeTab === 'PENDING' && v.status !== 'PENDING') return false;
      if (activeTab === 'APPROVED' && v.status !== 'APPROVED' && v.status !== 'ISSUED') return false;
      if (activeTab === 'REJECTED' && v.status !== 'REJECTED') return false;

      if (typeFilter !== 'ALL' && v.voucher_type !== typeFilter) return false;

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

  // Donations Filtered list
  const filteredDonations = useMemo(() => {
    const q = donationSearch.trim().toLowerCase();
    if (!q) return pendingDonations;
    return pendingDonations.filter((d) => {
      const matchNo = d.donation_number.toLowerCase().includes(q);
      const matchRef = (d.reference_number || '').toLowerCase().includes(q);
      const matchDonor = (d.donor?.full_name || '').toLowerCase().includes(q);
      const matchPhone = (d.donor?.phone || '').toLowerCase().includes(q);
      const matchPan = (d.donor?.pan_number || '').toLowerCase().includes(q);
      const matchPurpose = (d.purpose || '').toLowerCase().includes(q);
      const matchHome = (d.trust_home || '').toLowerCase().includes(q);
      return matchNo || matchRef || matchDonor || matchPhone || matchPan || matchPurpose || matchHome;
    });
  }, [pendingDonations, donationSearch]);

  const pendingDonationsTotal = useMemo(
    () => pendingDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0),
    [pendingDonations]
  );

  const handleApproveVoucher = async () => {
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

  const handleRejectVoucher = async () => {
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

  // Donation approval handler
  const handleOpenApproveDonation = (donation: Donation) => {
    setApprovingDonation(donation);
    setSelectedBankAccountId(donation.bank_account_id || (bankAccounts[0] ? bankAccounts[0].id : ''));
  };

  const handleConfirmApproveDonation = async () => {
    if (!approvingDonation) return;
    setIsProcessingDonationApproval(true);

    const payload: { bank_account_id?: number } = {};
    if (selectedBankAccountId && Number(selectedBankAccountId) > 0) {
      payload.bank_account_id = Number(selectedBankAccountId);
    }

    const res = await fetchAPI(`/donations/${approvingDonation.id}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success) {
      toast.success(`Donation ${approvingDonation.donation_number} approved! 80G receipt unlocked for donor.`);
      setApprovingDonation(null);
      loadPendingDonations();
      loadVouchers(); // Refresh vouchers as well
    } else {
      toast.error(res.error?.message || 'Failed to approve donation');
    }
    setIsProcessingDonationApproval(false);
  };

  // Donation rejection handler
  const handleConfirmRejectDonation = async () => {
    if (!rejectingDonation) return;
    if (!donationRejectionReason.trim()) {
      toast.error('Please enter a mandatory rejection reason');
      return;
    }

    setIsProcessingDonationRejection(true);
    const res = await fetchAPI(`/donations/${rejectingDonation.id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: donationRejectionReason.trim() }),
    });

    if (res.success) {
      toast.success(`Donation ${rejectingDonation.donation_number} rejected`);
      setRejectingDonation(null);
      setDonationRejectionReason('');
      loadPendingDonations();
    } else {
      toast.error(res.error?.message || 'Failed to reject donation');
    }
    setIsProcessingDonationRejection(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    toast.success(`Copied "${text}" to clipboard!`);
    setTimeout(() => setCopiedRef(null), 2500);
  };

  const getBranchBadge = (code?: string, name?: string) => {
    const c = (code || '').toUpperCase();
    if (c === 'OAH' || c.includes('OLD AGE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Building2 className="w-3 h-3 text-amber-600" />
          OAH (Old Age Home)
        </span>
      );
    }
    if (c === 'CH' || c.includes('CHILDREN HOME')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <Building2 className="w-3 h-3 text-blue-600" />
          CH (Children Home)
        </span>
      );
    }
    if (c === 'CAH' || c.includes('ADOPTION')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
          <Building2 className="w-3 h-3 text-purple-600" />
          CAH (Adoption Home)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Building2 className="w-3 h-3 text-slate-500" />
        {name || code || 'Branch'}
      </span>
    );
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
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900">Approvals & Verifications</h2>
            {activeBranch ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {activeBranch.name} ({activeBranch.branch_code})
              </span>
            ) : isAllBranches ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-300">
                All Branches (Consolidated)
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify branch UPI/QR mobile donations & authorize expense/income vouchers before double-entry posting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isLoadingDonations}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isLoading || isLoadingDonations ? 'animate-spin' : ''}`}
            />{' '}
            Refresh
          </Button>
          <Link to="/vouchers">
            <Button variant="primary" size="sm">
              <FileText className="w-4 h-4 mr-1" /> Vouchers Register
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveSection('VOUCHERS')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeSection === 'VOUCHERS'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Financial Vouchers
          {pendingVouchers.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold border border-amber-200">
              {pendingVouchers.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('DONATIONS')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all relative ${
            activeSection === 'DONATIONS'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          App Online Donations (QR / UPI)
          {pendingDonations.length > 0 ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-amber-500 text-white font-bold animate-pulse shadow-sm">
              {pendingDonations.length} Pending
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-medium">
              0
            </span>
          )}
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: APP ONLINE DONATIONS VERIFICATION                           */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeSection === 'DONATIONS' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Info Banner */}
          <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-bold text-amber-950">Mobile App Donation Verification Process:</strong>
              <p className="mt-0.5 text-amber-800">
                Donors scanning branch QR codes or paying via UPI in the Mobile App have their transactions recorded as{' '}
                <span className="font-semibold underline">Pending Verification</span>. Staff or Admin must verify the
                bank reference (UTR) against the branch bank statement before approving. Upon approval, the credit is
                booked in the ledger and the official 80G receipt is unlocked for the donor to download.
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-amber-50/60 border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                    Awaiting Bank Verification
                  </p>
                  <h3 className="text-2xl font-bold text-amber-900 mt-1">{pendingDonations.length}</h3>
                  <p className="text-xs font-mono font-medium text-amber-700 mt-0.5">
                    Total ₹{pendingDonationsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-emerald-50/60 border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Current Branch Scope
                  </p>
                  <h3 className="text-lg font-bold text-emerald-950 mt-1">
                    {activeBranch ? activeBranch.name : 'All Trust Branches'}
                  </h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {activeBranch ? `Branch Code: ${activeBranch.branch_code}` : 'Consolidated view for Trust Admin'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-blue-50/60 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                    Receipt Issuance Mode
                  </p>
                  <h3 className="text-lg font-bold text-blue-950 mt-1">Section 80G Certified</h3>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Automated voucher receipt & notification
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Search Bar */}
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Donor name, phone, PAN, UTR reference number, donation #..."
                  value={donationSearch}
                  onChange={(e) => setDonationSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              {donationSearch && (
                <button
                  type="button"
                  onClick={() => setDonationSearch('')}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>
          </Card>

          {/* Donations Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Branch</th>
                    <th className="px-4 py-3 font-semibold">Date & Don #</th>
                    <th className="px-4 py-3 font-semibold">Donor Details</th>
                    <th className="px-4 py-3 font-semibold">Purpose & Wing</th>
                    <th className="px-4 py-3 font-semibold">UTR / Reference No</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount (₹)</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredDonations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                        {isLoadingDonations ? (
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                            <span>Loading pending online donations...</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                            <p className="font-semibold text-slate-700">All caught up!</p>
                            <p className="text-xs text-slate-400">
                              No online donations are currently pending verification.
                            </p>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredDonations.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Branch */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getBranchBadge(d.branch?.branch_code, d.branch?.name)}
                        </td>

                        {/* Date & Donation Number */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-mono text-xs font-bold text-emerald-700">{d.donation_number}</p>
                          <p className="text-[11px] text-slate-500">
                            {d.business_date ? String(d.business_date).substring(0, 10) : ''}
                          </p>
                        </td>

                        {/* Donor Details */}
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 leading-tight">
                            {d.donor?.full_name || 'Anonymous Donor'}
                          </p>
                          <div className="text-[11px] text-slate-500 flex flex-wrap gap-2 mt-0.5">
                            {d.donor?.phone && <span>📞 {d.donor.phone}</span>}
                            {d.donor?.pan_number && (
                              <span className="font-mono bg-slate-100 px-1 rounded text-slate-700">
                                PAN: {d.donor.pan_number}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Purpose & Wing */}
                        <td className="px-4 py-3 text-xs">
                          <p className="font-semibold text-slate-800">{d.purpose || 'General Donation'}</p>
                          {d.trust_home && (
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                              Target: {d.trust_home.replace('_', ' ')}
                            </p>
                          )}
                          {d.reason && <p className="text-[11px] text-slate-400 italic">"{d.reason}"</p>}
                        </td>

                        {/* UTR / Reference Number */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                              {d.reference_number || 'N/A'}
                            </span>
                            {d.reference_number && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(d.reference_number!)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded"
                                title="Copy Reference / UTR"
                              >
                                {copiedRef === d.reference_number ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                            <QrCode className="w-3 h-3 text-slate-400" /> App UPI Payment
                          </span>
                          {d.attachment_path && (
                            <div className="mt-1">
                              <a
                                href={assetUrl(d.attachment_path)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-all shadow-xs"
                                title="Click to view uploaded payment screenshot"
                              >
                                <Eye className="w-3 h-3 text-indigo-600" /> View Payment Proof
                              </a>
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800 text-sm whitespace-nowrap">
                          ₹{Number(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                            PENDING VERIFICATION
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenApproveDonation(d)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1 transition-all"
                              title="Verify against bank and approve receipt"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verify & Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingDonation(d);
                                setDonationRejectionReason('');
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition-all"
                              title="Reject invalid transaction"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: FINANCIAL VOUCHERS APPROVAL                                  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeSection === 'VOUCHERS' && (
        <div className="space-y-4 animate-in fade-in">
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

          {/* Main Vouchers Table */}
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
                  {filteredVouchers.length === 0 ? (
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
                    filteredVouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700 whitespace-nowrap">
                          {v.voucher_number}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                              typeBadgeColor[v.voucher_type] || 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {v.voucher_type.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {v.business_date ? String(v.business_date).substring(0, 10) : ''}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 leading-tight">{v.payee_or_donor_name}</p>
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

                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          ₹{Number(v.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: APPROVE ONLINE DONATION                                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {approvingDonation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border-t-4 border-t-emerald-600 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
              <CheckCircle2 className="w-5 h-5" />
              Verify & Approve App Donation
            </div>

            <p className="text-xs text-slate-600">
              Verify payment reference with bank records to officially approve donation{' '}
              <strong className="font-mono text-emerald-800">{approvingDonation.donation_number}</strong>.
            </p>

            <div className="p-3.5 bg-slate-50 border rounded-lg text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Target Branch:</span>
                {getBranchBadge(approvingDonation.branch?.branch_code, approvingDonation.branch?.name)}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Donor Name:</span>
                <span className="font-bold text-slate-900">
                  {approvingDonation.donor?.full_name || 'Anonymous Donor'}
                </span>
              </div>
              {approvingDonation.donor?.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Donor Mobile:</span>
                  <span className="font-medium text-slate-700">{approvingDonation.donor.phone}</span>
                </div>
              )}
              {approvingDonation.donor?.pan_number && (
                <div className="flex justify-between">
                  <span className="text-slate-500">PAN Number:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {approvingDonation.donor.pan_number}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold font-mono text-emerald-700 text-base">
                  ₹{Number(approvingDonation.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">UTR / Ref Number:</span>
                <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                  {approvingDonation.reference_number || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Purpose / Wing:</span>
                <span className="font-medium text-slate-800">
                  {approvingDonation.purpose} ({approvingDonation.trust_home || 'General'})
                </span>
              </div>
            </div>

            {/* Payment Proof / Screenshot Preview */}
            {approvingDonation.attachment_path && (
              <div className="space-y-1.5 p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" /> Payment Screenshot Proof:
                  </span>
                  <a
                    href={assetUrl(approvingDonation.attachment_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-0.5"
                  >
                    <Eye className="w-3 h-3" /> Full View
                  </a>
                </div>
                <div className="mt-1.5 rounded-lg overflow-hidden border border-indigo-200 bg-white max-h-48 flex items-center justify-center p-1">
                  <img
                    src={assetUrl(approvingDonation.attachment_path)}
                    alt="Payment Proof"
                    className="max-h-44 w-auto object-contain cursor-pointer hover:opacity-95 rounded"
                    onClick={() => window.open(assetUrl(approvingDonation.attachment_path), '_blank')}
                  />
                </div>
              </div>
            )}

            {/* Bank Account Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Deposit Bank Account (Credit Ledger):
              </label>
              <select
                value={selectedBankAccountId}
                onChange={(e) => setSelectedBankAccountId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">-- Default / Branch Primary Bank Account --</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bank_name} - {acc.account_number_masked} (₹
                    {Number(acc.current_balance).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> What happens when you approve:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
                <li>Double-entry credit transaction recorded in the chosen bank account.</li>
                <li>Official Section 80G Receipt Voucher issued.</li>
                <li>
                  <strong>Donor Mobile App:</strong> Official 80G Receipt is unlocked for instant download.
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApprovingDonation(null)}
                disabled={isProcessingDonationApproval}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                onClick={handleConfirmApproveDonation}
                disabled={isProcessingDonationApproval}
              >
                {isProcessingDonationApproval ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Confirm & Unlock Receipt
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: REJECT ONLINE DONATION                                          */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {rejectingDonation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border-t-4 border-t-rose-600 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <XCircle className="w-5 h-5" />
              Reject App Donation
            </div>
            <p className="text-xs text-slate-600">
              Rejecting donation{' '}
              <strong className="font-mono text-rose-800">{rejectingDonation.donation_number}</strong> with UTR{' '}
              <span className="font-mono font-bold text-slate-800">{rejectingDonation.reference_number}</span>.
              Please provide the rejection reason:
            </p>
            <textarea
              required
              rows={3}
              value={donationRejectionReason}
              onChange={(e) => setDonationRejectionReason(e.target.value)}
              placeholder="e.g. UTR / payment not received in bank statement, duplicate entry, incorrect amount..."
              className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-rose-500 resize-none"
            />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingDonation(null)}
                disabled={isProcessingDonationRejection}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 font-semibold"
                onClick={handleConfirmRejectDonation}
                disabled={isProcessingDonationRejection}
              >
                {isProcessingDonationRejection ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VOUCHER APPROVE MODAL ─────────────────────────────────────────── */}
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
                onClick={handleApproveVoucher}
                disabled={isProcessingApproval}
              >
                {isProcessingApproval ? 'Authorizing...' : 'Authorize & Post'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VOUCHER REJECT MODAL ──────────────────────────────────────────── */}
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
                onClick={handleRejectVoucher}
                disabled={isProcessingRejection}
              >
                {isProcessingRejection ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VOUCHER VIEW MODAL ────────────────────────────────────────────── */}
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
