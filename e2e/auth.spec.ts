import { test, expect } from '@playwright/test';
import { login, register } from './helpers/auth';
import { generateTestUser } from './helpers/data';

test.describe('Authentication', () => {
  test('should register a new user', async ({ page }) => {
    const user = generateTestUser();
    await register(page, user.username, user.displayName, user.password);
    
    await expect(page).toHaveURL('/groups');
    await expect(page.locator('text=Groups')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    const user = generateTestUser();
    await register(page, user.username, user.displayName, user.password);
    
    // Logout first
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');
    
    // Login
    await login(page, user.username, user.password);
    await expect(page).toHaveURL('/groups');
  });

  test('should show error on invalid login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder*="Username" i]', 'nonexistent');
    await page.fill('input[placeholder*="Password" i]', 'wrongpassword');
    await page.click('button:has-text("Sign in")');
    
    await expect(page.locator('text=/invalid credentials/i')).toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/groups');
    await expect(page).toHaveURL('/login');
  });
});

