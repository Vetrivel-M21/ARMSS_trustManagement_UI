import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { BankAccount } from '../types';
import {
  Banknote,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Lock,
  PlusCircle,
  FileText,
} from 'lucide-react';

const fmt = (n: number | undefined | null) => '₹' + (n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export const Dashboard: React.FC = () => {
  const toast = useToast();
  const todayIST = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const today = new Date().toISOString().split('T')[0];

  const [cashSummary, setCashSummary] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDashboard = async () => {
    setIsLoading(true);
    const [cashRes, bankRes] = await Promise.all([
      fetchAPI<any>(`/cash/summary?date=${today}`),
      fetchAPI<BankAccount[]>('/bank-accounts/active'),
    ]);
    if (cashRes.success && cashRes.data) setCashSummary(cashRes.data);
    else toast.error(cashRes.error?.message || 'Failed to load today\'s cash summary');
    if (bankRes.success && bankRes.data) setBankAccounts(bankRes.data);
    else toast.error(bankRes.error?.message || 'Failed to load bank accounts');
    setIsLoading(false);
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const donationCount = (cashSummary?.scheme_aggregations ?? []).reduce((sum: number, g: any) => sum + (g.count ?? 0), 0);
  const expenseCount = (cashSummary?.expense_aggregations ?? []).reduce((sum: number, g: any) => sum + (g.count ?? 0), 0);
  const totalBankAssets = bankAccounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>{todayIST} (IST)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Trust Financial Overview</h2>
        </div>

        <div className="flex items-center gap-3">
          {cashSummary?.status && <StatusIndicator status={cashSummary.status} />}
          <Link to="/reports?tab=CASH_FLOW">
            <Button variant="primary" size="sm">
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Daily Closing
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Opening Cash</span>
            <Banknote className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{isLoading ? '—' : fmt(cashSummary?.opening_cash)}</p>
          <p className="text-xs text-slate-500 mt-1">Previous day closing balance</p>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash Receipts</span>
            <ArrowDownLeft className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">{isLoading ? '—' : fmt(cashSummary?.cash_inflow)}</p>
          <p className="text-xs text-slate-500 mt-1">{donationCount} donation{donationCount === 1 ? '' : 's'} today</p>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash Expenses</span>
            <ArrowUpRight className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">{isLoading ? '—' : fmt(cashSummary?.cash_outflow)}</p>
          <p className="text-xs text-slate-500 mt-1">{expenseCount} expense{expenseCount === 1 ? '' : 's'} recorded</p>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 bg-indigo-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">Expected Cash</span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">Reconciled</span>
          </div>
          <p className="text-2xl font-bold text-indigo-950 mt-2">{isLoading ? '—' : fmt(cashSummary?.expected_closing_cash)}</p>
          <p className="text-xs text-indigo-700 mt-1">Opening + Receipts - Expenses</p>
        </Card>
      </div>

      {/* Bank & Total Asset Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Bank Account Summary" subtitle="Reconciled Trust Accounts" className="lg:col-span-2">
          <div className="space-y-3">
            {!isLoading && bankAccounts.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs">No active bank accounts configured</p>
            ) : (
              bankAccounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{a.bank_name}</p>
                      <p className="text-xs text-slate-500">{a.account_number_masked} | {a.branch}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-900">{fmt(a.current_balance)}</p>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">Active</span>
                  </div>
                </div>
              ))
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
              <span>Total Bank Assets:</span>
              <span>{isLoading ? '—' : fmt(totalBankAssets)}</span>
            </div>
          </div>
        </Card>

        {/* Quick Actions Card */}
        <Card title="Quick Office Actions" subtitle="Fast Transaction Entry">
          <div className="space-y-2.5">
            <Link to="/donations" className="block">
              <Button variant="outline" className="w-full justify-start text-left py-2.5">
                <PlusCircle className="w-4 h-4 mr-2 text-emerald-600" />
                New Donation Record
              </Button>
            </Link>

            <Link to="/donors" className="block">
              <Button variant="outline" className="w-full justify-start text-left py-2.5">
                <PlusCircle className="w-4 h-4 mr-2 text-blue-600" />
                Add New Donor Profile
              </Button>
            </Link>

            <Link to="/vouchers" className="block">
              <Button variant="outline" className="w-full justify-start text-left py-2.5">
                <FileText className="w-4 h-4 mr-2 text-indigo-600" />
                Print Vouchers & Receipts
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
