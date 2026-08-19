import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { ClosingConfirmationModal } from '../components/closing/ClosingConfirmationModal';
import { Save, RefreshCw, AlertCircle, CheckCircle2, Eye, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import { CASH_DENOMINATIONS } from '../constants';
import { isNonNegativeAmount, isInteger, isNotFutureDate } from '../utils/validation';
import type { DenominationItem } from '../types';

const emptyDenoms = () => Object.fromEntries(CASH_DENOMINATIONS.map((v) => [v, 0])) as { [key: number]: number };

export const CashSummary: React.FC = () => {
  const toast = useToast();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedExpenseGroup, setSelectedExpenseGroup] = useState<any>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const [denominations, setDenominations] = useState<{ [key: number]: number }>(emptyDenoms());
  const [denomErrors, setDenomErrors] = useState<Record<number, string | undefined>>({});
  const [savingDenoms, setSavingDenoms] = useState(false);
  const dateError = isNotFutureDate(date, 'Business date');

  const loadSummary = async () => {
    setIsLoading(true);
    const res = await fetchAPI<any>(`/cash/summary?date=${date}`);
    if (res.success && res.data) {
      setSummary(res.data);
      if (res.data.denominations && res.data.denominations.length > 0) {
        const newDenoms = emptyDenoms();
        res.data.denominations.forEach((d: any) => {
          newDenoms[d.denomination_value] = d.quantity;
        });
        setDenominations(newDenoms);
      } else {
        setDenominations(emptyDenoms());
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadSummary();
  }, [date]);

  const totalPhysical = Object.entries(denominations).reduce(
    (acc, [val, qty]) => acc + Number(val) * Number(qty),
    0
  );

  const handleSaveDenominations = async () => {
    const newDenomErrors: Record<number, string | undefined> = {};
    Object.entries(denominations).forEach(([val, qty]) => {
      newDenomErrors[Number(val)] = isNonNegativeAmount(qty, `₹${val} count`) || isInteger(qty, `₹${val} count`);
    });
    if (Object.values(newDenomErrors).some((v) => v !== undefined)) {
      setDenomErrors(newDenomErrors);
      toast.error('Fix the invalid denomination count(s) highlighted below.');
      return;
    }

    const denomArray: DenominationItem[] = Object.entries(denominations)
      .filter(([_, qty]) => qty >= 0)
      .map(([val, qty]) => ({ value: Number(val), quantity: Number(qty) }));

    setSavingDenoms(true);
    const res = await fetchAPI<any>('/cash/denominations', {
      method: 'POST',
      body: JSON.stringify({
        business_date: date,
        denominations: denomArray,
      }),
    });
    setSavingDenoms(false);

    if (res.success) {
      setDenomErrors({});
      toast.success('Physical cash denominations saved.');
      loadSummary();
    } else {
      toast.error(res.error?.message || 'Failed to save denominations');
    }
  };

  const expectedClosing = summary?.expected_closing_cash || 0;
  const difference = totalPhysical - expectedClosing;

  const handleExecuteClosing = async () => {
    const res = await fetchAPI<any>('/closing/execute', {
      method: 'POST',
      body: JSON.stringify({ business_date: date }),
    });
    setShowCloseConfirm(false);
    if (res.success) {
      toast.success(`Business day ${date} successfully CLOSED.`);
      loadSummary();
    } else {
      toast.error(res.error?.message || 'Failed to lock business day');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cash Flow Movement & Aggregated Summary</h2>
          <p className="text-xs text-slate-500">Aggregated daily cash receipts by Scheme/Meal type, underlying transaction drilldown, and denomination verification</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {dateError && <p className="text-[11px] text-rose-600 font-medium mt-1">{dateError}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={loadSummary} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          {summary?.status && <StatusIndicator status={summary.status} />}
          {summary?.status !== 'CLOSED' && (
            <Button variant="primary" size="sm" onClick={() => setShowCloseConfirm(true)}>
              <Lock className="w-4 h-4 mr-1.5" /> Close Day
            </Button>
          )}
        </div>
      </div>

      {summary?.status === 'CLOSED' && (
        <div className="bg-rose-50 border-l-4 border-l-rose-600 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            <div>
              <h4 className="font-bold text-rose-900 text-sm">Business Day is CLOSED &amp; LOCKED</h4>
              <p className="text-xs text-rose-700">Financial entries for {date} are immutable. Only Administrators can submit/approve an Unlock Request.</p>
            </div>
          </div>
          <Lock className="w-5 h-5 text-rose-600" />
        </div>
      )}

      {summary?.status === 'UNLOCKED' && (
        <div className="bg-amber-50 border-l-4 border-l-amber-500 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Unlock className="w-6 h-6 text-amber-600" />
            <div>
              <h4 className="font-bold text-amber-900 text-sm">Business Day UNLOCKED by Admin</h4>
              <p className="text-xs text-amber-700">Corrections allowed for {date}. Re-close once edits are complete.</p>
            </div>
          </div>
        </div>
      )}

      {/* Unified stats strip — matches the Bank Reconciliation page's stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Opening Physical Cash</p>
          <p className="text-xl font-bold font-mono text-white">₹{(summary?.opening_cash || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Cash Inflows</p>
          <p className="text-xl font-bold font-mono text-emerald-400">₹{(summary?.cash_inflow || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Cash Outflows</p>
          <p className="text-xl font-bold font-mono text-rose-400">₹{(summary?.cash_outflow || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Expected Ledger Cash</p>
          <p className="text-xl font-bold font-mono text-emerald-400">₹{expectedClosing.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Credit (donations) and Debit (expenses) breakdowns side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      {/* Aggregated Daily Cash Summary Table (Section 17 of SPEC) */}
      <Card title="Aggregated Cash Summary by Purpose & Meal Type (Spec §17)">
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-emerald-50 text-emerald-800 text-[11px] uppercase tracking-wider border-b border-emerald-100">
              <tr>
                <th className="px-3 py-2">Purpose</th>
                <th className="px-3 py-2">Food Type</th>
                <th className="px-3 py-2">Meal Type</th>
                <th className="px-3 py-2 text-center">Count</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!summary?.scheme_aggregations || summary.scheme_aggregations.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400 italic text-xs">No cash donations recorded for {date}.</td></tr>
              ) : (
                summary.scheme_aggregations.map((grp: any, idx: number) => (
                  <tr key={idx} className="hover:bg-emerald-50/40">
                    <td className="px-3 py-2 text-slate-700 font-medium">{grp.label}</td>
                    <td className="px-3 py-2">
                      {grp.food_type && grp.food_type !== 'NA' ? (
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${grp.food_type === 'VEG' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{grp.food_type}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {grp.meal_type && grp.meal_type !== 'NA' ? (
                        <span className="px-1.5 py-0.5 rounded font-semibold text-[10px] bg-slate-100 text-slate-600">{grp.meal_type}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-slate-500">{grp.count}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">₹{grp.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1" onClick={() => setSelectedGroup(grp)}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {summary?.scheme_aggregations && summary.scheme_aggregations.length > 0 && (
              <tfoot>
                <tr className="bg-emerald-800 text-white text-xs font-bold">
                  <td className="px-3 py-2.5 uppercase tracking-wide" colSpan={4}>Total Cash Inflows</td>
                  <td className="px-3 py-2.5 text-right font-mono">₹{(summary?.cash_inflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Aggregated Cash Outflow (Expenses) by Category — debit-side counterpart of the donation breakdown above */}
      <Card title="Aggregated Cash Outflow by Category">
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-rose-50 text-rose-800 text-[11px] uppercase tracking-wider border-b border-rose-100">
              <tr>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-center">Count</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!summary?.expense_aggregations || summary.expense_aggregations.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400 italic text-xs">No cash expenses recorded for {date}.</td></tr>
              ) : (
                summary.expense_aggregations.map((grp: any, idx: number) => (
                  <tr key={idx} className="hover:bg-rose-50/40">
                    <td className="px-3 py-2 text-slate-700 font-medium">{grp.category}</td>
                    <td className="px-3 py-2 text-center font-mono text-slate-500">{grp.count}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-rose-700">₹{grp.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1" onClick={() => setSelectedExpenseGroup(grp)}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {summary?.expense_aggregations && summary.expense_aggregations.length > 0 && (
              <tfoot>
                <tr className="bg-rose-800 text-white text-xs font-bold">
                  <td className="px-3 py-2.5 uppercase tracking-wide" colSpan={2}>Total Cash Outflows</td>
                  <td className="px-3 py-2.5 text-right font-mono">₹{(summary?.cash_outflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
      </div>

      {/* Denomination Counter Grid */}
      <Card title="Physical Note & Coin Count Grid">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {CASH_DENOMINATIONS.map((val) => (
              <div key={val} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 font-mono">₹{val} Notes</span>
                  <span className="text-[10px] text-slate-400">Total</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  className="w-full px-3 py-1.5 border rounded-lg bg-white text-base font-bold font-mono text-center focus:ring-2 focus:ring-emerald-500"
                  value={denominations[val] || ''}
                  onChange={(e) => {
                    setDenominations({ ...denominations, [val]: parseInt(e.target.value) || 0 });
                    setDenomErrors((prev) => ({ ...prev, [val]: undefined }));
                  }}
                />
                {denomErrors[val] && <p className="text-[10px] text-rose-600 font-medium">{denomErrors[val]}</p>}
                <div className="text-right font-mono text-xs font-bold text-emerald-700">
                  ₹{((denominations[val] || 0) * val).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-xs text-slate-400 font-medium">Physical Cash Total Counted:</span>
              <h4 className="text-3xl font-bold font-mono text-emerald-400">₹{totalPhysical.toLocaleString('en-IN')}</h4>
            </div>

            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${difference === 0 ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'}`}>
                {difference === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>Variance: ₹{difference.toLocaleString('en-IN')} {difference === 0 ? '(Balanced)' : '(Mismatch)'}</span>
              </div>

              <Button variant="primary" size="sm" onClick={handleSaveDenominations} isLoading={savingDenoms} disabled={savingDenoms}>
                <Save className="w-4 h-4 mr-1.5" /> Save Denominations
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Transaction Details Modal (Spec §17 Drilldown) */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedGroup.label}</h3>
                <p className="text-xs text-slate-500">Underlying Transactions ({selectedGroup.count} donations | Total: ₹{selectedGroup.total_amount})</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedGroup(null)}>Close</Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {selectedGroup.donations.map((don: any) => (
                <div key={don.id} className="p-3 bg-slate-50 rounded-lg border flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-emerald-700">{don.donation_number}</span>
                    <p className="font-semibold text-slate-900">{don.donor?.full_name || 'Anonymous'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-slate-500 text-[11px]">{don.purpose}</p>
                      {don.scheme && (
                        <>
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${don.scheme.food_type === 'VEG' ? 'bg-emerald-100 text-emerald-800' : don.scheme.food_type === 'NON_VEG' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'}`}>
                            {don.scheme.food_type}
                          </span>
                          <span className="px-1.5 py-0.5 rounded font-semibold text-[10px] bg-slate-100 text-slate-600">{don.scheme.meal_type}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-sm">₹{don.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCloseConfirm && (
        <ClosingConfirmationModal
          businessDate={date}
          openingCash={summary?.opening_cash || 0}
          cashIn={summary?.cash_inflow || 0}
          cashOut={summary?.cash_outflow || 0}
          expectedCash={summary?.expected_closing_cash || 0}
          physicalCash={summary?.physical_cash_count || 0}
          difference={summary?.cash_difference || 0}
          onConfirm={handleExecuteClosing}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}

      {/* Expense Details Modal (debit-side drilldown) */}
      {selectedExpenseGroup && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedExpenseGroup.category}</h3>
                <p className="text-xs text-slate-500">Underlying Expenses ({selectedExpenseGroup.count} entries | Total: ₹{selectedExpenseGroup.total_amount})</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedExpenseGroup(null)}>Close</Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {selectedExpenseGroup.expenses.map((exp: any) => (
                <div key={exp.id} className="p-3 bg-slate-50 rounded-lg border flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-rose-700">{exp.expense_number}</span>
                    <p className="font-semibold text-slate-900">{exp.payee_name}</p>
                    <p className="text-slate-500 text-[11px]">{exp.description || 'No description'}</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-sm">₹{exp.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
