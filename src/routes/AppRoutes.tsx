import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Layout } from '../components/layout/Layout';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Donors } from '../pages/Donors';
import { DonorSummary } from '../pages/DonorSummary';
import { Schemes } from '../pages/Schemes';
import { Donations } from '../pages/Donations';
import { BankTransactions } from '../pages/BankTransactions';
import { Expenses } from '../pages/Expenses';
import { Vouchers } from '../pages/Vouchers';
import { VoucherView } from '../pages/VoucherView';
import { Reports } from '../pages/Reports';
import { AdminUnlock } from '../pages/AdminUnlock';
import { UserManagement } from '../pages/UserManagement';
import { ExpenseCategories } from '../pages/ExpenseCategories';
import { NotFound } from '../pages/NotFound';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/donors" element={<Donors />} />
          <Route path="/donor-summary" element={<DonorSummary />} />
          <Route path="/schemes" element={<Schemes />} />
          <Route path="/donations" element={<Donations />} />
          <Route path="/bank/transactions" element={<BankTransactions />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/vouchers" element={<Vouchers />} />
          <Route path="/vouchers/:id" element={<VoucherView />} />
          <Route path="/reports" element={<Reports />} />

          <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
            <Route path="/admin/unlock" element={<AdminUnlock />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/expense-categories" element={<ExpenseCategories />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
};
