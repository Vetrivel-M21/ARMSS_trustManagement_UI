import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RefreshCw, Users, Calendar, Cake, Gift, X, Loader2 } from 'lucide-react';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import { isValidYear } from '../utils/validation';
import type { YoYComparisonItem, BirthdayItem, YoYMonthDonorItem } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Builds a real calendar date (current year) for a report row's day/month —
// clamps Feb 29 to Feb 28 when the current year isn't a leap year, since the
// report only ever gives back a day-of-month + month, not a specific year.
const safeEventDate = (month: number, day: number): string => {
  const year = new Date().getFullYear();
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const safeDay = month === 2 && day === 29 && !isLeap ? 28 : day;
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
};

const eventTypeFor = (b: BirthdayItem): string =>
  b.type === 'ANNIVERSARY' ? 'ANNIVERSARY' : b.type === 'FAMILY_MEMBER' ? 'CHILD_BIRTHDAY' : 'BIRTHDAY';

type DonorSummaryTab = 'YOY_COMPARISON' | 'BIRTHDAYS';

export const DonorSummary: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<DonorSummaryTab>('YOY_COMPARISON');
  const [targetMonth, setTargetMonth] = useState(() => new Date().getMonth() + 1);
  const [yoyYear, setYoyYear] = useState(() => new Date().getFullYear());
  const yoyYearError = isValidYear(yoyYear, 2000, new Date().getFullYear());

  const [yoyData, setYoyData] = useState<YoYComparisonItem[]>([]);
  const [birthdayData, setBirthdayData] = useState<BirthdayItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedYoyMonth, setSelectedYoyMonth] = useState<number | null>(null);
  const [loadingMonth, setLoadingMonth] = useState<number | null>(null);
  const [yoyMonthDonors, setYoyMonthDonors] = useState<{
    current_year: number;
    previous_year: number;
    current_year_donors: YoYMonthDonorItem[];
    previous_year_donors: YoYMonthDonorItem[];
  } | null>(null);
  const [isLoadingDonors, setIsLoadingDonors] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedYoyMonth(null);
      }
    };
    if (selectedYoyMonth !== null) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedYoyMonth]);

  const loadData = async () => {
    setIsLoading(true);
    const requests: Promise<any>[] = [fetchAPI<any>(`/reports/birthdays?month=${targetMonth}`)];
    if (!yoyYearError) requests.unshift(fetchAPI<any>(`/reports/yoy-comparison?year=${yoyYear}`));
    const results = await Promise.all(requests);
    const birthdayRes = results[results.length - 1];
    const yoyRes = yoyYearError ? null : results[0];

    if (yoyRes) {
      if (yoyRes.success && yoyRes.data) setYoyData(yoyRes.data.months || []);
      else if (!yoyRes.success) toast.error(yoyRes.error?.message || 'Failed to load year-over-year comparison');
    }
    if (birthdayRes.success && birthdayRes.data) setBirthdayData(birthdayRes.data.birthdays || []);
    else if (!birthdayRes.success) toast.error(birthdayRes.error?.message || 'Failed to load birthday calendar');
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMonth, yoyYear]);

  useEffect(() => {
    setSelectedYoyMonth(null);
    setYoyMonthDonors(null);
  }, [yoyYear]);

  const recordDonationFor = (b: BirthdayItem) => {
    navigate('/donations', {
      state: {
        donationPrefill: {
          donorId: b.donor_id,
          eventType: eventTypeFor(b),
          eventPersonName: b.person_name,
          eventDate: safeEventDate(b.birthday_month, b.birthday_day),
          relationshipToDonor: b.relationship,
          familyMemberId: b.family_member_id,
        },
      },
    });
  };

  const loadYoyMonthDonors = async (month: number) => {
    setSelectedYoyMonth(month);
    setLoadingMonth(month);
    setIsLoadingDonors(true);
    setYoyMonthDonors(null);
    const res = await fetchAPI<any>(`/reports/yoy-comparison/donors?month=${month}&year=${yoyYear}`);
    if (res.success && res.data) {
      setYoyMonthDonors(res.data);
    } else {
      toast.error(res.error?.message || 'Failed to load donor list for this month');
    }
    setIsLoadingDonors(false);
    setLoadingMonth(null);
  };

  const currentDonors = yoyMonthDonors?.current_year_donors ?? [];
  const previousDonors = yoyMonthDonors?.previous_year_donors ?? [];
  const currentTotal = currentDonors.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const previousTotal = previousDonors.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Donor Summary</h2>
          <p className="text-xs text-slate-500">Year-over-year donation trends and upcoming donor/family birthdays</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-semibold">
        <button
          className={`pb-2 flex items-center gap-1.5 border-b-2 ${activeTab === 'YOY_COMPARISON' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('YOY_COMPARISON')}
        >
          <Calendar className="w-4 h-4" /> YoY Donor Comparison
        </button>
        <button
          className={`pb-2 flex items-center gap-1.5 border-b-2 ${activeTab === 'BIRTHDAYS' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('BIRTHDAYS')}
        >
          <Cake className="w-4 h-4" /> Birthday Calendar
        </button>
      </div>

      {activeTab === 'YOY_COMPARISON' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Comparison Year:</span>
            <div>
              <input
                type="number"
                min={2000}
                max={new Date().getFullYear()}
                className="w-28 px-3 py-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                value={yoyYear}
                onChange={(e) => setYoyYear(Number(e.target.value))}
              />
              {yoyYearError && <p className="text-[11px] text-rose-600 font-medium mt-1">{yoyYearError}</p>}
            </div>
            <span className="text-xs text-slate-400">vs {yoyYear - 1}</span>
          </div>

          <Card title="Year-over-Year Month-by-Month Collection Comparison">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">Current Year (₹)</th>
                    <th className="px-4 py-3 text-right">Previous Year (₹)</th>
                    <th className="px-4 py-3 text-right">Variance Amount (₹)</th>
                    <th className="px-4 py-3 text-right">YoY Growth (%)</th>
                    <th className="px-4 py-3 text-center">Donor List</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-xs">
                  {yoyData.map((m, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50 transition-colors ${selectedYoyMonth === idx + 1 ? 'bg-emerald-50/70 font-semibold' : ''}`}
                    >
                      <td className="px-4 py-3 font-sans font-semibold text-slate-900">{m.month_name}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">₹{Number(m.current_year_amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-slate-600">₹{Number(m.previous_year_amount || 0).toLocaleString('en-IN')}</td>
                      <td className={`px-4 py-3 text-right font-bold ${Number(m.variance_amount || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ₹{Number(m.variance_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${m.variance_percent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.variance_percent >= 0 ? `+${m.variance_percent.toFixed(1)}%` : `${m.variance_percent.toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          className="font-sans text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                          disabled={isLoadingDonors && loadingMonth === idx + 1}
                          onClick={() => loadYoyMonthDonors(idx + 1)}
                        >
                          {isLoadingDonors && loadingMonth === idx + 1 ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                          ) : (
                            <Users className="w-3.5 h-3.5 text-emerald-700" />
                          )}
                          View Donors
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* YoY Month Donors Drilldown Modal */}
          {selectedYoyMonth !== null && (
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={() => setSelectedYoyMonth(null)}
            >
              <div
                className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50/70">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Donor List — {MONTH_NAMES[selectedYoyMonth - 1]} {yoyYear} vs {MONTH_NAMES[selectedYoyMonth - 1]} {yoyYear - 1}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Detailed donor-level breakdown for {MONTH_NAMES[selectedYoyMonth - 1]} collections
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                    onClick={() => setSelectedYoyMonth(null)}
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto flex-1">
                  {isLoadingDonors ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                      <p className="text-sm font-medium">Loading donor list for {MONTH_NAMES[selectedYoyMonth - 1]}...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {([
                        {
                          label: `Current Year (${yoyMonthDonors?.current_year ?? yoyYear})`,
                          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                          rows: currentDonors,
                          total: currentTotal,
                        },
                        {
                          label: `Previous Year (${yoyMonthDonors?.previous_year ?? yoyYear - 1})`,
                          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                          rows: previousDonors,
                          total: previousTotal,
                        },
                      ] as const).map((col) => (
                        <div key={col.label} className="border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-white">
                          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-xs text-slate-800">{col.label}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${col.badgeClass}`}>
                                {col.rows.length} donor{col.rows.length === 1 ? '' : 's'}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                ₹{col.total.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100/70 text-slate-600 uppercase tracking-wide text-[10px] border-b sticky top-0">
                                <tr>
                                  <th className="px-3.5 py-2.5">Donor</th>
                                  <th className="px-3.5 py-2.5">Date</th>
                                  <th className="px-3.5 py-2.5">Purpose</th>
                                  <th className="px-3.5 py-2.5 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {col.rows.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                                      No donations recorded for this month
                                    </td>
                                  </tr>
                                ) : (
                                  col.rows.map((d, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-3.5 py-2.5">
                                        <p className="font-semibold text-slate-900">{d.donor_name}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">{d.donor_code}</p>
                                      </td>
                                      <td className="px-3.5 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                                        {d.business_date}
                                      </td>
                                      <td className="px-3.5 py-2.5 text-slate-600 max-w-[140px] truncate" title={d.purpose}>
                                        {d.purpose || '-'}
                                      </td>
                                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                        ₹{Number(d.amount || 0).toLocaleString('en-IN')}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setSelectedYoyMonth(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'BIRTHDAYS' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Select Month:</span>
            <select
              className="px-3 py-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              value={targetMonth}
              onChange={(e) => setTargetMonth(Number(e.target.value))}
            >
              {[
                { val: 1, label: 'January' }, { val: 2, label: 'February' }, { val: 3, label: 'March' },
                { val: 4, label: 'April' }, { val: 5, label: 'May' }, { val: 6, label: 'June' },
                { val: 7, label: 'July' }, { val: 8, label: 'August' }, { val: 9, label: 'September' },
                { val: 10, label: 'October' }, { val: 11, label: 'November' }, { val: 12, label: 'December' }
              ].map((m) => (
                <option key={m.val} value={m.val}>{m.label}</option>
              ))}
            </select>
          </div>

          <Card title="Upcoming & Monthly Birthdays (Donors & Registered Children)">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Person Name</th>
                    <th className="px-4 py-3">Relationship</th>
                    <th className="px-4 py-3">Primary Donor</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3 text-center">Date</th>
                    <th className="px-4 py-3 text-center">Turning / Years</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 text-xs">
                  {birthdayData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-400">No birthdays or anniversaries in this month</td>
                    </tr>
                  ) : (
                    birthdayData.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                              b.type === 'DONOR' ? 'bg-emerald-100 text-emerald-800' : b.type === 'ANNIVERSARY' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {b.type === 'DONOR' ? 'Donor' : b.type === 'ANNIVERSARY' ? 'Anniversary' : 'Child / Family'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{b.person_name}</td>
                        <td className="px-4 py-3 text-slate-500">{b.relationship}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{b.donor_name}</td>
                        <td className="px-4 py-3 font-mono">{b.phone}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-700">{b.birthday_day}th {MONTH_NAMES[b.birthday_month - 1]}</td>
                        <td className="px-4 py-3 text-center font-mono font-semibold">{b.age} yrs</td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="outline" size="sm" onClick={() => recordDonationFor(b)}>
                            <Gift className="w-3.5 h-3.5 mr-1" /> Record Donation
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
