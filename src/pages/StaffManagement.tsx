import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fetchAPI, assetUrl } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useBranch } from '../context/BranchContext';
import type { User, EmploymentStatus, Role, SystemPermission } from '../types';
import {
  Plus,
  RefreshCw,
  UserCog,
  Building2,
  Search,
  Phone,
  Mail,
  GraduationCap,
  Heart,
  Upload,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { isRequired, isValidEmail, isMinLength, hasErrors } from '../utils/validation';

export const StaffManagement: React.FC = () => {
  const toast = useToast();
  const { branches } = useBranch();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | EmploymentStatus>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [statusTarget, setStatusTarget] = useState<User | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [permissionsTarget, setPermissionsTarget] = useState<User | null>(null);
  const [viewPhotoTarget, setViewPhotoTarget] = useState<string | null>(null);

  // Permissions state
  const [allPermissions, setAllPermissions] = useState<SystemPermission[]>([]);
  const [selectedPermCodes, setSelectedPermCodes] = useState<string[]>([]);
  const [isLoadingPerms, setIsLoadingPerms] = useState(false);
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // Form states
  const initialFormData = {
    staff_code: '',
    username: '',
    full_name: '',
    email: '',
    phone: '',
    gender: 'MALE',
    education: '',
    marital_status: 'SINGLE',
    date_of_birth: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    designation: 'Staff',
    department: 'Operations',
    address_line: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    photo_path: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    password: '',
    role: 'STAFF' as Role,
    branch_id: 1,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [editData, setEditData] = useState<Partial<User>>({});
  const [statusData, setStatusData] = useState<{ employment_status: EmploymentStatus; status_remarks: string }>({
    employment_status: 'ACTIVE',
    status_remarks: '',
  });
  const [newPassword, setNewPassword] = useState('');

  const [createErrors, setCreateErrors] = useState<Record<string, string | undefined>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const loadStaff = async () => {
    setIsLoading(true);
    let url = `/users?status=${statusFilter}`;
    if (selectedBranch !== 'ALL') {
      url += `&branch_id=${selectedBranch}`;
    }
    if (searchQuery.trim()) {
      url += `&search=${encodeURIComponent(searchQuery.trim())}`;
    }

    const res = await fetchAPI<User[]>(url);
    if (res.success && res.data) {
      setUsers(Array.isArray(res.data) ? res.data : []);
    } else {
      setUsers([]);
      if (!res.success) {
        toast.error(res.error?.message || 'Failed to load staff list');
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, selectedBranch]);

  // Safe users list & real-time counts
  const safeUsers = Array.isArray(users) ? users : [];
  const activeCount = safeUsers.filter((u) => u.employment_status === 'ACTIVE').length;
  const relievedCount = safeUsers.filter((u) => u.employment_status === 'RELIEVED').length;
  const blockedCount = safeUsers.filter((u) => u.employment_status === 'TEMPORARILY_BLOCKED').length;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);

    setIsUploadingPhoto(true);
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    try {
      const res = await fetch('/api/v1/uploads', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: data,
      });
      const json = await res.json();
      if (res.ok && json.success && json.data?.path) {
        if (isEditMode) {
          setEditData((prev) => ({ ...prev, photo_path: json.data.path }));
        } else {
          setFormData((prev) => ({ ...prev, photo_path: json.data.path }));
        }
        toast.success('Staff photo uploaded successfully');
      } else {
        toast.error(json.error?.message || 'Failed to upload photo');
      }
    } catch {
      toast.error('Network error during photo upload');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string | undefined> = {
      username: isRequired(formData.username, 'Username'),
      full_name: isRequired(formData.full_name, 'Full name'),
      email: isValidEmail(formData.email),
      password: isMinLength(formData.password, 8, 'Password'),
    };
    if (hasErrors(errors)) {
      setCreateErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...formData,
      staff_code: formData.staff_code.trim() || undefined,
      branch_id: Number(formData.branch_id),
    };

    const res = await fetchAPI<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Staff member ${formData.full_name} created successfully!`);
      setShowAddModal(false);
      setFormData(initialFormData);
      loadStaff();
    } else {
      toast.error(res.error?.message || 'Failed to create staff member');
    }
  };

  const openEdit = (u: User) => {
    setEditTarget(u);
    setEditData({
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      gender: u.gender || 'MALE',
      education: u.education || '',
      marital_status: u.marital_status || 'SINGLE',
      date_of_birth: u.date_of_birth ? u.date_of_birth.split('T')[0] : '',
      date_of_joining: u.date_of_joining ? u.date_of_joining.split('T')[0] : '',
      date_of_relieving: u.date_of_relieving ? u.date_of_relieving.split('T')[0] : '',
      designation: u.designation || 'Staff',
      department: u.department || 'Operations',
      address_line: u.address_line || '',
      city: u.city || '',
      state: u.state || 'Tamil Nadu',
      pincode: u.pincode || '',
      photo_path: u.photo_path || '',
      emergency_contact_name: u.emergency_contact_name || '',
      emergency_contact_phone: u.emergency_contact_phone || '',
      role: u.role,
      branch_id: u.branch_id || 1,
    });
    setEditErrors({});
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    const errors: Record<string, string | undefined> = {
      full_name: isRequired(editData.full_name, 'Full name'),
      email: isValidEmail(editData.email),
    };
    if (hasErrors(errors)) {
      setEditErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const res = await fetchAPI<User>(`/users/${editTarget.id}`, {
      method: 'PUT',
      body: JSON.stringify(editData),
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Staff member ${editData.full_name} updated successfully!`);
      setEditTarget(null);
      loadStaff();
    } else {
      toast.error(res.error?.message || 'Failed to update staff member');
    }
  };

  const openStatusModal = (u: User) => {
    setStatusTarget(u);
    setStatusData({
      employment_status: u.employment_status || 'ACTIVE',
      status_remarks: u.status_remarks || '',
    });
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusTarget) return;

    setIsSubmitting(true);
    const res = await fetchAPI<User>(`/users/${statusTarget.id}`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Status updated to ${statusData.employment_status}`);
      setStatusTarget(null);
      loadStaff();
    } else {
      toast.error(res.error?.message || 'Failed to update status');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget) return;

    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    const res = await fetchAPI<User>(`/users/${passwordTarget.id}`, {
      method: 'PUT',
      body: JSON.stringify({ password: newPassword }),
    });
    setIsSubmitting(false);

    if (res.success) {
      setPasswordTarget(null);
      setNewPassword('');
      toast.success(`Password reset for ${passwordTarget.full_name}`);
    } else {
      toast.error(res.error?.message || 'Failed to reset password');
    }
  };

  // ── Permissions Management ──────────────────────────────────────────────────
  const openPermissionsModal = async (u: User) => {
    setPermissionsTarget(u);
    setIsLoadingPerms(true);

    if (allPermissions.length === 0) {
      const resAll = await fetchAPI<SystemPermission[]>('/permissions');
      if (resAll.success && Array.isArray(resAll.data)) {
        setAllPermissions(resAll.data);
      }
    }

    const resUser = await fetchAPI<{ user_id: number; permission_codes: string[] }>(
      `/users/${u.id}/permissions`
    );
    if (resUser.success && resUser.data && Array.isArray(resUser.data.permission_codes)) {
      setSelectedPermCodes(resUser.data.permission_codes);
    } else {
      setSelectedPermCodes([]);
    }
    setIsLoadingPerms(false);
  };

  const handleSavePermissions = async () => {
    if (!permissionsTarget) return;
    setIsSavingPerms(true);
    const res = await fetchAPI<{ message: string }>(`/users/${permissionsTarget.id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permission_codes: selectedPermCodes }),
    });
    setIsSavingPerms(false);

    if (res.success) {
      toast.success(`Access permissions updated for ${permissionsTarget.full_name}`);
      setPermissionsTarget(null);
    } else {
      toast.error(res.error?.message || 'Failed to update permissions');
    }
  };

  const togglePermission = (code: string) => {
    setSelectedPermCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleModule = (module: string, selectAll: boolean) => {
    const modulePermCodes = allPermissions.filter((p) => p.module === module).map((p) => p.code);
    setSelectedPermCodes((prev) => {
      const withoutModule = prev.filter((c) => !modulePermCodes.includes(c));
      return selectAll ? [...withoutModule, ...modulePermCodes] : withoutModule;
    });
  };

  const applyPreset = (preset: 'CASHIER' | 'ACCOUNTANT' | 'INCHARGE' | 'ALL' | 'CLEAR') => {
    if (preset === 'ALL') {
      setSelectedPermCodes(allPermissions.map((p) => p.code));
    } else if (preset === 'CLEAR') {
      setSelectedPermCodes([]);
    } else if (preset === 'CASHIER') {
      setSelectedPermCodes([
        'donation:create',
        'donation:view',
        'donor:view',
        'donor:create',
        'scheme:view',
        'attendance:view_my',
      ]);
    } else if (preset === 'ACCOUNTANT') {
      setSelectedPermCodes([
        'voucher:create',
        'voucher:view',
        'voucher:export',
        'expense:create',
        'expense:view',
        'ledger:view',
        'report:daybook',
        'attendance:view_my',
      ]);
    } else if (preset === 'INCHARGE') {
      setSelectedPermCodes([
        'voucher:create',
        'voucher:approve',
        'voucher:view',
        'voucher:export',
        'expense:create',
        'expense:approve',
        'expense:view',
        'donation:create',
        'donation:approve',
        'donation:view',
        'bank:view',
        'bank:close_day',
        'cash:submit_denominations',
        'attendance:mark',
        'attendance:view_my',
        'report:daybook',
      ]);
    }
  };

  // Group allPermissions by module
  const groupedPermissions = allPermissions.reduce<Record<string, SystemPermission[]>>((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});

  const getStatusBadge = (status?: EmploymentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Active
          </span>
        );
      case 'RELIEVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-500" />
            Relieved
          </span>
        );
      case 'TEMPORARILY_BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertOctagon className="w-3 h-3 text-amber-600" />
            Blocked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
            Active
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm shrink-0">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Staff Management & Access Control
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Manage employee profiles, designations, operational status, and granular action permissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadStaff}
            isLoading={isLoading}
            className="flex items-center gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setFormData({
                ...initialFormData,
                branch_id: branches[0]?.id ?? 1,
              });
              setCreateErrors({});
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Staff
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Staff</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{safeUsers.length}</p>
        </div>

        <div
          onClick={() => setStatusFilter('ACTIVE')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ACTIVE'
              ? 'bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Active Staff</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter('RELIEVED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'RELIEVED'
              ? 'bg-slate-100 border-slate-500 ring-2 ring-slate-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Relieved Staff</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">{relievedCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter('TEMPORARILY_BLOCKED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'TEMPORARILY_BLOCKED'
              ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-amber-200 hover:border-amber-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Blocked Staff</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{blockedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, phone, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadStaff()}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-auto">
              <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.branch_code})
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadStaff}
              className="border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              Apply Filter
            </Button>
          </div>
        </div>
      </Card>

      {/* Staff Table */}
      <Card className="overflow-hidden border border-slate-200 shadow-sm rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role & Designation</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Demographics</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {safeUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    No staff members found matching the criteria.
                  </td>
                </tr>
              ) : (
                safeUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Staff Name & Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {u.photo_path ? (
                          <img
                            src={assetUrl(u.photo_path)}
                            alt={u.full_name}
                            onClick={() => setViewPhotoTarget(assetUrl(u.photo_path))}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs cursor-pointer hover:opacity-90"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200">
                            {u.full_name?.charAt(0) || 'S'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {u.full_name}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                              {u.staff_code || `STF-${String(u.id).padStart(4, '0')}`}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Designation */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {u.designation || 'Staff'}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {u.role}
                        </span>
                        {u.department && <span>• {u.department}</span>}
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-4">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {u.branch?.name || u.branch_name || 'Main Branch'}
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3 px-4">
                      <div className="text-xs space-y-1">
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Demographics */}
                    <td className="py-3 px-4">
                      <div className="text-xs space-y-1 text-slate-500">
                        {u.education && (
                          <div className="flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{u.education}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-pink-400 shrink-0" />
                          <span>{u.marital_status || 'Single'}</span>
                          {u.gender && <span className="text-[10px]">({u.gender})</span>}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(u.employment_status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Granular Permissions Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPermissionsModal(u)}
                          className="h-8 px-2.5 text-xs text-indigo-700 bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100 flex items-center gap-1 font-semibold"
                          title="Configure granular action permissions"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Access
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(u)}
                          className="h-8 px-2.5 text-xs border-slate-200 hover:bg-slate-50 text-slate-700"
                          title="Edit staff details"
                        >
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStatusModal(u)}
                          className="h-8 px-2.5 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                          title="Change employment status"
                        >
                          Status
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPasswordTarget(u);
                            setNewPassword('');
                          }}
                          className="h-8 px-2 text-xs border-slate-200 hover:bg-slate-50 text-slate-700"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
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

      {/* ── Modal: Manage Action Permissions ───────────────────────────────── */}
      {permissionsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 my-8 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    Action Permissions & Access Control
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configuring for <strong className="text-slate-800">{permissionsTarget.full_name}</strong> ({permissionsTarget.staff_code || `STF-${permissionsTarget.id}`}) • Role: <span className="font-semibold text-indigo-600">{permissionsTarget.role}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPermissionsTarget(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="px-6 py-3 bg-indigo-50/40 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-slate-700">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPreset('CASHIER')}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300 font-medium transition-colors shadow-2xs"
                >
                  Cashier / Counter
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('ACCOUNTANT')}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300 font-medium transition-colors shadow-2xs"
                >
                  Accountant
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('INCHARGE')}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300 font-medium transition-colors shadow-2xs"
                >
                  Branch Incharge
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('ALL')}
                  className="text-xs px-2.5 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-semibold transition-colors shadow-2xs"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('CLEAR')}
                  className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors shadow-2xs"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Permissions Matrix Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {isLoadingPerms ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading system permissions registry...
                </div>
              ) : Object.keys(groupedPermissions).length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No system permissions configured.
                </div>
              ) : (
                Object.entries(groupedPermissions).map(([moduleName, perms]) => {
                  const selectedInModule = perms.filter((p) => selectedPermCodes.includes(p.code)).length;
                  const allSelectedInModule = selectedInModule === perms.length;

                  return (
                    <div key={moduleName} className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                      {/* Module Header Strip */}
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                            {moduleName}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {selectedInModule} / {perms.length} selected
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleModule(moduleName, !allSelectedInModule)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            {allSelectedInModule ? 'Deselect Module' : 'Select All Module'}
                          </button>
                        </div>
                      </div>

                      {/* Permissions Checkbox Grid */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {perms.map((p) => {
                          const isChecked = selectedPermCodes.includes(p.code);
                          return (
                            <label
                              key={p.code}
                              onClick={() => togglePermission(p.code)}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/40'
                                  : 'bg-white border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <div className="mt-0.5 shrink-0 text-emerald-600">
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                                  <span>{p.name}</span>
                                  <span className="font-mono text-[10px] text-slate-400">{p.code}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                  {p.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <p className="text-xs text-slate-500">
                <strong>{selectedPermCodes.length}</strong> total action permissions currently assigned.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPermissionsTarget(null)}
                  className="border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSavePermissions}
                  isLoading={isSavingPerms}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                >
                  Save Permissions
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add New Staff (Wide 3-Column Horizontal Layout) ─────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl xl:max-w-7xl w-full border border-slate-200 max-h-[94vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-none">Register New Staff Member</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Create system user credentials and demographic profile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 overflow-y-auto flex-1 text-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {/* COLUMN 1: Credentials & Role */}
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        1. System Account & Photo
                      </span>

                      {/* Photo Badge */}
                      <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 mb-2.5">
                        <div className="relative shrink-0">
                          {formData.photo_path ? (
                            <img
                              src={assetUrl(formData.photo_path)}
                              alt="Staff Preview"
                              className="w-11 h-11 rounded-lg object-cover border border-emerald-500 shadow-2xs"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          {isUploadingPhoto && (
                            <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                              ...
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs transition-colors">
                            <Upload className="w-3 h-3" />
                            Upload Photo
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(e, false)}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[10px] text-slate-400 mt-0.5">JPG / PNG (max 10MB)</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              Username <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.username}
                              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                              placeholder="e.g. ram_staff"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            {createErrors.username && <p className="text-[10px] text-red-500 mt-0.5">{createErrors.username}</p>}
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              Password <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="password"
                              required
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              placeholder="Min 8 chars"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            {createErrors.password && <p className="text-[10px] text-red-500 mt-0.5">{createErrors.password}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              System Role <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formData.role}
                              onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            >
                              <option value="STAFF">STAFF (Branch User)</option>
                              <option value="ADMIN">ADMIN (Full Admin)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              Branch <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formData.branch_id}
                              onChange={(e) => setFormData({ ...formData, branch_id: Number(e.target.value) })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            >
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name} ({b.branch_code})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Staff Code (Optional)</label>
                          <input
                            type="text"
                            value={formData.staff_code}
                            onChange={(e) => setFormData({ ...formData, staff_code: e.target.value })}
                            placeholder="Auto if empty (e.g. STF-001)"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: Personal Demographics */}
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      2. Personal Demographics
                    </span>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Full Legal Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          placeholder="Full name as per Aadhaar / ID"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        {createErrors.full_name && <p className="text-[10px] text-red-500 mt-0.5">{createErrors.full_name}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Gender</label>
                          <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Date of Birth</label>
                          <input
                            type="date"
                            value={formData.date_of_birth}
                            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                          </input>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="staff@trust.org"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          {createErrors.email && <p className="text-[10px] text-red-500 mt-0.5">{createErrors.email}</p>}
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Mobile Phone</label>
                          <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="10-digit mobile"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Education</label>
                          <input
                            type="text"
                            value={formData.education}
                            onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                            placeholder="e.g. B.Com, MBA"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Marital Status</label>
                          <select
                            value={formData.marital_status}
                            onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="SINGLE">Single</option>
                            <option value="MARRIED">Married</option>
                            <option value="WIDOWED">Widowed</option>
                            <option value="DIVORCED">Divorced</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: Job Role, Address & Emergency */}
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      3. Job, Address & Emergency
                    </span>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Designation</label>
                          <input
                            type="text"
                            value={formData.designation}
                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                            placeholder="e.g. Accountant"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Department</label>
                          <input
                            type="text"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            placeholder="e.g. Accounts"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Date of Joining</label>
                          <input
                            type="date"
                            value={formData.date_of_joining}
                            onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">City / Town</label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="Chennai / Trichy"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Residential Address</label>
                          <input
                            type="text"
                            value={formData.address_line}
                            onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
                            placeholder="Door no, street, locality"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Pincode</label>
                          <input
                            type="text"
                            value={formData.pincode}
                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                            placeholder="622001"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Emergency Contact</label>
                          <input
                            type="text"
                            value={formData.emergency_contact_name}
                            onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                            placeholder="Spouse / Parent name"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Emergency Mobile</label>
                          <input
                            type="text"
                            value={formData.emergency_contact_phone}
                            onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                            placeholder="10-digit mobile"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Sticky Bottom Footer */}
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/95 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  Register Staff Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Staff Member (Wide 3-Column Horizontal Layout) ───────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl xl:max-w-7xl w-full border border-slate-200 max-h-[94vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-none">
                    Edit Staff Profile: {editTarget.full_name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Staff Code: <span className="font-mono font-semibold text-emerald-700">{editTarget.staff_code || `STF-${editTarget.id}`}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 overflow-y-auto flex-1 text-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {/* COLUMN 1: Photo & Employment Assignment */}
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        1. Photo & Employment Assignment
                      </span>

                      {/* Photo Badge */}
                      <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 mb-2.5">
                        <div className="relative shrink-0">
                          {editData.photo_path ? (
                            <img
                              src={assetUrl(editData.photo_path)}
                              alt="Staff Preview"
                              className="w-11 h-11 rounded-lg object-cover border border-emerald-500 shadow-2xs"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          {isUploadingPhoto && (
                            <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                              ...
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs transition-colors">
                            <Upload className="w-3 h-3" />
                            Update Photo
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(e, true)}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[10px] text-slate-400 mt-0.5">JPG / PNG (max 10MB)</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Assigned Branch</label>
                            <select
                              value={editData.branch_id || 1}
                              onChange={(e) => setEditData({ ...editData, branch_id: Number(e.target.value) })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            >
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name} ({b.branch_code})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">System Role</label>
                            <select
                              value={editData.role || 'STAFF'}
                              onChange={(e) => setEditData({ ...editData, role: e.target.value as Role })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            >
                              <option value="STAFF">STAFF</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Designation</label>
                            <input
                              type="text"
                              value={editData.designation || ''}
                              onChange={(e) => setEditData({ ...editData, designation: e.target.value })}
                              placeholder="e.g. Accountant"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Department</label>
                            <input
                              type="text"
                              value={editData.department || ''}
                              onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                              placeholder="e.g. Accounts"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Date of Joining</label>
                            <input
                              type="date"
                              value={editData.date_of_joining || ''}
                              onChange={(e) => setEditData({ ...editData, date_of_joining: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Date of Relieving</label>
                            <input
                              type="date"
                              value={editData.date_of_relieving || ''}
                              onChange={(e) => setEditData({ ...editData, date_of_relieving: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: Personal Demographics */}
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      2. Personal Demographics
                    </span>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Full Legal Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editData.full_name || ''}
                          onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        {editErrors.full_name && <p className="text-[10px] text-red-500 mt-0.5">{editErrors.full_name}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Gender</label>
                          <select
                            value={editData.gender || 'MALE'}
                            onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Date of Birth</label>
                          <input
                            type="date"
                            value={editData.date_of_birth || ''}
                            onChange={(e) => setEditData({ ...editData, date_of_birth: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={editData.email || ''}
                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          {editErrors.email && <p className="text-[10px] text-red-500 mt-0.5">{editErrors.email}</p>}
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Phone Number</label>
                          <input
                            type="text"
                            value={editData.phone || ''}
                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            placeholder="10-digit mobile"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Education</label>
                          <input
                            type="text"
                            value={editData.education || ''}
                            onChange={(e) => setEditData({ ...editData, education: e.target.value })}
                            placeholder="e.g. B.Com, MBA"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Marital Status</label>
                          <select
                            value={editData.marital_status || 'SINGLE'}
                            onChange={(e) => setEditData({ ...editData, marital_status: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="SINGLE">Single</option>
                            <option value="MARRIED">Married</option>
                            <option value="WIDOWED">Widowed</option>
                            <option value="DIVORCED">Divorced</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: Address & Emergency Contacts */}
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      3. Address & Emergency Contacts
                    </span>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Residential Address</label>
                          <input
                            type="text"
                            value={editData.address_line || ''}
                            onChange={(e) => setEditData({ ...editData, address_line: e.target.value })}
                            placeholder="Door no, street, locality"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">City</label>
                          <input
                            type="text"
                            value={editData.city || ''}
                            onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                            placeholder="Chennai"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Pincode</label>
                        <input
                          type="text"
                          value={editData.pincode || ''}
                          onChange={(e) => setEditData({ ...editData, pincode: e.target.value })}
                          placeholder="622001"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Emergency Contact</label>
                          <input
                            type="text"
                            value={editData.emergency_contact_name || ''}
                            onChange={(e) => setEditData({ ...editData, emergency_contact_name: e.target.value })}
                            placeholder="Spouse / Parent name"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Emergency Mobile</label>
                          <input
                            type="text"
                            value={editData.emergency_contact_phone || ''}
                            onChange={(e) => setEditData({ ...editData, emergency_contact_phone: e.target.value })}
                            placeholder="10-digit mobile"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Sticky Bottom Footer */}
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/95 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditTarget(null)}
                  className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Manage Employment Status ──────────────────────────────────── */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                Change Employment Status
              </h3>
              <button onClick={() => setStatusTarget(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Updating status for <strong>{statusTarget.full_name}</strong> ({statusTarget.staff_code || `STF-${statusTarget.id}`})
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Employment Status Lifecycle
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="status"
                      value="ACTIVE"
                      checked={statusData.employment_status === 'ACTIVE'}
                      onChange={() => setStatusData({ ...statusData, employment_status: 'ACTIVE' })}
                      className="text-emerald-600"
                    />
                    <div>
                      <span className="font-semibold text-sm text-emerald-700">ACTIVE</span>
                      <p className="text-xs text-slate-500">Currently employed and allowed to log in</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="status"
                      value="TEMPORARILY_BLOCKED"
                      checked={statusData.employment_status === 'TEMPORARILY_BLOCKED'}
                      onChange={() => setStatusData({ ...statusData, employment_status: 'TEMPORARILY_BLOCKED' })}
                      className="text-amber-600"
                    />
                    <div>
                      <span className="font-semibold text-sm text-amber-700">TEMPORARILY BLOCKED</span>
                      <p className="text-xs text-slate-500">Suspended from logging in until unblocked</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="status"
                      value="RELIEVED"
                      checked={statusData.employment_status === 'RELIEVED'}
                      onChange={() => setStatusData({ ...statusData, employment_status: 'RELIEVED' })}
                      className="text-slate-600"
                    />
                    <div>
                      <span className="font-semibold text-sm text-slate-700">RELIEVED</span>
                      <p className="text-xs text-slate-500">Resigned or relieved from trust duties (Archived)</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason / Remarks for Status Change
                </label>
                <textarea
                  rows={2}
                  value={statusData.status_remarks}
                  onChange={(e) => setStatusData({ ...statusData, status_remarks: e.target.value })}
                  placeholder="e.g. Resigned on 2026-10-20 / On personal leave"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setStatusTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Update Status
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Reset Password ────────────────────────────────────────────── */}
      {passwordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                Reset Password
              </h3>
              <button onClick={() => setPasswordTarget(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handlePasswordReset} className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Set a new password for <strong>{passwordTarget.full_name}</strong> (@{passwordTarget.username})
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setPasswordTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Reset Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Photo Preview Lightbox ───────────────────────────────────────────── */}
      {viewPhotoTarget && (
        <div
          onClick={() => setViewPhotoTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
        >
          <div className="max-w-md w-full bg-white rounded-2xl overflow-hidden p-2 shadow-2xl">
            <img src={viewPhotoTarget} alt="Staff Preview" className="w-full h-auto rounded-xl object-contain max-h-[80vh]" />
            <p className="text-center text-xs text-slate-400 py-2">Click anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
};
