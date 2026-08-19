import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RefreshCw, Users, Calendar, Cake, Gift } from 'lucide-react';
import { fetchAPI } from '../api/client';
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
  const [activeTab, setActiveTab] = useState<DonorSummaryTab>('YOY_COMPARISON');
  const [targetMonth, setTargetMonth] = useState(() => new Date().getMonth() + 1);
  const [yoyYear, setYoyYear] = useState(() => new Date().getFullYear());

  const [yoyData, setYoyData] = useState<YoYComparisonItem[]>([]);
  const [birthdayData, setBirthdayData] = useState<BirthdayItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedYoyMonth, setSelectedYoyMonth] = useState<number | null>(null);
  const [yoyMonthDonors, setYoyMonthDonors] = useState<{
    current_year: number;
    previous_year: number;
    current_year_donors: YoYMonthDonorItem[];
    previous_year_donors: YoYMonthDonorItem[];
  } | null>(null);
  const [isLoadingDonors, setIsLoadingDonors] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const [yoyRes, birthdayRes] = await Promise.all([
      fetchAPI<any>(`/reports/yoy-comparison?year=${yoyYear}`),
      fetchAPI<any>(`/reports/birthdays?month=${targetMonth}`),
    ]);
    if (yoyRes.success && yoyRes.data) setYoyData(yoyRes.data.months || []);
    if (birthdayRes.success && birthdayRes.data) setBirthdayData(birthdayRes.data.birthdays || []);
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
    setIsLoadingDonors(true);
    const res = await fetchAPI<any>(`/reports/yoy-comparison/donors?month=${month}&year=${yoyYear}`);
    if (res.success && res.data) setYoyMonthDonors(res.data);
    setIsLoadingDonors(false);
  };

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
            <input
              type="number"
              className="w-28 px-3 py-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              value={yoyYear}
              onChange={(e) => setYoyYear(Number(e.target.value) || yoyYear)}
            />
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
                    <tr key={idx} className={`hover:bg-slate-50 ${selectedYoyMonth === idx + 1 ? 'bg-emerald-50/60' : ''}`}>
                      <td className="px-4 py-3 font-sans font-semibold text-slate-900">{m.month_name}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">₹{m.current_year_amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-slate-600">₹{m.previous_year_amount.toLocaleString('en-IN')}</td>
                      <td className={`px-4 py-3 text-right font-bold ${m.variance_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ₹{m.variance_amount.toLocaleString('en-IN')}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${m.variance_percent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.variance_percent >= 0 ? `+${m.variance_percent.toFixed(1)}%` : `${m.variance_percent.toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          className="font-sans text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                          onClick={() => loadYoyMonthDonors(idx + 1)}
                        >
                          <Users className="w-3.5 h-3.5" /> View Donors
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {selectedYoyMonth !== null && (
            <Card title={`Donor List — ${MONTH_NAMES[selectedYoyMonth - 1]} ${yoyYear} vs ${MONTH_NAMES[selectedYoyMonth - 1]} ${yoyYear - 1}`}>
              {isLoadingDonors ? (
                <p className="text-center py-6 text-slate-400 text-xs">Loading donor list...</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {([
                    { label: `This Year (${yoyMonthDonors?.current_year ?? yoyYear})`, rows: yoyMonthDonors?.current_year_donors ?? [] },
                    { label: `Last Year (${yoyMonthDonors?.previous_year ?? yoyYear - 1})`, rows: yoyMonthDonors?.previous_year_donors ?? [] },
                  ] as const).map((col) => (
                    <div key={col.label} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 border-b border-slate-200">
                        {col.label} — {col.rows.length} donor{col.rows.length === 1 ? '' : 's'}
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-white text-slate-500 uppercase tracking-wide border-b sticky top-0">
                            <tr>
                              <th className="px-3 py-2">Donor</th>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Purpose</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {col.rows.length === 0 ? (
                              <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">No donors this month</td></tr>
                            ) : (
                              col.rows.map((d, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="px-3 py-2">
                                    <p className="font-semibold text-slate-900">{d.donor_name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{d.donor_code}</p>
                                  </td>
                                  <td className="px-3 py-2 font-mono text-slate-500">{d.business_date}</td>
                                  <td className="px-3 py-2 text-slate-600">{d.purpose}</td>
                                  <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">₹{d.amount.toLocaleString('en-IN')}</td>
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
            </Card>
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
