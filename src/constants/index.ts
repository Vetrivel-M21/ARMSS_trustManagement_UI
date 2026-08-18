/** Cash denomination values supported by the system (spec section 15). */
export const CASH_DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

export const DONATION_PURPOSES = [
  'General Donation',
  'Food',
  'Education',
  'Medical',
  'Birthday',
  'Child Birthday',
  'Wedding Anniversary',
  'Memorial',
  'Festival',
  'Other',
] as const;

export const EVENT_TYPES = [
  'BIRTHDAY',
  'CHILD_BIRTHDAY',
  'ANNIVERSARY',
  'MEMORIAL',
  'FESTIVAL',
  'SPECIAL_OCCASION',
] as const;

export const RELATIONSHIP_TYPES = [
  'SELF',
  'SPOUSE',
  'SON',
  'DAUGHTER',
  'FATHER',
  'MOTHER',
  'SIBLING',
  'OTHER',
] as const;

export const MARITAL_STATUS_OPTIONS = ['SINGLE', 'MARRIED', 'WIDOWED', 'DIVORCED'] as const;

export const BANK_TRANSACTION_CATEGORIES = [
  'DONATION',
  'FOOD_EXPENSE',
  'SALARY',
  'ELECTRICITY',
  'PURCHASE',
  'BANK_CHARGE',
  'TRANSFER',
  'OTHER',
] as const;
