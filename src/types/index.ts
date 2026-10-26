export type Role = 'STAFF' | 'ADMIN';

export interface Branch {
  id: number;
  branch_code: string;
  name: string;
  tamil_name?: string;
  license_number?: string;
  license_issue_date?: string;
  license_expiry_date?: string;
  registration_details?: string;
  incharge_name?: string;
  phone?: string;
  email?: string;
  address_line?: string;
  city?: string;
  state?: string;
  pincode?: string;
  upi_id?: string;
  qr_code_path?: string;
  logo_path?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LicenseAlert {
  branch_id: number;
  branch_name: string;
  branch_code: string;
  license_number: string;
  license_expiry_date?: string;
  days_remaining: number;
  status: 'EXPIRED' | 'EXPIRING_SOON' | 'ACTIVE';
}

export interface BranchComparisonItem {
  branch_id: number;
  branch_code: string;
  branch_name: string;
  total_donations: number;
  total_expenses: number;
  cash_inflow: number;
  cash_outflow: number;
  net_cash: number;
  voucher_count: number;
  license_expiry_date?: string;
  license_status: string;
}

export type EmploymentStatus = 'ACTIVE' | 'RELIEVED' | 'TEMPORARILY_BLOCKED';
export type AttendanceStatus = 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF' | 'ABSENT' | 'LEAVE';

export interface User {
  id: number;
  staff_code?: string;
  username: string;
  full_name: string;
  email: string;
  phone?: string;
  gender?: string;
  education?: string;
  marital_status?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  date_of_relieving?: string;
  designation?: string;
  department?: string;
  address_line?: string;
  city?: string;
  state?: string;
  pincode?: string;
  photo_path?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  role: Role;
  employment_status?: EmploymentStatus;
  status_remarks?: string;
  branch_id?: number;
  branch_code?: string;
  branch_name?: string;
  branch?: Branch;
  permissions?: string[];
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SystemPermission {
  id: number;
  code: string;
  module: string;
  name: string;
  description: string;
  created_at?: string;
}

export interface AttendanceSheetItem {
  user_id: number;
  staff_code: string;
  full_name: string;
  designation: string;
  department: string;
  photo_path: string;
  branch_id: number;
  branch_name: string;
  attendance_id?: number;
  status: AttendanceStatus;
  remarks: string;
  marked_by_user_name?: string;
  updated_at?: string;
}

export type StaffAttendanceItem = AttendanceSheetItem;

export interface AttendanceSheetResponse {
  business_date: string;
  total_staff: number;
  present_full_day: number;
  present_1st_half: number;
  present_2nd_half: number;
  absent_count: number;
  leave_count: number;
  items: AttendanceSheetItem[];
}

export interface BatchAttendanceEntry {
  user_id: number;
  status: AttendanceStatus;
  remarks?: string;
}

export interface StaffAttendanceHistoryItem {
  id: number;
  business_date: string;
  status: AttendanceStatus;
  remarks: string;
  marked_by_name: string;
  created_at: string;
}

export interface StaffAttendanceMySummary {
  total_days: number;
  full_day_count: number;
  first_half_count: number;
  second_half_count: number;
  absent_count: number;
  leave_count: number;
  attendance_percentage: number;
  history: StaffAttendanceHistoryItem[];
}

export interface AttendanceReportItem {
  id: number;
  business_date: string;
  user_id: number;
  staff_code: string;
  full_name: string;
  designation: string;
  department: string;
  branch_id: number;
  branch_name: string;
  status: AttendanceStatus;
  remarks: string;
  marked_by_name: string;
}

export interface EmployeeAttendanceSummaryItem {
  user_id: number;
  staff_code: string;
  full_name: string;
  phone: string;
  email: string;
  designation: string;
  department: string;
  branch_id: number;
  branch_name: string;
  employment_status: EmploymentStatus | string;
  total_days: number;
  full_day_count: number;
  first_half_count: number;
  second_half_count: number;
  leave_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface AttendanceReportResponse {
  start_date: string;
  end_date: string;
  total_records: number;
  full_day_count: number;
  first_half_count: number;
  second_half_count: number;
  absent_count: number;
  leave_count: number;
  attendance_percentage: number;
  items: AttendanceReportItem[];
  employee_summaries?: EmployeeAttendanceSummaryItem[];
}

export interface StaffMasterReportItem {
  id: number;
  staff_code: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  education: string;
  marital_status: string;
  date_of_birth?: string;
  date_of_joining?: string;
  date_of_relieving?: string;
  designation: string;
  department: string;
  address: string;
  address_line?: string;
  city: string;
  state: string;
  pincode: string;
  emergency_contact: string;
  role: string;
  employment_status: EmploymentStatus;
  status_remarks: string;
  branch_id: number;
  branch_name: string;
  is_active: boolean;
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
  upi_id?: string;
  is_app_donation_account?: boolean;
  current_balance: number;
  is_active: boolean;
  created_at?: string;
}

export interface TrustHomeConfig {
  id: number;
  home_key: string;
  home_name: string;
  home_name_tamil: string;
  upi_id: string;
  qr_code_path: string;
  logo_path?: string;
  description: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
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
  branch_id?: number;
  branch?: Branch;
  donation_number: string;
  donor_id: number;
  donor?: Donor;
  business_date: string;
  amount: number;
  payment_mode: 'CASH' | 'BANK';
  purpose: string;
  category?: string;
  reason?: string;
  source?: string;
  verification_status?: string;
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
  rejection_reason?: string;
  trust_home?: string;
  status: string;
  created_by_user?: User;
  created_at?: string;
}

export interface Expense {
  id: number;
  branch_id?: number;
  branch?: Branch;
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
  status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'REJECTED' | string;
  created_by?: number;
  created_by_user?: { id: number; full_name: string; username: string };
  approved_by?: number;
  approved_by_user?: { id: number; full_name: string; username: string };
  approved_at?: string;
  rejection_reason?: string;
  created_at?: string;
  voucher?: Voucher;
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

export interface Ledger {
  id: number;
  ledger_no: string;
  ledger_name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  titles_count?: number;
}

export interface VoucherTitle {
  id: number;
  title_no: string;
  title: string;
  voucher_type: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'SELF_TRANSFER';
  ledger_id: number;
  ledger?: Ledger;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export type VoucherType =
  | 'INCOME'
  | 'EXPENSE'
  | 'ASSET'
  | 'LIABILITY'
  | 'SELF_TRANSFER'
  | 'DONATION_RECEIPT'
  | 'EXPENSE_VOUCHER';

export interface Voucher {
  id: number;
  branch_id?: number;
  branch?: Branch;
  voucher_number: string;
  voucher_type: VoucherType;
  business_date: string;
  source_type: string;
  source_id: number;
  payee_or_donor_name: string;
  amount: number;
  amount_in_words: string;
  payment_mode: 'CASH' | 'BANK';
  status: string;
  created_at?: string;
  ledger_id?: number;
  ledger?: Ledger;
  title_id?: number;
  title?: VoucherTitle;
  bank_account_id?: number;
  bank_account?: BankAccount | null;
  from_bank_account_id?: number;
  from_bank_account?: BankAccount | null;
  to_bank_account_id?: number;
  to_bank_account?: BankAccount | null;
  details?: string;
  attachment_path?: string;
  approved_at?: string;
  rejection_reason?: string;
  // Enrichment returned by GET /vouchers/:id
  purpose?: string;
  reference_number?: string;
  category?: string;
  food_type?: string;
  meal_type?: string;
  donor_phone?: string;
  donor_father_name?: string;
}

export interface VoucherReportSummary {
  total_income: number;
  total_expense: number;
  net_cash_flow: number;
  total_assets: number;
  total_liabilities: number;
  total_self_transfers: number;
  voucher_count: number;
}

export interface LedgerSummaryItem {
  ledger_id: number;
  ledger_no: string;
  ledger_name: string;
  total_debit: number;
  total_credit: number;
  net_amount: number;
  count: number;
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
  source_channel?: string;
  is_mobile_app?: boolean;
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

export interface StaffProfileDetail {
  id: number;
  staff_code: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  education: string;
  marital_status: string;
  date_of_birth?: string;
  date_of_joining?: string;
  date_of_relieving?: string;
  tenure_formatted: string;
  designation: string;
  department: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  photo_path: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  role: string;
  employment_status: EmploymentStatus;
  status_remarks: string;
  branch_id: number;
  branch_name: string;
  is_active: boolean;
}

export interface StaffOperationalActivity {
  vouchers_created_count: number;
  vouchers_created_total_amount: string;
  vouchers_approved_count: number;
  vouchers_approved_total_amount: string;
  expenses_created_count: number;
  expenses_created_total_amount: string;
  expenses_approved_count: number;
  expenses_approved_total_amount: string;
  donations_collected_count: number;
  donations_collected_amount: string;
}

export interface StaffAttendanceMonthSummary {
  year: number;
  month: number;
  month_name: string;
  start_date?: string;
  end_date?: string;
  total_business_days: number;
  full_day_count: number;
  first_half_count: number;
  second_half_count: number;
  leave_count: number;
  absent_count: number;
  attendance_percentage: number;
  history: StaffAttendanceHistoryItem[];
}

export interface StaffAnalyticsReport {
  profile: StaffProfileDetail;
  attendance_summary: StaffAttendanceMonthSummary;
  operational_activity: StaffOperationalActivity;
  permissions: string[];
}

