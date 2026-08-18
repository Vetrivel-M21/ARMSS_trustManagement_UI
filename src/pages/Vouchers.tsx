import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download, RefreshCw, Eye, FileText } from 'lucide-react';
import { fetchAPI } from '../api/client';
import { downloadVoucherPdf } from '../utils/voucherPdf';
import type { Voucher } from '../types';

export const Vouchers: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [filterType, setFilterType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  const loadVouchers = async () => {
    setIsLoading(true);
    const res = await fetchAPI<Voucher[]>(`/vouchers?type=${filterType}`);
    if (res.success && res.data) {
      setVouchers(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadVouchers();
  }, [filterType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Official Voucher & Receipt Register</h2>
          <p className="text-xs text-slate-500">Immutable record of issued donation receipts and expense payment vouchers</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Voucher Types</option>
            <option value="DONATION_RECEIPT">Donation Receipts</option>
            <option value="EXPENSE_VOUCHER">Expense Vouchers</option>
          </select>
          <Button variant="outline" size="sm" onClick={loadVouchers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Voucher No</th>
                <th className="px-4 py-3">Voucher Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Payee / Donor Name</th>
                <th className="px-4 py-3">Payment Mode</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                    {isLoading ? 'Loading vouchers...' : 'No vouchers recorded'}
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700">{v.voucher_number}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${v.voucher_type === 'DONATION_RECEIPT' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {v.voucher_type === 'DONATION_RECEIPT' ? 'Donation Receipt' : 'Expense Voucher'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{v.business_date ? String(v.business_date).substring(0, 10) : ''}</td>
                    <td className="px-4 py-3 font-medium">{v.payee_or_donor_name}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">{v.payment_mode}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setSelectedVoucher(v)}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Quick View
                        </Button>
                        <Link to={`/vouchers/${v.id}`}>
                          <Button variant="primary" size="sm">
                            <FileText className="w-3.5 h-3.5 mr-1" /> Open Receipt
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Voucher Detail Print Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border-t-8 border-t-emerald-600">
            <div className="text-center border-b pb-4">
              <h3 className="font-bold text-lg text-slate-900">
                {selectedVoucher.voucher_type === 'DONATION_RECEIPT' ? 'TRUST DONATION RECEIPT' : 'EXPENSE PAYMENT VOUCHER'}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedVoucher.voucher_number}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Business Date:</span>
                <span className="font-semibold text-slate-900">{selectedVoucher.business_date ? String(selectedVoucher.business_date).substring(0, 10) : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{selectedVoucher.voucher_type === 'DONATION_RECEIPT' ? 'Received From:' : 'Paid To:'}</span>
                <span className="font-bold text-slate-900">{selectedVoucher.payee_or_donor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold text-slate-900">{selectedVoucher.payment_mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Voucher Amount:</span>
                <span className="font-mono font-bold text-emerald-700 text-base">₹{selectedVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border text-[11px] font-medium text-slate-700">
                Amount in Words: <br />
                <span className="italic font-serif text-slate-900">{selectedVoucher.amount_in_words}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => downloadVoucherPdf(selectedVoucher)}>
                <Download className="w-4 h-4 mr-1" /> Download PDF
              </Button>
              <Button variant="primary" size="sm" onClick={() => setSelectedVoucher(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
