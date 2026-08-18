import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '../ui/Button';

interface ClosingConfirmationModalProps {
  businessDate: string;
  openingCash: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  physicalCash: number;
  difference: number;
  pendingIssues?: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

/** Closing confirmation dialog matching spec section 53 exactly: business date,
 * opening, in, out, expected, physical, difference, pending issues, and a
 * required acknowledgement checkbox gating the final close action. */
export const ClosingConfirmationModal: React.FC<ClosingConfirmationModalProps> = ({
  businessDate, openingCash, cashIn, cashOut, expectedCash, physicalCash, difference,
  pendingIssues = [], onConfirm, onCancel,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const isBalanced = difference === 0;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <Lock className="w-5 h-5 text-slate-700" />
          <h3 className="text-lg font-bold text-slate-900">Confirm Daily Closing — {businessDate}</h3>
        </div>

        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            <tr><td className="py-1.5 text-slate-500">Opening Cash</td><td className="py-1.5 text-right font-mono">{fmt(openingCash)}</td></tr>
            <tr><td className="py-1.5 text-slate-500">Cash In</td><td className="py-1.5 text-right font-mono text-emerald-700">{fmt(cashIn)}</td></tr>
            <tr><td className="py-1.5 text-slate-500">Cash Out</td><td className="py-1.5 text-right font-mono text-rose-700">{fmt(cashOut)}</td></tr>
            <tr className="font-semibold"><td className="py-1.5 text-slate-700">Expected Cash</td><td className="py-1.5 text-right font-mono">{fmt(expectedCash)}</td></tr>
            <tr className="font-semibold"><td className="py-1.5 text-slate-700">Physical Cash Counted</td><td className="py-1.5 text-right font-mono">{fmt(physicalCash)}</td></tr>
            <tr className="font-bold">
              <td className="py-1.5 text-slate-900">Difference</td>
              <td className={`py-1.5 text-right font-mono ${isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(difference)}</td>
            </tr>
          </tbody>
        </table>

        {!isBalanced && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Physical and expected cash do not match. Closing will be rejected by the server until this difference is resolved.</span>
          </div>
        )}

        {pendingIssues.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            <p className="font-semibold mb-1">Pending Issues</p>
            <ul className="list-disc list-inside space-y-0.5">
              {pendingIssues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          </div>
        )}

        <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
          <span>I confirm that the physical cash and system balance have been verified.</span>
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" disabled={!acknowledged} onClick={onConfirm}>
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Close Day
          </Button>
        </div>
      </div>
    </div>
  );
};
