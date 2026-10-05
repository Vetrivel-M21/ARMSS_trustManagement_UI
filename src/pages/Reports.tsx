import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  BarChart3,
  Download,
  RefreshCw,
  Building2,
  Banknote,
  Layers,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { fetchAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import type { BranchComparisonItem } from '../types';
import { BankSummary } from './BankSummary';
import { CashSummary } from './CashSummary';

export const Reports: React.FC = () => {
  type ReportTab = 'SUMMARY_BOOK' | 'BRANCH_COMPARISON' | 'BANK_RECONCILIATION' | 'CASH_FLOW';
  const VALID_TABS: ReportTab[] = ['SUMMARY_BOOK', 'BRANCH_COMPARISON', 'BANK_RECONCILIATION', 'CASH_FLOW'];
  
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as ReportTab | null;
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'SUMMARY_BOOK');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { branches, activeBranch, activeBranchId, switchBranch } = useBranch();

  // For Summary Book: user can select a specific branch or "ALL" (consolidated)
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(() => {
    return activeBranchId ? String(activeBranchId) : 'ALL';
  });

  const [summaryData, setSummaryData] = useState<any>(null);
  const [comparisonData, setComparisonData] = useState<BranchComparisonItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sync selected branch filter if activeBranchId changes
  useEffect(() => {
    if (activeBranchId) {
      setSelectedBranchFilter(String(activeBranchId));
    } else {
      setSelectedBranchFilter('ALL');
    }
  }, [activeBranchId]);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'SUMMARY_BOOK') {
        let url = `/reports/summary-book?date=${date}`;
        if (selectedBranchFilter && selectedBranchFilter !== 'ALL') {
          url += `&branch_id=${selectedBranchFilter}`;
        }
        const res = await fetchAPI<any>(url);
        if (res.success && res.data) setSummaryData(res.data);
      } else if (activeTab === 'BRANCH_COMPARISON') {
        const res = await fetchAPI<{ business_date: string; branches: BranchComparisonItem[] }>(
          `/reports/branches-comparison?date=${date}`
        );
        if (res.success && res.data && res.data.branches) {
          setComparisonData(res.data.branches);
        }
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, date, selectedBranchFilter]);

  // Aggregate stats for Branch Comparison
  const compTotals = comparisonData.reduce(
    (acc, b) => ({
      totalDonations: acc.totalDonations + Number(b.total_donations || 0),
      totalExpenses: acc.totalExpenses + Number(b.total_expenses || 0),
      cashInflow: acc.cashInflow + Number(b.cash_inflow || 0),
      cashOutflow: acc.cashOutflow + Number(b.cash_outflow || 0),
      netCash: acc.netCash + Number(b.net_cash || 0),
      voucherCount: acc.voucherCount + Number(b.voucher_count || 0),
    }),
    { totalDonations: 0, totalExpenses: 0, cashInflow: 0, cashOutflow: 0, netCash: 0, voucherCount: 0 }
  );

  const licenseWarnings = comparisonData.filter(
    (b) => b.license_status === 'EXPIRING_SOON' || b.license_status === 'EXPIRED'
  );

  const currentBranchLabel = () => {
    if (!isAdmin) {
      return activeBranch?.name || 'Assigned Branch';
    }
    if (selectedBranchFilter === 'ALL') {
      return 'All Branches (Consolidated)';
    }
    const b = branches.find((item) => String(item.id) === selectedBranchFilter);
    return b ? `${b.name} (${b.branch_code})` : 'Selected Branch';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Financial Intelligence & Trust Reports</h2>
          <p className="text-xs text-slate-500">
            Multi-branch summary book ledgers, branch comparisons, bank reconciliation, and cash flow
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadReportData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-1.5" /> Export Report
          </Button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-semibold overflow-x-auto">
        <button
          className={`pb-2.5 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'SUMMARY_BOOK'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('SUMMARY_BOOK')}
        >
          <BarChart3 className="w-4 h-4" /> Daily Summary Book
        </button>

        {isAdmin && (
          <button
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'BRANCH_COMPARISON'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('BRANCH_COMPARISON')}
          >
            <Layers className="w-4 h-4" /> Branch Comparison
          </button>
        )}

        <button
          className={`pb-2.5 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'BANK_RECONCILIATION'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('BANK_RECONCILIATION')}
        >
          <Building2 className="w-4 h-4" /> Bank Reconciliation
        </button>


        <button
          className={`pb-2.5 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'CASH_FLOW'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('CASH_FLOW')}
        >
          <Banknote className="w-4 h-4" /> Cash Flow
        </button>
      </div>

      {/* Tab 1: Daily Summary Book */}
      {activeTab === 'SUMMARY_BOOK' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">Date:</span>
                <input
                  type="date"
                  className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Branch Filter for Admin */}
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-700">Branch Scope:</span>
                  <select
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500"
                    value={selectedBranchFilter}
                    onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  >
                    <option value="ALL">🌐 All Branches (Consolidated)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.branch_code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Branch: {activeBranch?.name || 'Assigned Branch'}</span>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 italic">
              Showing report for: <strong className="text-slate-800 not-italic">{currentBranchLabel()}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <Card className="bg-slate-900 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Collection</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {selectedBranchFilter === 'ALL' ? 'CONSOLIDATED' : 'BRANCH'}
                </span>
              </div>
              <p className="text-3xl font-bold font-mono text-emerald-400 mt-2">
                ₹{(summaryData?.total_collection || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Cash receipts + Bank credits</p>
            </Card>

            <Card className="bg-emerald-50/70 border-emerald-200">
              <span className="text-xs text-emerald-800 font-medium uppercase tracking-wider">Net Cash Receipts</span>
              <p className="text-2xl font-bold font-mono text-emerald-900 mt-2">
                ₹{(summaryData?.net_cash || 0).toLocaleString('en-IN')}
              </p>
              <div className="flex justify-between text-[11px] text-emerald-700/80 mt-1">
                <span>Inflow: ₹{(summaryData?.cash_inflow || 0).toLocaleString('en-IN')}</span>
                <span>Outflow: ₹{(summaryData?.cash_outflow || 0).toLocaleString('en-IN')}</span>
              </div>
            </Card>

            <Card className="bg-blue-50/70 border-blue-200">
              <span className="text-xs text-blue-800 font-medium uppercase tracking-wider">Net Bank Credits</span>
              <p className="text-2xl font-bold font-mono text-blue-900 mt-2">
                ₹{(summaryData?.net_bank || 0).toLocaleString('en-IN')}
              </p>
              <div className="flex justify-between text-[11px] text-blue-700/80 mt-1">
                <span>Credit: ₹{(summaryData?.bank_credit || 0).toLocaleString('en-IN')}</span>
                <span>Debit: ₹{(summaryData?.bank_debit || 0).toLocaleString('en-IN')}</span>
              </div>
            </Card>
          </div>

          <Card title={`Collection Breakdown by Scheme & Category — ${currentBranchLabel()}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">Scheme Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-center">Donations Count</th>
                    <th className="px-4 py-3 text-right">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {!summaryData?.scheme_summary || summaryData.scheme_summary.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No collections recorded for {date} ({currentBranchLabel()})
                      </td>
                    </tr>
                  ) : (
                    summaryData.scheme_summary.map((s: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{s.scheme_name}</td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-semibold">
                            {s.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{s.count}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                          ₹{Number(s.total_amount || 0).toLocaleString('en-IN')}
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

      {/* Tab 2: Branch Comparison (Super Admin feature) */}
      {activeTab === 'BRANCH_COMPARISON' && isAdmin && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Select Date for Comparison:</span>
              <input
                type="date"
                className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="text-xs text-slate-500">
              Comparing metrics across <strong className="text-slate-800">{branches.length} Registered Branches</strong>
            </div>
          </div>

          {/* License Alert Banner if needed */}
          {licenseWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <span className="font-bold">License Attention Required:</span>{' '}
                {licenseWarnings.map((b) => (
                  <span key={b.branch_id} className="inline-block mr-2 font-medium">
                    • {b.branch_name} ({b.license_status === 'EXPIRED' ? 'EXPIRED' : 'Expiring Soon'})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Aggregate KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Card className="bg-slate-900 text-white">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Donations (All)</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1.5">
                ₹{compTotals.totalDonations.toLocaleString('en-IN')}
              </p>
            </Card>
            <Card className="bg-red-50/70 border-red-200">
              <span className="text-xs text-red-800 font-medium uppercase tracking-wider">Total Expenses (All)</span>
              <p className="text-2xl font-bold font-mono text-red-700 mt-1.5">
                ₹{compTotals.totalExpenses.toLocaleString('en-IN')}
              </p>
            </Card>
            <Card className="bg-emerald-50/70 border-emerald-200">
              <span className="text-xs text-emerald-800 font-medium uppercase tracking-wider">Net Cash Position</span>
              <p className="text-2xl font-bold font-mono text-emerald-800 mt-1.5">
                ₹{compTotals.netCash.toLocaleString('en-IN')}
              </p>
            </Card>
            <Card className="bg-indigo-50/70 border-indigo-200">
              <span className="text-xs text-indigo-800 font-medium uppercase tracking-wider">Total Vouchers</span>
              <p className="text-2xl font-bold font-mono text-indigo-900 mt-1.5">
                {compTotals.voucherCount}
              </p>
            </Card>
          </div>

          {/* Branch Comparison Table */}
          <Card title="Comparative Performance by Branch">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">License Status</th>
                    <th className="px-4 py-3 text-right">Donations</th>
                    <th className="px-4 py-3 text-right">Expenses</th>
                    <th className="px-4 py-3 text-right">Cash In</th>
                    <th className="px-4 py-3 text-right">Cash Out</th>
                    <th className="px-4 py-3 text-right">Net Cash</th>
                    <th className="px-4 py-3 text-center">Vouchers</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {comparisonData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No branch data available for comparison.
                      </td>
                    </tr>
                  ) : (
                    comparisonData.map((b) => (
                      <tr
                        key={b.branch_id}
                        className={`hover:bg-slate-50 transition-colors ${
                          activeBranchId === b.branch_id ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {b.branch_name}
                            {activeBranchId === b.branch_id && (
                              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">Code: {b.branch_code}</div>
                        </td>
                        <td className="px-4 py-3">
                          {b.license_status === 'ACTIVE' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          )}
                          {b.license_status === 'EXPIRING_SOON' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> Expiring Soon
                            </span>
                          )}
                          {b.license_status === 'EXPIRED' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                              <ShieldAlert className="w-3 h-3" /> Expired
                            </span>
                          )}
                          {b.license_expiry_date && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Exp: {new Date(b.license_expiry_date).toLocaleDateString('en-IN')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                          ₹{Number(b.total_donations || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-red-700">
                          ₹{Number(b.total_expenses || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">
                          ₹{Number(b.cash_inflow || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">
                          ₹{Number(b.cash_outflow || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          <span className={Number(b.net_cash) >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                            ₹{Number(b.net_cash || 0).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">
                          {b.voucher_count}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 px-2.5"
                            onClick={() => switchBranch(b.branch_id)}
                          >
                            Switch <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {comparisonData.length > 0 && (
                  <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                    <tr>
                      <td className="px-4 py-3" colSpan={2}>
                        CONSOLIDATED TOTALS ({comparisonData.length} Branches)
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-800">
                        ₹{compTotals.totalDonations.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-800">
                        ₹{compTotals.totalExpenses.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800 text-xs">
                        ₹{compTotals.cashInflow.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800 text-xs">
                        ₹{compTotals.cashOutflow.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-900">
                        ₹{compTotals.netCash.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {compTotals.voucherCount}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Bank Reconciliation */}
      {activeTab === 'BANK_RECONCILIATION' && <BankSummary />}


      {/* Tab 5: Cash Flow */}
      {activeTab === 'CASH_FLOW' && <CashSummary />}
    </div>
  );
};
