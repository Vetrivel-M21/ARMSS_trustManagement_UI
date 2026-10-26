import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  CalendarCheck2,
  Calendar,
  Building2,
  Search,
  CheckCircle2,
  Clock,
  UserX,
  Plane,
  Save,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
} from 'lucide-react';
import { fetchAPI, assetUrl } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import type { AttendanceStatus, StaffAttendanceItem, Branch } from '../types';

export const StaffAttendance: React.FC = () => {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const getTodayIST = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayIST());
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<StaffAttendanceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load branches
  useEffect(() => {
    const loadBranches = async () => {
      const res = await fetchAPI<Branch[]>('/branches');
      if (res.success && Array.isArray(res.data)) {
        setBranches(res.data);
      }
    };
    loadBranches();
  }, []);

  // Load daily attendance sheet
  const loadAttendanceSheet = async () => {
    setIsLoading(true);
    const branchQuery = selectedBranch !== 'ALL' ? `&branch_id=${selectedBranch}` : '';
    const res = await fetchAPI<{ date: string; branch_id?: number; items: StaffAttendanceItem[] }>(
      `/attendance/sheet?date=${selectedDate}${branchQuery}`
    );
    if (res.success && res.data) {
      setItems(Array.isArray(res.data.items) ? res.data.items : []);
    } else {
      setItems([]);
      toast.error(res.error?.message || 'Failed to load attendance sheet');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAttendanceSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedBranch]);

  // Date Shift Helper
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Mark all currently filtered/displayed staff as FULL_DAY
  const handleMarkAllPresent = () => {
    setItems((prev) =>
      (prev || []).map((item) => ({
        ...item,
        status: 'FULL_DAY',
      }))
    );
    toast.info('Marked all staff as Full Day Present (unsaved changes)');
  };

  const handleStatusChange = (userId: number, newStatus: AttendanceStatus) => {
    setItems((prev) =>
      (prev || []).map((item) => (item.user_id === userId ? { ...item, status: newStatus } : item))
    );
  };

  const handleRemarksChange = (userId: number, newRemarks: string) => {
    setItems((prev) =>
      (prev || []).map((item) => (item.user_id === userId ? { ...item, remarks: newRemarks } : item))
    );
  };

  const handleSaveAttendance = async () => {
    const safeItems = Array.isArray(items) ? items : [];
    if (safeItems.length === 0) {
      toast.info('No staff members to record attendance for');
      return;
    }

    setIsSaving(true);
    const payload = {
      business_date: selectedDate,
      entries: safeItems.map((it) => ({
        user_id: it.user_id,
        status: it.status,
        remarks: it.remarks || '',
      })),
    };

    const res = await fetchAPI<{ message: string; saved_count: number }>('/attendance/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setIsSaving(false);

    if (res.success) {
      toast.success(res.data?.message || 'Staff attendance recorded successfully!');
      loadAttendanceSheet();
    } else {
      toast.error(res.error?.message || 'Failed to save attendance');
    }
  };

  // Safe list of items
  const safeItems = Array.isArray(items) ? items : [];

  // Filter items by search
  const filteredItems = safeItems.filter((it) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (it.full_name || '').toLowerCase().includes(q) ||
      (it.staff_code || '').toLowerCase().includes(q) ||
      (it.designation || '').toLowerCase().includes(q)
    );
  });

  // Real-time counters
  const presentFull = safeItems.filter((it) => it.status === 'FULL_DAY').length;
  const present1st = safeItems.filter((it) => it.status === 'FIRST_HALF').length;
  const present2nd = safeItems.filter((it) => it.status === 'SECOND_HALF').length;
  const absentCount = safeItems.filter((it) => it.status === 'ABSENT').length;
  const leaveCount = safeItems.filter((it) => it.status === 'LEAVE').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm shrink-0">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Staff Attendance Entry
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Daily manual attendance sheet with full-day, half-day, absent, and leave tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAttendanceSheet}
            isLoading={isLoading}
            className="flex items-center gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload
          </Button>

          {hasPermission('attendance:mark') && (
            <Button
              size="sm"
              onClick={handleSaveAttendance}
              isLoading={isSaving}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
            >
              <Save className="w-3.5 h-3.5" />
              Save Attendance
            </Button>
          )}
        </div>
      </div>

      {/* Date & Filter Navigation Bar */}
      <Card className="p-4 bg-white border border-slate-200/90 shadow-sm rounded-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Date Selector with Quick Step */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => shiftDate(-1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => shiftDate(1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSelectedDate(getTodayIST())}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              Today
            </button>
          </div>

          {/* Branch & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
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

            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Quick Bulk Action */}
            {hasPermission('attendance:mark') && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors shadow-xs"
                title="Click to quickly set all staff to Full Day Present"
              >
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                Mark All Full Day Present
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Staff</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{safeItems.length}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            Full Day
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{presentFull}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-blue-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider flex items-center justify-between">
            1st Half
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{present1st}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-indigo-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider flex items-center justify-between">
            2nd Half
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          </p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{present2nd}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-rose-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center justify-between">
            Absent
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          </p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{absentCount}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center justify-between">
            Leave
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{leaveCount}</p>
        </div>
      </div>

      {/* Attendance Grid Table */}
      <Card className="overflow-hidden border border-slate-200/90 shadow-sm rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4 min-w-[340px]">Attendance Status</th>
                <th className="py-3 px-4 min-w-[200px]">Remarks / Note</th>
                <th className="py-3 px-4 text-right">Audit Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    No active staff members found for the selected branch filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.user_id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Staff Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {item.photo_path ? (
                          <img
                            src={assetUrl(item.photo_path)}
                            alt={item.full_name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200">
                            {item.full_name?.charAt(0) || 'S'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {item.full_name}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                              {item.staff_code}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.designation || 'Staff'} {item.department && `• ${item.department}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-4 text-xs font-medium text-slate-600">
                      {item.branch_name}
                    </td>

                    {/* Attendance Radio Segmented Controls */}
                    <td className="py-3 px-4">
                      <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200/80 gap-1">
                        {/* Full Day */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.user_id, 'FULL_DAY')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                            item.status === 'FULL_DAY'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Full Day
                        </button>

                        {/* First Half */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.user_id, 'FIRST_HALF')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                            item.status === 'FIRST_HALF'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          1st Half
                        </button>

                        {/* Second Half */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.user_id, 'SECOND_HALF')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                            item.status === 'SECOND_HALF'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          2nd Half
                        </button>

                        {/* Absent */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.user_id, 'ABSENT')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                            item.status === 'ABSENT'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Absent
                        </button>

                        {/* Leave */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.user_id, 'LEAVE')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                            item.status === 'LEAVE'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                        >
                          <Plane className="w-3.5 h-3.5" />
                          Leave
                        </button>
                      </div>
                    </td>

                    {/* Remarks Input */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Optional remarks..."
                        value={item.remarks || ''}
                        onChange={(e) => handleRemarksChange(item.user_id, e.target.value)}
                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Audit Info */}
                    <td className="py-3 px-4 text-right text-xs">
                      {item.attendance_id ? (
                        <div>
                          <span className="text-emerald-600 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            Saved
                          </span>
                          {item.updated_at && <div className="text-[10px] text-slate-400 mt-0.5">{item.updated_at.split(' ')[1]}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Unsaved</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Save Action */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Make sure to click <strong>Save Attendance</strong> to commit records for {selectedDate}.
          </p>

          {hasPermission('attendance:mark') && (
            <Button
              onClick={handleSaveAttendance}
              isLoading={isSaving}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-6 py-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Attendance
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
