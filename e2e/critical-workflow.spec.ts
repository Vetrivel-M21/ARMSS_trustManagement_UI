import { test, expect } from '@playwright/test';

const seed = Date.now();
const donorName = `E2E Test Donor ${seed}`;
const donorPhone = `9${String(seed).slice(-9)}`;

async function login(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

test.describe('Critical financial workflow (spec section 60)', () => {
  test('login, donor creation, cash donation with denomination validation, and voucher issuance', async ({ page }) => {
    await login(page, 'admin', 'Admin@123');
    await expect(page.getByText(/TRUST MANAGEMENT SYSTEM/i)).toBeVisible();

    // Create donor
    await page.goto('/donors');
    await page.getByRole('button', { name: /add new donor/i }).click();
    const donorForm = page.locator('form').filter({ hasText: 'Save Donor Profile' });
    await donorForm.locator('input[type="text"]').nth(0).fill(donorName); // Full Name
    await donorForm.locator('input[type="text"]').nth(1).fill(donorPhone); // Phone
    await donorForm.getByRole('button', { name: /save donor profile/i }).click();
    await expect(page.getByText(donorName)).toBeVisible({ timeout: 10000 });

    // Create a cash donation with a denomination MISMATCH — must be rejected
    await page.goto('/donations');
    await page.getByRole('button', { name: /record new donation/i }).click();
    const donationForm = page.locator('form').filter({ hasText: 'Submit & Issue Receipt' });
    await donationForm.locator('select').nth(0).selectOption({ label: new RegExp(donorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
    await donationForm.locator('input[type="number"]').nth(0).fill('1000'); // Amount
    const denomGrid = donationForm.locator('.grid.grid-cols-5 input[type="number"]');
    await denomGrid.nth(1).fill('1'); // ₹500 x 1 = 500, mismatched vs 1000
    await donationForm.getByRole('button', { name: /submit.*issue receipt/i }).click();
    await expect(page.getByText(/does not match/i)).toBeVisible({ timeout: 10000 });

    // Correct the denominations and resubmit — must succeed
    await denomGrid.nth(1).fill('2'); // 500 x 2 = 1000, matches
    await donationForm.getByRole('button', { name: /submit.*issue receipt/i }).click();
    await expect(page.getByText(/DONATION RECEIPT/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Rupees One Thousand Only/i)).toBeVisible();
    await page.getByRole('button', { name: /^done$/i }).click();

    // The donation now appears in the register
    await expect(page.locator('table')).toContainText(donorName);
  });

  test('staff cannot access admin-only endpoints (user management route redirects)', async ({ page }) => {
    await login(page, 'staff', 'Staff@123');
    await page.goto('/admin/users');
    // ProtectedRoute redirects non-admins away from admin-only routes
    await expect(page).not.toHaveURL(/\/admin\/users/, { timeout: 10000 });
  });

  test('admin can reach user management and bank reconciliation views', async ({ page }) => {
    await login(page, 'admin', 'Admin@123');

    await page.goto('/admin/users');
    await expect(page.getByText(/User & Role Management/i)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table')).toContainText('admin');

    await page.goto('/bank');
    await expect(page.getByText(/Bank Accounts & Reconciliation/i)).toBeVisible({ timeout: 10000 });
  });
});
