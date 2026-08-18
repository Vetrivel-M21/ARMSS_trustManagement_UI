import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { fetchAPI, assetUrl } from '../api/client';
import type { BankAccount, BankTransaction } from '../types';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Eye } from 'lucide-react';
import { Button } from '../components/ui/Button';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

export const BankTransactions: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedId, setSelectedId] = useState<number>(0);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTx, setSelectedTx] = useState<{ tx: BankTransaction; type: 'CREDIT' | 'DEBIT' } | null>(null);

  useEffect(() => {
    fetchAPI<BankAccount[]>('/bank-accounts/active').then((res) => {
      if (res.success && res.data) {
        setAccounts(res.data);
        if (res.data.length > 0) setSelectedId(res.data[0].id);
      }
    });
  }, []);

  const loadTransactions = async (id: number) => {
    if (!id) return;
    setIsLoading(true);
    const res = await fetchAPI<BankTransaction[]>(`/bank-accounts/${id}/transactions`);
    if (res.success && res.data) setTransactions(res.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTransactions(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selectedAccount = accounts.find((a) => a.id === selectedId);
  const filteredTransactions = transactions.filter((t) => {
    const d = String(t.business_date).substring(0, 10);
    return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
  });
  const credits = filteredTransactions.filter((t) => t.transaction_type === 'CREDIT');
  const debits = filteredTransactions.filter((t) => t.transaction_type === 'DEBIT');
  const totalCredits = credits.reduce((s, t) => s + t.amount, 0);
  const totalDebits = debits.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Bank Transactions Ledger</h2>
          <p className="text-xs text-slate-500">Full credit/debit history for a single bank account</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 min-w-[220px]"
            value={selectedId}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name}</option>
            ))}
          </select>
          <input
            type="date"
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From date"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            title="To date"
          />
          {(dateFrom || dateTo) && (
            <Button variant="outline" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear Dates</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => loadTransactions(selectedId)} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {selectedAccount && (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
          <div>
            <p className="font-semibold text-slate-800">{selectedAccount.bank_name} · {selectedAccount.account_name}</p>
            <p className="text-xs text-slate-400">{selectedAccount.account_number_masked} · {selectedAccount.ifsc_code}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Current Balance</p>
            <p className="font-mono font-bold text-lg text-slate-900">{fmt(selectedAccount.current_balance)}</p>
          </div>
        </div>
      )}

      <Card title={`Credits (Fund In) — ${credits.length} entries`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-emerald-50 text-emerald-800 text-xs uppercase tracking-wider border-b border-emerald-100">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Reason (Category)</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {credits.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">{isLoading ? 'Loading transactions...' : 'No credit entries for this account'}</td></tr>
              ) : (
                credits.map((t) => (
                  <tr key={t.id} className="hover:bg-emerald-50/40">
                    <td className="px-4 py-3 text-xs text-slate-500">{String(t.business_date).substring(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 bg-emerald-50 text-emerald-700">
                        <ArrowDownCircle className="w-3 h-3" /> {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{t.reference_number || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{t.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{fmt(t.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1" onClick={() => setSelectedTx({ tx: t, type: 'CREDIT' })}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {credits.length > 0 && (
              <tfoot>
                <tr className="bg-emerald-800 text-white text-xs font-bold">
                  <td colSpan={4} className="px-4 py-2.5 uppercase tracking-wide">Total Credits</td>
                  <td className="px-4 py-2.5 text-right font-mono">{fmt(totalCredits)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <Card title={`Debits (Fund Out) — ${debits.length} entries`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-rose-50 text-rose-800 text-xs uppercase tracking-wider border-b border-rose-100">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Reason (Category)</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {debits.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">{isLoading ? 'Loading transactions...' : 'No debit entries for this account'}</td></tr>
              ) : (
                debits.map((t) => (
                  <tr key={t.id} className="hover:bg-rose-50/40">
                    <td className="px-4 py-3 text-xs text-slate-500">{String(t.business_date).substring(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 bg-rose-50 text-rose-700">
                        <ArrowUpCircle className="w-3 h-3" /> {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{t.reference_number || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{t.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">{fmt(t.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1" onClick={() => setSelectedTx({ tx: t, type: 'DEBIT' })}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {debits.length > 0 && (
              <tfoot>
                <tr className="bg-rose-800 text-white text-xs font-bold">
                  <td colSpan={4} className="px-4 py-2.5 uppercase tracking-wide">Total Debits</td>
                  <td className="px-4 py-2.5 text-right font-mono">{fmt(totalDebits)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Transaction Details — who gave/paid, why, and when, behind one ledger row */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedTx.type === 'CREDIT' ? (selectedTx.tx.donor_name || 'Transaction Details') : (selectedTx.tx.payee_name || 'Transaction Details')}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedTx.tx.donation_number || selectedTx.tx.expense_number || `Ledger Entry #${selectedTx.tx.id}`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedTx(null)}>Close</Button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-900">{String(selectedTx.tx.business_date).substring(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category</span>
                <span className="font-semibold text-slate-900">{selectedTx.tx.category}</span>
              </div>
              {selectedTx.tx.donor_phone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone</span>
                  <span className="font-mono text-slate-900">{selectedTx.tx.donor_phone}</span>
                </div>
              )}
              {(selectedTx.tx.purpose || selectedTx.tx.description) && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 shrink-0">Purpose</span>
                  <span className="font-medium text-slate-900 text-right">{selectedTx.tx.purpose || selectedTx.tx.description}</span>
                </div>
              )}
              {selectedTx.tx.scheme_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheme</span>
                  <span className="font-medium text-slate-900">{selectedTx.tx.scheme_name}</span>
                </div>
              )}
              {selectedTx.tx.food_type && selectedTx.tx.food_type !== 'NA' && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Food / Meal Type</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${selectedTx.tx.food_type === 'VEG' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{selectedTx.tx.food_type}</span>
                    {selectedTx.tx.meal_type && selectedTx.tx.meal_type !== 'NA' && (
                      <span className="px-1.5 py-0.5 rounded font-semibold text-[10px] bg-slate-100 text-slate-600">{selectedTx.tx.meal_type}</span>
                    )}
                  </span>
                </div>
              )}
              {selectedTx.tx.reference_number && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference No.</span>
                  <span className="font-mono text-slate-900">{selectedTx.tx.reference_number}</span>
                </div>
              )}
              {selectedTx.tx.attachment_path && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Attachment</span>
                  <a href={assetUrl(selectedTx.tx.attachment_path)} target="_blank" rel="noreferrer" className="text-emerald-700 font-semibold hover:underline">View File</a>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="text-slate-500 font-semibold">Amount</span>
                <span className={`font-mono font-bold text-base ${selectedTx.type === 'CREDIT' ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(selectedTx.tx.amount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
