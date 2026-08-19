import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  requireReason?: boolean;
  confirmDisabled?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

/** Modal confirmation replacing window.confirm()/prompt(). When requireReason
 * is set, the confirm action is disabled until a non-empty reason is entered
 * (used for admin actions that must be auditable, e.g. unlock requests). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  requireReason = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const disabled = confirmDisabled || (requireReason && reason.trim() === '');

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 rounded-full p-2 ${variant === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <div className="text-sm text-slate-600 mt-1">{message}</div>
          </div>
        </div>

        {requireReason && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason (required)</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this action is being taken..."
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onCancel}>{cancelLabel}</Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            disabled={disabled}
            onClick={() => onConfirm(requireReason ? reason.trim() : undefined)}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
