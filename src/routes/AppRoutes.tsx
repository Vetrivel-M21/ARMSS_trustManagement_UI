import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Layout } from '../components/layout/Layout';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Donors } from '../pages/Donors';
import { DonorSummary } from '../pages/DonorSummary';
import { Schemes } from '../pages/Schemes';
import { Donations } from '../pages/Donations';
import { BankTransactions } from '../pages/BankTransactions';
import { Vouchers } from '../pages/Vouchers';
import { VoucherView } from '../pages/VoucherView';
import { Ledgers } from '../pages/Ledgers';
import { Reports } from '../pages/Reports';
import { AdminUnlock } from '../pages/AdminUnlock';
import { StaffManagement } from '../pages/StaffManagement';
import { StaffAttendance } from '../pages/StaffAttendance';
import { StaffReports } from '../pages/StaffReports';
import { StaffProfile } from '../pages/StaffProfile';
import { VoucherApprovals } from '../pages/VoucherApprovals';
import { TrustHomesConfig } from '../pages/TrustHomesConfig';
import { Branches } from '../pages/Branches';
import { NotFound } from '../pages/NotFound';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/donors" element={<Donors />} />
          <Route path="/donor-summary" element={<DonorSummary />} />
          <Route path="/schemes" element={<Schemes />} />
          <Route path="/donations" element={<Donations />} />
          <Route path="/bank/transactions" element={<BankTransactions />} />
          <Route path="/expenses" element={<Navigate to="/vouchers" replace />} />
          <Route path="/vouchers" element={<Vouchers />} />
          <Route path="/vouchers/:id" element={<VoucherView />} />
          <Route path="/ledgers" element={<Ledgers />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<StaffProfile />} />

          <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
            <Route path="/admin/branches" element={<Branches />} />
            <Route path="/admin/trust-homes" element={<TrustHomesConfig />} />
            <Route path="/admin/unlock" element={<AdminUnlock />} />
            <Route path="/admin/staff" element={<StaffManagement />} />
            <Route path="/admin/users" element={<StaffManagement />} />
            <Route path="/admin/attendance" element={<StaffAttendance />} />
            <Route path="/admin/staff-reports" element={<StaffReports />} />
            <Route path="/admin/voucher-approvals" element={<VoucherApprovals />} />
            <Route path="/admin/expense-approvals" element={<Navigate to="/admin/voucher-approvals" replace />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
};
