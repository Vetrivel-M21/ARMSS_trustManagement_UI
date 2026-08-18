import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  HeartHandshake,
  Receipt,
  FileCheck2,
  BarChart3,
  Unlock,
  Layers,
  ListOrdered,
  UserCog,
  Calendar,
  Tag,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/donors', label: 'Donors & Family', icon: Users },
    { to: '/schemes', label: 'Scheme Configuration', icon: Layers },
    { to: '/donations', label: 'Donations', icon: HeartHandshake },
    { to: '/bank/transactions', label: 'Bank Transactions Ledger', icon: ListOrdered },
    { to: '/expenses', label: 'Expenses', icon: Receipt },
    { to: '/vouchers', label: 'Vouchers & Receipts', icon: FileCheck2 },
    { to: '/reports', label: 'Reports & Comparison', icon: BarChart3 },
    { to: '/donor-summary', label: 'Donor Summary', icon: Calendar },
    ...(isAdmin ? [{ to: '/admin/unlock', label: 'Admin Unlock & Audit', icon: Unlock }] : []),
    ...(isAdmin ? [{ to: '/admin/users', label: 'User Management', icon: UserCog }] : []),
    ...(isAdmin ? [{ to: '/admin/expense-categories', label: 'Expense Categories', icon: Tag }] : []),
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 sticky top-[61px] h-[calc(100vh-61px)] overflow-y-auto p-4 flex flex-col border-r border-slate-800 shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Core Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="mt-auto pt-6 border-t border-slate-800/80 px-3">
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/60 text-xs">
          <p className="font-semibold text-slate-200">Financial Integrity Status</p>
          <p className="text-emerald-400 mt-0.5 text-[11px]">✓ Closed-Day Protection Active</p>
        </div>
      </div>
    </aside>
  );
};
