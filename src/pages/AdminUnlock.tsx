import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Unlock, RefreshCw } from 'lucide-react';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { UnlockRequest, AuditLog } from '../types';

export const AdminUnlock: React.FC = () => {
  const toast = useToast();
  const [requests, setRequests] = useState<UnlockRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ id: number; status: 'APPROVED' | 'REJECTED' } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const [dateToUnlock, setDateToUnlock] = useState(() => new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const [reqRes, auditRes] = await Promise.all([
      fetchAPI<UnlockRequest[]>('/unlock-requests'),
      fetchAPI<AuditLog[]>('/audit-logs'),
    ]);

    if (reqRes.success && reqRes.data) setRequests(reqRes.data);
    if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetchAPI<UnlockRequest>('/unlock-requests', {
      method: 'POST',
      body: JSON.stringify({
        business_date: dateToUnlock,
        reason,
      }),
    });

    if (res.success) {
      setShowSubmitModal(false);
      setReason('');
      toast.success('Unlock request submitted for Admin review.');
      loadData();
    } else {
      toast.error(res.error?.message || 'Failed to submit unlock request');
    }
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    const res = await fetchAPI<UnlockRequest>(`/unlock-requests/${reviewTarget.id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status: reviewTarget.status, review_notes: reviewNotes }),
    });

    if (res.success) {
      toast.success(`Unlock request ${reviewTarget.status.toLowerCase()}.`);
      setReviewTarget(null);
      setReviewNotes('');
      loadData();
    } else {
      toast.error(res.error?.message || 'Failed to review unlock request');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Admin Unlock Requests & Audit Logs</h2>
          <p className="text-xs text-slate-500">Staff unlock authorization requests for closed business dates and immutable audit trail</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowSubmitModal(true)}>
            <Unlock className="w-4 h-4 mr-1.5" /> Submit Unlock Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unlock Requests Section */}
        <Card title="Closed Day Unlock Requests">
          <div className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs">No unlock requests found</p>
            ) : (
              requests.map((r) => (
                <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${r.entity_type === 'BANK_DAY' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'}`}>
                        {r.entity_type === 'BANK_DAY' ? 'Bank Account' : 'Cash Day'}
                      </span>
                      <span className="font-mono font-bold text-slate-900">{r.business_date ? String(r.business_date).substring(0, 10) : ''}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${r.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {r.status}
                    </span>
                  </div>

                  {r.entity_type === 'BANK_DAY' && r.bank_account && (
                    <p className="text-xs text-slate-600">Account: <span className="font-semibold">{r.bank_account.bank_name} · {r.bank_account.account_name}</span></p>
                  )}

                  <p className="text-xs text-slate-700 font-medium">Reason: {r.request_reason}</p>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t">
                    <span>Requested by: {r.requested_by_user?.full_name || 'Staff'}</span>
                    {r.status === 'PENDING' && (
                      <div className="flex gap-1">
                        <button onClick={() => setReviewTarget({ id: r.id, status: 'APPROVED' })} className="bg-emerald-600 text-white px-2 py-1 rounded font-semibold hover:bg-emerald-700">Approve</button>
                        <button onClick={() => setReviewTarget({ id: r.id, status: 'REJECTED' })} className="bg-rose-600 text-white px-2 py-1 rounded font-semibold hover:bg-rose-700">Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Immutable Audit Logs Section */}
        <Card title="System Audit Logs & Security History">
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs">No audit logs recorded</p>
            ) : (
              auditLogs.map((a) => (
                <div key={a.id} className="p-2.5 bg-slate-50 rounded-lg border text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-700">{a.action}</span>
                    <span className="text-[10px] text-slate-400">{a.created_at ? String(a.created_at).substring(0, 19).replace('T', ' ') : ''}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{a.reason}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-600" /> Submit Unlock Authorization Request
            </h3>

            <form onSubmit={handleSubmitRequest} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Closed Business Date *</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={dateToUnlock}
                  onChange={(e) => setDateToUnlock(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Administrative Unlock *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State clear reason why closed day needs to be unlocked for corrections..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Submit to Admin</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {reviewTarget.status === 'APPROVED' ? 'Approve' : 'Reject'} Unlock Request
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Review Notes (optional)</label>
              <textarea
                rows={3}
                autoFocus
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes for the audit trail..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => { setReviewTarget(null); setReviewNotes(''); }}>Cancel</Button>
              <Button variant={reviewTarget.status === 'APPROVED' ? 'primary' : 'danger'} onClick={submitReview}>
                Confirm {reviewTarget.status === 'APPROVED' ? 'Approval' : 'Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
