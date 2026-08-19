export type Role = 'STAFF' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: Role;
  is_active?: boolean;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface BankAccount {
  id: number;
  bank_name: string;
  account_name: string;
  account_number_masked: string;
  ifsc_code: string;
  branch: string;
  location?: string;
  opening_balance: number;
  qr_code_path?: string;
  current_balance: number;
  is_active: boolean;
  created_at?: string;
}

export interface DonorFamilyMember {
  id?: number;
  donor_id?: number;
  full_name: string;
  relationship: string;
  date_of_birth: string;
  notes?: string;
}

export interface Donor {
  id: number;
  donor_code: string;
  full_name: string;
  father_name?: string;
  phone: string;
  email: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  date_of_birth?: string;
  anniversary_date?: string;
  marital_status: string;
  aadhaar_number: string;
  aadhaar_doc_path: string;
  pan_number: string;
  pan_doc_path: string;
  photo_path?: string;
  notes: string;
  is_active: boolean;
  family_members?: DonorFamilyMember[];
  created_at?: string;
}

export interface Scheme {
  id: number;
  name: string;
  category: string;
  food_type: 'VEG' | 'NON_VEG' | 'NA';
  meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'NA';
  default_amount: number;
  description: string;
  is_active: boolean;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  is_active: boolean;
}

export interface DenominationItem {
  value: number;
  quantity: number;
}

export interface Donation {
  id: number;
  donation_number: string;
  donor_id: number;
  donor?: Donor;
  business_date: string;
  amount: number;
  payment_mode: 'CASH' | 'BANK';
  purpose: string;
  scheme_id?: number;
  scheme?: Scheme;
  event_type?: string;
  event_person_name?: string;
  event_date?: string;
  relationship_to_donor?: string;
  family_member_id?: number;
  bank_account_id?: number;
  bank_account?: BankAccount;
  reference_number?: string;
  attachment_path?: string;
  notes?: string;
  status: string;
  created_by_user?: User;
  created_at?: string;
}

export interface Expense {
  id: number;
  expense_number: string;
  business_date: string;
  payment_mode: 'CASH' | 'BANK';
  bank_account_id?: number;
  bank_account?: BankAccount;
  category: string;
  amount: number;
  payee_name: string;
  description?: string;
  reference_number?: string;
  attachment_path?: string;
  status: string;
  created_at?: string;
}

export interface DailyClosing {
  id: number;
  business_date: string;
  status: 'OPEN' | 'READY_TO_CLOSE' | 'CLOSED' | 'UNLOCKED';
  opening_cash: number;
  cash_inflow: number;
  cash_outflow: number;
  expected_closing_cash: number;
  physical_cash_count: number;
  cash_difference: number;
  closed_by_user?: User;
  closed_at?: string;
}

export interface Voucher {
  id: number;
  voucher_number: string;
  voucher_type: 'DONATION_RECEIPT' | 'EXPENSE_VOUCHER';
  business_date: string;
  source_type: string;
  source_id: number;
  payee_or_donor_name: string;
  amount: number;
  amount_in_words: string;
  payment_mode: 'CASH' | 'BANK';
  status: string;
  created_at?: string;
  // Enrichment returned only by GET /vouchers/:id
  purpose?: string;
  reference_number?: string;
  category?: string;
  food_type?: string;
  meal_type?: string;
  donor_phone?: string;
  donor_father_name?: string;
  bank_account?: BankAccount | null;
}

export interface UnlockRequest {
  id: number;
  entity_type: 'CASH_DAY' | 'BANK_DAY';
  bank_account_id?: number;
  bank_account?: BankAccount;
  business_date: string;
  requested_by_user?: User;
  request_reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by_user?: User;
  review_reason?: string;
  requested_at?: string;
  reviewed_at?: string;
}

export interface AuditLog {
  id: number;
  user?: User;
  action: string;
  entity_name: string;
  entity_id: number;
  reason: string;
  ip_address: string;
  created_at: string;
}

export interface YoYComparisonItem {
  month_name: string;
  current_year_amount: number;
  previous_year_amount: number;
  variance_amount: number;
  variance_percent: number;
}

export interface BankTransaction {
  id: number;
  bank_account_id: number;
  business_date: string;
  transaction_type: 'CREDIT' | 'DEBIT';
  amount: number;
  category: string;
  reference_number?: string;
  source_type: string;
  source_id: number;
  description?: string;
  created_at?: string;
  donor_name?: string;
  donor_phone?: string;
  donation_number?: string;
  purpose?: string;
  scheme_name?: string;
  food_type?: string;
  meal_type?: string;
  payee_name?: string;
  expense_number?: string;
  attachment_path?: string;
}

export interface BankClosingStatus {
  business_date: string;
  bank_account_id: number;
  status: 'OPEN' | 'CLOSED' | 'UNLOCKED';
  opening_balance: number;
  total_credits: number;
  total_debits: number;
  expected_closing: number;
  actual_closing?: number;
  difference?: number;
}

export interface BankBreakdownEntry {
  name: string;
  purpose: string;
  reference_number: string;
  amount: number;
  business_date: string;
}

export interface BankBreakdownRow {
  label: string;
  food_type?: string;
  meal_type?: string;
  category?: string;
  count: number;
  total_amount: number;
  entries: BankBreakdownEntry[];
}

export interface BankAccountBreakdown {
  bank_account_id: number;
  bank_name: string;
  account_name: string;
  opening_balance: number;
  total_credits: number;
  total_debits: number;
}

export interface BankDaySummary {
  business_date: string;
  opening_total: number;
  total_credits: number;
  total_debits: number;
  net_position: number;
  banks: BankAccountBreakdown[];
  credit_breakdown: BankBreakdownRow[];
  debit_breakdown: BankBreakdownRow[];
}

export interface YoYMonthDonorItem {
  donor_id: number;
  donor_name: string;
  donor_code: string;
  amount: number;
  business_date: string;
  purpose: string;
  year: number;
}

export interface BirthdayItem {
  type: 'DONOR' | 'FAMILY_MEMBER' | 'ANNIVERSARY';
  donor_id: number;
  donor_name: string;
  person_name: string;
  phone: string;
  email: string;
  relationship: string;
  date_of_birth: string;
  birthday_day: number;
  birthday_month: number;
  age: number;
  family_member_id?: number;
}
