import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Branch, LicenseAlert } from '../types';
import { fetchAPI } from '../api/client';
import { useAuth } from './AuthContext';

interface BranchContextType {
  branches: Branch[];
  activeBranch: Branch | null;
  activeBranchId: number | null;
  isAllBranches: boolean;
  licenseAlerts: LicenseAlert[];
  isLoading: boolean;
  switchBranch: (branchId: number | null) => void;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<number | null>(() => {
    const saved = localStorage.getItem('active_branch_id');
    return saved && saved !== 'ALL' && saved !== '0' ? Number(saved) : null;
  });
  const [licenseAlerts, setLicenseAlerts] = useState<LicenseAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // If user is STAFF, enforce their assigned branch
  useEffect(() => {
    if (user && !isAdmin && user.branch_id) {
      setActiveBranchId(user.branch_id);
      localStorage.setItem('active_branch_id', String(user.branch_id));
    }
  }, [user, isAdmin]);

  const loadBranches = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const res = await fetchAPI<Branch[]>('/branches');
      if (res.success && res.data) {
        setBranches(res.data);
      }

      if (isAdmin) {
        const alertRes = await fetchAPI<LicenseAlert[]>('/branches/license-alerts');
        if (alertRes.success && alertRes.data) {
          setLicenseAlerts(alertRes.data);
        }
      }
    } catch {
      // Ignore network errors on init
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadBranches();
    } else {
      setBranches([]);
      setLicenseAlerts([]);
    }
  }, [isAuthenticated, isAdmin]);

  const switchBranch = (branchId: number | null) => {
    if (!isAdmin) return; // Staff cannot switch branches
    if (branchId === null || branchId === 0) {
      setActiveBranchId(null);
      localStorage.removeItem('active_branch_id');
    } else {
      setActiveBranchId(branchId);
      localStorage.setItem('active_branch_id', String(branchId));
    }
    // Trigger window event so any listeners/pages can refetch data
    window.dispatchEvent(new Event('branch-changed'));
  };

  const activeBranch = branches.find((b) => b.id === activeBranchId) || null;
  const isAllBranches = isAdmin && activeBranchId === null;

  return (
    <BranchContext.Provider
      value={{
        branches,
        activeBranch,
        activeBranchId,
        isAllBranches,
        licenseAlerts,
        isLoading,
        switchBranch,
        refreshBranches: loadBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};
