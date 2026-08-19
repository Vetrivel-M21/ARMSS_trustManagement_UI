import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { fetchAPI, assetUrl } from '../api/client';
import { downloadVoucherPdf } from '../utils/voucherPdf';
import { useAuthedAsset } from '../hooks/useAuthedAsset';
import { ArrowLeft, Printer, Download, Share2, Landmark, CheckCircle2, ThumbsUp } from 'lucide-react';
import type { Voucher } from '../types';

const TRUST_NAME = 'ARMSS CHARITABLE TRUST';
const TRUST_ADDRESS = 'No:281/6B2, First Floor, Mullur, Pudukkottai, 622004, Tamil Nadu';

const fmtAmount = (n: number) => 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });
const fmtDate = (s: string) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-GB').replace(/\//g, '/');
};

export const VoucherView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const res = await fetchAPI<Voucher>(`/vouchers/${id}`);
      if (res.success && res.data) setVoucher(res.data);
      setIsLoading(false);
    };
    load();
  }, [id]);

  const qrUrl = useAuthedAsset(voucher?.bank_account?.qr_code_path ? assetUrl(voucher.bank_account.qr_code_path) : null);

  if (isLoading) {
    return <div className="text-center py-16 text-slate-400 text-sm">Loading voucher...</div>;
  }
  if (!voucher) {
    return <div className="text-center py-16 text-slate-400 text-sm">Voucher not found.</div>;
  }

  const isDonation = voucher.voucher_type === 'DONATION_RECEIPT';
  const particularsMain = voucher.purpose || (isDonation ? 'General Donation' : 'Expense Payment');
  const particularsSub = [voucher.category, voucher.food_type && voucher.food_type !== 'NA' ? voucher.food_type : null, voucher.meal_type && voucher.meal_type !== 'NA' ? voucher.meal_type : null]
    .filter(Boolean)
    .join(' · ');

  const whatsappHref = voucher.donor_phone
    ? `https://wa.me/91${voucher.donor_phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
        `Hello, here is your receipt ${voucher.voucher_number} for ₹${voucher.amount.toLocaleString('en-IN')} from ${TRUST_NAME}. Thank you for your support.`
      )}`
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Toolbar — hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
          <Button variant="primary" size="sm" onClick={() => downloadVoucherPdf(voucher)}>
            <Download className="w-4 h-4 mr-1.5" /> Download PDF
          </Button>
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              <Button variant="primary" size="sm">
                <Share2 className="w-4 h-4 mr-1.5" /> Send to Vendor
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Receipt card */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
        {/* Green header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-5 flex items-center gap-4">
          <div className="bg-white rounded-lg p-1.5 w-16 h-16 shrink-0 flex items-center justify-center">
            <img src="/trust-logo.png" alt="Trust Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-white">
            <h1 className="text-lg font-extrabold tracking-wide">{TRUST_NAME}</h1>
            <p className="text-xs text-emerald-50 mt-0.5">{TRUST_ADDRESS}</p>
          </div>
        </div>

        {/* Date / Invoice No */}
        <div className="grid grid-cols-2 border-b border-slate-100">
          <div className="px-6 py-3 border-r border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Date</p>
            <p className="font-bold text-slate-900 text-sm">{fmtDate(voucher.business_date)}</p>
          </div>
          <div className="px-6 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Invoice No</p>
            <p className="font-bold text-emerald-700 text-sm font-mono">{voucher.voucher_number}</p>
          </div>
        </div>

        {/* Received From / Paid To */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{isDonation ? 'Received From / Donor' : 'Paid To / Vendor'}</p>
            <p className="font-bold text-slate-900 text-sm">{voucher.payee_or_donor_name}</p>
          </div>
        </div>

        {/* Particulars table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-white text-[11px] uppercase tracking-wide">
              <th className="px-4 py-2 text-left w-12">SL</th>
              <th className="px-4 py-2 text-left">Particulars</th>
              <th className="px-4 py-2 text-right">Amount (Rs)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-4 py-4 align-top text-slate-500">1</td>
              <td className="px-4 py-4">
                <p className="font-bold text-emerald-700">{particularsMain}</p>
                {particularsSub && <p className="text-xs font-semibold text-slate-600 mt-0.5">{particularsSub}</p>}
                {voucher.reference_number && <p className="text-[11px] text-slate-400 mt-1">Ref: {voucher.reference_number}</p>}
              </td>
              <td className="px-4 py-4 align-top text-right font-bold text-slate-900">{fmtAmount(voucher.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="px-6 py-3 space-y-1 border-b border-slate-100">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Total Amount</span>
            <span className="font-mono font-semibold text-emerald-700">{fmtAmount(voucher.amount)}</span>
          </div>
        </div>
        <div className="bg-slate-800 text-white px-6 py-2.5 flex justify-between font-bold text-sm">
          <span>Total Cost</span>
          <span className="font-mono">{fmtAmount(voucher.amount)}</span>
        </div>

        {/* Amount in words */}
        <div className="bg-amber-50 px-6 py-2.5 text-xs text-amber-900 border-b border-amber-100">
          <strong>Amount in Words:</strong> {voucher.amount_in_words}
        </div>

        {/* Footer: payment details | QR | signatory */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="p-4 space-y-1.5 text-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5" /> Payment Details
            </p>
            <p className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> {voucher.payment_mode === 'CASH' ? 'Cash Payment Received' : 'Bank Transfer Received'}
            </p>
            <p className="flex items-center gap-1.5 text-amber-600 font-medium">
              <ThumbsUp className="w-3.5 h-3.5" /> Thanks for Your Support
            </p>
          </div>

          <div className="p-4 flex flex-col items-center justify-center gap-2">
            {voucher.bank_account?.qr_code_path && qrUrl ? (
              <>
                <img src={qrUrl} alt="Payment QR" className="w-28 h-28 object-contain border rounded-lg" />
                <Button variant="primary" size="sm" className="w-full" onClick={() => window.open(qrUrl, '_blank')}>
                  <Share2 className="w-3.5 h-3.5 mr-1" /> Share QR Code
                </Button>
              </>
            ) : (
              <p className="text-[11px] text-slate-400 italic text-center">No QR code on file for this account</p>
            )}
          </div>

          <div className="p-4 text-xs text-right space-y-8">
            <p className="font-bold text-slate-800">For: {TRUST_NAME}</p>
            <div>
              <div className="border-t border-slate-300 pt-1 inline-block min-w-[120px]">
                <span className="text-slate-500">Authorized Signatory</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 text-white text-center text-xs py-2.5">
          Thank you for choosing <strong>{TRUST_NAME}</strong> — we appreciate your support!
        </div>
      </div>
    </div>
  );
};
