import React from 'react';
import { Card } from '../components/ui/Card';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
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

export const Dashboard: React.FC = () => {
  const todayIST = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
          <StatusIndicator status="OPEN" />
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
          <p className="text-2xl font-bold text-slate-900 mt-2">₹50,000.00</p>
          <p className="text-xs text-slate-500 mt-1">Previous day closing balance</p>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash Receipts</span>
            <ArrowDownLeft className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">₹25,000.00</p>
          <p className="text-xs text-slate-500 mt-1">5 donations today</p>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash Expenses</span>
            <ArrowUpRight className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">₹5,000.00</p>
          <p className="text-xs text-slate-500 mt-1">2 expenses recorded</p>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 bg-indigo-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">Expected Cash</span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">Reconciled</span>
          </div>
          <p className="text-2xl font-bold text-indigo-950 mt-2">₹70,000.00</p>
          <p className="text-xs text-indigo-700 mt-1">Opening + Receipts - Expenses</p>
        </Card>
      </div>

      {/* Bank & Total Asset Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Bank Account Summary" subtitle="Reconciled Trust Accounts" className="lg:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-semibold text-sm text-slate-800">State Bank of India (SBI)</p>
                  <p className="text-xs text-slate-500">**** **** 4892 | Main Branch</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-slate-900">₹2,50,000.00</p>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">Active</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-semibold text-sm text-slate-800">HDFC Bank</p>
                  <p className="text-xs text-slate-500">**** **** 9102 | Central Market</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-slate-900">₹1,50,000.00</p>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">Active</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
              <span>Total Bank Assets:</span>
              <span>₹4,00,000.00</span>
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
