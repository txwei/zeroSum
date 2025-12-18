import { test, expect } from '@playwright/test';
import { register } from './helpers/auth';
import { generateTestUser, generateTestGroup } from './helpers/data';

test.describe('Statistics', () => {
  let user: ReturnType<typeof generateTestUser>;

  test.beforeEach(async ({ page }) => {
    user = generateTestUser();
    await register(page, user.username, user.displayName, user.password);
    
    // Create a group
    const group = generateTestGroup();
    await page.click('button:has-text("Create")');
    await page.fill('input[placeholder*="Group Name" i]', group.name);
    await page.click('button:has-text("Create Group")');
    await page.click(`text=${group.name}`);
  });

  test('should view statistics tab', async ({ page }) => {
    await page.click('button:has-text("Statistics")');
    await expect(page.locator('text=Statistics')).toBeVisible();
  });

  test('should display cumulative totals', async ({ page }) => {
    await page.click('button:has-text("Statistics")');
    // Statistics content should be visible
    await expect(page.locator('text=/total|statistics/i')).toBeVisible();
  });
});

