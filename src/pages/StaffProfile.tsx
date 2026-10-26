import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { fetchAPI, assetUrl } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { User, StaffAttendanceMySummary } from '../types';
import {
  UserCircle,
  Building2,
  Calendar,
  Phone,
  Mail,
  GraduationCap,
  Heart,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserX,
  Plane,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const StaffProfile: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<User | null>(user);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Month & Year state for attendance
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);

  const [attendanceSummary, setAttendanceSummary] = useState<StaffAttendanceMySummary | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    const res = await fetchAPI<User>('/auth/me');
    if (res.success && res.data) {
      setProfile(res.data);
    }
    setIsLoadingProfile(false);
  };

  const loadAttendance = async () => {
    setIsLoadingAttendance(true);
    const res = await fetchAPI<StaffAttendanceMySummary>(
      `/attendance/my?year=${selectedYear}&month=${selectedMonth}`
    );
    if (res.success && res.data) {
      setAttendanceSummary(res.data);
    } else {
      toast.error(res.error?.message || 'Failed to load your attendance');
    }
    setIsLoadingAttendance(false);
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FULL_DAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Full Day Present
          </span>
        );
      case 'FIRST_HALF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            1st Half Present
          </span>
        );
      case 'SECOND_HALF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Clock className="w-3 h-3 text-indigo-600" />
            2nd Half Present
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <UserX className="w-3 h-3 text-rose-600" />
            Absent
          </span>
        );
      case 'LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Plane className="w-3 h-3 text-amber-600" />
            On Leave
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  const safeHistory = Array.isArray(attendanceSummary?.history) ? attendanceSummary.history : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm shrink-0">
            <UserCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              My Staff Profile & Attendance
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Personal employment details, contact credentials, and your monthly attendance record
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            loadProfile();
            loadAttendance();
          }}
          isLoading={isLoadingProfile || isLoadingAttendance}
          className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Main Profile Hero Card */}
      <Card className="overflow-hidden border border-slate-200/90 bg-white shadow-sm rounded-xl">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 h-28 relative">
          <div className="absolute right-4 top-4 text-emerald-100 text-xs flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Verified Staff Account
          </div>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-6">
            <div className="flex items-end gap-4">
              {profile?.photo_path ? (
                <img
                  src={assetUrl(profile.photo_path)}
                  alt={profile.full_name}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg bg-white"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-3xl border-4 border-white shadow-lg">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
              )}

              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {profile?.full_name}
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {profile?.staff_code || `STF-${profile?.id}`}
                  </span>
                </h2>
                <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs">@{profile?.username}</span>
                  <span>•</span>
                  <span className="font-semibold text-emerald-600">
                    {profile?.designation || 'Staff'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                ROLE: {profile?.role}
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                STATUS: {profile?.employment_status || 'ACTIVE'}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
            {/* Column 1: Contact Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{profile?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profile?.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profile?.branch_name || profile?.branch?.name || 'Main Branch'}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Demographic & Education */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Personal & Education</h3>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Education: <strong className="text-slate-800">{profile?.education || 'Not specified'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500 shrink-0" />
                  <span>Marital Status: <strong className="text-slate-800">{profile?.marital_status || 'Single'}</strong></span>
                </div>
                {profile?.date_of_birth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>DOB: <strong className="text-slate-800">{profile.date_of_birth}</strong></span>
                  </div>
                )}
                {profile?.gender && (
                  <div className="text-xs text-slate-500">Gender: {profile.gender}</div>
                )}
              </div>
            </div>

            {/* Column 3: Address & Emergency */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Emergency & Address</h3>
              <div className="space-y-2 text-sm text-slate-700">
                {profile?.emergency_contact_name && (
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">{profile.emergency_contact_name}</p>
                      {profile.emergency_contact_phone && (
                        <p className="text-xs text-slate-500">{profile.emergency_contact_phone}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-slate-600">
                    {[profile?.address_line, profile?.city, profile?.state, profile?.pincode]
                      .filter(Boolean)
                      .join(', ') || 'Address not registered'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Attendance History Section */}
      <Card className="p-6 bg-white border border-slate-200/90 shadow-sm rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              My Attendance Record
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monthly breakdown of your present, half-day, absent, and leave records
            </p>
          </div>

          {/* Month / Year Selectors */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none cursor-pointer"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none cursor-pointer"
            >
              {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Monthly Attendance Metrics */}
        {attendanceSummary && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                <p className="text-[10px] font-semibold text-slate-500 uppercase">Recorded Days</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{attendanceSummary.total_days}</p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-xs">
                <p className="text-[10px] font-semibold text-emerald-700 uppercase">Full Day</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">{attendanceSummary.full_day_count}</p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-blue-200 shadow-xs">
                <p className="text-[10px] font-semibold text-blue-700 uppercase">1st Half</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{attendanceSummary.first_half_count}</p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-indigo-200 shadow-xs">
                <p className="text-[10px] font-semibold text-indigo-700 uppercase">2nd Half</p>
                <p className="text-xl font-bold text-indigo-600 mt-1">{attendanceSummary.second_half_count}</p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-rose-200 shadow-xs">
                <p className="text-[10px] font-semibold text-rose-700 uppercase">Absent</p>
                <p className="text-xl font-bold text-rose-600 mt-1">{attendanceSummary.absent_count}</p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-amber-200 shadow-xs">
                <p className="text-[10px] font-semibold text-amber-700 uppercase">Leave</p>
                <p className="text-xl font-bold text-amber-600 mt-1">{attendanceSummary.leave_count}</p>
              </div>
            </div>

            {/* Attendance Rate Bar */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-slate-700">
                  Monthly Attendance Performance ({monthNames[selectedMonth - 1]} {selectedYear})
                </span>
                <span className="text-emerald-600 font-bold text-sm">
                  {attendanceSummary.attendance_percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, attendanceSummary.attendance_percentage)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Business Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Remarks / Reason</th>
                <th className="py-3 px-4 text-right">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {safeHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                    No attendance records logged for {monthNames[selectedMonth - 1]} {selectedYear}.
                  </td>
                </tr>
              ) : (
                safeHistory.map((h) => {
                  const dt = new Date(h.business_date);
                  const dayName = dt.toLocaleDateString('en-US', { weekday: 'short' });
                  return (
                    <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {h.business_date}
                          <span className="text-xs font-normal text-slate-400">({dayName})</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">{getStatusBadge(h.status)}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">
                        {h.remarks || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-slate-400">
                        {h.marked_by_name || 'Admin'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
