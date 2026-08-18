import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Clock, Menu } from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarOpen, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const todayIST = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-inner">
          TM
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wide text-slate-100 leading-tight">
            TRUST MANAGEMENT SYSTEM
          </h1>
          <p className="text-xs text-emerald-400 font-medium">Donation Accounting & Daily Closing Ledger</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700 text-xs text-slate-300">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Business Date: <strong>{todayIST} (IST)</strong></span>
        </div>

        <div className="flex items-center gap-3 border-l border-slate-700 pl-4">
          <div className="flex flex-col text-right">
            <span className="text-sm font-semibold text-slate-200">{user?.full_name}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 self-end">
              {user?.role}
            </span>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-300 text-slate-400 transition-colors border border-slate-700"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
