import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useBranch } from '../context/BranchContext';
import type {
  AttendanceReportResponse,
  StaffMasterReportItem,
  AttendanceStatus,
} from '../types';
import {
  FileText,
  Calendar,
  Building2,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  UserX,
  Plane,
  BarChart3,
  Users,
  ChevronRight,
} from 'lucide-react';
import { StaffAnalyticsDossier } from '../components/staff/StaffAnalyticsDossier';

export const StaffReports: React.FC = () => {
  const toast = useToast();
  const { branches } = useBranch();

  const getTodayIST = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  };

  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'STAFF_MASTER'>('ATTENDANCE');
  const [attViewMode, setAttViewMode] = useState<'SUMMARY' | 'DAILY_LOG'>('SUMMARY');
  const [cyclePreset, setCyclePreset] = useState<string>('THIS_MONTH');

  // Attendance Filters (Default to Current Month Range)
  const getDefaultStartDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const [attStartDate, setAttStartDate] = useState<string>(getDefaultStartDate());
  const [attEndDate, setAttEndDate] = useState<string>(getTodayIST());
  const [attBranch, setAttBranch] = useState<string>('ALL');
  const [attStatus, setAttStatus] = useState<string>('ALL');
  const [attReport, setAttReport] = useState<AttendanceReportResponse | null>(null);
  const [isLoadingAtt, setIsLoadingAtt] = useState(false);

  // Staff Master Filters
  const [masterStatus, setMasterStatus] = useState<string>('ALL');
  const [masterBranch, setMasterBranch] = useState<string>('ALL');
  const [masterReport, setMasterReport] = useState<StaffMasterReportItem[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

  const loadAttendanceReport = async (sDate = attStartDate, eDate = attEndDate) => {
    setIsLoadingAtt(true);
    let url = `/reports/attendance?start_date=${sDate}&end_date=${eDate}`;
    if (attBranch !== 'ALL') url += `&branch_id=${attBranch}`;
    if (attStatus !== 'ALL') url += `&status=${attStatus}`;

    const res = await fetchAPI<AttendanceReportResponse>(url);
    if (res.success && res.data) {
      setAttReport({
        ...res.data,
        items: Array.isArray(res.data.items) ? res.data.items : [],
        employee_summaries: Array.isArray(res.data.employee_summaries) ? res.data.employee_summaries : [],
      });
    } else {
      setAttReport(null);
      toast.error(res.error?.message || 'Failed to load attendance report');
    }
    setIsLoadingAtt(false);
  };

  const handleCycleChange = (preset: string) => {
    setCyclePreset(preset);
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-indexed

    let s = attStartDate;
    let e = attEndDate;

    if (preset === 'TODAY') {
      s = getTodayIST();
      e = getTodayIST();
    } else if (preset === 'THIS_MONTH') {
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
      setAttStartDate(s);
      setAttEndDate(e);
      loadAttendanceReport(s, e);
    }
  };

  const loadStaffMasterReport = async () => {
    setIsLoadingMaster(true);
    let url = `/reports/staff-master?`;
    if (masterStatus !== 'ALL') url += `&status=${masterStatus}`;
    if (masterBranch !== 'ALL') url += `&branch_id=${masterBranch}`;

    const res = await fetchAPI<StaffMasterReportItem[]>(url);
    if (res.success && res.data) {
      setMasterReport(Array.isArray(res.data) ? res.data : []);
    } else {
      setMasterReport([]);
      toast.error(res.error?.message || 'Failed to load employee master report');
    }
    setIsLoadingMaster(false);
  };

  useEffect(() => {
    if (activeTab === 'ATTENDANCE') {
      loadAttendanceReport();
    } else {
      loadStaffMasterReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // CSV Export for Overall Employee Summary
  const exportEmployeeSummaryCSV = () => {
    const summaries = attReport?.employee_summaries || [];
    if (summaries.length === 0) {
      toast.error('No employee attendance records to export');
      return;
    }

    const headers = [
      'Staff Code',
      'Full Legal Name',
      'Branch',
      'Designation',
      'Department',
      'Phone Number',
      'Email Address',
      'Employment Status',
      'Report Period Start',
      'Report Period End',
      'Total Days Logged',
      'Full Days Present',
      '1st Half Days',
      '2nd Half Days',
      'Approved Leaves',
      'Absences',
      'Attendance Percentage (%)',
    ];

    const rows = summaries.map((s) => [
      s.staff_code || `STF-${s.user_id}`,
      `"${s.full_name}"`,
      `"${s.branch_name}"`,
      `"${s.designation || 'Staff'}"`,
      `"${s.department || 'Operations'}"`,
      s.phone || '',
      s.email || '',
      s.employment_status || 'ACTIVE',
      attStartDate,
      attEndDate,
      s.total_days,
      s.full_day_count,
      s.first_half_count,
      s.second_half_count,
      s.leave_count,
      s.absent_count,
      s.attendance_percentage.toFixed(1),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Staff_Attendance_Overall_Summary_${attStartDate}_to_${attEndDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Overall Employee Attendance Summary exported to CSV');
  };

  // CSV Export for Daily Attendance Logs
  const exportAttendanceCSV = () => {
    const items = attReport?.items || [];
    if (items.length === 0) {
      toast.error('No attendance records to export');
      return;
    }

    const headers = ['Business Date', 'Staff Code', 'Staff Name', 'Branch', 'Designation', 'Department', 'Status', 'Remarks', 'Marked By'];
    const rows = items.map((it) => [
      it.business_date,
      it.staff_code,
      `"${it.full_name}"`,
      `"${it.branch_name}"`,
      `"${it.designation}"`,
      `"${it.department}"`,
      it.status,
      `"${it.remarks}"`,
      `"${it.marked_by_name}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Staff_Attendance_Daily_Log_${attStartDate}_to_${attEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Daily attendance log exported to CSV');
  };

  // CSV Export for Staff Master
  const exportStaffMasterCSV = () => {
    const list = Array.isArray(masterReport) ? masterReport : [];
    if (list.length === 0) {
      toast.error('No staff records to export');
      return;
    }

    const headers = [
      'Staff Code',
      'Full Name',
      'Username',
      'Email',
      'Phone',
      'Role',
      'Designation',
      'Department',
      'Branch',
      'Employment Status',
      'Education',
      'Marital Status',
      'Date of Joining',
      'Date of Relieving',
      'Address',
      'Emergency Contact',
    ];

    const rows = list.map((m) => [
      m.staff_code,
      `"${m.full_name}"`,
      m.username,
      m.email,
      m.phone,
      m.role,
      `"${m.designation}"`,
      `"${m.department}"`,
      `"${m.branch_name}"`,
      m.employment_status,
      `"${m.education}"`,
      m.marital_status,
      m.date_of_joining,
      m.date_of_relieving,
      `"${m.address_line}, ${m.city}"`,
      `"${m.emergency_contact}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Staff_Master_Directory_${getTodayIST()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Staff master report exported to CSV');
  };

  const getStatusBadge = (status: AttendanceStatus | string) => {
    switch (status) {
      case 'FULL_DAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Full Day
          </span>
        );
      case 'FIRST_HALF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            1st Half
          </span>
        );
      case 'SECOND_HALF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            2nd Half
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <UserX className="w-3.5 h-3.5 text-rose-600" />
            Absent
          </span>
        );
      case 'LEAVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Plane className="w-3.5 h-3.5 text-amber-600" />
            Leave
          </span>
        );
      default:
        return <span className="text-xs text-slate-500 font-medium">{status}</span>;
    }
  };

  if (selectedStaffId !== null) {
    return (
      <StaffAnalyticsDossier
        staffId={selectedStaffId}
        onBack={() => setSelectedStaffId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Staff & Attendance Reports
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Attendance audit logs and employee directory reports with date filtering (defaults to today)
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'ATTENDANCE'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Attendance Report
          </button>
          <button
            onClick={() => setActiveTab('STAFF_MASTER')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'STAFF_MASTER'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Employee Master Directory
          </button>
        </div>
      </div>

      {/* ── TAB 1: ATTENDANCE REPORT ────────────────────────────────────────── */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <Card className="p-4 bg-white border border-slate-200/90 shadow-sm rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cycle / Preset
                </label>
                <select
                  value={cyclePreset}
                  onChange={(e) => handleCycleChange(e.target.value)}
                  className="w-full bg-slate-50 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="THIS_MONTH">This Month (1st - End)</option>
                  <option value="LAST_MONTH">Last Month (1st - End)</option>
                  <option value="CYCLE_21_20">Cycle: 21st - 20th</option>
                  <option value="CYCLE_26_25">Cycle: 26th - 25th</option>
                  <option value="TODAY">Today Only</option>
                  <option value="CUSTOM">Custom Date Range</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  From Date
                </label>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <input
                    type="date"
                    value={attStartDate}
                    onChange={(e) => {
                      setAttStartDate(e.target.value);
                      setCyclePreset('CUSTOM');
                    }}
                    className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none w-full cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  To Date
                </label>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <input
                    type="date"
                    value={attEndDate}
                    onChange={(e) => {
                      setAttEndDate(e.target.value);
                      setCyclePreset('CUSTOM');
                    }}
                    className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none w-full cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Branch
                </label>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <select
                    value={attBranch}
                    onChange={(e) => setAttBranch(e.target.value)}
                    className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none w-full cursor-pointer"
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.branch_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status
                </label>
                <select
                  value={attStatus}
                  onChange={(e) => setAttStatus(e.target.value)}
                  className="w-full bg-slate-50 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="FULL_DAY">Full Day Present</option>
                  <option value="FIRST_HALF">1st Half Present</option>
                  <option value="SECOND_HALF">2nd Half Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => loadAttendanceReport(attStartDate, attEndDate)}
                  isLoading={isLoadingAtt}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 shadow-sm"
                >
                  <Filter className="w-3.5 h-3.5 mr-1" />
                  Filter
                </Button>

                <Button
                  variant="outline"
                  onClick={exportEmployeeSummaryCSV}
                  className="border-emerald-300 hover:bg-emerald-50 text-emerald-700 text-xs px-2.5 py-2 shrink-0"
                  title="Download Overall Employee Summary CSV"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Metric Summary Bar */}
          {attReport && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Records</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{attReport.total_records}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-emerald-200/80 shadow-xs">
                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
                  Full Day
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{attReport.full_day_count}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-blue-200/80 shadow-xs">
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider flex items-center justify-between">
                  1st Half
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{attReport.first_half_count}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-indigo-200/80 shadow-xs">
                <p className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider flex items-center justify-between">
                  2nd Half
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                </p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{attReport.second_half_count}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-rose-200/80 shadow-xs">
                <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider flex items-center justify-between">
                  Absent
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                </p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{attReport.absent_count}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-purple-200/80 shadow-xs">
                <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider flex items-center justify-between">
                  Attendance Rate
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                </p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {(attReport.attendance_percentage || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Sub-View Switcher: Overall Employee Summary vs Daily Punch Log */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setAttViewMode('SUMMARY')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  attViewMode === 'SUMMARY'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Overall Employee Summary ({attReport?.employee_summaries?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setAttViewMode('DAILY_LOG')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  attViewMode === 'DAILY_LOG'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Daily Punch Audit Logs ({attReport?.items?.length || 0})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportEmployeeSummaryCSV}
                className="text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Summary CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportAttendanceCSV}
                className="text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                Daily Log CSV
              </Button>
            </div>
          </div>

          {/* VIEW 1: OVERALL EMPLOYEE SUMMARY TABLE */}
          {attViewMode === 'SUMMARY' && (
            <Card className="overflow-hidden border border-slate-200/90 shadow-sm rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Role / Dept</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4 text-center">Total Days</th>
                      <th className="py-3 px-4 text-center">Full Days</th>
                      <th className="py-3 px-4 text-center">Half Days</th>
                      <th className="py-3 px-4 text-center">Leaves</th>
                      <th className="py-3 px-4 text-center">Absences</th>
                      <th className="py-3 px-4 text-right">Attendance %</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {!attReport || (attReport.employee_summaries || []).length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400 text-sm">
                          No employee attendance summaries recorded for {attStartDate} to {attEndDate}.
                        </td>
                      </tr>
                    ) : (
                      (attReport.employee_summaries || []).map((s) => (
                        <tr key={s.user_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => setSelectedStaffId(s.user_id)}
                              className="text-left group cursor-pointer focus:outline-none"
                              title="Click to view full employee analytical dossier"
                            >
                              <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {s.full_name}
                              </div>
                              <div className="text-xs font-mono text-slate-500 font-semibold group-hover:text-emerald-600 transition-colors">
                                {s.staff_code || `STF-${s.user_id}`}
                              </div>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-600">
                            {s.branch_name}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            <div className="font-medium text-slate-800">{s.designation || 'Staff'}</div>
                            <div className="text-[11px] text-slate-400">{s.department || 'Operations'}</div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                            <div>{s.phone || '—'}</div>
                            <div className="text-[11px] text-slate-400 font-sans">{s.email || ''}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900">
                            {s.total_days}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-700">
                            {s.full_day_count}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-blue-700">
                            {s.first_half_count + s.second_half_count}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-amber-700">
                            {s.leave_count}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-rose-700">
                            {s.absent_count}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                s.attendance_percentage >= 90
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : s.attendance_percentage >= 75
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {s.attendance_percentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedStaffId(s.user_id)}
                              className="text-xs py-1 px-2.5 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 inline-flex items-center gap-1 font-semibold"
                            >
                              Dossier
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* VIEW 2: DAILY PUNCH AUDIT LOG TABLE */}
          {attViewMode === 'DAILY_LOG' && (
            <Card className="overflow-hidden border border-slate-200/90 shadow-sm rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Business Date</th>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Remarks</th>
                      <th className="py-3 px-4 text-right">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {!attReport || (attReport.items || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                          No attendance records logged for {attStartDate} to {attEndDate}.
                        </td>
                      </tr>
                    ) : (
                      (attReport.items || []).map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {it.business_date}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => setSelectedStaffId(it.user_id)}
                              className="text-left group cursor-pointer focus:outline-none"
                              title="Click to view full employee analytical dossier"
                            >
                              <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {it.full_name}
                              </div>
                              <div className="text-xs font-mono text-slate-500 font-semibold group-hover:text-emerald-600 transition-colors">
                                {it.staff_code}
                              </div>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-600">
                            {it.branch_name}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {it.designation || 'Staff'} {it.department && `(${it.department})`}
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(it.status)}</td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {it.remarks || '—'}
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-slate-500">
                            {it.marked_by_name || 'Admin'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB 2: STAFF MASTER DIRECTORY ──────────────────────────────────── */}
      {activeTab === 'STAFF_MASTER' && (
        <div className="space-y-6">
          {/* Master Filters */}
          <Card className="p-4 bg-white border border-slate-200/90 shadow-sm rounded-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500">Status:</span>
                  <select
                    value={masterStatus}
                    onChange={(e) => setMasterStatus(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Staff</option>
                    <option value="RELIEVED">Relieved Staff</option>
                    <option value="TEMPORARILY_BLOCKED">Temporarily Blocked</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <select
                    value={masterBranch}
                    onChange={(e) => setMasterBranch(e.target.value)}
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
                  size="sm"
                  onClick={loadStaffMasterReport}
                  isLoading={isLoadingMaster}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                >
                  Apply
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={exportStaffMasterCSV}
                className="flex items-center gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                <Download className="w-4 h-4" />
                Export Directory CSV
              </Button>
            </div>
          </Card>

          {/* Quick Info Banner */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 font-medium">
            <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Click on any staff member or click <strong>Full Report</strong> to view in-depth performance analytics, monthly attendance logs, operational throughput, and granted permissions.
            </span>
          </div>

          {/* Master Table */}
          <Card className="overflow-hidden border border-slate-200/90 shadow-sm rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Staff Code</th>
                    <th className="py-3 px-4">Full Name & Account</th>
                    <th className="py-3 px-4">Designation & Branch</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Education & Status</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Employment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {masterReport.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                        No staff members found matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    masterReport.map((m) => (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedStaffId(m.id)}
                        className="hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-xs text-emerald-700">
                          {m.staff_code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {m.full_name}
                          </div>
                          <div className="text-xs text-slate-500">@{m.username} • {m.role}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{m.designation || 'Staff'}</div>
                          <div className="text-xs text-slate-500">{m.branch_name}</div>
                        </td>
                        <td className="py-3 px-4 text-xs space-y-0.5">
                          <div className="font-medium text-slate-800">{m.phone || 'No phone'}</div>
                          <div className="text-slate-500">{m.email}</div>
                        </td>
                        <td className="py-3 px-4 text-xs space-y-0.5">
                          <div className="font-semibold text-slate-800">{m.education || 'N/A'}</div>
                          <div className="text-slate-500">{m.marital_status}</div>
                        </td>
                        <td className="py-3 px-4 text-xs space-y-0.5">
                          <div>Joined: {m.date_of_joining || 'N/A'}</div>
                          {m.date_of_relieving && <div className="text-rose-600 font-semibold">Relieved: {m.date_of_relieving}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            m.employment_status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : m.employment_status === 'RELIEVED'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {m.employment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStaffId(m.id);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-100/60 hover:border-emerald-300 shadow-2xs py-1 px-3 h-auto"
                          >
                            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                            Full Report
                          </Button>
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
    </div>
  );
};
