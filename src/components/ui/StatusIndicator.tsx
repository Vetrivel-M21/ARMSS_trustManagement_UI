import React from 'react';
import { clsx } from 'clsx';
import { Lock, Unlock, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'OPEN' | 'READY_TO_CLOSE' | 'CLOSED' | 'UNLOCKED' | 'REQUIRES_CORRECTION';
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, className }) => {
  const configs = {
    OPEN: {
      label: 'OPEN',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Clock,
    },
    READY_TO_CLOSE: {
      label: 'READY TO CLOSE',
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: CheckCircle2,
    },
    CLOSED: {
      label: 'CLOSED',
      bg: 'bg-slate-100 text-slate-800 border-slate-300 font-bold',
      icon: Lock,
    },
    UNLOCKED: {
      label: 'UNLOCKED',
      bg: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
      icon: Unlock,
    },
    REQUIRES_CORRECTION: {
      label: 'REQUIRES CORRECTION',
      bg: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
      icon: AlertTriangle,
    },
  };

  const config = configs[status] || configs.OPEN;
  const Icon = config.icon;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold uppercase tracking-wider',
        config.bg,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};
