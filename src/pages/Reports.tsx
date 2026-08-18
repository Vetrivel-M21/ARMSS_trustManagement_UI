import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BarChart3, Download, RefreshCw, Building2, Banknote } from 'lucide-react';
import { fetchAPI } from '../api/client';
import { BankSummary } from './BankSummary';
import { CashSummary } from './CashSummary';

export const Reports: React.FC = () => {
  type ReportTab = 'SUMMARY_BOOK' | 'BANK_RECONCILIATION' | 'CASH_FLOW';
  const VALID_TABS: ReportTab[] = ['SUMMARY_BOOK', 'BANK_RECONCILIATION', 'CASH_FLOW'];
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as ReportTab | null;
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'SUMMARY_BOOK');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadReportData = async () => {
    setIsLoading(true);
    if (activeTab === 'SUMMARY_BOOK') {
      const res = await fetchAPI<any>(`/reports/summary-book?date=${date}`);
      if (res.success && res.data) setSummaryData(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, date]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Financial Intelligence & Trust Reports</h2>
          <p className="text-xs text-slate-500">Summary book ledgers, bank reconciliation, and cash flow</p>
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
      <div className="flex border-b border-slate-200 gap-4 text-sm font-semibold">
        <button
          className={`pb-2 flex items-center gap-1.5 border-b-2 ${activeTab === 'SUMMARY_BOOK' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('SUMMARY_BOOK')}
        >
          <BarChart3 className="w-4 h-4" /> Daily Summary Book
        </button>
        <button
          className={`pb-2 flex items-center gap-1.5 border-b-2 ${activeTab === 'BANK_RECONCILIATION' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('BANK_RECONCILIATION')}
        >
          <Building2 className="w-4 h-4" /> Bank Reconciliation
        </button>
        <button
          className={`pb-2 flex items-center gap-1.5 border-b-2 ${activeTab === 'CASH_FLOW' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('CASH_FLOW')}
        >
          <Banknote className="w-4 h-4" /> Cash Flow
        </button>
      </div>

      {/* Tab 1: Daily Summary Book */}
      {activeTab === 'SUMMARY_BOOK' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Select Date:</span>
            <input
              type="date"
              className="px-3 py-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <Card className="bg-slate-900 text-white">
              <span className="text-xs text-slate-400 font-medium uppercase">Total Daily Collection</span>
              <p className="text-3xl font-bold font-mono text-emerald-400 mt-1">₹{(summaryData?.total_collection || 0).toLocaleString('en-IN')}</p>
            </Card>
            <Card className="bg-emerald-50/70 border-emerald-200">
              <span className="text-xs text-emerald-800 font-medium uppercase">Net Cash Receipts</span>
              <p className="text-2xl font-bold font-mono text-emerald-900 mt-1">₹{(summaryData?.net_cash || 0).toLocaleString('en-IN')}</p>
            </Card>
            <Card className="bg-blue-50/70 border-blue-200">
              <span className="text-xs text-blue-800 font-medium uppercase">Net Bank Credits</span>
              <p className="text-2xl font-bold font-mono text-blue-900 mt-1">₹{(summaryData?.net_bank || 0).toLocaleString('en-IN')}</p>
            </Card>
          </div>

          <Card title="Daily Collection Breakdown by Scheme & Category">
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
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-xs">No collections recorded for {date}</td>
                    </tr>
                  ) : (
                    summaryData.scheme_summary.map((s: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{s.scheme_name}</td>
                        <td className="px-4 py-3"><span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-semibold">{s.category}</span></td>
                        <td className="px-4 py-3 text-center font-mono">{s.count}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">₹{s.total_amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Bank Reconciliation (embedded, self-contained page) */}
      {activeTab === 'BANK_RECONCILIATION' && <BankSummary />}

      {/* Tab 3: Cash Flow (embedded, self-contained page) */}
      {activeTab === 'CASH_FLOW' && <CashSummary />}
    </div>
  );
};
