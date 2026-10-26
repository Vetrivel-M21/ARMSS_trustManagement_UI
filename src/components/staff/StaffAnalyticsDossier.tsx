import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { fetchAPI, assetUrl } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import type { StaffAnalyticsReport } from '../../types';
import {
  ArrowLeft,
  Printer,
  Calendar,
  Building2,
  Mail,
  Phone,
  GraduationCap,
  Heart,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  Clock,
  UserX,
  Plane,
  Receipt,
  Wallet,
  Coins,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  UserCheck,
  Download,
  Filter,
} from 'lucide-react';

interface StaffAnalyticsDossierProps {
  staffId: number;
  onBack: () => void;
}

export const StaffAnalyticsDossier: React.FC<StaffAnalyticsDossierProps> = ({
  staffId,
  onBack,
}) => {
  const toast = useToast();

  const getTodayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Default range: 1st day of current month to today (or end of month)
  const getDefaultStartDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getTodayIST());
  const [cyclePreset, setCyclePreset] = useState<string>('THIS_MONTH');

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ATTENDANCE' | 'ACTIVITY' | 'PERMISSIONS'>('OVERVIEW');
  const [report, setReport] = useState<StaffAnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReport = async (sDate = startDate, eDate = endDate) => {
    setIsLoading(true);
    const res = await fetchAPI<StaffAnalyticsReport>(
      `/reports/staff/${staffId}?start_date=${sDate}&end_date=${eDate}`
    );
    if (res.success && res.data) {
      setReport(res.data);
    } else {
      toast.error(res.error?.message || 'Failed to load employee report');
    }
    setIsLoading(false);
  };

  const handlePresetChange = (preset: string) => {
    setCyclePreset(preset);
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-indexed

    let s = startDate;
    let e = endDate;

    if (preset === 'THIS_MONTH') {
      const start = new Date(curYear, curMonth, 1);
      const end = new Date(curYear, curMonth + 1, 0);
      s = start.toLocaleDateString('en-CA');
      e = end.toLocaleDateString('en-CA');
    } else if (preset === 'LAST_MONTH') {
      const start = new Date(curYear, curMonth - 1, 1);
      const end = new Date(curYear, curMonth, 0);
      s = start.toLocaleDateString('en-CA');
      e = end.toLocaleDateString('en-CA');
    } else if (preset === 'CYCLE_21_20') {
      // 21st of prev month to 20th of current month
      const start = new Date(curYear, curMonth - 1, 21);
      const end = new Date(curYear, curMonth, 20);
      s = start.toLocaleDateString('en-CA');
      e = end.toLocaleDateString('en-CA');
    } else if (preset === 'CYCLE_26_25') {
      // 26th of prev month to 25th of current month
      const start = new Date(curYear, curMonth - 1, 26);
      const end = new Date(curYear, curMonth, 25);
      s = start.toLocaleDateString('en-CA');
      e = end.toLocaleDateString('en-CA');
    }

    if (preset !== 'CUSTOM') {
      setStartDate(s);
      setEndDate(e);
      loadReport(s, e);
    }
  };

  const exportAttendanceCSV = () => {
    if (!report || !report.attendance_summary) {
      toast.error('No attendance records to export');
      return;
    }
    const { profile, attendance_summary: att } = report;
    const items = att.history || [];

    const lines = [
      `"STAFF ATTENDANCE PERFORMANCE REPORT"`,
      `"Employee Name","${profile.full_name}"`,
      `"Staff Code","${profile.staff_code || `STF-${profile.id}`}"`,
      `"Designation","${profile.designation || 'Staff'}"`,
      `"Department","${profile.department || 'Operations'}"`,
      `"Branch","${profile.branch_name}"`,
      `"Attendance Period","${att.start_date || startDate} to ${att.end_date || endDate}"`,
      `"Total Marked Days","${att.total_business_days}"`,
      `"Full Days Present","${att.full_day_count}"`,
      `"Half Days (1st + 2nd Half)","${att.first_half_count + att.second_half_count}"`,
      `"Approved Leaves","${att.leave_count}"`,
      `"Absences","${att.absent_count}"`,
      `"Attendance Score","${att.attendance_percentage.toFixed(1)}%"`,
      `""`,
      `"DAILY PUNCH AUDIT LOG"`,
      `"Business Date","Punch Status","Remarks / Explanation","Recorded By","Timestamp"`,
      ...items.map((it) => [
        `"${it.business_date}"`,
        `"${it.status}"`,
        `"${(it.remarks || '').replace(/"/g, '""')}"`,
        `"${it.marked_by_name || 'Admin'}"`,
        `"${it.created_at || ''}"`
      ].join(','))
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Staff_Attendance_${profile.staff_code || profile.id}_${att.start_date || startDate}_to_${att.end_date || endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Attendance CSV downloaded successfully');
  };

  useEffect(() => {
    loadReport(startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FULL_DAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Full Day
          </span>
        );
      case 'FIRST_HALF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            1st Half
          </span>
        );
      case 'SECOND_HALF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            2nd Half
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <UserX className="w-3.5 h-3.5 text-rose-600" />
            Absent
          </span>
        );
      case 'LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Plane className="w-3.5 h-3.5 text-amber-600" />
            Leave
          </span>
        );
      default:
        return <span className="text-xs text-slate-500 font-medium">{status}</span>;
    }
  };

  if (isLoading && !report) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Generating Comprehensive Employee Report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">Employee Record Not Found</h3>
        <p className="text-sm text-slate-500">The requested staff record could not be loaded or was removed.</p>
        <Button onClick={onBack} variant="outline" size="sm">
          Return to Staff Directory
        </Button>
      </div>
    );
  }

  const { profile, attendance_summary: att, operational_activity: op, permissions } = report;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Top Return Bar (Hidden on Print) ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700 transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-emerald-300 shadow-xs">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          </div>
          Back to Staff Directory
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print Report
          </Button>
        </div>
      </div>

      {/* ── Top Identity Header Card ───────────────────────────────────────── */}
      <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-50/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start md:items-center gap-5">
            {profile.photo_path ? (
              <img
                src={assetUrl(profile.photo_path)}
                alt={profile.full_name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-2 border-emerald-100 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-extrabold text-2xl md:text-3xl flex items-center justify-center shadow-sm shrink-0">
                {profile.full_name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                  {profile.full_name}
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                  {profile.staff_code}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    profile.employment_status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : profile.employment_status === 'RELIEVED'
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {profile.employment_status}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                  {profile.role}
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span>{profile.designation || 'Staff Member'}</span>
                {profile.department && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-medium">{profile.department}</span>
                  </>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  {profile.branch_name}
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Joined: {profile.date_of_joining || 'N/A'} ({profile.tenure_formatted})
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {profile.phone}
                  </span>
                )}
                {profile.email && (
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {profile.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── High-Level Performance Metric Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <Card className="p-4 bg-white border border-slate-200 shadow-xs rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Monthly Attendance Rate</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">
                {att.attendance_percentage.toFixed(1)}%
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                ({att.full_day_count}/{att.total_business_days} days)
              </span>
            </div>
          </div>
        </Card>

        {/* Vouchers Handled */}
        <Card className="p-4 bg-white border border-slate-200 shadow-xs rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Vouchers Managed</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">
                {op.vouchers_created_count}
              </span>
              <span className="text-xs font-medium text-slate-500">
                Created (₹{Number(op.vouchers_created_total_amount || 0).toLocaleString('en-IN')})
              </span>
            </div>
          </div>
        </Card>

        {/* Expenses Handled */}
        <Card className="p-4 bg-white border border-slate-200 shadow-xs rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Expenses Logged</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">
                {op.expenses_created_count}
              </span>
              <span className="text-xs font-medium text-slate-500">
                (₹{Number(op.expenses_created_total_amount || 0).toLocaleString('en-IN')})
              </span>
            </div>
          </div>
        </Card>

        {/* Donations Collected */}
        <Card className="p-4 bg-white border border-slate-200 shadow-xs rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Counter Donations</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">
                {op.donations_collected_count}
              </span>
              <span className="text-xs font-medium text-slate-500">
                Receipts (₹{Number(op.donations_collected_amount || 0).toLocaleString('en-IN')})
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Tabbed View Selection ───────────────────────────────────────────── */}
      <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 w-full sm:w-auto print:hidden">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'OVERVIEW'
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Demographic & Service Profile
        </button>
        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'ATTENDANCE'
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Attendance Performance ({att.month_name} {att.year})
        </button>
        <button
          onClick={() => setActiveTab('ACTIVITY')}
          className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'ACTIVITY'
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Trust Activity Audit
        </button>
        <button
          onClick={() => setActiveTab('PERMISSIONS')}
          className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'PERMISSIONS'
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Granted Permissions ({permissions.length})
        </button>
      </div>

      {/* ── TAB 1: DEMOGRAPHIC & SERVICE PROFILE ────────────────────────────── */}
      {(activeTab === 'OVERVIEW' || window.matchMedia?.('print').matches) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              Personal & Demographic Dossier
            </h3>

            <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Date of Birth:</span>
                <span className="font-bold text-slate-800">{profile.date_of_birth || 'Not Specified'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Gender:</span>
                <span className="font-bold text-slate-800">{profile.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Education / Qualification:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {profile.education || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Marital Status:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {profile.marital_status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Emergency Contact:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {profile.emergency_contact_name || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Emergency Phone:</span>
                <span className="font-bold text-slate-800">{profile.emergency_contact_phone || 'N/A'}</span>
              </div>
            </div>
          </Card>

          {/* Residence & Employment */}
          <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="w-4 h-4 text-indigo-600" />
              Residential Address & Service Record
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Permanent Address:</span>
                <p className="font-bold text-slate-800 leading-relaxed">
                  {profile.address_line || 'No street address specified'}, {profile.city || ''}, {profile.state || 'Tamil Nadu'} {profile.pincode ? `- ${profile.pincode}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Date of Joining:</span>
                  <span className="font-bold text-slate-800">{profile.date_of_joining || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Date of Relieving:</span>
                  <span className={`font-bold ${profile.date_of_relieving ? 'text-rose-600' : 'text-slate-800'}`}>
                    {profile.date_of_relieving || 'Currently Active'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Status Remarks & Notes:</span>
                <p className="text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                  {profile.status_remarks || 'No disciplinary or special status notes recorded.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: ATTENDANCE PERFORMANCE & LOGS ────────────────────────────── */}
      {(activeTab === 'ATTENDANCE' || window.matchMedia?.('print').matches) && (
        <div className="space-y-6">
          {/* Dynamic From Date to End Date & Preset Filter Bar */}
          <Card className="p-4 bg-white border border-slate-200 shadow-xs rounded-xl print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attendance Cycle / Preset
                </label>
                <select
                  value={cyclePreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full bg-slate-50 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="THIS_MONTH">This Month (1st - End)</option>
                  <option value="LAST_MONTH">Last Month (1st - End)</option>
                  <option value="CYCLE_21_20">Cycle: 21st - 20th</option>
                  <option value="CYCLE_26_25">Cycle: 26th - 25th</option>
                  <option value="CUSTOM">Custom Date Range</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  From Date
                </label>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCyclePreset('CUSTOM');
                    }}
                    className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none w-full cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  To Date
                </label>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCyclePreset('CUSTOM');
                    }}
                    className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none w-full cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <Button
                  onClick={() => loadReport(startDate, endDate)}
                  isLoading={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 shadow-xs"
                >
                  <Filter className="w-3.5 h-3.5 mr-1" />
                  Filter Period
                </Button>
              </div>

              <div>
                <Button
                  onClick={exportAttendanceCSV}
                  variant="outline"
                  className="w-full border-emerald-300 hover:bg-emerald-50 text-emerald-700 text-xs font-bold py-2 shadow-xs"
                  title="Download CSV for this attendance period"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download CSV
                </Button>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>
                Selected Range: <strong className="text-slate-800 font-mono">{att.start_date || startDate}</strong> to{' '}
                <strong className="text-slate-800 font-mono">{att.end_date || endDate}</strong>
              </span>
              <span className="text-emerald-700 font-semibold">
                {att.total_business_days} Marked Day{att.total_business_days !== 1 ? 's' : ''} in Range
              </span>
            </div>
          </Card>

          {/* Month Stats Summary Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-center">
              <span className="text-xs font-semibold text-slate-400 block">Total Marked</span>
              <span className="text-xl font-black text-slate-800">{att.total_business_days}</span>
            </div>
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl shadow-xs text-center">
              <span className="text-xs font-semibold text-emerald-700 block">Full Days</span>
              <span className="text-xl font-black text-emerald-800">{att.full_day_count}</span>
            </div>
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl shadow-xs text-center">
              <span className="text-xs font-semibold text-blue-700 block">Half Days</span>
              <span className="text-xl font-black text-blue-800">{att.first_half_count + att.second_half_count}</span>
            </div>
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl shadow-xs text-center">
              <span className="text-xs font-semibold text-amber-700 block">Leaves</span>
              <span className="text-xl font-black text-amber-800">{att.leave_count}</span>
            </div>
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl shadow-xs text-center">
              <span className="text-xs font-semibold text-rose-700 block">Absences</span>
              <span className="text-xl font-black text-rose-800">{att.absent_count}</span>
            </div>
          </div>

          {/* Detailed Attendance Table */}
          <Card className="overflow-hidden border border-slate-200 shadow-xs rounded-xl">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Daily Attendance History ({att.start_date || startDate} to {att.end_date || endDate})
              </h4>
              <span className="text-xs font-semibold text-emerald-700">
                Overall Rate: {att.attendance_percentage.toFixed(1)}%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Business Date</th>
                    <th className="py-2.5 px-4">Punch Status</th>
                    <th className="py-2.5 px-4">Remarks / Explanation</th>
                    <th className="py-2.5 px-4">Recorded By</th>
                    <th className="py-2.5 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {att.history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 text-sm">
                        No attendance records logged for {att.start_date || startDate} to {att.end_date || endDate}.
                      </td>
                    </tr>
                  ) : (
                    att.history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 font-mono text-xs">
                          {h.business_date}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(h.status)}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {h.remarks || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                          {h.marked_by_name}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-slate-400 font-mono">
                          {h.created_at || '—'}
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

      {/* ── TAB 3: TRUST ACTIVITY AUDIT ─────────────────────────────────────── */}
      {(activeTab === 'ACTIVITY' || window.matchMedia?.('print').matches) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Vouchers Activity Card */}
          <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Vouchers Throughput</h4>
                <p className="text-xs text-slate-400">Creation & authorization records</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Vouchers Created:</span>
                <span className="font-bold text-slate-900">{op.vouchers_created_count}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Total Value Created:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  ₹{Number(op.vouchers_created_total_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Vouchers Approved:</span>
                <span className="font-bold text-slate-900">{op.vouchers_approved_count}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 font-medium">Total Value Approved:</span>
                <span className="font-bold text-indigo-700 font-mono">
                  ₹{Number(op.vouchers_approved_total_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </Card>

          {/* Expenses Activity Card */}
          <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Expenses Managed</h4>
                <p className="text-xs text-slate-400">Expense entry & authorization records</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Expenses Submitted:</span>
                <span className="font-bold text-slate-900">{op.expenses_created_count}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Total Amount Submitted:</span>
                <span className="font-bold text-amber-700 font-mono">
                  ₹{Number(op.expenses_created_total_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Expenses Approved:</span>
                <span className="font-bold text-slate-900">{op.expenses_approved_count}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 font-medium">Total Amount Approved:</span>
                <span className="font-bold text-indigo-700 font-mono">
                  ₹{Number(op.expenses_approved_total_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </Card>

          {/* Donations Activity Card */}
          <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Donations Received</h4>
                <p className="text-xs text-slate-400">Counter donation collections</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Receipts Issued:</span>
                <span className="font-bold text-slate-900">{op.donations_collected_count}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 font-medium">Total Cash/Bank Collection:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  ₹{Number(op.donations_collected_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 4: GRANTED PERMISSIONS MATRIX ──────────────────────────────── */}
      {(activeTab === 'PERMISSIONS' || window.matchMedia?.('print').matches) && (
        <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Granted Action Permissions Matrix
              </h4>
              <p className="text-xs text-slate-500">
                Authorized privileges governing user operations across all trust modules
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              {permissions.length} Active Permissions
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {permissions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No granular permissions assigned to this user.</p>
            ) : (
              permissions.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-800 rounded-lg border border-slate-200 text-xs font-semibold font-mono"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {p}
                </span>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
