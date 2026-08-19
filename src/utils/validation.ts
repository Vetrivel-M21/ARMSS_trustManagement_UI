// Plain validation helpers shared across form pages. Each returns an error
// message string when invalid, or undefined when the value is valid.

export function isRequired(value: string | number | undefined | null, fieldLabel: string): string | undefined {
  if (value === undefined || value === null || value === '' || (typeof value === 'number' && value === 0)) {
    return `${fieldLabel} is required.`;
  }
  return undefined;
}

export function isPositiveAmount(value: string | number | undefined | null, fieldLabel = 'Amount'): string | undefined {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (value === undefined || value === null || value === '' || isNaN(num)) {
    return `${fieldLabel} is required.`;
  }
  if (num <= 0) {
    return `${fieldLabel} must be greater than 0.`;
  }
  return undefined;
}

export function isNonNegativeAmount(value: string | number | undefined | null, fieldLabel = 'Amount'): string | undefined {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (value === undefined || value === null || value === '' || isNaN(num)) {
    return `${fieldLabel} is required.`;
  }
  if (num < 0) {
    return `${fieldLabel} cannot be negative.`;
  }
  return undefined;
}

export function isMinLength(value: string | undefined | null, min: number, fieldLabel: string): string | undefined {
  if (!value) return undefined;
  if (value.length < min) {
    return `${fieldLabel} must be at least ${min} characters.`;
  }
  return undefined;
}

export function isWithinLength(value: string | undefined | null, max: number, fieldLabel: string): string | undefined {
  if (!value) return undefined;
  if (value.length > max) {
    return `${fieldLabel} must be ${max} characters or fewer.`;
  }
  return undefined;
}

export function isValidEmail(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(value)) {
    return 'Enter a valid email address.';
  }
  return undefined;
}

export function isNotFutureDate(value: string | undefined | null, fieldLabel: string): string | undefined {
  if (!value) return undefined;
  const today = new Date().toISOString().split('T')[0];
  if (value > today) {
    return `${fieldLabel} cannot be in the future.`;
  }
  return undefined;
}

export function isDateAfterOrEqual(
  laterValue: string | undefined | null,
  earlierValue: string | undefined | null,
  laterLabel: string,
  earlierLabel: string
): string | undefined {
  if (!laterValue || !earlierValue) return undefined;
  if (laterValue < earlierValue) {
    return `${laterLabel} cannot be before ${earlierLabel}.`;
  }
  return undefined;
}

export function isInteger(value: string | number | undefined | null, fieldLabel: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num) || !Number.isInteger(num)) {
    return `${fieldLabel} must be a whole number.`;
  }
  return undefined;
}

export function isValidYear(value: string | number | undefined | null, min: number, max: number): string | undefined {
  const num = typeof value === 'number' ? value : Number(value);
  if (value === undefined || value === null || value === '' || isNaN(num)) {
    return 'Enter a valid year.';
  }
  if (num < min || num > max) {
    return `Year must be between ${min} and ${max}.`;
  }
  return undefined;
}

export function isValidCategoryName(value: string | undefined | null): string | undefined {
  if (!value) return 'Category name is required.';
  if (!/^[A-Z][A-Z0-9_]*$/.test(value)) {
    return 'Use uppercase letters, numbers, and underscores only (e.g. OFFICE_SUPPLIES).';
  }
  return undefined;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((v) => v !== undefined);
}
