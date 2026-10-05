import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fetchAPI, assetUrl } from '../api/client';
import { uploadFile } from '../utils/upload';
import { useToast } from '../context/ToastContext';
import { useBranch } from '../context/BranchContext';
import type { Branch, LicenseAlert } from '../types';
import {
  Building2,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  MapPin,
  Edit2,
  ShieldAlert,
  Calendar,
  QrCode,
  Upload,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  ImageIcon,
} from 'lucide-react';

export const Branches: React.FC = () => {
  const toast = useToast();
  const { refreshBranches } = useBranch();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [licenseAlerts, setLicenseAlerts] = useState<LicenseAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingQR, setIsUploadingQR] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [copiedUpiId, setCopiedUpiId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const initialForm = {
    branch_code: '',
    name: '',
    tamil_name: '',
    license_number: '',
    license_issue_date: '',
    license_expiry_date: '',
    registration_details: '',
    incharge_name: '',
    phone: '',
    email: '',
    address_line: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    upi_id: '',
    qr_code_path: '',
    logo_path: '',
    is_active: true,
  };

  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    setIsLoading(true);
    const [bRes, aRes] = await Promise.all([
      fetchAPI<Branch[]>('/branches'),
      fetchAPI<LicenseAlert[]>('/branches/license-alerts'),
    ]);

    if (bRes.success && bRes.data) {
      setBranches(bRes.data);
    } else {
      toast.error(bRes.error?.message || 'Failed to load branches');
    }

    if (aRes.success && aRes.data) {
      setLicenseAlerts(aRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setEditTarget(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const openEdit = (b: Branch) => {
    setEditTarget(b);
    setFormData({
      branch_code: b.branch_code,
      name: b.name,
      tamil_name: b.tamil_name || '',
      license_number: b.license_number || '',
      license_issue_date: b.license_issue_date ? b.license_issue_date.split('T')[0] : '',
      license_expiry_date: b.license_expiry_date ? b.license_expiry_date.split('T')[0] : '',
      registration_details: b.registration_details || '',
      incharge_name: b.incharge_name || '',
      phone: b.phone || '',
      email: b.email || '',
      address_line: b.address_line || '',
      city: b.city || '',
      state: b.state || 'Tamil Nadu',
      pincode: b.pincode || '',
      upi_id: b.upi_id || '',
      qr_code_path: b.qr_code_path || '',
      logo_path: b.logo_path || '',
      is_active: b.is_active,
    });
    setShowModal(true);
  };

  const handleQRUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingQR(true);
    try {
      const path = await uploadFile(file);
      if (path) {
        setFormData((prev) => ({ ...prev, qr_code_path: path }));
        toast.success('QR Code image uploaded successfully');
      } else {
        toast.error('Failed to upload QR code. Please try again.');
      }
    } catch {
      toast.error('Error during image upload. Check file size/format.');
    } finally {
      setIsUploadingQR(false);
    }
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const path = await uploadFile(file);
      if (path) {
        setFormData((prev) => ({ ...prev, logo_path: path }));
        toast.success('Branch logo uploaded successfully');
      } else {
        toast.error('Failed to upload branch logo. Please try again.');
      }
    } catch {
      toast.error('Error during logo upload. Check file size/format.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleDeleteBranch = async (branch: Branch) => {
    if (branch.id === 1) {
      toast.error('Main Branch is the primary trust entity and cannot be deleted.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete branch "${branch.name}" (${branch.branch_code})?\n\nIf this branch has associated financial vouchers or donations, it will be safely deactivated instead of deleted.`
    );
    if (!confirmed) return;

    setDeletingId(branch.id);
    try {
      const res = await fetchAPI(`/branches/${branch.id}`, { method: 'DELETE' });
      if (res.success) {
        toast.success(
          (res.data as { message?: string })?.message || `Branch ${branch.branch_code} processed successfully`
        );
        loadData();
        refreshBranches();
      } else {
        toast.error(res.error?.message || 'Failed to delete branch');
      }
    } catch {
      toast.error('Error occurred while deleting branch');
    } finally {
      setDeletingId(null);
    }
  };

  const copyUpi = (upi: string) => {
    if (!upi) return;
    navigator.clipboard.writeText(upi);
    setCopiedUpiId(upi);
    toast.success('UPI ID copied to clipboard');
    setTimeout(() => setCopiedUpiId(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Branch Name is required');
      return;
    }
    if (!editTarget && !formData.branch_code.trim()) {
      toast.error('Branch Code is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        tamil_name: formData.tamil_name.trim(),
        license_number: formData.license_number.trim(),
        registration_details: formData.registration_details.trim(),
        incharge_name: formData.incharge_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address_line: formData.address_line.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        upi_id: formData.upi_id.trim(),
        qr_code_path: formData.qr_code_path.trim(),
        logo_path: formData.logo_path.trim(),
        is_active: formData.is_active,
      };

      if (formData.license_issue_date) {
        payload.license_issue_date = new Date(formData.license_issue_date).toISOString();
      }
      if (formData.license_expiry_date) {
        payload.license_expiry_date = new Date(formData.license_expiry_date).toISOString();
      }

      if (editTarget) {
        const res = await fetchAPI<Branch>(`/branches/${editTarget.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (res.success) {
          toast.success('Branch details updated successfully');
          setShowModal(false);
          loadData();
          refreshBranches();
        } else {
          toast.error(res.error?.message || 'Failed to update branch');
        }
      } else {
        payload.branch_code = formData.branch_code.trim().toUpperCase();
        const res = await fetchAPI<Branch>('/branches', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (res.success) {
          toast.success('New branch registered successfully');
          setShowModal(false);
          loadData();
          refreshBranches();
        } else {
          toast.error(res.error?.message || 'Failed to create branch');
        }
      }
    } catch {
      toast.error('Unexpected error processing branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLicenseBadge = (branch: Branch) => {
    if (!branch.license_expiry_date) {
      return (
        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
          No Expiry Set
        </span>
      );
    }

    const expiry = new Date(branch.license_expiry_date);
    const now = new Date();
    const days = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return (
        <span className="text-[11px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-300 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-rose-600" /> Expired ({Math.abs(days)}d ago)
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300 flex items-center gap-1 animate-pulse">
          <AlertTriangle className="w-3 h-3 text-amber-600" /> Renewal Due ({days}d left)
        </span>
      );
    }
    return (
      <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium border border-emerald-200 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid ({days}d left)
      </span>
    );
  };

  const expiredCount = licenseAlerts.filter((a) => a.status === 'EXPIRED').length;
  const expiringSoonCount = licenseAlerts.filter((a) => a.status === 'EXPIRING_SOON').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" /> Trust Branches & License Management
          </h2>
          <p className="text-xs text-slate-500">
            Create branches, configure branch UPI & QR codes, track registration licenses, and manage multi-branch operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1.5" /> Add New Branch
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase">Total Branches</p>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{branches.length}</p>
            </div>
            <div className="p-2.5 bg-slate-800 rounded-lg text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-800 font-medium uppercase">Active Branches</p>
              <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                {branches.filter((b) => b.is_active).length}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-100 rounded-lg text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-800 font-medium uppercase">Renewal Due (≤30d)</p>
              <p className="text-2xl font-bold font-mono text-amber-700 mt-1">{expiringSoonCount}</p>
            </div>
            <div className="p-2.5 bg-amber-100 rounded-lg text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-rose-50 border-rose-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-rose-800 font-medium uppercase">Expired Licenses</p>
              <p className="text-2xl font-bold font-mono text-rose-700 mt-1">{expiredCount}</p>
            </div>
            <div className="p-2.5 bg-rose-100 rounded-lg text-rose-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* License Renewal Urgent Banner */}
      {expiredCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <span className="font-bold">Urgent Action Required:</span> {expiredCount} branch license(s) have expired.
            Please coordinate with government registration authorities and update the renewed license details.
          </div>
        </div>
      )}

      {/* Branches Table */}
      <Card className="overflow-hidden border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Configured Branches & Units</h3>
          <span className="text-xs text-slate-400">Total: {branches.length} branches</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Branch Name</th>
                <th className="py-3 px-4">License / Reg</th>
                <th className="py-3 px-4">License Validity</th>
                <th className="py-3 px-4">UPI & QR Code</th>
                <th className="py-3 px-4">Incharge & Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {isLoading ? 'Loading branches...' : 'No branches configured yet.'}
                  </td>
                </tr>
              ) : (
                branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                      <span className="px-2 py-1 rounded bg-emerald-50 border border-emerald-200">
                        {b.branch_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {b.logo_path ? (
                          <a
                            href={assetUrl(b.logo_path)}
                            target="_blank"
                            rel="noreferrer"
                            className="w-10 h-10 rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs shrink-0 hover:border-emerald-500 transition-colors"
                            title="Click to view branch logo"
                          >
                            <img
                              src={assetUrl(b.logo_path)}
                              alt={`${b.name} logo`}
                              className="w-full h-full object-contain rounded-lg"
                            />
                          </a>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                            <Building2 className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                          {b.tamil_name && <p className="text-slate-500 font-medium text-xs">{b.tamil_name}</p>}
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{b.city ? `${b.city}, ${b.state}` : b.state}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800 font-mono">
                        {b.license_number || <span className="text-slate-400 italic">None</span>}
                      </p>
                      {b.registration_details && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{b.registration_details}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getLicenseBadge(b)}
                      {b.license_expiry_date && (
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          Exp: {new Date(b.license_expiry_date).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </td>

                    {/* Branch UPI & QR Code Column */}
                    <td className="py-3.5 px-4">
                      {b.qr_code_path || b.upi_id ? (
                        <div className="flex items-center gap-2">
                          {b.qr_code_path ? (
                            <a
                              href={assetUrl(b.qr_code_path)}
                              target="_blank"
                              rel="noreferrer"
                              className="w-9 h-9 rounded-lg border border-slate-200 bg-white p-0.5 shrink-0 hover:border-emerald-500 transition-colors shadow-xs group"
                              title="Click to view full QR code"
                            >
                              <img
                                src={assetUrl(b.qr_code_path)}
                                alt={`${b.branch_code} QR`}
                                className="w-full h-full object-contain rounded"
                              />
                            </a>
                          ) : (
                            <div className="w-9 h-9 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                              <QrCode className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            {b.upi_id ? (
                              <button
                                type="button"
                                onClick={() => copyUpi(b.upi_id!)}
                                className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-800 hover:text-emerald-700 group text-left truncate"
                                title="Click to copy UPI ID"
                              >
                                <span className="truncate max-w-[130px]">{b.upi_id}</span>
                                {copiedUpiId === b.upi_id ? (
                                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                                )}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No UPI ID</span>
                            )}
                            <span className="inline-block text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                              Ready for Donations
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <QrCode className="w-4 h-4 stroke-[1.5]" />
                          <span className="text-[11px] italic">Not Configured</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{b.incharge_name || '—'}</p>
                      <div className="text-[11px] text-slate-500 space-y-0.5 mt-0.5">
                        {b.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {b.phone}
                          </div>
                        )}
                        {b.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {b.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {b.is_active ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        {b.id !== 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBranch(b)}
                            disabled={deletingId === b.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 disabled:opacity-50"
                            title="Delete or Deactivate Branch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Branch Modal - Wide Dialog Layout */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  {editTarget ? 'Edit Branch, UPI & License Details' : 'Add New Trust Branch'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editTarget
                    ? `Updating branch profile, UPI & QR codes, license renewal dates & contacts for ${editTarget.branch_code}`
                    : 'Register a new operational trust branch unit with independent UPI, QR code, vouchers and finances'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body - Multi-column Layout Utilizing Dialog Width */}
            <form id="branch-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-sm">
              {/* 1. Branch Identification */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    1. Branch Identification
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Branch Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editTarget}
                      placeholder="e.g. MDU, CHE, CBE"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                      value={formData.branch_code}
                      onChange={(e) => setFormData({ ...formData, branch_code: e.target.value.toUpperCase() })}
                    />
                    <span className="text-[10px] text-slate-400">Unique operational code (3-6 uppercase letters)</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Branch Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Madurai South Branch"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Tamil Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. மதுரை தென் கிளை"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                      value={formData.tamil_name}
                      onChange={(e) => setFormData({ ...formData, tamil_name: e.target.value })}
                    />
                  </div>
                </div>

                {/* Branch Logo Upload */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                      {formData.logo_path ? (
                        <img
                          src={assetUrl(formData.logo_path)}
                          alt="Branch Logo"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <div className="text-slate-400 flex flex-col items-center">
                          <ImageIcon className="w-6 h-6 stroke-[1.5] text-slate-300" />
                          <span className="text-[9px] font-medium mt-0.5">No Logo</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Branch Logo</h4>
                      <p className="text-[11px] text-slate-500">
                        Upload official emblem or wing logo. Displayed on web admin &amp; donor mobile app.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition">
                      <Upload className={`w-3.5 h-3.5 ${isUploadingLogo ? 'animate-spin' : ''}`} />
                      <span>{isUploadingLogo ? 'Uploading...' : formData.logo_path ? 'Change Logo' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingLogo}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoUpload(file);
                        }}
                      />
                    </label>

                    {formData.logo_path && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo_path: '' })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. License & Registration Compliance */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <ShieldAlert className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. License & Legal Registration Details
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      License / Registration No
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DSD/MDU/2024/098"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      License Issue Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                      value={formData.license_issue_date}
                      onChange={(e) => setFormData({ ...formData, license_issue_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      License Expiry / Renewal Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                      value={formData.license_expiry_date}
                      onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Registration Authority & Approval Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Details about district social welfare department registration, certificate validities, or inspection records..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    value={formData.registration_details}
                    onChange={(e) => setFormData({ ...formData, registration_details: e.target.value })}
                  />
                </div>
              </div>

              {/* 3. Branch UPI & QR Code Configuration (Highlighted for Admin) */}
              <div className="space-y-3 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/60">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      3. Branch UPI & QR Code Configuration
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                    Public & Staff Payments
                  </span>
                </div>

                <p className="text-[11px] text-slate-600">
                  Configure the dedicated UPI ID and QR code image for this branch. When donors select this branch in the mobile donor app or staff generate donation receipts, this QR code will be displayed for instant scanning.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Left: QR Code Image Upload & Preview Box */}
                  <div className="md:col-span-4 bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs flex flex-col items-center justify-center text-center">
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Branch QR Code Image
                    </label>

                    <div className="w-36 h-36 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden mb-3 relative group">
                      {formData.qr_code_path ? (
                        <>
                          <img
                            src={assetUrl(formData.qr_code_path)}
                            alt="Branch QR Code"
                            className="w-full h-full object-contain p-2 bg-white"
                          />
                          <a
                            href={assetUrl(formData.qr_code_path)}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-xl"
                            title="Open full size"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        </>
                      ) : (
                        <div className="p-3 text-slate-400 flex flex-col items-center">
                          <QrCode className="w-10 h-10 stroke-[1.5] text-slate-300 mb-1" />
                          <span className="text-[10px] font-medium">No QR Code Uploaded</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full">
                      <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition">
                        <Upload className={`w-3.5 h-3.5 ${isUploadingQR ? 'animate-spin' : ''}`} />
                        <span>{isUploadingQR ? 'Uploading...' : formData.qr_code_path ? 'Change QR' : 'Upload QR'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingQR}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQRUpload(file);
                          }}
                        />
                      </label>

                      {formData.qr_code_path && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, qr_code_path: '' })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition"
                          title="Remove QR Code"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: UPI ID & Payment Instructions */}
                  <div className="md:col-span-8 space-y-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Branch UPI ID / VPA
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. nesakkaram.madurai@sbi or nesakkaram@okaxis"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 bg-white"
                          value={formData.upi_id}
                          onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                        />
                        {formData.upi_id && (
                          <button
                            type="button"
                            onClick={() => copyUpi(formData.upi_id)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
                            title="Copy UPI ID"
                          >
                            {copiedUpiId === formData.upi_id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Enter the registered UPI VPA tied to this branch bank account for direct app payments.
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-emerald-100 rounded-xl space-y-1.5">
                      <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Seamless Multi-Branch Payments
                      </p>
                      <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                        <li>The mobile donor application dynamically loads this branch with its custom QR code.</li>
                        <li>Donations received via this QR code are linked to this branch code for separate financial reporting.</li>
                        <li>Branch staff can also display this QR directly on desktop and mobile screens during counter donations.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Administration & Incharge Contact */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    4. Incharge & Communication Contacts
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Branch Incharge / Manager Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. K. Murugan"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                      value={formData.incharge_name}
                      onChange={(e) => setFormData({ ...formData, incharge_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="branch@nesakkaram.org"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 5. Physical Address */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    5. Branch Physical Address
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Street Address / Door No
                    </label>
                    <input
                      type="text"
                      placeholder="Door no, Street name, Area"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                      value={formData.address_line}
                      onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Madurai"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Pincode</label>
                    <input
                      type="text"
                      placeholder="625001"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 6. Status Toggle */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active_checkbox"
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <div>
                    <label htmlFor="is_active_checkbox" className="text-xs font-bold text-slate-800 cursor-pointer block">
                      Branch is Active & Enabled for Financial Operations
                    </label>
                    <p className="text-[11px] text-slate-400">
                      When active, staff can record vouchers, receipts and expenses for this branch
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${formData.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                  {formData.is_active ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </form>

            {/* Fixed Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 z-10">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="branch-form"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : editTarget ? 'Save Changes' : 'Create Branch'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
