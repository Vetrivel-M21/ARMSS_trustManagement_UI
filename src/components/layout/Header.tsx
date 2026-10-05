import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { LogOut, Clock, Menu, Building2, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarOpen, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { branches, activeBranch, activeBranchId, switchBranch, licenseAlerts } = useBranch();
  const isAdmin = user?.role === 'ADMIN';

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
        <img
          src="/trust-logo.png"
          alt="Trust Logo"
          className="w-10 h-10 rounded-full object-cover bg-white p-0.5 shadow-md border border-slate-700 shrink-0"
        />
        <div>
          <h1 className="font-bold text-base tracking-wide text-slate-100 leading-tight">
            NESAKKARAM TRUST
          </h1>
          <p className="text-xs text-emerald-400 font-medium">Donation Accounting & Daily Closing Ledger</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Branch Switcher (Admin) or Branch Badge (Staff) */}
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 transition-colors">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <select
                value={activeBranchId || 'ALL'}
                onChange={(e) => switchBranch(e.target.value === 'ALL' ? null : Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer pr-1"
                title="Switch active branch view"
              >
                <option value="ALL" className="bg-slate-900 text-white">🌐 All Branches (Consolidated)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    🏢 {b.name} ({b.branch_code})
                  </option>
                ))}
              </select>
            </div>

            {licenseAlerts.length > 0 && (
              <div
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium"
                title="Branches with license expiry/renewal due soon"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{licenseAlerts.length} Renewal Alert{licenseAlerts.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-700/60 rounded-lg px-3 py-1.5 text-xs text-emerald-200">
            <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{activeBranch?.name || user?.branch_name || 'Branch Workspace'}</span>
            <span className="text-[10px] text-emerald-300 font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-900/80 border border-emerald-700/50">
              {activeBranch?.branch_code || user?.branch_code || 'MAIN'}
            </span>
          </div>
        )}

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
